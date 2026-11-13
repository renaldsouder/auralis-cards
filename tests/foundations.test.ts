import { describe, expect, it } from "vitest";
import { collectEntityIds, hassChangeMatters } from "../src/utils/watch";
import { alertLevel, severity, severityClass } from "../src/utils/severity";
import { isAvailable, isCommandable } from "../src/utils/entities";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";

const state = (entity_id: string, value: string): HassEntity => ({ entity_id, state: value, attributes: {} });
const hass = (states: Record<string, HassEntity>, extra: Partial<HomeAssistant> = {}): HomeAssistant => ({
  states,
  callService: async () => undefined,
  ...extra,
});

describe("entities a card watches", () => {
  it("finds entity ids in values, nested lists and object keys", () => {
    const ids = collectEntityIds({
      type: "custom:auralis-room-card",
      name: "Salon",
      icon: "mdi:sofa",
      background_image: "/local/auralis/salon.jpg",
      lights: ["light.plafond", " light.lampe "],
      players: [{ entity: "media_player.ampli", sources: ["tv"] }],
      entity_labels: { "cover.baie": "Baie" },
      groups: [{ switches: ["group:1"] }],
    });
    expect([...ids].sort()).toEqual(["cover.baie", "light.lampe", "light.plafond", "media_player.ampli"]);
  });

  it("ignores changes of entities the card does not show", () => {
    const light = state("light.salon", "on");
    const before = hass({ "light.salon": light, "sensor.other": state("sensor.other", "1") });
    const after = hass({ "light.salon": light, "sensor.other": state("sensor.other", "2") });
    expect(hassChangeMatters(before, after, ["light.salon"])).toBe(false);
    expect(hassChangeMatters(before, after, ["sensor.other"])).toBe(true);
  });

  it("redraws when a watched entity disappears or a global setting changes", () => {
    const light = state("light.salon", "on");
    expect(hassChangeMatters(hass({ "light.salon": light }), hass({}), ["light.salon"])).toBe(true);
    const states = { "light.salon": light };
    expect(hassChangeMatters(hass(states, { themes: { darkMode: false } }), hass(states, { themes: { darkMode: true } }), [])).toBe(true);
    expect(hassChangeMatters(undefined, hass(states), [])).toBe(true);
  });
});

describe("commandable entities", () => {
  it("accepts never-pressed buttons and covers without position, not unavailable ones", () => {
    expect(isCommandable(state("button.reboot", "unknown"))).toBe(true);
    expect(isAvailable(state("button.reboot", "unknown"))).toBe(false);
    expect(isCommandable(state("cover.baie", "unavailable"))).toBe(false);
    expect(isCommandable(undefined)).toBe(false);
  });
});

describe("alert levels", () => {
  it("colours a value above its warning then critical level", () => {
    const disk = alertLevel(undefined, "disk");
    expect(severity(50, disk)).toBe("normal");
    expect(severity(85, disk)).toBe("warning");
    expect(severity(97, disk)).toBe("critical");
    expect(severityClass(severity(97, disk))).toBe("sev-critical");
    expect(severityClass("normal")).toBe("");
  });

  it("uses configured levels, falling back per field, and supports falling values", () => {
    const cpu = alertLevel({ cpu: { warning: 60 } }, "cpu");
    expect(cpu).toEqual({ warning: 60, critical: 95 });
    expect(severity(15, { warning: 30, critical: 10 }, "below")).toBe("warning");
    expect(severity(5, { warning: 30, critical: 10 }, "below")).toBe("critical");
    expect(severity(undefined, cpu)).toBe("normal");
  });
});
