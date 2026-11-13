import { beforeAll, describe, expect, it, vi } from "vitest";
import type { HassEntity } from "../src/types/home-assistant";

let energy: typeof import("../src/cards/auralis-energy-card");
const state = (id: string, attributes: Record<string, unknown> = {}): HassEntity => ({ entity_id: id, state: "1", attributes });

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  energy = await import("../src/cards/auralis-energy-card");
});

describe("Auralis energy card", () => {
  it("converts electricity to kWh by default and keeps a chosen energy unit", () => {
    expect(energy.energyProfile(state("sensor.compteur", { unit_of_measurement: "Wh", device_class: "energy" }), {}))
      .toMatchObject({ unit: "kWh", units: { energy: "kWh" }, decimals: 1, eyebrow: "Énergie", title: "Consommation électrique" });
    expect(energy.energyProfile(undefined, {})).toMatchObject({ unit: "kWh", units: { energy: "kWh" } });
    expect(energy.energyProfile(state("sensor.compteur", { unit_of_measurement: "kWh" }), { unit: "Wh" }))
      .toMatchObject({ unit: "Wh", units: { energy: "Wh" }, decimals: 0 });
  });

  it("follows gas and water meters in their own units", () => {
    expect(energy.energyProfile(state("sensor.gaz", { unit_of_measurement: "m³", device_class: "gas" }), {}))
      .toMatchObject({ unit: "m³", units: { volume: "m³" }, decimals: 2, eyebrow: "Gaz", icon: "mdi:fire", rateLabel: "Débit instantané" });
    expect(energy.energyProfile(state("sensor.eau", { unit_of_measurement: "m³", device_class: "water" }), { unit: "L" }))
      .toMatchObject({ unit: "L", units: { volume: "L" }, decimals: 0, eyebrow: "Eau", title: "Consommation d’eau" });
    expect(energy.energyProfile(state("sensor.pellets", { unit_of_measurement: "kg" }), { decimals: 9 }))
      .toMatchObject({ unit: "kg", units: undefined, decimals: 3 });
  });

  it("shows the meter index in the card unit and decimals", () => {
    const meter = { entity_id: "sensor.compteur", state: "12345", attributes: { unit_of_measurement: "Wh" } };
    expect(energy.meterReading(meter, { unit: "kWh", decimals: 1 }).replace(/\s/g, " ")).toBe("12,3 kWh");
    const water = { entity_id: "sensor.eau", state: "1.5", attributes: { unit_of_measurement: "m³" } };
    expect(energy.meterReading(water, { unit: "L", decimals: 0 }).replace(/\s/g, " ")).toBe("1 500 L");
    const pellets = { entity_id: "sensor.pellets", state: "42.25", attributes: { unit_of_measurement: "kg" } };
    expect(energy.meterReading(pellets, { unit: "kWh", decimals: 1 })).toBe("42,3 kg");
    expect(energy.meterReading(undefined, { unit: "kWh", decimals: 1 })).toBe("—");
    expect(energy.convertMeterValue(2, "MWh", "kWh")).toBe(2000);
    expect(energy.convertMeterValue(2, "kg", "kWh")).toBeUndefined();
  });

  it("retries a failed history load after 30 s, then backs off up to 5 minutes", () => {
    expect(energy.historyRetryDelay(0)).toBe(300_000);
    expect(energy.historyRetryDelay(1)).toBe(30_000);
    expect(energy.historyRetryDelay(2)).toBe(60_000);
    expect(energy.historyRetryDelay(3)).toBe(120_000);
    expect(energy.historyRetryDelay(10)).toBe(300_000);
  });

  it("follows the Home Assistant theme by default and offers colours in the editor", () => {
    const card = new energy.AuralisEnergyCard();
    card.setConfig({ type: "custom:auralis-energy-card", energy_entity: "sensor.compteur" });
    expect(card.config?.theme).toBe("auto");
    const fields = energy.AuralisEnergyCard.getConfigForm().schema.map(({ name }) => name);
    expect(fields).toEqual(expect.arrayContaining(["accent_color", "card_background"]));
  });
});
