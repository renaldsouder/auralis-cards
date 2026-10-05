import { describe, expect, it, vi } from "vitest";
import type { HomeAssistant } from "../src/types/home-assistant";
import { activateEntity } from "../src/utils/actions";

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
});
