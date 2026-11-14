import { beforeAll, describe, expect, it, vi } from "vitest";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";
import type { ClimateCardConfig } from "../src/cards/auralis-climate-card";

let climate: typeof import("../src/cards/auralis-climate-card");
const sensor = (id: string, value: string, attributes: Record<string, unknown> = {}): HassEntity =>
  ({ entity_id: id, state: value, attributes });
const config: ClimateCardConfig = {
  type: "custom:auralis-climate-card",
  rooms: [
    { name: "Salon", temperature_entity: "sensor.salon_temperature", humidity_entity: "sensor.salon_humidity", battery_entity: "sensor.salon_battery" },
    { name: "Extérieur", temperature_entity: "sensor.exterieur_temperature", outdoor: true },
  ],
};

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  climate = await import("../src/cards/auralis-climate-card");
});

describe("Auralis climate card", () => {
  it("requires sensor entities and applies bounded defaults", () => {
    const card = new climate.AuralisClimateCard();
    card.setConfig({ ...config, columns: 9, graph_hours: 500, low_battery: -4 });
    expect(card.config).toMatchObject({ name: "Températures", theme: "carbon", columns: 6, graph_hours: 168, low_battery: 0 });
    card.setConfig(config);
    expect(card.config).toMatchObject({ columns: undefined, graph_hours: 24, low_battery: 20 });
    expect(card.config?.thresholds).toEqual(climate.INDOOR_THRESHOLDS);
    expect(() => card.setConfig({ type: "custom:auralis-climate-card", rooms: [] })).toThrow();
    expect(() => card.setConfig({ type: "custom:auralis-climate-card", rooms: [{ temperature_entity: "climate.salon" }] })).toThrow();
    expect(() => card.setConfig({ type: "custom:auralis-climate-card", rooms: [{ temperature_entity: "sensor.a", humidity_entity: "light.b" }] })).toThrow();
  });

  it("picks the colour band below each threshold and keeps an open last band", () => {
    const band = (value: number | undefined, scale = climate.INDOOR_THRESHOLDS) => climate.temperatureBand(value, scale)?.label;
    expect(band(16.9)).toBe("Froid");
    expect(band(17)).toBe("Frais");
    expect(band(21.9)).toBe("Confort");
    expect(band(40)).toBe("Très chaud");
    expect(band(undefined)).toBeUndefined();
    expect(band(Number.NaN)).toBeUndefined();
    expect(band(-3, climate.OUTDOOR_THRESHOLDS)).toBe("Gel");
    expect(band(21, climate.OUTDOOR_THRESHOLDS)).toBe("Agréable");
  });

  it("sorts custom thresholds, rejects unsafe colours and falls back when nothing is usable", () => {
    const custom = climate.normalizeThresholds([
      { below: 22, color: " #00ff00 ", label: "Bon" },
      { below: 18, color: "#0000ff", label: "Froid" },
      { below: 30, color: "red;} body{display:none", label: "Injection" },
    ], climate.INDOOR_THRESHOLDS);
    expect(custom).toEqual([
      { below: 18, color: "#0000ff", label: "Froid" },
      { below: 22, color: "#00ff00", label: "Bon" },
      { below: undefined, color: "#00ff00", label: "Bon" },
    ]);
    expect(climate.temperatureBand(25, custom)?.label).toBe("Bon");
    expect(climate.normalizeThresholds([{ color: "url(javascript:1);" }], climate.INDOOR_THRESHOLDS)).toBe(climate.INDOOR_THRESHOLDS);
    expect(climate.normalizeThresholds("bleu", climate.OUTDOOR_THRESHOLDS)).toBe(climate.OUTDOOR_THRESHOLDS);
  });

  it("reads both Home Assistant history formats and ignores non-numeric states", () => {
    expect(climate.parseHistory([
      { s: "21.5", lu: 2000 },
      { s: "unavailable", lu: 1500 },
      { s: "20,5", lu: 1000 },
      { state: "19", last_changed: "1970-01-01T00:00:00.500Z" },
      null,
    ])).toEqual([{ time: 500, value: 19 }, { time: 1_000_000, value: 20.5 }, { time: 2_000_000, value: 21.5 }]);
    expect(climate.parseHistory(undefined)).toEqual([]);
  });

  it("averages each interval and carries the last known value over gaps", () => {
    const points = [
      { time: -50, value: 18 },
      { time: 10, value: 20 },
      { time: 20, value: 22 },
      { time: 350, value: 25 },
      { time: 900, value: 99 },
    ];
    expect(climate.resampleHistory(points, 0, 400, 4)).toEqual([21, 21, 21, 25]);
    expect(climate.resampleHistory([{ time: 250, value: 5 }], 0, 400, 4)).toEqual([undefined, undefined, 5, 5]);
    expect(climate.seriesStats([undefined, 4, 8])).toEqual({ min: 4, max: 8, mean: 6 });
    expect(climate.seriesStats([undefined])).toBeUndefined();
  });

  it("computes min, max and mean on the raw readings, not on the interval averages", () => {
    const points = [
      { time: -50, value: 18 },
      { time: 100, value: 30 },
      { time: 110, value: 20 },
      { time: 900, value: 99 },
    ];
    // Les moyennes par intervalle écrêtent le pic de 30 ; les mesures brutes le gardent.
    const buckets = climate.resampleHistory(points, 0, 400, 4);
    expect(climate.seriesStats(buckets)?.max).toBe(25);
    const stats = climate.pointStats(points, 0, 400);
    expect(stats?.min).toBe(18);
    expect(stats?.max).toBe(30);
    // Moyenne pondérée par la durée : 18 pendant 100, 30 pendant 10, 20 pendant 290.
    expect(stats?.mean).toBeCloseTo((18 * 100 + 30 * 10 + 20 * 290) / 400, 6);
    expect(climate.pointStats([], 0, 400)).toBeUndefined();
    expect(climate.withCurrentStats(stats, 31)).toMatchObject({ min: 18, max: 31 });
    expect(climate.withCurrentStats(undefined, 21)).toEqual({ min: 21, max: 21, mean: 21 });
  });

  it("draws within the chart box and widens flat series", () => {
    expect(climate.chartRange([20, 20, 20])).toEqual([18.8, 21.2]);
    const [min, max] = climate.chartRange([10, 20]);
    expect(min).toBeCloseTo(9);
    expect(max).toBeCloseTo(21);
    expect(climate.chartPaths([undefined, 0, 10], 100, 50, 0, 10)).toEqual({ line: "M50 50 L100 0", area: "M50 50 L100 0 L100 50 L50 50 Z" });
    expect(climate.chartPaths([5], 100, 50, 0, 10).line).toBe("M0 25 L100 25 L0 25");
    expect(climate.chartPaths([undefined], 100, 50, 0, 10)).toEqual({ line: "", area: "" });
  });

  it("changes the curve colour where it crosses a threshold", () => {
    const stops = climate.gradientStops(climate.INDOOR_THRESHOLDS, 18, 20);
    expect(stops).toEqual([
      { offset: 0, color: "#5bd69b" },
      { offset: 0.47, color: "#5bd69b" },
      { offset: 0.53, color: "#5fd4e6" },
      { offset: 1, color: "#5fd4e6" },
    ]);
    expect(climate.gradientStops(climate.INDOOR_THRESHOLDS, 20, 21)).toEqual([{ offset: 0, color: "#5bd69b" }, { offset: 1, color: "#5bd69b" }]);
  });

  it("loads every room temperature in one history request and reuses it within five minutes", async () => {
    const now = Date.parse("2026-11-12T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    try {
      const callWS = vi.fn(async () => ({
        "sensor.salon_temperature": [{ s: "20", lu: now / 1000 - 23 * 3600 }, { s: "22", lu: now / 1000 - 60 }],
      }));
      const hass: HomeAssistant = {
        states: { "sensor.salon_temperature": sensor("sensor.salon_temperature", "21.4", { unit_of_measurement: "°C" }) },
        callService: vi.fn(async () => undefined),
        callWS: callWS as HomeAssistant["callWS"],
      };
      const card = new climate.AuralisClimateCard();
      card.setConfig(config);
      card.hass = hass;
      const internals = card as unknown as {
        refreshHistory(): Promise<void>;
        history?: { hours: number; series: Record<string, Array<number | undefined>> };
      };
      await internals.refreshHistory();
      await internals.refreshHistory();
      expect(callWS).toHaveBeenCalledTimes(1);
      expect(callWS).toHaveBeenCalledWith(expect.objectContaining({
        type: "history/history_during_period",
        entity_ids: ["sensor.salon_temperature", "sensor.exterieur_temperature"],
        start_time: "2026-11-11T12:00:00.000Z",
        end_time: "2026-11-12T12:00:00.000Z",
        minimal_response: true,
        no_attributes: true,
      }));
      const series = internals.history!.series["sensor.salon_temperature"];
      expect(series).toHaveLength(48);
      expect(series[0]).toBeUndefined();
      expect(series[2]).toBe(20);
      expect(series[47]).toBe(22);
      expect(internals.history!.series["sensor.exterieur_temperature"].every((value) => value === undefined)).toBe(true);

      vi.setSystemTime(now + 301_000);
      await internals.refreshHistory();
      expect(callWS).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("flags low batteries and unavailable sensors without inventing a reading", () => {
    const card = new climate.AuralisClimateCard();
    card.setConfig(config);
    card.hass = {
      states: {
        "sensor.salon_temperature": sensor("sensor.salon_temperature", "21.4", { unit_of_measurement: "°C" }),
        "sensor.salon_humidity": sensor("sensor.salon_humidity", "48"),
        "sensor.salon_battery": sensor("sensor.salon_battery", "20"),
        "sensor.exterieur_temperature": sensor("sensor.exterieur_temperature", "unavailable"),
      },
      callService: vi.fn(async () => undefined),
    };
    const internals = card as unknown as { view(room: ClimateCardConfig["rooms"][number], index: number): Record<string, unknown> };
    expect(internals.view(config.rooms[0], 0)).toMatchObject({
      label: "Salon", available: true, temperature: 21.4, unit: "°C", humidity: 48, battery: 20, lowBattery: true,
      band: { label: "Confort" },
    });
    expect(internals.view(config.rooms[1], 1)).toMatchObject({
      label: "Extérieur", available: false, temperature: undefined, lowBattery: false, band: undefined, icon: "mdi:tree-outline",
    });
  });

  it("gives each room a fixed color slot, then dashes past eight rooms", () => {
    expect([0, 7, 8, 15, 16, 40].map((index) => climate.seriesStyle(index))).toEqual([
      { slot: 1, dash: "" }, { slot: 8, dash: "" }, { slot: 1, dash: "6 4" }, { slot: 8, dash: "6 4" },
      { slot: 1, dash: "1.5 4" }, { slot: 1, dash: "1.5 4" },
    ]);
  });

  it("builds round axis ticks covering the values, with a minimum span", () => {
    expect(climate.niceTicks(19.7, 23.4)).toEqual({ min: 18, max: 24, ticks: [18, 20, 22, 24] });
    expect(climate.niceTicks(21, 21.2)).toEqual({ min: 20, max: 23, ticks: [20, 21, 22, 23] });
    expect(climate.niceTicks(38, 71, 10)).toEqual({ min: 20, max: 80, ticks: [20, 40, 60, 80] });
    expect(climate.niceTicks(Number.NaN, 4).ticks).toEqual([0, 2]);
  });

  it("lists the values at a chart position from the highest, skipping gaps", () => {
    const series = [{ label: "A", values: [20, 21] }, { label: "B", values: [22, undefined] }, { label: "C", values: [19, 23] }];
    expect(climate.valuesAt(series, 0).map((item) => [item.label, item.value])).toEqual([["B", 22], ["A", 20], ["C", 19]]);
    expect(climate.valuesAt(series, 1).map((item) => item.label)).toEqual(["C", "A"]);
  });

  it("accepts the chart layout and rejects unknown layouts or metrics", () => {
    const card = new climate.AuralisClimateCard();
    card.setConfig({ ...config, layout: "chart", chart_metric: "humidity" });
    expect((card as unknown as { chartMetric: string }).chartMetric).toBe("humidity");
    expect(card.getCardSize()).toBe(7);
    expect(() => card.setConfig({ ...config, layout: "grille" as never })).toThrow("layout");
    expect(() => card.setConfig({ ...config, chart_metric: "pression" as never })).toThrow("chart_metric");
  });

  it("averages curves point by point, ignoring gaps", () => {
    expect(climate.meanSeries([[20, 22, undefined], [22, undefined, undefined], [21, 23]])).toEqual([21, 22.5, undefined]);
    expect(climate.meanSeries([])).toEqual([]);
    expect(climate.meanOf([20, undefined, 23])).toBe(21.5);
    expect(climate.meanOf([undefined])).toBeUndefined();
  });

  it("offers 24 h, 3 days and 7 days, plus the configured duration", () => {
    expect(climate.chartPeriods()).toEqual([24, 72, 168]);
    expect(climate.chartPeriods(12)).toEqual([12, 24, 72, 168]);
    expect(climate.chartPeriods(72)).toEqual([24, 72, 168]);
  });

  it("starts the chart on graph_hours and keeps the chosen period until the configuration changes it", () => {
    const card = new climate.AuralisClimateCard();
    const state = card as unknown as { chartHours: number };
    card.setConfig({ ...config, layout: "chart", graph_hours: 12 });
    expect(state.chartHours).toBe(12);
    state.chartHours = 168;
    card.setConfig({ ...config, layout: "chart", graph_hours: 12, name: "Autre" });
    expect(state.chartHours).toBe(168);
    card.setConfig({ ...config, layout: "chart", graph_hours: 48 });
    expect(state.chartHours).toBe(48);
  });
});
