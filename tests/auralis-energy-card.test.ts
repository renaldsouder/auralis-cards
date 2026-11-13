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
});
