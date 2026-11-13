import { beforeAll, describe, expect, it, vi } from "vitest";
import type { IrrigationCardConfig, IrrigationZone } from "../src/cards/auralis-irrigation-card";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";

type IrrigationModule = typeof import("../src/cards/auralis-irrigation-card");
let irrigation: IrrigationModule;

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  irrigation = await import("../src/cards/auralis-irrigation-card");
});

const PARIS = "Europe/Paris";
const at = (iso: string): number => Date.parse(iso);
const state = (entity_id: string, value: string, attributes: Record<string, unknown> = {}, last_changed?: string): HassEntity =>
  ({ entity_id, state: value, attributes, last_changed });
const hass = (...states: HassEntity[]): HomeAssistant => ({
  states: Object.fromEntries(states.map((item) => [item.entity_id, item])),
  config: { time_zone: PARIS },
  callService: async () => undefined,
});
const config = (overrides: Partial<IrrigationCardConfig> = {}): IrrigationCardConfig => ({
  type: "custom:auralis-irrigation-card",
  ...overrides,
});

describe("next watering", () => {
  it("finds the next time tonight, or tomorrow once it has passed", () => {
    const tonight = irrigation.nextWatering(["23:00"], at("2026-07-01T20:00:00+02:00"), PARIS);
    expect(tonight).toMatchObject({ time: "23:00", tomorrow: false, label: "ce soir à 23:00", inMs: 3 * 3_600_000 });
    const later = irrigation.nextWatering(["23:00"], at("2026-07-01T23:30:00+02:00"), PARIS);
    expect(later).toMatchObject({ tomorrow: true, label: "demain à 23:00", inMs: 23.5 * 3_600_000 });
  });

  it("crosses midnight and picks the closest of several times", () => {
    const times = ["23:00", "07:00"];
    expect(irrigation.nextWatering(times, at("2026-07-01T23:30:00+02:00"), PARIS)?.label).toBe("demain à 07:00");
    expect(irrigation.nextWatering(times, at("2026-07-02T00:10:00+02:00"), PARIS)?.label).toBe("aujourd’hui à 07:00");
    expect(irrigation.nextWatering(times, at("2026-07-02T12:00:00+02:00"), PARIS)?.label).toBe("ce soir à 23:00");
    expect(irrigation.nextWatering(["23:00"], at("2026-07-02T00:10:00+02:00"), PARIS)?.inMs).toBe((22 * 60 + 50) * 60_000);
  });

  it("treats the current minute as already started and uses the Home Assistant time zone", () => {
    expect(irrigation.nextWatering(["23:00"], at("2026-07-01T23:00:30+02:00"), PARIS)?.tomorrow).toBe(true);
    const now = at("2026-07-01T21:30:00Z");
    expect(irrigation.nextWatering(["23:00"], now, PARIS)?.tomorrow).toBe(true);
    expect(irrigation.nextWatering(["23:00"], now, "UTC")?.label).toBe("ce soir à 23:00");
    expect(irrigation.nextWatering([], now, PARIS)).toBeUndefined();
  });

  it("reads the next start of a schedule helper", () => {
    const now = at("2026-07-01T20:00:00+02:00");
    expect(irrigation.nextEventWatering("2026-07-02T07:00:00+02:00", now, PARIS)?.label).toBe("demain à 07:00");
    expect(irrigation.nextEventWatering("2026-07-01T22:00:00+02:00", now, PARIS)?.label).toBe("ce soir à 22:00");
    expect(irrigation.nextEventWatering("2026-07-01T19:00:00+02:00", now, PARIS)).toBeUndefined();
    expect(irrigation.nextEventWatering(undefined, now, PARIS)).toBeUndefined();
  });
});

describe("device countdown", () => {
  it("converts minutes to the entity unit", () => {
    expect(irrigation.countdownSetting(10, { unit_of_measurement: "min", min: 0, max: 60, step: 1 })).toEqual({ value: 10, minutes: 10, adjusted: false });
    expect(irrigation.countdownSetting(10, { unit_of_measurement: "s", min: 0, max: 86400, step: 1 })).toEqual({ value: 600, minutes: 10, adjusted: false });
    expect(irrigation.countdownSetting(90, { unit_of_measurement: "h", step: 0.5 })).toEqual({ value: 1.5, minutes: 90, adjusted: false });
    expect(irrigation.countdownSetting(10, {}).value).toBe(10);
  });

  it("clamps to min and max and rounds to the step", () => {
    expect(irrigation.countdownSetting(90, { unit_of_measurement: "min", min: 0, max: 60 })).toEqual({ value: 60, minutes: 60, adjusted: true });
    expect(irrigation.countdownSetting(90, { unit_of_measurement: "s", max: 3600 }).value).toBe(3600);
    expect(irrigation.countdownSetting(7, { unit_of_measurement: "min", min: 0, max: 60, step: 5 })).toMatchObject({ value: 5, adjusted: true });
    expect(irrigation.countdownSetting(20, { unit_of_measurement: "h", step: 0.5 })).toMatchObject({ value: 0.5, minutes: 30 });
    expect(irrigation.countdownSetting(0.2, { unit_of_measurement: "min", min: 1, max: 60 }).value).toBe(1);
    expect(irrigation.countdownSetting(0.2, { unit_of_measurement: "min", min: 0, max: 60 }).value).toBe(1);
    expect(irrigation.countdownSetting(17, { unit_of_measurement: "min", min: 0, max: 58, step: 5 }).value).toBe(15);
  });

  it("formats durations", () => {
    expect(irrigation.formatDuration(45)).toBe("45 s");
    expect(irrigation.formatDuration(600)).toBe("10 min");
    expect(irrigation.formatDuration(130, "ceil")).toBe("3 min");
    expect(irrigation.formatDuration(5400)).toBe("1 h 30");
    expect(irrigation.formatDuration(3600)).toBe("1 h");
  });
});

describe("timed run strategy", () => {
  it("prefers a script, then the device countdown, and refuses browser timers", () => {
    expect(irrigation.timedRunStrategy({ script_entity: "script.arroser", countdown_entity: "number.minuterie" })).toBe("script");
    expect(irrigation.timedRunStrategy({ countdown_entity: "number.minuterie" })).toBe("countdown");
    expect(irrigation.timedRunStrategy({})).toBe("manual");
  });
});

describe("battery and error", () => {
  it("classifies text and numeric batteries", () => {
    expect(irrigation.batteryInfo("low")).toMatchObject({ severity: "warning", low: true, label: "Pile faible" });
    expect(irrigation.batteryInfo("Faible")).toMatchObject({ low: true });
    expect(irrigation.batteryInfo("critical")).toMatchObject({ severity: "critical", low: true });
    expect(irrigation.batteryInfo("high")).toMatchObject({ severity: "normal", low: false });
    expect(irrigation.batteryInfo("82")).toMatchObject({ level: 82, severity: "normal", low: false, label: "82 %" });
    expect(irrigation.batteryInfo("25")).toMatchObject({ severity: "warning", low: true });
    expect(irrigation.batteryInfo("10")).toMatchObject({ severity: "critical", low: true });
    expect(irrigation.batteryInfo("on", "binary_sensor")).toMatchObject({ low: true });
    expect(irrigation.batteryInfo("off", "binary_sensor")).toMatchObject({ low: false });
    expect(irrigation.batteryInfo("")).toBeUndefined();
    expect(irrigation.batteryInfo("unavailable")).toBeUndefined();
    expect(irrigation.batteryInfo(undefined)).toBeUndefined();
  });

  it("only reports real errors", () => {
    for (const value of ["", "none", "OK", "unknown", "unavailable", " "]) expect(irrigation.errorText(value)).toBeUndefined();
    expect(irrigation.errorText("water_shortage")).toBe("water shortage");
    expect(irrigation.errorText("Fuite détectée")).toBe("Fuite détectée");
    expect(irrigation.errorText("on", "binary_sensor")).toBe("Anomalie signalée");
    expect(irrigation.errorText("off", "binary_sensor")).toBeUndefined();
  });
});

describe("rain forecast", () => {
  const now = at("2026-07-01T12:00:00Z");
  const hour = 3_600_000;

  it("sums hourly precipitation over the next 24 hours", () => {
    const entries = Array.from({ length: 30 }, (_, index) => ({ time: now + index * hour, precipitation: 1 }));
    expect(irrigation.rainForecast(entries, now)).toBe(24);
    const shifted = Array.from({ length: 30 }, (_, index) => ({ time: now - hour / 2 + index * hour, precipitation: 1 }));
    expect(irrigation.rainForecast(shifted, now)).toBe(24);
  });

  it("prorates daily forecasts", () => {
    const midnight = at("2026-07-01T00:00:00Z");
    const entries = [
      { time: midnight, precipitation: 6 },
      { time: midnight + 24 * hour, precipitation: 12 },
      { time: midnight + 48 * hour, precipitation: 30 },
    ];
    expect(irrigation.rainForecast(entries, now, 24 * hour)).toBe(9);
  });

  it("returns nothing without precipitation data", () => {
    expect(irrigation.rainForecast([{ time: now }, { time: now + hour }], now)).toBeUndefined();
    expect(irrigation.rainForecast([], now)).toBeUndefined();
  });

  it("backs off between subscription attempts", () => {
    expect(irrigation.retryDelay(0)).toBe(15_000);
    expect(irrigation.retryDelay(2)).toBe(60_000);
    expect(irrigation.retryDelay(20)).toBe(15 * 60_000);
  });
});

describe("configuration", () => {
  it("accepts a single zone at top level with defaults", () => {
    const zones = irrigation.normalizeZones(config({ valve_entity: "switch.mod_arrosage_jardiniere", zone_name: "Jardinière", schedule: "23:00" }));
    expect(zones).toEqual([{
      valve_entity: "switch.mod_arrosage_jardiniere",
      name: "Jardinière",
      icon: "mdi:sprinkler-variant",
      countdown_entity: undefined,
      battery_entity: undefined,
      error_entity: undefined,
      schedule_entity: undefined,
      script_entity: undefined,
      schedule: ["23:00"],
      durations: [5, 10, 20],
      max_duration: 60,
    }]);
  });

  it("accepts a list of zones, after the top-level zone", () => {
    const zones = irrigation.normalizeZones(config({
      valve_entity: "switch.potager",
      zones: [
        { valve_entity: "valve.pelouse", schedule: ["7:00", "21:30", "07:00"], durations: [30, "15", 90, -1], max_duration: 45 },
        { valve_entity: "switch.haie", countdown_entity: "number.haie_countdown", schedule_entity: "automation.haie" },
      ],
    }));
    expect(zones.map((zone) => zone.valve_entity)).toEqual(["switch.potager", "valve.pelouse", "switch.haie"]);
    expect(zones[1]).toMatchObject({ schedule: ["07:00", "21:30"], durations: [15, 30], max_duration: 45 });
    expect(zones[2]).toMatchObject({ countdown_entity: "number.haie_countdown", schedule_entity: "automation.haie" });
    expect(irrigation.normalizeZones(config({ zones: [{ valve_entity: "switch.a" }] }))).toHaveLength(1);
  });

  it("ignores empty editor fields and rejects invalid entities", () => {
    expect(irrigation.normalizeZones(config({ valve_entity: "switch.a", countdown_entity: "", script_entity: undefined }))[0].countdown_entity).toBeUndefined();
    expect(() => irrigation.normalizeZones(config())).toThrow(/vanne/);
    expect(() => irrigation.normalizeZones(config({ valve_entity: "light.salon" }))).toThrow(/valve_entity/);
    expect(() => irrigation.normalizeZones(config({ valve_entity: "switch.a", countdown_entity: "sensor.x" }))).toThrow(/countdown_entity/);
    expect(() => irrigation.normalizeZones(config({ valve_entity: "switch.a", schedule: ["25:00"] }))).toThrow(/HH:MM/);
    expect(() => irrigation.normalizeZones(config({ zones: [{ valve_entity: "switch.a" }, {} as never] }))).toThrow(/Zone 2/);
  });

  it("suggests the irrigation valve and its sibling entities", () => {
    const home = hass(
      state("switch.salon", "off"),
      state("switch.mod_arrosage_jardiniere", "off"),
      state("number.mod_arrosage_jardiniere_countdown", "4"),
      state("sensor.mod_arrosage_jardiniere_battery_state", "low"),
      state("sensor.mod_arrosage_jardiniere_error_status", ""),
    );
    expect(irrigation.stubConfig(home)).toEqual({
      type: "custom:auralis-irrigation-card",
      valve_entity: "switch.mod_arrosage_jardiniere",
      countdown_entity: "number.mod_arrosage_jardiniere_countdown",
      battery_entity: "sensor.mod_arrosage_jardiniere_battery_state",
      error_entity: "sensor.mod_arrosage_jardiniere_error_status",
    });
    expect(irrigation.stubConfig(hass(state("switch.salon", "off"), state("valve.jardin", "closed"))).valve_entity).toBe("valve.jardin");
    const placeholder = irrigation.stubConfig(hass(state("switch.salon", "off")));
    expect(() => new irrigation.AuralisIrrigationCard().setConfig(placeholder as IrrigationCardConfig)).not.toThrow();
  });

  it("validates the card options", () => {
    const card = new irrigation.AuralisIrrigationCard();
    expect(() => card.setConfig(config({ valve_entity: "switch.a", weather_entity: "sensor.meteo" }))).toThrow(/weather/);
    expect(card.getGridOptions()).toEqual({ columns: 6, min_columns: 4, rows: "auto" });
  });
});

describe("zone view", () => {
  const zone = (overrides: Partial<IrrigationZone> = {}): IrrigationZone =>
    ({ ...irrigation.normalizeZones(config({ valve_entity: "switch.jardin", schedule: ["23:00"] }))[0], ...overrides });
  const now = at("2026-07-01T20:00:00+02:00");

  it("shows the device countdown while watering", () => {
    const view = irrigation.zoneView(hass(
      state("switch.jardin", "on", {}, "2026-07-01T19:58:00+02:00"),
      state("number.jardin_countdown", "4", { unit_of_measurement: "min" }),
    ), zone({ countdown_entity: "number.jardin_countdown" }), 0, now);
    expect(view).toMatchObject({ open: true, status: "Arrosage en cours · reste 4 min", usesElapsed: false, strategy: "countdown", timedReady: true });
  });

  it("falls back to the elapsed time, and reports closed or unavailable valves", () => {
    const home = hass(state("switch.jardin", "on", {}, "2026-07-01T19:48:00+02:00"));
    expect(irrigation.zoneView(home, zone(), 0, now)).toMatchObject({ status: "Arrosage en cours · depuis 12 min", usesElapsed: true, strategy: "manual" });
    expect(irrigation.zoneView(hass(state("switch.jardin", "off")), zone(), 0, now)).toMatchObject({ status: "Fermé", next: { label: "ce soir à 23:00" } });
    expect(irrigation.zoneView(hass(state("switch.jardin", "unavailable")), zone(), 0, now)).toMatchObject({ status: "Indisponible", available: false });
  });

  it("pauses the schedule display when its automation is off", () => {
    const view = irrigation.zoneView(hass(state("switch.jardin", "off"), state("automation.arrosage", "off")), zone({ schedule_entity: "automation.arrosage" }), 0, now);
    expect(view).toMatchObject({ paused: true, pausable: true, next: undefined });
  });

  it("disables timed runs when the device countdown is unavailable", () => {
    const view = irrigation.zoneView(hass(state("switch.jardin", "off"), state("number.jardin_countdown", "unavailable")), zone({ countdown_entity: "number.jardin_countdown" }), 0, now);
    expect(view.timedReady).toBe(false);
  });

  it("summarises the card", () => {
    const home = hass(
      state("switch.jardin", "on", {}, "2026-07-01T19:48:00+02:00"),
      state("switch.potager", "off"),
      state("sensor.pile", "low"),
    );
    const views = [
      irrigation.zoneView(home, zone(), 0, now),
      irrigation.zoneView(home, zone({ valve_entity: "switch.potager", battery_entity: "sensor.pile" }), 1, now),
    ];
    expect(irrigation.cardSummary(views)).toEqual({ text: "1 zone en cours · Pile faible", tone: "warning" });
    expect(irrigation.cardSummary([irrigation.zoneView(hass(state("switch.jardin", "off")), zone(), 0, now)])).toEqual({ text: "Tout est fermé", tone: "healthy" });
  });
});
