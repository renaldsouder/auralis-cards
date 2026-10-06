import { describe, expect, it, vi } from "vitest";
import { informationValue } from "../src/utils/information";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";

const state = (value: string, attributes: HassEntity["attributes"] = {}): HassEntity => ({ entity_id: "sensor.value", state: value, attributes });
const fixture = (value: string, attributes: HassEntity["attributes"] = {}): HomeAssistant => ({
  states: { "sensor.value": state(value, attributes), "sensor.total": state("15.4001"), "binary_sensor.active": state("off") },
  callService: vi.fn(),
});

describe("configurable information values", () => {
  it("formats the JARVIS uptime and memory measurements without interpreting GiB as percent", () => {
    expect(informationValue(fixture("291.2725"), { entity: "sensor.value", format: "duration", duration_unit: "hours" })).toBe("12 j 3 h");
    expect(informationValue(fixture("11.3387"), { entity: "sensor.value", format: "ratio", total_entity: "sensor.total", unit: "Gio" })).toBe("11,3 / 15,4 Gio");
  });

  it("keeps zero valid and honours the duration source unit", () => {
    expect(informationValue(fixture("0"), { entity: "sensor.value", format: "duration" })).toBe("0 min");
    expect(informationValue(fixture("90", { unit_of_measurement: "min" }), { entity: "sensor.value", format: "duration" })).toBe("1 h 30 min");
    expect(informationValue(fixture("0"), { entity: "sensor.value", format: "ratio", total_entity: "sensor.total", unit: "Gio" })).toBe("0 / 15,4 Gio");
  });

  it("hides absent, invalid and unavailable sources and totals", () => {
    for (const value of ["unknown", "unavailable", "", "invalid", "-1"]) {
      expect(informationValue(fixture(value), { entity: "sensor.value", format: "duration" })).toBeUndefined();
    }
    expect(informationValue(fixture("23:30"), { entity: "sensor.value", format: "datetime" })).toBeUndefined();
    expect(informationValue(fixture("11.3"), { entity: "sensor.value", format: "ratio", total_entity: "sensor.missing" })).toBeUndefined();
    const hass = fixture("11.3");
    hass.states["sensor.total"] = state("0");
    expect(informationValue(hass, { entity: "sensor.value", format: "ratio", total_entity: "sensor.total" })).toBeUndefined();
  });

  it("switches from a backup date to a configured active message and back", () => {
    const hass = fixture("2026-10-06T10:30:00Z");
    const item = { entity: "sensor.value", format: "datetime" as const, active_entity: "binary_sensor.active", active_state: "on", active_text: "Sauvegarde en cours" };
    const date = informationValue(hass, item);
    expect(date).toMatch(/06\/10\/26/);
    hass.states["binary_sensor.active"] = state("on");
    expect(informationValue(hass, item)).toBe("Sauvegarde en cours");
    hass.states["sensor.value"] = state("unknown");
    expect(informationValue(hass, item)).toBe("Sauvegarde en cours");
    hass.states["binary_sensor.active"] = state("unavailable");
    expect(informationValue(hass, item)).toBeUndefined();
  });

  it("supports arbitrary entities, attribute values, labels and numeric precision", () => {
    const hass = fixture("ready", { temperature: 42.125, capacity: 64 });
    expect(informationValue(hass, { entity: "sensor.value" })).toBe("ready");
    expect(informationValue(hass, { entity: "sensor.value", attribute: "temperature", unit: "°C", precision: 2 })).toBe("42,13 °C");
    expect(informationValue(hass, { entity: "sensor.value", attribute: "missing" })).toBeUndefined();
    expect(informationValue(hass, { entity: "sensor.value", attribute: "temperature", format: "ratio", total_entity: "sensor.value", total_attribute: "capacity", unit: "Gio" })).toBe("42,1 / 64 Gio");
  });
});
