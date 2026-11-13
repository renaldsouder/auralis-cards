import { afterEach, describe, expect, it, vi } from "vitest";
import { cachedFormatCount, clockTime, dateTimeFormat, dayKey, formatTime, hourOf, relativeTime } from "../src/utils/format";
import { bounded, optionalMatch, safeColor } from "../src/utils/validate";
import { isInternalPath, navigate } from "../src/utils/navigation";

// Intl insère des espaces insécables : on les compare comme des espaces simples.
const plain = (text: string): string => text.replace(/\s/g, " ");
const NOW = Date.parse("2026-11-12T15:00:00Z");

describe("cached date formats", () => {
  it("reuses one formatter per locale, time zone and options", () => {
    const first = dateTimeFormat({ hour: "2-digit" }, "Europe/Paris");
    const before = cachedFormatCount();
    expect(dateTimeFormat({ hour: "2-digit" }, "Europe/Paris")).toBe(first);
    expect(cachedFormatCount()).toBe(before);
    expect(dateTimeFormat({ hour: "2-digit" }, "America/New_York")).not.toBe(first);
  });

  it("formats in the Home Assistant time zone and survives an unknown one", () => {
    const time = Date.parse("2026-11-12T23:30:00Z");
    expect(dayKey(time, "Europe/Paris")).toBe("2026-11-13");
    expect(dayKey(time, "UTC")).toBe("2026-11-12");
    expect(hourOf(time, "Europe/Paris")).toBe(0);
    expect(hourOf(time, "UTC")).toBe(23);
    expect(clockTime(time, "Europe/Paris")).toBe("00:30");
    expect(clockTime(time, "UTC", true)).toBe("23:30:00");
    expect(() => formatTime(time, { hour: "2-digit" }, "Pas/Un_Fuseau")).not.toThrow();
  });

  it("describes elapsed time in short French", () => {
    expect(plain(relativeTime(NOW - 10_000, NOW))).toBe("à l’instant");
    expect(plain(relativeTime(NOW - 5 * 60_000, NOW))).toBe("il y a 5 min");
    expect(plain(relativeTime(NOW - 3 * 3_600_000, NOW))).toBe("il y a 3 h");
    expect(plain(relativeTime(NOW - 86_400_000, NOW))).toBe("hier");
    expect(relativeTime(Number.NaN, NOW)).toBe("");
  });
});

describe("configuration checks", () => {
  it("accepts only colours that are safe to inject in a style", () => {
    expect(safeColor(" #ff8a5b ")).toBe("#ff8a5b");
    expect(safeColor("rgb(10, 20, 30)")).toBe("rgb(10, 20, 30)");
    expect(safeColor("red;background:url(x)")).toBeUndefined();
    expect(safeColor("")).toBeUndefined();
    expect(safeColor(12)).toBeUndefined();
  });

  it("checks optional ids and bounds numbers", () => {
    expect(optionalMatch(undefined, /^a$/)).toBe(true);
    expect(optionalMatch("", /^a$/)).toBe(true);
    expect(optionalMatch("a", /^a$/)).toBe(true);
    expect(optionalMatch("b", /^a$/)).toBe(false);
    expect(optionalMatch(3, /^a$/)).toBe(false);
    expect(bounded("12", 1, 6)).toBe(6);
    expect(bounded(0, 1, 6)).toBe(1);
    expect(bounded("", 1, 6)).toBeUndefined();
    expect(bounded("abc", 1, 6)).toBeUndefined();
  });
});

describe("dashboard navigation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("accepts only paths of this dashboard", () => {
    expect(isInternalPath("/dashboard-auralis/cameras")).toBe(true);
    expect(isInternalPath("/")).toBe(true);
    expect(isInternalPath("//evil.example")).toBe(false);
    expect(isInternalPath("/\\evil.example")).toBe(false);
    expect(isInternalPath("https://example.com")).toBe(false);
    expect(isInternalPath("cameras")).toBe(false);
    expect(isInternalPath("/avec espace")).toBe(false);
  });

  it("pushes the route and tells Home Assistant, without throwing on refusal", () => {
    const pushState = vi.fn();
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { history: { pushState, replaceState: vi.fn() }, dispatchEvent });
    expect(navigate("/auralis/salon")).toBe(true);
    expect(pushState).toHaveBeenCalledWith(null, "", "/auralis/salon");
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(navigate("//evil.example")).toBe(false);
    expect(pushState).toHaveBeenCalledOnce();

    pushState.mockImplementationOnce(() => { throw new Error("SecurityError"); });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(navigate("/auralis/garage")).toBe(false);
    expect(dispatchEvent).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
