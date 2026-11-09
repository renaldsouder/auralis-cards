import { describe, expect, it, vi } from "vitest";
import type { HomeAssistant } from "../src/types/home-assistant";
import { activateEntity, coverCommand } from "../src/utils/actions";

const hassWithCallService = () => {
  const callService = vi.fn(async () => undefined);
  const hass: HomeAssistant = { states: {}, callService };
  return { hass, callService };
};

describe("entity actions", () => {
  it("activates a scene with the dedicated Home Assistant service", async () => {
    const { hass, callService } = hassWithCallService();

    await activateEntity(hass, "scene.soiree_salon");

    expect(callService).toHaveBeenCalledWith(
      "scene",
      "turn_on",
      {},
      { entity_id: "scene.soiree_salon" },
    );
  });

  it("sends every Stop press and excludes covers without Stop support", async () => {
    const { hass, callService } = hassWithCallService();
    hass.states = {
      "cover.supported": { entity_id: "cover.supported", state: "opening", attributes: { supported_features: 11 } },
      "cover.unsupported": { entity_id: "cover.unsupported", state: "opening", attributes: { supported_features: 3 } },
    };

    await coverCommand(hass, ["cover.supported", "cover.unsupported"], "stop");
    await coverCommand(hass, ["cover.supported", "cover.unsupported"], "stop");
    expect(callService).toHaveBeenCalledTimes(2);
    expect(callService).toHaveBeenNthCalledWith(1, "cover", "stop_cover", {}, { entity_id: ["cover.supported"] });
    expect(callService).toHaveBeenNthCalledWith(2, "cover", "stop_cover", {}, { entity_id: ["cover.supported"] });

    await coverCommand(hass, ["cover.unsupported"], "stop");
    expect(callService).toHaveBeenCalledTimes(2);
  });
});
