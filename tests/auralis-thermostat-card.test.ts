import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";

type ThermostatModule = typeof import("../src/cards/auralis-thermostat-card");
let thermostat: ThermostatModule;

const climate = (state: string, attributes: HassEntity["attributes"]): HassEntity =>
  ({ entity_id: "climate.salon", state, attributes });

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  thermostat = await import("../src/cards/auralis-thermostat-card");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Auralis thermostat card", () => {
  it("accepts a single thermostat or a deduplicated list", () => {
    const card = new thermostat.AuralisThermostatCard();
    card.setConfig({ type: "custom:auralis-thermostat-card", entity: "climate.salon", entities: ["climate.salon", "climate.chambre"] });
    expect(card.config?.entities).toEqual(["climate.salon", "climate.chambre"]);
    expect(() => card.setConfig({ type: "custom:auralis-thermostat-card", entities: ["sensor.temperature"] })).toThrow();
    expect(() => card.setConfig({ type: "custom:auralis-thermostat-card" })).toThrow();
  });

  it("uses the device step and temperature limits without substituting the current temperature", () => {
    const state = climate("heat", { temperature: 20.25, current_temperature: 18, target_temp_step: 0.25, min_temp: 19, max_temp: 20.5 });
    expect(thermostat.nextThermostatTarget(state, 1)).toBe(20.5);
    expect(thermostat.nextThermostatTarget(state, -1)).toBe(20);
    state.attributes.temperature = 20.5;
    expect(thermostat.nextThermostatTarget(state, 1)).toBeUndefined();
    delete state.attributes.temperature;
    expect(thermostat.thermostatTarget(state)).toBeUndefined();
    expect(thermostat.nextThermostatTarget(state, -1)).toBeUndefined();
    state.state = "unavailable";
    expect(thermostat.nextThermostatTarget(state, 1)).toBeUndefined();
  });

  it("prefers a configured step and sends both range bounds together", () => {
    const state = climate("heat_cool", { target_temp_low: 19, target_temp_high: 24, target_temp_step: 1, min_temp: 7, max_temp: 30 });
    expect(thermostat.setpointLimits(state, 0.5)).toEqual({ step: 0.5, min: 7, max: 30 });
    expect(thermostat.setpointLimits(state, -2).step).toBe(1);
    expect(thermostat.stepSetpoint(29.8, 1, { step: 0.5, min: 7, max: 30 })).toBe(30);
    expect(thermostat.setpointPayload({ target_temp_high: 25 }, thermostat.readSetpoints(state)))
      .toEqual({ target_temp_low: 19, target_temp_high: 25 });
    expect(thermostat.setpointPayload({ temperature: 21 }, {})).toEqual({ temperature: 21 });
  });

  it("accumulates taps locally and sends a single set_temperature after the pause", async () => {
    vi.useFakeTimers();
    const callService = vi.fn(async () => undefined);
    const hass: HomeAssistant = {
      states: { "climate.salon": climate("heat", { temperature: 20, target_temp_step: 0.5, hvac_modes: ["off", "heat", "cool"] }) },
      callService,
    };
    const card = new thermostat.AuralisThermostatCard();
    card.setConfig({ type: "custom:auralis-thermostat-card", entity: "climate.salon" });
    card.hass = hass;
    const actions = card as unknown as {
      adjustTemperature(id: string, direction: -1 | 1): boolean;
      setMode(id: string, mode: string): Promise<void>;
      setpoints: { values(id: string): { temperature?: number }; pending(id: string): boolean };
    };
    actions.adjustTemperature("climate.salon", 1);
    actions.adjustTemperature("climate.salon", 1);
    actions.adjustTemperature("climate.salon", 1);
    expect(actions.setpoints.values("climate.salon").temperature).toBe(21.5);
    expect(callService).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(thermostat.SETPOINT_DELAY);
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith("climate", "set_temperature", { temperature: 21.5 }, { entity_id: "climate.salon" });
    // La valeur envoyée reste affichée jusqu'à la confirmation de Home Assistant.
    expect(actions.setpoints.values("climate.salon").temperature).toBe(21.5);
    hass.states["climate.salon"] = climate("heat", { ...hass.states["climate.salon"].attributes, temperature: 21.5 });
    expect(actions.setpoints.pending("climate.salon")).toBe(false);

    await actions.setMode("climate.salon", "cool");
    await actions.setMode("climate.salon", "dry");
    expect(callService).toHaveBeenNthCalledWith(2, "climate", "set_hvac_mode", { hvac_mode: "cool" }, { entity_id: "climate.salon" });
    expect(callService).toHaveBeenCalledTimes(2);
    hass.states["climate.salon"].state = "unavailable";
    expect(actions.adjustTemperature("climate.salon", -1)).toBe(false);
    await actions.setMode("climate.salon", "off");
    expect(callService).toHaveBeenCalledTimes(2);
  });

  it("returns to the real setpoint when the command fails", async () => {
    vi.useFakeTimers();
    let state = climate("heat", { temperature: 20 });
    const buffer = new thermostat.SetpointBuffer({ state: () => state, send: async () => false, changed: vi.fn() });
    buffer.adjust("climate.salon", "temperature", -1, { step: 0.5, min: 5, max: 35 });
    expect(buffer.values("climate.salon").temperature).toBe(19.5);
    await vi.advanceTimersByTimeAsync(thermostat.SETPOINT_DELAY);
    expect(buffer.values("climate.salon").temperature).toBe(20);
    state = climate("heat", {});
    expect(buffer.adjust("climate.salon", "temperature", 1, { step: 0.5, min: 5, max: 35 })).toBe(false);
  });

  it("lets Sections follow the content height", () => {
    expect(new thermostat.AuralisThermostatCard().getGridOptions()).toEqual({ columns: 6, min_columns: 3 });
  });
});
