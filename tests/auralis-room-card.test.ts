import { beforeAll, describe, expect, it, vi } from "vitest";
import type { RoomCardConfig, RoomOverlayPosition, RoomSceneConfig } from "../src/types/config";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";

type RoomCardModule = typeof import("../src/cards/auralis-room-card");

let roomCard: RoomCardModule;

const state = (entityId: string, value: string): HassEntity => ({
  entity_id: entityId,
  state: value,
  attributes: {},
});

const config = (overrides: Partial<RoomCardConfig> = {}): RoomCardConfig => ({
  type: "custom:auralis-room-card",
  temperature_entity: "sensor.salon_temperature",
  ...overrides,
});

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  roomCard = await import("../src/cards/auralis-room-card");
});

describe("Auralis room ambiance", () => {
  it("uses one shared button position for every configured scene", () => {
    const card = new roomCard.AuralisRoomCard();
    card.setConfig(config({
      ambiance: { position: "top-left" },
      scenes: [
        { entity: "scene.soiree", label: "Mode soirée" },
        { entity: "scene.normal", label: "Mode normal" },
      ],
    }));

    const internals = card as unknown as {
      sceneModes(): RoomSceneConfig[];
      ambiancePosition(modes: RoomSceneConfig[]): RoomOverlayPosition;
    };
    const modes = internals.sceneModes();

    expect(modes).toHaveLength(2);
    expect(internals.ambiancePosition(modes)).toBe("top-left");
  });

  it("keeps the legacy scene entity as a single popup option", () => {
    const card = new roomCard.AuralisRoomCard();
    card.setConfig(config({ scene_entity: "scene.soiree_salon" }));

    const internals = card as unknown as { sceneModes(): RoomSceneConfig[] };
    expect(internals.sceneModes()).toEqual([{
      entity: "scene.soiree_salon",
      label: "Mode soirée",
      icon: "mdi:creation-outline",
      position: "bottom-right",
    }]);
  });

  it("activates the selected scene and closes the popup", async () => {
    const callService = vi.fn(async () => undefined);
    const hass: HomeAssistant = {
      states: { "scene.soiree": state("scene.soiree", "unknown") },
      callService,
    };
    const card = new roomCard.AuralisRoomCard();
    card.setConfig(config({ scenes: [{ entity: "scene.soiree", label: "Mode soirée" }] }));
    card.hass = hass;

    const internals = card as unknown as {
      dialog: string | null;
      activateSceneMode(mode: RoomSceneConfig): void;
    };
    internals.dialog = "ambiance";
    internals.activateSceneMode({ entity: "scene.soiree", label: "Mode soirée" });
    await Promise.resolve();

    expect(callService).toHaveBeenCalledWith("scene", "turn_on", {}, { entity_id: "scene.soiree" });
    expect(internals.dialog).toBeNull();
  });
});

describe("Auralis room background", () => {
  it("supports solid and gradient backgrounds without CSS declaration injection", () => {
    const card = new roomCard.AuralisRoomCard();
    const internals = card as unknown as {
      roomCardBackground(): { mode: RoomOverlayPosition | "grid" | "solid" | "gradient"; showGrid: boolean; style: string };
    };

    card.setConfig(config({ card_background: { mode: "solid", color: "#0D151D" } }));
    expect(internals.roomCardBackground()).toEqual({
      mode: "solid",
      showGrid: false,
      style: "--room-card-background:#0D151D",
    });

    card.setConfig(config({
      card_background: {
        mode: "gradient",
        gradient: "linear-gradient(135deg, #0D151D, #183044)",
      },
    }));
    expect(internals.roomCardBackground()).toEqual({
      mode: "gradient",
      showGrid: false,
      style: "--room-card-background:linear-gradient(135deg, #0D151D, #183044)",
    });

    card.setConfig(config({ card_background: { mode: "solid", color: "red;background:white" } }));
    expect(internals.roomCardBackground()).toEqual({ mode: "solid", showGrid: false, style: "" });
  });
});
