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
