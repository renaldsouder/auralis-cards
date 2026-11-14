import { beforeAll, describe, expect, it, vi } from "vitest";
import type { ConsumptionCardConfig } from "../src/cards/auralis-consumption-card";

let consumption: typeof import("../src/cards/auralis-consumption-card");
const HOUR = 3_600_000;

const config = (overrides: Partial<ConsumptionCardConfig> = {}): ConsumptionCardConfig => ({
  type: "custom:auralis-consumption-card",
  total_power_entity: "sensor.maison_puissance",
  total_energy_entity: "sensor.maison_energie",
  devices: [
    { name: "Serveur", power_entity: "sensor.serveur_puissance", energy_entity: "sensor.serveur_energie" },
    { name: "Caisson", power_entity: "sensor.caisson_puissance" },
  ],
  ...overrides,
});

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  consumption = await import("../src/cards/auralis-consumption-card");
});

describe("Auralis consumption card", () => {
  it("needs at least one device with a power or energy sensor", () => {
    const card = new consumption.AuralisConsumptionCard();
    card.setConfig(config());
    expect(card.config?.name).toBe("Consommation par appareil");
    expect(card.config?.graph_hours).toBe(24);
    expect(() => card.setConfig(config({ devices: [] }))).toThrow("au moins un appareil");
    expect(() => card.setConfig(config({ devices: [{ name: "Vide" }] }))).toThrow("au moins un appareil");
    expect(() => card.setConfig(config({ devices: [{ power_entity: "switch.prise" }] }))).toThrow();
    expect(() => card.setConfig(config({ chart_metric: "volume" as ConsumptionCardConfig["chart_metric"] }))).toThrow("chart_metric");
  });

  it("starts on energy when no device has a power sensor", () => {
    const card = new consumption.AuralisConsumptionCard();
    card.setConfig(config({ devices: [{ name: "Lave-linge", energy_entity: "sensor.lave_linge_energie" }] }));
    expect((card as unknown as { metric: string }).metric).toBe("energy");
    card.setConfig(config());
    expect((card as unknown as { metric: string }).metric).toBe("power");
  });

  it("formats power and energy the French way", () => {
    expect(consumption.formatPower(1250)).toBe("1 250 W");
    expect(consumption.formatPower(2360, "VA")).toBe("2 360 VA");
    expect(consumption.formatPower(undefined)).toBe("—");
    expect(consumption.formatEnergy(0.4234)).toBe("0,42 kWh");
    expect(consumption.formatEnergy(12.34)).toBe("12,3 kWh");
    expect(consumption.formatEnergy(128.4)).toBe("128 kWh");
  });

  it("accumulates hourly statistics from the start of the period", () => {
    const start = Date.UTC(2026, 10, 14, 0, 30);
    const first = Date.UTC(2026, 10, 14, 0);
    const rows = [
      { start: first, change: 0.5 },
      { start: first + HOUR, change: 0.25 },
      { start: first + 3 * HOUR, change: 1 },
      { start: first - HOUR, change: 9 },
      { start: first + 2 * HOUR, change: -4 },
    ];
    const { values, total } = consumption.cumulativeSeries(rows, start, 6);
    expect(values).toEqual([0.5, 0.75, 0.75, 1.75, undefined, undefined]);
    expect(total).toBe(1.75);
    expect(consumption.cumulativeSeries([], start, 6)).toEqual({ values: [] });
  });

  it("loads power history and hourly energy statistics in one call each", async () => {
    const callWS = vi.fn(async (message: Record<string, unknown>) => {
      const ids = (message.entity_ids ?? message.statistic_ids) as string[];
      if (message.type === "history/history_during_period") {
        const now = Date.now() / 1000;
        return Object.fromEntries(ids.map((id) => [id, [{ s: "100", lu: now - 3600 }, { s: "200", lu: now - 60 }]]));
      }
      const first = Math.floor(Date.parse(String(message.start_time)) / HOUR) * HOUR;
      return Object.fromEntries(ids.map((id) => [id, [{ start: first + HOUR, change: 0.3 }, { start: first + 2 * HOUR, change: 0.2 }]]));
    });
    const card = new consumption.AuralisConsumptionCard();
    card.setConfig(config());
    card.hass = { states: {}, callService: async () => undefined, callWS: callWS as never };
    const internals = card as unknown as {
      refreshHistory(): Promise<void>;
      history?: { metric: string; series: Record<string, unknown[]>; totals: Record<string, number | undefined> };
      setMetric(metric: string): void;
    };

    await internals.refreshHistory();
    expect(callWS).toHaveBeenLastCalledWith(expect.objectContaining({
      type: "history/history_during_period",
      entity_ids: ["sensor.serveur_puissance", "sensor.caisson_puissance", "sensor.maison_puissance"],
    }));
    expect(internals.history?.metric).toBe("power");
    expect(internals.history?.series["sensor.serveur_puissance"]).toHaveLength(96);

    internals.setMetric("energy");
    await internals.refreshHistory();
    expect(callWS).toHaveBeenLastCalledWith(expect.objectContaining({
      type: "recorder/statistics_during_period",
      statistic_ids: ["sensor.serveur_energie", "sensor.maison_energie"],
      period: "hour",
      types: ["change"],
    }));
    expect(internals.history?.totals["sensor.serveur_energie"]).toBeCloseTo(0.5);
  });

  it("labels every editor field in French", () => {
    const form = consumption.AuralisConsumptionCard.getConfigForm() as {
      schema: Array<{ name: string }>; computeLabel: (field: { name: string }) => string | undefined;
    };
    for (const { name } of form.schema) expect(form.computeLabel({ name })).toBeTruthy();
  });
});
