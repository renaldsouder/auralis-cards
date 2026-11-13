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
      activateSceneMode(mode: RoomSceneConfig): Promise<boolean>;
    };
    internals.dialog = "ambiance";
    await internals.activateSceneMode({ entity: "scene.soiree", label: "Mode soirée" });

    expect(callService).toHaveBeenCalledWith("scene", "turn_on", {}, { entity_id: "scene.soiree" });
    expect(internals.dialog).toBeNull();
  });

  it("keeps the popup open and reports the error when the scene fails", async () => {
    vi.stubGlobal("window", globalThis);
    const callService = vi.fn(async () => { throw new Error("scène introuvable"); });
    const card = new roomCard.AuralisRoomCard();
    card.setConfig(config({ scenes: [{ entity: "scene.soiree" }] }));
    card.hass = { states: { "scene.soiree": state("scene.soiree", "unknown") }, callService };
    const internals = card as unknown as {
      dialog: string | null;
      feedback?: { tone: string; message: string };
      activateSceneMode(mode: RoomSceneConfig): Promise<boolean>;
    };
    internals.dialog = "ambiance";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await internals.activateSceneMode({ entity: "scene.soiree" })).toBe(false);
    expect(internals.dialog).toBe("ambiance");
    expect(internals.feedback?.message).toContain("scène introuvable");
    vi.unstubAllGlobals();
    vi.stubGlobal("HTMLElement", class {});
  });
});

describe("Auralis room stub and controls", () => {
  it("builds a valid stub from real entities, with a safe fallback", () => {
    const states = {
      "light.plafond": state("light.plafond", "off"),
      "cover.baie": state("cover.baie", "closed"),
      "sensor.salon_t": { ...state("sensor.salon_t", "21"), attributes: { device_class: "temperature" } },
    };
    const stub = roomCard.AuralisRoomCard.getStubConfig({ states, callService: vi.fn() });
    expect(stub).toMatchObject({ lights: ["light.plafond"], covers: ["cover.baie"], temperature_entity: "sensor.salon_t" });
    const empty = roomCard.AuralisRoomCard.getStubConfig({ states: {}, callService: vi.fn() });
    const card = new roomCard.AuralisRoomCard();
    expect(() => card.setConfig({ type: "custom:auralis-room-card", ...stub })).not.toThrow();
    expect(() => card.setConfig({ type: "custom:auralis-room-card", ...empty })).not.toThrow();
  });

  it("sends the general brightness once, to the lights that are on and dimmable", async () => {
    const callService = vi.fn(async () => undefined);
    const card = new roomCard.AuralisRoomCard();
    card.setConfig(config({ lights: ["light.on", "light.off", "light.onoff", "light.lost", "switch.lamp"] }));
    card.hass = {
      states: {
        "light.on": { ...state("light.on", "on"), attributes: { brightness: 120, supported_color_modes: ["brightness"] } },
        "light.off": { ...state("light.off", "off"), attributes: { supported_color_modes: ["brightness"] } },
        "light.onoff": { ...state("light.onoff", "on"), attributes: { supported_color_modes: ["onoff"] } },
        "light.lost": { ...state("light.lost", "unavailable"), attributes: { supported_color_modes: ["brightness"] } },
        "switch.lamp": state("switch.lamp", "on"),
      },
      callService,
    };
    const internals = card as unknown as {
      setGlobalBrightness(value: number): Promise<boolean>;
      toggleLight(id: string, on: boolean): Promise<boolean>;
    };
    await internals.setGlobalBrightness(40);
    expect(callService).toHaveBeenLastCalledWith("light", "turn_on", { brightness_pct: 40 }, { entity_id: ["light.on"] });
    card.hass.states["light.on"] = { ...state("light.on", "off"), attributes: { supported_color_modes: ["brightness"] } };
    await internals.setGlobalBrightness(60);
    expect(callService).toHaveBeenLastCalledWith("light", "turn_on", { brightness_pct: 60 }, { entity_id: ["light.on", "light.off"] });
    expect(callService).toHaveBeenCalledTimes(2);
    await internals.toggleLight("switch.lamp", false);
    expect(callService).toHaveBeenLastCalledWith("switch", "turn_off", {}, { entity_id: "switch.lamp" });
  });

  it("never shows the current temperature as the thermostat setpoint", () => {
    const card = new roomCard.AuralisRoomCard();
    card.setConfig(config({ climate_entity: "climate.salon" }));
    card.hass = {
      states: { "climate.salon": { ...state("climate.salon", "heat"), attributes: { current_temperature: 19 } } },
      callService: vi.fn(),
    };
    const internals = card as unknown as { thermostatTarget(): number | undefined; adjustThermostat(direction: -1 | 1): boolean };
    expect(internals.thermostatTarget()).toBeUndefined();
    expect(internals.adjustThermostat(1)).toBe(false);
  });

  it("caps long climate periods by switching to long-term statistics", () => {
    expect(roomCard.climateGraphConfig("sensor.t", "Température", 24)).toMatchObject({ type: "history-graph", hours_to_show: 24 });
    expect(roomCard.climateGraphConfig("sensor.t", "Température", 240)).toMatchObject({ type: "history-graph", hours_to_show: 240 });
    expect(roomCard.climateGraphConfig("sensor.t", "Température", 30 * 24)).toMatchObject({ type: "statistics-graph", days_to_show: 30, period: "hour" });
    expect(roomCard.climateGraphConfig("sensor.t", "Température", 43_800)).toMatchObject({ type: "statistics-graph", days_to_show: 1825, period: "day" });
  });

  it("describes the media player state without calling every stop a pause", () => {
    expect(roomCard.mediaStatusLabel({ entity_id: "media_player.a", state: "paused", attributes: {} })).toBe("en pause");
    expect(roomCard.mediaStatusLabel({ entity_id: "media_player.a", state: "idle", attributes: {} })).toBe("inactif");
    expect(roomCard.mediaStatusLabel({ entity_id: "media_player.a", state: "off", attributes: {} })).toBe("éteint");
    expect(roomCard.mediaStatusLabel(undefined)).toBe("indisponible");
  });
});

describe("Auralis room background", () => {
  it("lets Sections size the room card from its actual content height", () => {
    const card = new roomCard.AuralisRoomCard();
    expect(card.getGridOptions()).toEqual({ columns: 12, min_columns: 6 });
  });

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
