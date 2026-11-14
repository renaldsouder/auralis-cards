import { beforeAll, describe, expect, it, vi } from "vitest";
import type { HomeAssistant } from "../src/types/home-assistant";

let LightsCard: typeof import("../src/cards/auralis-lights-card").AuralisLightsCard;

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  LightsCard = (await import("../src/cards/auralis-lights-card")).AuralisLightsCard;
});

describe("Auralis lights card", () => {
  it("accepts a single list or grouped light entities", () => {
    const card = new LightsCard();
    card.setConfig({ type: "custom:auralis-lights-card", name: "Salon", lights: ["light.salon"] });
    expect(card.config?.groups).toEqual([{ name: "Salon", lights: ["light.salon"] }]);
    expect(() => card.setConfig({ type: "custom:auralis-lights-card", groups: [{ name: "Salon", lights: ["fan.salon"] }] })).toThrow();
  });

  it("drives relay switches alongside lights without offering brightness or color", async () => {
    const callService = vi.fn(async () => undefined);
    const card = new LightsCard();
    card.setConfig({ type: "custom:auralis-lights-card", groups: [
      { name: "Porche", lights: ["switch.porche", "switch.allee"] },
      { name: "Salon", lights: ["light.rgb", "switch.meuble_tv"] },
    ] });
    card.hass = {
      states: {
        "switch.porche": { entity_id: "switch.porche", state: "on", attributes: {} },
        "switch.allee": { entity_id: "switch.allee", state: "off", attributes: {} },
        "switch.meuble_tv": { entity_id: "switch.meuble_tv", state: "on", attributes: {} },
        "light.rgb": { entity_id: "light.rgb", state: "on", attributes: { brightness: 128, supported_color_modes: ["rgb"] } },
      },
      callService,
    };
    const internals = card as unknown as {
      power(ids: string[], on: boolean): Promise<void>;
      onOffOnly(group: { name: string; lights: string[] }): boolean;
      dimmableIds(group: { name: string; lights: string[] }): string[];
      colorIds(group: { name: string; lights: string[] }): string[];
    };
    const [porche, salon] = card.config!.groups!;
    expect(internals.onOffOnly(porche)).toBe(true);
    expect(internals.onOffOnly(salon)).toBe(false);
    expect(internals.dimmableIds(salon)).toEqual(["light.rgb"]);
    expect(internals.colorIds(salon)).toEqual(["light.rgb"]);
    await internals.power(porche.lights, true);
    expect(callService).toHaveBeenLastCalledWith("switch", "turn_on", {}, { entity_id: ["switch.porche", "switch.allee"] });
    await internals.power(salon.lights, false);
    expect(callService).toHaveBeenLastCalledWith("homeassistant", "turn_off", {}, { entity_id: ["light.rgb", "switch.meuble_tv"] });
  });

  it("targets available color lights only and sends one group service call", async () => {
    const callService = vi.fn(async () => undefined);
    const hass: HomeAssistant = {
      states: {
        "light.rgb": { entity_id: "light.rgb", state: "on", attributes: { brightness: 200, supported_color_modes: ["rgb"] } },
        "light.white": { entity_id: "light.white", state: "off", attributes: { supported_color_modes: ["brightness"] } },
        "light.lost": { entity_id: "light.lost", state: "unavailable", attributes: { supported_color_modes: ["rgb"] } },
      },
      callService,
    };
    const card = new LightsCard();
    card.setConfig({ type: "custom:auralis-lights-card", groups: [{ name: "Salon", lights: ["light.rgb", "light.white", "light.lost"] }] });
    card.hass = hass;
    const internals = card as unknown as {
      available(group: { name: string; lights: string[] }): string[];
      colorIds(group: { name: string; lights: string[] }): string[];
      dimmableIds(group: { name: string; lights: string[] }): string[];
      brightness(ids: string[], percentage: number): Promise<void>;
      colorize(ids: string[], color: string): Promise<void>;
    };
    const group = card.config!.groups![0];
    expect(internals.available(group)).toEqual(["light.rgb", "light.white"]);
    expect(internals.colorIds(group)).toEqual(["light.rgb"]);
    expect(internals.dimmableIds(group)).toEqual(["light.rgb", "light.white"]);
    await internals.brightness(internals.dimmableIds(group), 42);
    await internals.colorize(internals.colorIds(group), "#ff8040");
    expect(callService).toHaveBeenNthCalledWith(1, "light", "turn_on", { brightness_pct: 42 }, { entity_id: ["light.rgb", "light.white"] });
    expect(callService).toHaveBeenNthCalledWith(2, "light", "turn_on", { rgb_color: [255, 128, 64] }, { entity_id: ["light.rgb"] });
  });
});

describe("Auralis lights card targets and options", () => {
  const light = (entity_id: string, state: string, attributes: Record<string, unknown> = {}) => ({ entity_id, state, attributes });

  it("adjusts only the lights that are on, or every compatible light when all are off", async () => {
    const module = await import("../src/cards/auralis-lights-card");
    const hass: HomeAssistant = {
      states: {
        "light.on": light("light.on", "on", { brightness: 80, supported_color_modes: ["brightness"] }),
        "light.off": light("light.off", "off", { supported_color_modes: ["brightness"] }),
        "light.relay": light("light.relay", "on", { supported_color_modes: ["onoff"] }),
        "light.lost": light("light.lost", "unavailable", { supported_color_modes: ["brightness"] }),
        "switch.porch": light("switch.porch", "on"),
      },
      callService: vi.fn(),
    };
    const ids = Object.keys(hass.states);
    expect(module.brightnessTargets(hass, ids)).toEqual(["light.on"]);
    hass.states["light.on"] = light("light.on", "off", { supported_color_modes: ["brightness"] });
    expect(module.brightnessTargets(hass, ids)).toEqual(["light.on", "light.off"]);
  });

  it("sends white presets as a colour temperature to compatible lights", async () => {
    const module = await import("../src/cards/auralis-lights-card");
    const callService = vi.fn(async () => undefined);
    const hass: HomeAssistant = {
      states: {
        "light.ct": light("light.ct", "on", { supported_color_modes: ["color_temp", "hs"] }),
        "light.rgb": light("light.rgb", "on", { supported_color_modes: ["rgb"] }),
      },
      callService,
    };
    await module.applyLightPreset(hass, ["light.ct", "light.rgb"], { name: "Blanc chaud", color: "#ffd4a3", kelvin: 2700 });
    expect(callService).toHaveBeenCalledWith("light", "turn_on", { color_temp_kelvin: 2700 }, { entity_id: ["light.ct"] });
    expect(callService).toHaveBeenCalledWith("light", "turn_on", { rgb_color: [255, 212, 163] }, { entity_id: ["light.rgb"] });
    callService.mockClear();
    await module.applyLightPreset(hass, ["light.ct", "light.rgb"], { name: "Rose", color: "#ff7eb8" });
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith("light", "turn_on", { rgb_color: [255, 126, 184] }, { entity_id: ["light.ct", "light.rgb"] });
  });

  it("accepts background_image as an alias of image, the card image as fallback, and /api/ paths", async () => {
    const module = await import("../src/cards/auralis-lights-card");
    expect(module.groupImageStyle({ image: "/local/salon.jpg" })).toContain('url("/local/salon.jpg")');
    expect(module.groupImageStyle({ background_image: "/api/image/serve/abc/512x512" })).toContain("/api/image/serve/abc/512x512");
    expect(module.groupImageStyle({}, "https://exemple.fr/photo.jpg")).toContain("https://exemple.fr/photo.jpg");
    expect(module.groupImageStyle({ image: "media-source://media_source/local/salon.jpg" })).toBe("");
    expect(module.groupImageStyle({ image: "/local/a.jpg\");color:red" })).toBe("");
  });

  it("offers a valid stub, sizes to its content and closes the scenes popup only on success", async () => {
    vi.stubGlobal("window", globalThis);
    const stub = LightsCard.getStubConfig({ states: { "light.salon": light("light.salon", "off") }, callService: vi.fn() });
    expect(stub.lights).toEqual(["light.salon"]);
    const card = new LightsCard();
    expect(() => card.setConfig({ type: "custom:auralis-lights-card", ...stub })).not.toThrow();
    expect(() => card.setConfig({ type: "custom:auralis-lights-card", ...LightsCard.getStubConfig() })).not.toThrow();
    expect(card.getGridOptions()).toEqual({ columns: 6, min_columns: 3 });
    const callService = vi.fn(async (): Promise<unknown> => { throw new Error("refusé"); });
    card.hass = { states: {}, callService };
    const internals = card as unknown as { dialog: string | null; activateScene(scene: { entity: string }): Promise<void> };
    internals.dialog = "scenes:0";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await internals.activateScene({ entity: "scene.cosy" });
    expect(internals.dialog).toBe("scenes:0");
    callService.mockImplementation(async () => undefined);
    await internals.activateScene({ entity: "scene.cosy" });
    expect(internals.dialog).toBeNull();
    vi.unstubAllGlobals();
    vi.stubGlobal("HTMLElement", class {});
  });
  it("keeps on, off and brightness on the card and opens the rest from the photo", () => {
    // Texte statique d'un gabarit Lit, sous-gabarits compris.
    const text = (value: unknown): string => {
      if (Array.isArray(value)) return value.map(text).join("");
      if (value && typeof value === "object" && "strings" in value && "values" in value) {
        const result = value as { strings: readonly string[]; values: unknown[] };
        return result.strings.join("") + result.values.map(text).join("");
      }
      return "";
    };
    const card = new LightsCard();
    const group = { name: "Salon", lights: ["light.rgb"], scenes: [{ entity: "scene.soiree", label: "Soirée" }] };
    card.hass = {
      states: { "light.rgb": { entity_id: "light.rgb", state: "on", attributes: { brightness: 128, supported_color_modes: ["rgb"] } } },
      callService: vi.fn(async () => undefined),
    };
    const internals = card as unknown as { renderGroup(group: unknown, index: number): unknown; renderGroupDialog(group: unknown, index: number): unknown };
    card.setConfig({ type: "custom:auralis-lights-card", groups: [group] });
    const face = text(internals.renderGroup(group, 0));
    expect(face).toContain('class="group-photo"');
    expect(face).toContain('aria-haspopup="dialog"');
    expect(face).toContain('class="dimmer"');
    // Réglages depuis la photo (indice), marche et arrêt à la place du chevron.
    expect(face).toContain("photo-hint");
    expect(face).toContain('class="group-power"');
    expect(face).not.toContain("mdi:chevron-right");
    expect(face).not.toContain('class="group-actions"');
    expect(face).not.toContain('class="swatches"');
    expect(face).not.toContain('type="color"');
    const dialog = text(internals.renderGroupDialog(group, 0));
    expect(dialog).toContain('class="swatches"');
    expect(dialog).toContain('type="color"');
    expect(dialog).toContain("scene-grid");

    card.setConfig({ type: "custom:auralis-lights-card", show_colors: true, groups: [group] });
    const full = text(internals.renderGroup(group, 0));
    expect(full).toContain('class="swatches"');
    expect(full).toContain('type="color"');
  });
});
