import { beforeAll, describe, expect, it, vi } from "vitest";
import type { BaseCardConfig } from "../src/types/config";

type BaseModule = typeof import("../src/cards/auralis-base-card");
type LightsModule = typeof import("../src/cards/auralis-lights-card");

let base: BaseModule;
let lights: LightsModule;

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  base = await import("../src/cards/auralis-base-card");
  lights = await import("../src/cards/auralis-lights-card");
});

const config = (overrides: Partial<BaseCardConfig>): BaseCardConfig => ({ type: "custom:test", ...overrides });

/** Hôte minimal : style inline et attributs, comme un élément du DOM. */
const fakeHost = () => {
  const properties = new Map<string, string>();
  const attributes = new Set<string>();
  return {
    properties,
    attributes,
    style: {
      setProperty: (name: string, value: string) => properties.set(name, value),
      removeProperty: (name: string) => properties.delete(name),
    },
    toggleAttribute: (name: string, force: boolean) => (force ? attributes.add(name) : attributes.delete(name)),
  };
};

describe("Configured accent and card background", () => {
  it("reads the gradient or the colour and rejects values that could escape the declaration", () => {
    expect(base.configuredAccent(config({ accent_color: " #FFB454 " }))).toBe("#FFB454");
    expect(base.configuredAccent(config({ accent_color: "red; display:none" }))).toBeUndefined();
    expect(base.configuredBackground(config({ card_background: { mode: "gradient", gradient: "linear-gradient(#000, #111)" } })))
      .toBe("linear-gradient(#000, #111)");
    expect(base.configuredBackground(config({ card_background: { mode: "solid", color: "#101820" } }))).toBe("#101820");
    expect(base.configuredBackground(config({ card_background: { mode: "gradient" } }))).toBeUndefined();
    expect(base.configuredBackground(config({}))).toBeUndefined();
  });

  it("sets the host variables only when configured and clears them afterwards", () => {
    const host = fakeHost();
    const card = Object.assign(Object.create(lights.AuralisLightsCard.prototype), host, {
      config: config({ accent_color: "#FFB454", card_background: { mode: "gradient", gradient: "linear-gradient(#1a1006, #140c05)" } }),
    });
    card.applyHostPalette();
    expect(host.properties.get("--auralis-card-accent")).toBe("#FFB454");
    expect(host.properties.get("--auralis-card-background")).toBe("linear-gradient(#1a1006, #140c05)");
    expect([...host.attributes].sort()).toEqual(["data-accent", "data-background"]);

    card.config = config({});
    card.applyHostPalette();
    expect(host.properties.size).toBe(0);
    expect(host.attributes.size).toBe(0);
  });
});
