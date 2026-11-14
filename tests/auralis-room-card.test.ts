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

describe("Auralis room photo", () => {
  it("lists every entity of the card once in the overview window", () => {
    const card = new roomCard.AuralisRoomCard();
    card.setConfig(config({
      humidity_entity: "sensor.salon_humidity",
      climate_entity: "climate.salon",
      media_player_entity: "media_player.salon",
      lights: ["light.plafond", "light.ruban"],
      covers: ["cover.baie"],
      right_controls: [
        { type: "media", entity: "media_player.salon" },
        { type: "entity", entity: "switch.enceintes", action: "toggle" },
      ],
    }));
    expect(card.roomEntities()).toEqual([
      "light.plafond", "light.ruban", "cover.baie", "climate.salon", "sensor.salon_temperature",
      "sensor.salon_humidity", "media_player.salon", "switch.enceintes",
    ]);
  });

  it("puts the settings hint in the first corner left free by the thermostat and the ambiance button", () => {
    const card = new roomCard.AuralisRoomCard();
    const internals = card as unknown as {
      occupiedCorners(modes: RoomSceneConfig[]): Set<RoomOverlayPosition>;
      sceneModes(): RoomSceneConfig[];
    };
    card.setConfig(config({
      climate_entity: "climate.salon",
      thermostat: { show: true, position: "bottom-left" },
      ambiance: { position: "top-right" },
      scenes: [{ entity: "scene.soiree" }],
    }));
    expect([...internals.occupiedCorners(internals.sceneModes())].sort()).toEqual(["bottom-left", "top-right"]);
  });
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

describe("Auralis room from a Home Assistant area", () => {
  const areaHass = (): HomeAssistant & Record<string, unknown> => ({
    states: {
      "light.plafonnier": state("light.plafonnier", "on"),
      "cover.baie": state("cover.baie", "open"),
      "sensor.salon_t": { ...state("sensor.salon_t", "21"), attributes: { device_class: "temperature" } },
      "sensor.salon_h": { ...state("sensor.salon_h", "50"), attributes: { device_class: "humidity" } },
      "media_player.enceinte": state("media_player.enceinte", "idle"),
      "media_player.tv": { ...state("media_player.tv", "off"), attributes: { device_class: "tv" } },
      "sensor.cave_t": { ...state("sensor.cave_t", "12"), attributes: { device_class: "temperature" } },
    },
    callService: vi.fn(),
    areas: {
      salon: { area_id: "salon", name: "Salon" },
      cave: { area_id: "cave", name: "Cave" },
      garage: { area_id: "garage", name: "Garage" },
    },
    devices: { capteur: { id: "capteur", area_id: "salon" } },
    entities: {
      "light.plafonnier": { entity_id: "light.plafonnier", area_id: "salon" },
      "cover.baie": { entity_id: "cover.baie", area_id: "salon" },
      "sensor.salon_t": { entity_id: "sensor.salon_t", device_id: "capteur" },
      "sensor.salon_h": { entity_id: "sensor.salon_h", device_id: "capteur" },
      "media_player.enceinte": { entity_id: "media_player.enceinte", area_id: "salon" },
      "media_player.tv": { entity_id: "media_player.tv", area_id: "salon" },
      "sensor.cave_t": { entity_id: "sensor.cave_t", area_id: "cave", entity_category: "diagnostic" },
    },
  });

  type AreaInternals = {
    room: RoomCardConfig;
    areaProblem(): string | undefined;
    watchedEntityIds(): Set<string>;
    sideControls(side: "left" | "right"): Array<{ type: string; entity?: string }>;
  };

  it("accepts a configuration with only an area and fills every field from it", () => {
    const card = new roomCard.AuralisRoomCard();
    expect(() => card.setConfig({ type: "custom:auralis-room-card", area: "SALON" })).not.toThrow();
    card.hass = areaHass();
    const internals = card as unknown as AreaInternals;
    expect(internals.areaProblem()).toBeUndefined();
    expect(internals.room).toMatchObject({
      name: "Salon",
      lights: ["light.plafonnier"],
      covers: ["cover.baie"],
      temperature_entity: "sensor.salon_t",
      humidity_entity: "sensor.salon_h",
      media_player_entity: "media_player.enceinte",
      right_controls: [{ type: "media", entity: "media_player.enceinte" }, { type: "tv", entity: "media_player.tv" }],
    });
    expect(internals.sideControls("left")).toEqual([{ type: "lights" }]);
    // Les entités de la zone sont suivies, bien qu'absentes de la configuration.
    expect([...internals.watchedEntityIds()]).toEqual(expect.arrayContaining(["light.plafonnier", "cover.baie", "sensor.salon_t", "media_player.tv"]));
    expect(internals.watchedEntityIds()).toBe(internals.watchedEntityIds());
  });

  it("lets the explicit configuration win and honours exclusions", () => {
    const card = new roomCard.AuralisRoomCard();
    card.setConfig({
      type: "custom:auralis-room-card",
      area: "salon",
      name: "Séjour",
      lights: ["light.lampe_perso"],
      temperature_entity: "sensor.autre_t",
      right_controls: [],
      area_exclude: ["cover.*", "media_player.enceinte"],
    });
    card.hass = areaHass();
    const room = (card as unknown as AreaInternals).room;
    expect(room).toMatchObject({
      name: "Séjour",
      lights: ["light.lampe_perso"],
      covers: [],
      temperature_entity: "sensor.autre_t",
      humidity_entity: "sensor.salon_h",
      right_controls: [],
    });
    expect(room.media_player_entity).toBeUndefined();
  });

  it("recomputes the watched entities when the registries change", () => {
    const card = new roomCard.AuralisRoomCard();
    card.setConfig({ type: "custom:auralis-room-card", area: "salon" });
    const hass = areaHass();
    card.hass = hass;
    const internals = card as unknown as AreaInternals;
    const before = internals.watchedEntityIds();
    expect(before.has("light.couloir")).toBe(false);
    card.hass = <HomeAssistant>{
      ...hass,
      states: { ...hass.states, "light.couloir": state("light.couloir", "off") },
      entities: { ...(hass.entities as object), "light.couloir": { entity_id: "light.couloir", area_id: "salon" } },
    };
    expect(internals.watchedEntityIds().has("light.couloir")).toBe(true);
    // Un registre remplacé redessine la carte ; un état hors de la zone, non.
    const shouldUpdate = (previous: HomeAssistant) =>
      (card as unknown as { shouldUpdate(changed: Map<string, unknown>): boolean }).shouldUpdate(new Map([["hass", previous]]));
    expect(shouldUpdate(hass)).toBe(true);
    const current = card.hass!;
    card.hass = { ...current, states: { ...current.states, "sensor.ailleurs": state("sensor.ailleurs", "1") } };
    expect(shouldUpdate(current)).toBe(false);
    card.hass = { ...current, states: { ...current.states, "light.couloir": state("light.couloir", "on") } };
    expect(shouldUpdate(current)).toBe(true);
  });

  it("explains an unknown or empty area in French", () => {
    const card = new roomCard.AuralisRoomCard();
    const internals = card as unknown as AreaInternals;
    card.setConfig({ type: "custom:auralis-room-card", area: "xyz" });
    card.hass = areaHass();
    expect(internals.areaProblem()).toBe("Zone « xyz » introuvable.");
    card.setConfig({ type: "custom:auralis-room-card", area: "garage" });
    expect(internals.areaProblem()).toBe("La zone « Garage » ne contient ni lumière, ni volet, ni capteur, ni thermostat, ni lecteur.");
    // Un capteur de diagnostic ne suffit pas à rendre la zone utilisable.
    card.setConfig({ type: "custom:auralis-room-card", area: "Cave" });
    expect(internals.areaProblem()).toBe("La zone « Cave » ne contient ni lumière, ni volet, ni capteur, ni thermostat, ni lecteur.");
    expect(() => card.setConfig({ type: "custom:auralis-room-card", area: "  " })).toThrow();
  });

  it("accepts an area that only holds a thermostat, a player or a television", () => {
    const base = areaHass();
    const only = (entityId: string, attributes: Record<string, unknown> = {}): HomeAssistant => <HomeAssistant>{
      ...base,
      states: { ...base.states, [entityId]: { ...state(entityId, "idle"), attributes } },
      entities: { ...(base.entities as object), [entityId]: { entity_id: entityId, area_id: "garage" } },
    };
    const card = new roomCard.AuralisRoomCard();
    const internals = card as unknown as AreaInternals;
    card.setConfig({ type: "custom:auralis-room-card", area: "garage" });

    card.hass = only("climate.garage");
    expect(internals.areaProblem()).toBeUndefined();
    expect(internals.room.climate_entity).toBe("climate.garage");

    card.hass = only("media_player.radio");
    expect(internals.areaProblem()).toBeUndefined();
    expect(internals.sideControls("right")).toEqual([{ type: "media", entity: "media_player.radio" }]);

    card.hass = only("media_player.ecran", { device_class: "tv" });
    expect(internals.areaProblem()).toBeUndefined();
    expect(internals.sideControls("right")).toEqual([{ type: "tv", entity: "media_player.ecran" }]);

    // Une télévision écartée par `right_controls: []` ne laisse rien à afficher.
    card.setConfig({ type: "custom:auralis-room-card", area: "garage", right_controls: [] });
    expect(internals.areaProblem()).toBe("La zone « Garage » ne contient ni lumière, ni volet, ni capteur, ni thermostat, ni lecteur.");
  });

  it("proposes an area in the stub and the editor", () => {
    expect(roomCard.AuralisRoomCard.getStubConfig(areaHass())).toEqual({ area: "salon" });
    const form = roomCard.AuralisRoomCard.getConfigForm() as {
      schema: Array<{ name: string; selector: Record<string, unknown> }>;
      computeLabel(field: { name: string }): string;
    };
    expect(form.schema.find(({ name }) => name === "area")?.selector).toEqual({ area: {} });
    expect(form.computeLabel({ name: "area_exclude" })).toMatch(/ignorer/);
  });
});
