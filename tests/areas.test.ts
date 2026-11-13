import { describe, expect, it, vi } from "vitest";
import type { HassEntity } from "../src/types/home-assistant";
import {
  findArea,
  globToRegExp,
  resolveAreaEntities,
  suggestArea,
  type AreaEntityEntry,
  type HomeAssistantWithRegistries,
  type ResolvedArea,
} from "../src/utils/areas";

const state = (entity_id: string, attributes: Record<string, unknown> = {}, value = "on"): HassEntity => ({ entity_id, state: value, attributes });

/** Maison de test : un salon (entités rattachées directement ou par leur appareil) et une cuisine. */
function house(overrides: { entities?: Record<string, AreaEntityEntry>; states?: Record<string, HassEntity> } = {}): HomeAssistantWithRegistries {
  const states: Record<string, HassEntity> = {
    "light.plafonnier": state("light.plafonnier", { friendly_name: "Plafonnier" }),
    "light.lampadaire": state("light.lampadaire", { friendly_name: "Lampadaire" }),
    "light.cuisine": state("light.cuisine"),
    "switch.guirlande": state("switch.guirlande"),
    "switch.prise_tv": state("switch.prise_tv", { device_class: "outlet" }),
    "cover.baie": state("cover.baie", { friendly_name: "Baie vitrée" }, "open"),
    "cover.garage": state("cover.garage", { device_class: "garage" }, "closed"),
    "sensor.batterie_temperature": state("sensor.batterie_temperature", { device_class: "temperature", friendly_name: "Batterie température" }, "30"),
    "sensor.salon_temperature": state("sensor.salon_temperature", { device_class: "temperature" }, "21"),
    "sensor.salon_humidite": state("sensor.salon_humidite", { device_class: "humidity" }, "48"),
    "sensor.salon_diag": state("sensor.salon_diag", { device_class: "humidity" }, "50"),
    "climate.salon": state("climate.salon", {}, "heat"),
    "media_player.tv": state("media_player.tv", { device_class: "tv" }, "off"),
    "media_player.enceinte": state("media_player.enceinte", { device_class: "speaker" }, "idle"),
    ...overrides.states,
  };
  return {
    states,
    callService: vi.fn(),
    areas: {
      salon: { area_id: "salon", name: "Salon" },
      cuisine: { area_id: "cuisine", name: "Cuisine" },
      bureau: { area_id: "bureau", name: "Bureau" },
    },
    devices: {
      capteur: { id: "capteur", area_id: "salon" },
      lampe: { id: "lampe", area_id: "cuisine" },
    },
    entities: {
      "light.plafonnier": { entity_id: "light.plafonnier", area_id: "salon" },
      // Rattachée au salon directement, même si son appareil est en cuisine.
      "light.lampadaire": { entity_id: "light.lampadaire", area_id: "salon", device_id: "lampe" },
      "light.cuisine": { entity_id: "light.cuisine", device_id: "lampe" },
      "switch.guirlande": { entity_id: "switch.guirlande", area_id: "salon" },
      "switch.prise_tv": { entity_id: "switch.prise_tv", area_id: "salon" },
      "cover.baie": { entity_id: "cover.baie", area_id: "salon" },
      "cover.garage": { entity_id: "cover.garage", area_id: "salon" },
      "sensor.batterie_temperature": { entity_id: "sensor.batterie_temperature", device_id: "capteur" },
      "sensor.salon_temperature": { entity_id: "sensor.salon_temperature", device_id: "capteur" },
      "sensor.salon_humidite": { entity_id: "sensor.salon_humidite", device_id: "capteur", area_id: null },
      "sensor.salon_diag": { entity_id: "sensor.salon_diag", device_id: "capteur", entity_category: "diagnostic" },
      "climate.salon": { entity_id: "climate.salon", area_id: "salon" },
      "media_player.tv": { entity_id: "media_player.tv", area_id: "salon" },
      "media_player.enceinte": { entity_id: "media_player.enceinte", area_id: "salon" },
      ...overrides.entities,
    },
  };
}

const resolved = (result: ReturnType<typeof resolveAreaEntities>): ResolvedArea => {
  expect(result.status).toBe("ok");
  return result as ResolvedArea;
};

describe("Auralis areas", () => {
  it("finds an area by id or by name, whatever the case", () => {
    const { areas } = house();
    expect(findArea(areas, "salon")?.area_id).toBe("salon");
    expect(findArea(areas, " SALON ")?.area_id).toBe("salon");
    expect(findArea(areas, "Cuisine")?.area_id).toBe("cuisine");
    expect(findArea(areas, "garage")).toBeUndefined();
  });

  it("collects entities through their own area and through their device", () => {
    const area = resolved(resolveAreaEntities(house(), "Salon"));
    expect(area).toMatchObject({
      areaId: "salon",
      name: "Salon",
      // Triées par nom ; la lampe de la cuisine reste en cuisine.
      lights: ["light.lampadaire", "light.plafonnier"],
      covers: ["cover.baie"],
      temperature: "sensor.salon_temperature",
      humidity: "sensor.salon_humidite",
      climate: "climate.salon",
      media: "media_player.enceinte",
      tv: "media_player.tv",
    });
    expect(resolved(resolveAreaEntities(house(), "cuisine")).lights).toEqual(["light.cuisine"]);
    expect(area.entities).toEqual(expect.arrayContaining(["light.plafonnier", "sensor.salon_temperature", "media_player.tv"]));
  });

  it("keeps a battery temperature only when nothing else measures the room", () => {
    const hass = house({ entities: { "sensor.salon_temperature": { entity_id: "sensor.salon_temperature", hidden: true } } });
    expect(resolved(resolveAreaEntities(hass, "salon")).temperature).toBe("sensor.batterie_temperature");
  });

  it("skips hidden, disabled, configuration and diagnostic entities", () => {
    const hass = house({
      entities: {
        "light.plafonnier": { entity_id: "light.plafonnier", area_id: "salon", hidden_by: "user" },
        "light.lampadaire": { entity_id: "light.lampadaire", area_id: "salon", disabled_by: "integration" },
        "cover.baie": { entity_id: "cover.baie", area_id: "salon", entity_category: "config" },
        "climate.salon": { entity_id: "climate.salon", area_id: "salon", hidden: true },
      },
    });
    const area = resolved(resolveAreaEntities(hass, "salon"));
    expect(area.lights).toEqual([]);
    expect(area.covers).toEqual([]);
    expect(area.climate).toBeUndefined();
    // Le capteur d'humidité de diagnostic n'est jamais choisi.
    expect(area.humidity).toBe("sensor.salon_humidite");
  });

  it("removes excluded entities, with globs", () => {
    const area = resolved(resolveAreaEntities(house(), "salon", ["light.plafon*", "MEDIA_PLAYER.TV", "sensor.salon_?umidite"]));
    expect(area.lights).toEqual(["light.lampadaire"]);
    expect(area.tv).toBeUndefined();
    expect(area.humidity).toBeUndefined();
    expect(globToRegExp("light.*").test("light.salon")).toBe(true);
    expect(globToRegExp("light.*").test("switch.light_x")).toBe(false);
    expect(globToRegExp("sensor.a+b").test("sensor.a+b")).toBe(true);
  });

  it("adds switches only on request, never outlets, and never garage doors", () => {
    expect(resolved(resolveAreaEntities(house(), "salon")).lights).not.toContain("switch.guirlande");
    const area = resolved(resolveAreaEntities(house(), "salon", [], { includeSwitches: true }));
    expect(area.lights).toContain("switch.guirlande");
    expect(area.lights).not.toContain("switch.prise_tv");
    expect(area.covers).not.toContain("cover.garage");
  });

  it("shows a light group instead of its members", () => {
    const hass = house({
      states: { "light.salon_groupe": state("light.salon_groupe", { entity_id: ["light.plafonnier", "light.lampadaire"], friendly_name: "Tout le salon" }) },
      entities: { "light.salon_groupe": { entity_id: "light.salon_groupe", area_id: "salon" } },
    });
    expect(resolved(resolveAreaEntities(hass, "salon")).lights).toEqual(["light.salon_groupe"]);
    // Le groupe exclu, ses membres reviennent.
    expect(resolved(resolveAreaEntities(hass, "salon", ["light.salon_groupe"])).lights).toEqual(["light.lampadaire", "light.plafonnier"]);
  });

  it("reports unknown areas and missing registries", () => {
    expect(resolveAreaEntities(house(), "grenier")).toEqual({ status: "not-found", area: "grenier" });
    expect(resolveAreaEntities({ states: {}, callService: vi.fn() }, "salon")).toEqual({ status: "unavailable", area: "salon" });
    expect(resolveAreaEntities(undefined, "salon").status).toBe("unavailable");
  });

  it("memoises the result until the registries change", () => {
    const hass = house();
    const first = resolveAreaEntities(hass, "salon", ["light.x"]);
    // Un nouvel objet hass avec les mêmes registres (changement d'état ailleurs) : même résultat.
    expect(resolveAreaEntities({ ...hass, states: { ...hass.states } }, "salon", ["light.x"])).toBe(first);
    expect(resolveAreaEntities({ ...hass, entities: { ...hass.entities } }, "salon", ["light.x"])).not.toBe(first);
    expect(resolveAreaEntities(hass, "salon", ["light.y"])).not.toBe(first);
    // Une entité de la zone dont l'état arrive après les registres est prise en compte.
    const { "sensor.salon_humidite": _late, ...early } = hass.states;
    const before = resolved(resolveAreaEntities({ ...hass, states: early }, "salon"));
    expect(before.humidity).toBeUndefined();
    expect(resolved(resolveAreaEntities({ ...hass, states: { ...early, "sensor.salon_humidite": _late } }, "salon")).humidity).toBe("sensor.salon_humidite");
  });

  it("suggests the first area with lights or covers", () => {
    // Bureau est vide : la cuisine (lumière) passe avant le salon par ordre alphabétique.
    expect(suggestArea(house())).toBe("cuisine");
    expect(suggestArea({ states: {}, callService: vi.fn() })).toBeUndefined();
  });
});
