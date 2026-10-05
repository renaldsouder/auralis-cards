import { describe, expect, it } from "vitest";
import type { HassEntity } from "../src/types/home-assistant";
import {
  clamp,
  hexToRgb,
  isActive,
  lightRgbColor,
  lightSupportsColor,
  numericState,
  rgbToHex,
  summarizeRange,
} from "../src/utils/entities";

const state = (value: string, attributes: Record<string, unknown> = {}): HassEntity => ({
  entity_id: "sensor.test",
  state: value,
  attributes,
});

describe("entity helpers", () => {
  it("recognizes common active states", () => {
    expect(isActive(state("on"))).toBe(true);
    expect(isActive(state("running"))).toBe(true);
    expect(isActive(state("off"))).toBe(false);
  });

  it("parses decimal values using a French comma", () => {
    expect(numericState(state("21,5"))).toBe(21.5);
  });

  it("clamps percentages", () => {
    expect(clamp(120)).toBe(100);
    expect(clamp(-4)).toBe(0);
  });

  it("summarizes a homogeneous or mixed range", () => {
    expect(summarizeRange([50, 50])).toBe("50 %");
    expect(summarizeRange([75, 35])).toBe("35–75 %");
    expect(summarizeRange([])).toBe("—");
  });

  it("converts light colors between RGB and hexadecimal values", () => {
    expect(rgbToHex([121, 214, 242])).toBe("#79d6f2");
    expect(hexToRgb("#79d6f2")).toEqual([121, 214, 242]);
    expect(hexToRgb("invalid")).toBeUndefined();
  });

  it("detects and reads color-capable lights", () => {
    const light = state("on", { rgb_color: [255, 128, 0], supported_color_modes: ["rgb"] });
    expect(lightSupportsColor(light)).toBe(true);
    expect(lightRgbColor(light)).toEqual([255, 128, 0]);
    expect(lightSupportsColor(state("on", { supported_color_modes: ["brightness"] }))).toBe(false);
  });
});
