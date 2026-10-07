import { beforeAll, describe, expect, it, vi } from "vitest";
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

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  fridge = await import("../src/cards/auralis-fridge-card");
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
  });

  it("clamps temperature changes to the appliance range and ignores unavailable controls", async () => {
    const callService = vi.fn(async () => undefined);
    const hass: HomeAssistant = {
      states: {
        "number.fridge_target": state("number.fridge_target", "7", { min: 2, max: 7, step: 0.5 }),
        "switch.quick_cool": state("switch.quick_cool", "off"),
        "lock.fridge": state("lock.fridge", "locked"),
      },
      callService,
    };
    const card = new fridge.AuralisFridgeCard();
    card.setConfig(config);
    card.hass = hass;
    const actions = card as unknown as { adjustTarget(id: string, direction: -1 | 1): Promise<void>; quickAction(id: string): Promise<void> };
    await actions.adjustTarget("number.fridge_target", 1);
    expect(callService).not.toHaveBeenCalled();
    await actions.adjustTarget("number.fridge_target", -1);
    expect(callService).toHaveBeenCalledWith("number", "set_value", { value: 6.5 }, { entity_id: "number.fridge_target" });
    await actions.quickAction("switch.quick_cool");
    expect(callService).toHaveBeenCalledWith("switch", "toggle", {}, { entity_id: "switch.quick_cool" });
    await actions.quickAction("lock.fridge");
    expect(callService).toHaveBeenCalledWith("lock", "unlock", {}, { entity_id: "lock.fridge" });
    hass.states["switch.quick_cool"].state = "unavailable";
    await actions.quickAction("switch.quick_cool");
    expect(callService).toHaveBeenCalledTimes(3);
  });
});
