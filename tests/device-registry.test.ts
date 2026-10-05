import { describe, expect, it, vi } from "vitest";
import type { HomeAssistant } from "../src/types/home-assistant";
import { deviceEntityIds, siblingEntityIds } from "../src/utils/device-registry";

const registry = [
  { entity_id: "sensor.mqtt_temperature", device_id: "mqtt-device-1" },
  { entity_id: "switch.mqtt_relay", device_id: "mqtt-device-1" },
  { entity_id: "sensor.mqtt_diagnostic", device_id: "mqtt-device-1", disabled_by: "integration" },
  { entity_id: "sensor.other", device_id: "mqtt-device-2" },
  { entity_id: "sensor.orphan", device_id: null },
];

function homeAssistant(): HomeAssistant {
  return {
    states: {},
    callService: async () => undefined,
    callWS: vi.fn(async () => registry) as unknown as NonNullable<HomeAssistant["callWS"]>,
  };
}

describe("Home Assistant device registry", () => {
  it("returns every entity attached to a device in a deterministic order", async () => {
    const hass = homeAssistant();

    await expect(deviceEntityIds(hass, "mqtt-device-1")).resolves.toEqual([
      "sensor.mqtt_diagnostic",
      "sensor.mqtt_temperature",
      "switch.mqtt_relay",
    ]);
    expect(hass.callWS).toHaveBeenCalledWith({ type: "config/entity_registry/list" });
  });

  it("resolves sibling entities from a known entity without a second registry request", async () => {
    const hass = homeAssistant();

    await expect(siblingEntityIds(hass, "switch.mqtt_relay")).resolves.toEqual([
      "sensor.mqtt_diagnostic",
      "sensor.mqtt_temperature",
      "switch.mqtt_relay",
    ]);
    expect(hass.callWS).toHaveBeenCalledTimes(1);
  });

  it("returns an empty list for missing identifiers or entities without a device", async () => {
    const hass = homeAssistant();

    await expect(deviceEntityIds(hass, " ")).resolves.toEqual([]);
    await expect(siblingEntityIds(hass, "sensor.orphan")).resolves.toEqual([]);
    expect(hass.callWS).toHaveBeenCalledTimes(1);
  });

  it("reports clearly when the WebSocket API is unavailable", async () => {
    const hass: HomeAssistant = { states: {}, callService: async () => undefined };

    await expect(deviceEntityIds(hass, "mqtt-device-1")).rejects.toThrow(
      "L'API WebSocket Home Assistant n'est pas disponible.",
    );
  });
});
