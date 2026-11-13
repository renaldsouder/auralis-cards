import { beforeAll, describe, expect, it, vi } from "vitest";
import type { ScreensaverCardConfig } from "../src/cards/auralis-screensaver-card";

type ScreensaverModule = typeof import("../src/cards/auralis-screensaver-card");
let saver: ScreensaverModule;

const config = (overrides: Partial<ScreensaverCardConfig> = {}): ScreensaverCardConfig => ({
  type: "custom:auralis-screensaver-card",
  ...overrides,
});

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  saver = await import("../src/cards/auralis-screensaver-card");
});

describe("Auralis screensaver", () => {
  it("clamps the timeout to 15 s minimum and defaults to 5 minutes", () => {
    expect(saver.screensaverTimeout(undefined)).toBe(300);
    expect(saver.screensaverTimeout("abc")).toBe(300);
    expect(saver.screensaverTimeout(5)).toBe(15);
    expect(saver.screensaverTimeout(-30)).toBe(15);
    expect(saver.screensaverTimeout("120")).toBe(120);
    expect(saver.screensaverTimeout(1e9)).toBe(86_400);
    expect(saver.timeoutLabel(300)).toBe("5 min");
    expect(saver.timeoutLabel(90)).toBe("1 min 30 s");
    expect(saver.timeoutLabel(45)).toBe("45 s");
  });

  it("checks a night window that crosses midnight", () => {
    const start = saver.parseTimeOfDay("22:00")!;
    const end = saver.parseTimeOfDay("07:00")!;
    expect(start).toBe(1320);
    expect(end).toBe(420);
    expect(saver.inTimeWindow(23 * 60, start, end)).toBe(true);
    expect(saver.inTimeWindow(0, start, end)).toBe(true);
    expect(saver.inTimeWindow(6 * 60 + 59, start, end)).toBe(true);
    expect(saver.inTimeWindow(7 * 60, start, end)).toBe(false);
    expect(saver.inTimeWindow(12 * 60, start, end)).toBe(false);
    expect(saver.inTimeWindow(21 * 60 + 59, start, end)).toBe(false);
    expect(saver.inTimeWindow(13 * 60, 12 * 60, 14 * 60)).toBe(true);
    expect(saver.inTimeWindow(15 * 60, 12 * 60, 14 * 60)).toBe(false);
    expect(saver.parseTimeOfDay("24:00")).toBeUndefined();
    expect(saver.parseTimeOfDay("7h")).toBeUndefined();
  });

  it("dims the content at night unless night_dim is off", () => {
    expect(saver.contentOpacity(config(), 12 * 60)).toBe(0.85);
    expect(saver.contentOpacity(config(), 23 * 60)).toBe(0.35);
    expect(saver.contentOpacity(config({ night_dim: false }), 23 * 60)).toBe(0.85);
    expect(saver.contentOpacity(config({ dim_brightness: 0.05 }), 12 * 60)).toBe(0.2);
    expect(saver.contentOpacity(config({ night_start: "20:30", night_end: "06:00", night_brightness: 0.5 }), 20 * 60 + 45)).toBe(0.5);
  });

  it("keeps the burn-in offset within the bounds", () => {
    for (const value of [0, 0.25, 0.5, 0.999, 1, -2, 5]) {
      const offset = saver.burnInOffset(() => value);
      expect(Math.abs(offset.x)).toBeLessThanOrEqual(saver.BURN_IN_SHIFT);
      expect(Math.abs(offset.y)).toBeLessThanOrEqual(saver.BURN_IN_SHIFT);
    }
    expect(saver.burnInOffset(() => 0)).toEqual({ x: -4, y: -4 });
    expect(saver.burnInOffset(() => 1)).toEqual({ x: 4, y: 4 });
    expect(saver.burnInOffset(() => 0.5)).toEqual({ x: 0, y: 0 });
  });

  it("accepts only internal dashboard paths on wake", () => {
    expect(saver.wakePath("/tdb-claude/tablette")).toBe("/tdb-claude/tablette");
    expect(saver.wakePath("lovelace/accueil")).toBe("/lovelace/accueil");
    expect(saver.wakePath("https://exemple.fr")).toBeUndefined();
    expect(saver.wakePath("//exemple.fr")).toBeUndefined();
    expect(saver.wakePath("javascript:alert(1)")).toBeUndefined();
    expect(saver.wakePath("  ")).toBeUndefined();
  });

  it("shares one portal between all connected source cards", () => {
    const registry = new saver.PortalRegistry<string>();
    expect(registry.acquire("vue-1")).toBe(true);
    expect(registry.acquire("vue-2")).toBe(false);
    expect(registry.acquire("vue-2")).toBe(false);
    expect(registry.size).toBe(2);
    expect(registry.leader).toBe("vue-2");
    expect(registry.release("vue-2")).toBe(false);
    expect(registry.leader).toBe("vue-1");
    expect(registry.release("inconnue")).toBe(false);
    expect(registry.release("vue-1")).toBe(true);
    expect(registry.release("vue-1")).toBe(false);
    expect(registry.leader).toBeUndefined();
    expect(registry.acquire("vue-1")).toBe(true);
  });

  it("ignores the click that follows the wake tap for 400 ms", () => {
    expect(saver.swallowsFollowingClick(undefined, 1_000)).toBe(false);
    expect(saver.swallowsFollowingClick(1_000, 1_000)).toBe(true);
    expect(saver.swallowsFollowingClick(1_000, 1_399)).toBe(true);
    expect(saver.swallowsFollowingClick(1_000, 1_400)).toBe(false);
    expect(saver.swallowsFollowingClick(1_000, 900)).toBe(false);
  });

  it("aligns the clock on the next minute, or second", () => {
    expect(saver.msUntilNextTick(60_000 * 10 + 15_000)).toBe(45_000);
    expect(saver.msUntilNextTick(60_000 * 10)).toBe(60_000);
    expect(saver.msUntilNextTick(1_250, true)).toBe(750);
  });

  it("formats the clock and date in the Home Assistant time zone", () => {
    const time = Date.UTC(2026, 10, 13, 22, 30, 5);
    expect(saver.formatClock(time, "Europe/Paris")).toBe("23:30");
    expect(saver.formatClock(time, "Europe/Paris", true)).toBe("23:30:05");
    expect(saver.formatLongDate(time, "Europe/Paris")).toBe("vendredi 13 novembre");
    expect(saver.formatLongDate(time, "Asia/Tokyo")).toBe("samedi 14 novembre");
    expect(saver.zonedMinutes(time, "Europe/Paris")).toBe(23 * 60 + 30);
    expect(saver.zonedMinutes(Date.UTC(2026, 10, 13, 23, 5), "Europe/Paris")).toBe(5);
  });

  it("highlights the alert entity only while it is active", () => {
    const state = (value: string) => ({ entity_id: "binary_sensor.entree", state: value, attributes: {} });
    expect(saver.alertActive(state("on"))).toBe(true);
    expect(saver.alertActive(state("detected"))).toBe(true);
    expect(saver.alertActive(state("off"))).toBe(false);
    expect(saver.alertActive(state("unavailable"))).toBe(false);
    expect(saver.alertActive(undefined)).toBe(false);
  });

  it("validates the configuration and stays invisible in the grid", () => {
    const card = new saver.AuralisScreensaverCard();
    expect(() => card.setConfig(config({ weather_entity: "sensor.meteo" }))).toThrow("weather_entity");
    expect(() => card.setConfig(config({ night_start: "25:00" }))).toThrow("night_start");
    expect(() => card.setConfig(config({ navigate_on_wake: "https://exemple.fr" }))).toThrow("navigate_on_wake");
    expect(() => card.setConfig(config({ entities: ["sensor.a", "sensor.b", "sensor.c", "sensor.d", "sensor.e"] }))).toThrow("au plus 4");
    expect(() => card.setConfig(config({ entities: [{ name: "Sans entité" } as never] }))).toThrow("entities");
    card.setConfig(config({ timeout: 3, entities: ["sensor.salon", { entity: "sensor.exterieur", name: "Dehors" }] }));
    expect(card.config?.timeout).toBe(15);
    expect(saver.screensaverEntities(card.config?.entities)).toEqual([
      { entity: "sensor.salon" },
      { entity: "sensor.exterieur", name: "Dehors" },
    ]);
    expect(card.getGridOptions()).toEqual({ columns: 1, min_columns: 1 });
    card.editMode = true;
    expect(card.getGridOptions()).toEqual({ rows: 1, min_rows: 1, columns: 6, min_columns: 3 });
  });

  it("offers a stub with the first weather entity and French editor labels", () => {
    const hass = { states: { "sensor.x": {}, "weather.maison": {} } } as never;
    expect(saver.AuralisScreensaverCard.getStubConfig(hass)).toMatchObject({ weather_entity: "weather.maison", timeout: 300 });
    expect(saver.AuralisScreensaverCard.getStubConfig()).not.toHaveProperty("weather_entity");
    const form = saver.AuralisScreensaverCard.getConfigForm() as { computeLabel: (schema: { name: string }) => string };
    expect(form.computeLabel({ name: "timeout" })).toBe("Délai avant la veille (secondes)");
  });
});
