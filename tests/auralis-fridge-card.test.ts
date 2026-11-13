import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";
import type { FridgeCardConfig } from "../src/cards/auralis-fridge-card";

let fridge: typeof import("../src/cards/auralis-fridge-card");
const state = (id: string, value: string, attributes: Record<string, unknown> = {}): HassEntity => ({ entity_id: id, state: value, attributes });
const config: FridgeCardConfig = {
  type: "custom:auralis-fridge-card",
  connected_entity: "binary_sensor.fridge_connected",
  fridge_temperature_entity: "sensor.fridge_temperature",
  door_entity: "binary_sensor.fridge_door",
  alert_entity: "binary_sensor.fridge_alert",
};

type Actions = {
  adjustTarget(id: string, direction: -1 | 1): void;
  commitTarget(id: string): Promise<void>;
  quickAction(id: string): Promise<void>;
  temperature(id?: string, role?: "current" | "target"): string;
  modeLabel(): string;
  optimisticTargets: Map<string, number>;
};

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  fridge = await import("../src/cards/auralis-fridge-card");
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", { setTimeout, clearTimeout });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.stubGlobal("HTMLElement", class {});
});

describe("Auralis fridge card", () => {
  it("prioritizes alerts, open doors and offline status without claiming unavailable data is healthy", () => {
    const hass: HomeAssistant = {
      states: {
        "binary_sensor.fridge_connected": state("binary_sensor.fridge_connected", "on"),
        "sensor.fridge_temperature": state("sensor.fridge_temperature", "4.1"),
        "binary_sensor.fridge_door": state("binary_sensor.fridge_door", "off"),
        "binary_sensor.fridge_alert": state("binary_sensor.fridge_alert", "off"),
      },
      callService: vi.fn(async () => undefined),
    };
    expect(fridge.fridgeHealth(hass, config)).toBe("ok");
    hass.states[config.door_entity!].state = "on";
    expect(fridge.fridgeHealth(hass, config)).toBe("open");
    hass.states[config.alert_entity!].state = "on";
    expect(fridge.fridgeHealth(hass, config)).toBe("alert");
    hass.states[config.alert_entity!].state = "off";
    hass.states[config.door_entity!].state = "off";
    hass.states[config.connected_entity!].state = "off";
    expect(fridge.fridgeHealth(hass, config)).toBe("offline");
    expect(fridge.fridgeHealth({ ...hass, states: {} }, config)).toBe("unknown");
    // status_entity est le nom commun ; connected_entity reste un alias.
    const aliased = { type: "custom:auralis-fridge-card" as const, status_entity: "binary_sensor.fridge_connected" };
    expect(fridge.fridgeHealth(hass, aliased)).toBe("offline");
    expect(fridge.normalizeFridgeConfig(aliased).connected_entity).toBe("binary_sensor.fridge_connected");
  });

  it("clamps temperature changes to the appliance range and ignores unavailable controls", async () => {
    const callService = vi.fn(async () => undefined);
    const hass: HomeAssistant = {
      states: {
        "number.fridge_target": state("number.fridge_target", "7", { min: 2, max: 7, step: 0.5 }),
        "switch.quick_cool": state("switch.quick_cool", "off"),
        "button.quick_freeze": state("button.quick_freeze", "unknown"),
        "lock.fridge": state("lock.fridge", "locked"),
      },
      callService,
    };
    const card = new fridge.AuralisFridgeCard();
    card.setConfig(config);
    card.hass = hass;
    const actions = card as unknown as Actions;
    actions.adjustTarget("number.fridge_target", 1);
    await vi.runAllTimersAsync();
    expect(callService).not.toHaveBeenCalled();
    actions.adjustTarget("number.fridge_target", -1);
    await vi.runAllTimersAsync();
    expect(callService).toHaveBeenCalledWith("number", "set_value", { value: 6.5 }, { entity_id: "number.fridge_target" });
    await actions.quickAction("switch.quick_cool");
    expect(callService).toHaveBeenCalledWith("switch", "toggle", {}, { entity_id: "switch.quick_cool" });
    // Un bouton jamais pressé est « unknown » mais reste utilisable.
    await actions.quickAction("button.quick_freeze");
    expect(callService).toHaveBeenCalledWith("button", "press", {}, { entity_id: "button.quick_freeze" });
    await actions.quickAction("lock.fridge");
    expect(callService).toHaveBeenCalledWith("lock", "unlock", {}, { entity_id: "lock.fridge" });
    hass.states["switch.quick_cool"].state = "unavailable";
    await actions.quickAction("switch.quick_cool");
    expect(callService).toHaveBeenCalledTimes(4);
  });

  it("merges fast taps into one command with an optimistic target", async () => {
    const callService = vi.fn(async () => undefined);
    const card = new fridge.AuralisFridgeCard();
    card.setConfig({ ...config, fridge_target_entity: "number.fridge_target" });
    card.hass = { states: { "number.fridge_target": state("number.fridge_target", "5", { min: 1, max: 8, step: 1 }) }, callService };
    const actions = card as unknown as Actions;
    actions.adjustTarget("number.fridge_target", -1);
    actions.adjustTarget("number.fridge_target", -1);
    actions.adjustTarget("number.fridge_target", -1);
    expect(actions.temperature("number.fridge_target", "target").replace(/\s/g, " ")).toBe("2 °C");
    expect(callService).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(fridge.TARGET_DEBOUNCE);
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith("number", "set_value", { value: 2 }, { entity_id: "number.fridge_target" });
  });

  it("drops the optimistic target when the command fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const callService = vi.fn(async () => { throw new Error("offline"); });
    const card = new fridge.AuralisFridgeCard();
    card.setConfig(config);
    card.hass = { states: { "number.fridge_target": state("number.fridge_target", "5", { step: 1 }) }, callService };
    const actions = card as unknown as Actions;
    actions.adjustTarget("number.fridge_target", 1);
    await actions.commitTarget("number.fridge_target");
    expect(actions.optimisticTargets.size).toBe(0);
    expect(actions.temperature("number.fridge_target", "target").replace(/\s/g, " ")).toBe("5 °C");
    vi.restoreAllMocks();
  });

  it("reads and adjusts a fridge exposed only as a climate entity", async () => {
    const callService = vi.fn(async () => undefined);
    const climate = state("climate.frigo", "cool", { current_temperature: 4.2, temperature: 4, target_temp_step: 1, min_temp: 1, max_temp: 7, preset_modes: ["eco", "boost"], preset_mode: "eco" });
    expect(fridge.fridgeTemperature(climate)).toBe(4.2);
    expect(fridge.fridgeTemperature(climate, "target")).toBe(4);
    expect(fridge.fridgeTemperature(state("sensor.t", "3,5"))).toBe(3.5);
    expect(fridge.fridgeTemperature(state("climate.x", "unavailable"))).toBeUndefined();
    expect(fridge.normalizeFridgeConfig({ type: "custom:auralis-fridge-card", climate_entity: "climate.frigo", fridge_temperature_entity: "sensor.sonde" })).toMatchObject({
      fridge_temperature_entity: "sensor.sonde", fridge_target_entity: "climate.frigo", mode_entity: "climate.frigo",
    });

    const card = new fridge.AuralisFridgeCard();
    card.setConfig({ type: "custom:auralis-fridge-card", climate_entity: "climate.frigo" });
    expect(card.config).toMatchObject({ fridge_temperature_entity: "climate.frigo", fridge_target_entity: "climate.frigo", theme: "auto" });
    card.hass = { states: { "climate.frigo": climate }, callService } as HomeAssistant;
    const actions = card as unknown as Actions;
    expect(actions.temperature("climate.frigo").replace(/\s/g, " ")).toBe("4,2 °C");
    expect(actions.temperature("climate.frigo", "target").replace(/\s/g, " ")).toBe("4 °C");
    expect(actions.modeLabel()).toBe("eco");
    actions.adjustTarget("climate.frigo", -1);
    await vi.runAllTimersAsync();
    expect(callService).toHaveBeenCalledWith("climate", "set_temperature", { temperature: 3 }, { entity_id: "climate.frigo" });
    expect(() => card.setConfig({ type: "custom:auralis-fridge-card", climate_entity: "sensor.frigo" })).toThrow();
  });

  it("treats a null climate temperature as missing instead of 0 °C", async () => {
    const callService = vi.fn(async () => undefined);
    const climate = state("climate.frigo", "cool", { current_temperature: null, temperature: null, min_temp: 1, max_temp: 7 });
    expect(fridge.fridgeTemperature(climate)).toBeUndefined();
    expect(fridge.fridgeTemperature(climate, "target")).toBeUndefined();
    expect(fridge.fridgeTemperature(state("climate.frigo", "cool", { current_temperature: "" }))).toBeUndefined();

    const card = new fridge.AuralisFridgeCard();
    card.setConfig({ type: "custom:auralis-fridge-card", climate_entity: "climate.frigo" });
    card.hass = { states: { "climate.frigo": climate }, callService } as HomeAssistant;
    const actions = card as unknown as Actions;
    expect(actions.temperature("climate.frigo")).toBe("—");
    actions.adjustTarget("climate.frigo", 1);
    await vi.runAllTimersAsync();
    expect(callService).not.toHaveBeenCalled();
  });

  it("colours temperatures above the configured thresholds", () => {
    expect(fridge.fridgeTemperatureLevel(4, undefined, fridge.FRIDGE_ALERT_ABOVE)).toBe("normal");
    expect(fridge.fridgeTemperatureLevel(9, undefined, fridge.FRIDGE_ALERT_ABOVE)).toBe("critical");
    expect(fridge.fridgeTemperatureLevel(9, 10, fridge.FRIDGE_ALERT_ABOVE)).toBe("normal");
    expect(fridge.fridgeTemperatureLevel(-18, undefined, fridge.FREEZER_ALERT_ABOVE)).toBe("normal");
    expect(fridge.fridgeTemperatureLevel(-8, undefined, fridge.FREEZER_ALERT_ABOVE)).toBe("critical");
    expect(fridge.fridgeTemperatureLevel(undefined, undefined, fridge.FREEZER_ALERT_ABOVE)).toBe("normal");
  });

  it("exposes icon, extra entities, background and thresholds in the visual editor, in French", () => {
    const form = fridge.AuralisFridgeCard.getConfigForm() as { schema: Array<{ name: string }>; computeLabel(schema: { name: string }): string };
    const fields = form.schema.map(({ name }) => name);
    expect(fields).toEqual(expect.arrayContaining(["icon", "extra_entities", "card_background", "status_entity", "fridge_alert_above", "freezer_alert_above"]));
    expect(form.computeLabel({ name: "door_entity" })).toBe("Porte du réfrigérateur");
  });
});
