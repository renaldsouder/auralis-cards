import { beforeAll, describe, expect, it, vi } from "vitest";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";

let ThermostatCard: typeof import("../src/cards/auralis-thermostat-card").AuralisThermostatCard;
let nextTarget: typeof import("../src/cards/auralis-thermostat-card").nextThermostatTarget;

const climate = (state: string, attributes: HassEntity["attributes"]): HassEntity =>
  ({ entity_id: "climate.salon", state, attributes });

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  const module = await import("../src/cards/auralis-thermostat-card");
  ThermostatCard = module.AuralisThermostatCard;
  nextTarget = module.nextThermostatTarget;
});

describe("Auralis thermostat card", () => {
  it("accepts a single thermostat or a deduplicated list", () => {
    const card = new ThermostatCard();
    card.setConfig({ type: "custom:auralis-thermostat-card", entity: "climate.salon", entities: ["climate.salon", "climate.chambre"] });
    expect(card.config?.entities).toEqual(["climate.salon", "climate.chambre"]);
    expect(() => card.setConfig({ type: "custom:auralis-thermostat-card", entities: ["sensor.temperature"] })).toThrow();
    expect(() => card.setConfig({ type: "custom:auralis-thermostat-card" })).toThrow();
  });

  it("uses the device step and temperature limits without substituting the current temperature", () => {
    const state = climate("heat", { temperature: 20.25, current_temperature: 18, target_temp_step: 0.25, min_temp: 19, max_temp: 20.5 });
    expect(nextTarget(state, 1)).toBe(20.5);
    expect(nextTarget(state, -1)).toBe(20);
    state.attributes.temperature = 20.5;
    expect(nextTarget(state, 1)).toBeUndefined();
    delete state.attributes.temperature;
    expect(nextTarget(state, -1)).toBeUndefined();
    state.state = "unavailable";
    expect(nextTarget(state, 1)).toBeUndefined();
  });

  it("sends only supported commands to the selected climate entity", async () => {
    const callService = vi.fn(async () => undefined);
    const hass: HomeAssistant = {
      states: { "climate.salon": climate("heat", { temperature: 20, target_temp_step: 0.5, hvac_modes: ["off", "heat", "cool"] }) },
      callService,
    };
    const card = new ThermostatCard();
    card.setConfig({ type: "custom:auralis-thermostat-card", entity: "climate.salon" });
    card.hass = hass;
    const actions = card as unknown as {
      adjustTemperature(id: string, direction: -1 | 1): Promise<void>;
      setMode(id: string, mode: string): Promise<void>;
    };
    await actions.adjustTemperature("climate.salon", 1);
    await actions.setMode("climate.salon", "cool");
    await actions.setMode("climate.salon", "dry");
    expect(callService).toHaveBeenNthCalledWith(1, "climate", "set_temperature", { temperature: 20.5 }, { entity_id: "climate.salon" });
    expect(callService).toHaveBeenNthCalledWith(2, "climate", "set_hvac_mode", { hvac_mode: "cool" }, { entity_id: "climate.salon" });
    expect(callService).toHaveBeenCalledTimes(2);
    hass.states["climate.salon"].state = "unavailable";
    await actions.adjustTemperature("climate.salon", -1);
    await actions.setMode("climate.salon", "off");
    expect(callService).toHaveBeenCalledTimes(2);
  });
});
