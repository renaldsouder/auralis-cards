import { beforeAll, describe, expect, it, vi } from "vitest";
import type { BatteriesHass } from "../src/cards/auralis-batteries-card";
import type { HassEntity } from "../src/types/home-assistant";

type BatteriesModule = typeof import("../src/cards/auralis-batteries-card");
let batteries: BatteriesModule;

const NOW = Date.parse("2026-11-13T12:00:00Z");
const ago = (minutes: number): string => new Date(NOW - minutes * 60_000).toISOString();

const state = (entity_id: string, value: string, attributes: Record<string, unknown> = {}, last_changed?: string): HassEntity =>
  ({ entity_id, state: value, attributes, last_changed });

const hassOf = (list: HassEntity[], extra: Partial<BatteriesHass> = {}): BatteriesHass => ({
  states: Object.fromEntries(list.map((item) => [item.entity_id, item])),
  callService: async () => undefined,
  ...extra,
});

/** Les données réelles de la maison, plus quelques voisins sans intérêt. */
const house = (): HassEntity[] => [
  state("sensor.capt_temp_01_battery", "9", { device_class: "battery", unit_of_measurement: "%", friendly_name: "Capt temp 01 Batterie" }),
  state("sensor.capt_temp_02_temperature", "unknown", { friendly_name: "Capt temp 02 Température" }, ago(180)),
  state("sensor.capt_temp_02_humidity", "unknown", { friendly_name: "Capt temp 02 Humidité" }, ago(200)),
  state("sensor.capt_temp_02_battery", "unknown", { friendly_name: "Capt temp 02 Batterie" }, ago(190)),
  state("sensor.mod_arrosage_jardiniere_battery_state", "low", { friendly_name: "Arrosage jardinière Battery" }),
  state("sensor.salon_temperature", "21.4", { device_class: "temperature", unit_of_measurement: "°C" }),
  state("automation.reveil", "unavailable"),
];

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  batteries = await import("../src/cards/auralis-batteries-card");
});

describe("battery discovery", () => {
  it("reads numeric, text and binary batteries", () => {
    const hass = hassOf([
      state("sensor.porte_battery", "98,5", { device_class: "battery", unit_of_measurement: "%", friendly_name: "Porte Batterie" }),
      state("sensor.fenetre_batterie", "9.5", { unit_of_measurement: "%", friendly_name: "Fenêtre batterie" }),
      state("sensor.thermo_battery", "45", { unit_of_measurement: "V" }),
      state("sensor.telecommande", "medium", { device_class: "battery", friendly_name: "Télécommande" }),
      state("sensor.arrosage_battery_state", "low", { friendly_name: "Arrosage" }),
      state("binary_sensor.fumee_battery_low", "on", { device_class: "battery", friendly_name: "Détecteur fumée" }),
      state("binary_sensor.cave_battery_low", "off", { device_class: "battery", friendly_name: "Cave" }),
      state("binary_sensor.porte", "on", { device_class: "door" }),
    ]);
    const report = batteries.discoverBatteries(hass, batteries.discoveryOptions());
    const byId = Object.fromEntries(report.batteries.map((item) => [item.entityId, item]));
    expect(Object.keys(byId).sort()).toEqual([
      "binary_sensor.cave_battery_low", "binary_sensor.fumee_battery_low", "sensor.arrosage_battery_state",
      "sensor.fenetre_batterie", "sensor.porte_battery", "sensor.telecommande",
    ]);
    expect(byId["sensor.porte_battery"]).toMatchObject({ source: "percent", percent: 98.5, level: "ok", name: "Porte" });
    expect(byId["sensor.fenetre_batterie"]).toMatchObject({ percent: 9.5, level: "critical", name: "Fenêtre" });
    expect(byId["sensor.telecommande"]).toMatchObject({ source: "text", textLevel: "medium", level: "ok", label: "Moyen" });
    expect(byId["sensor.arrosage_battery_state"]).toMatchObject({ source: "text", level: "low", label: "Faible" });
    expect(byId["binary_sensor.fumee_battery_low"]).toMatchObject({ source: "binary", level: "low" });
    expect(byId["binary_sensor.cave_battery_low"]).toMatchObject({ source: "binary", level: "ok" });
  });

  it("warns on medium text states only when asked", () => {
    const hass = hassOf([state("sensor.telecommande", "moyen", { device_class: "battery" })]);
    expect(batteries.discoverBatteries(hass, batteries.discoveryOptions()).low).toHaveLength(0);
    expect(batteries.discoverBatteries(hass, batteries.discoveryOptions({ warn_on_medium: true })).low).toHaveLength(1);
  });

  it("finds the problems of the real house", () => {
    const report = batteries.discoverBatteries(hassOf(house()), batteries.discoveryOptions({ include_unknown: true }));
    expect(report.critical.map((item) => [item.name, item.label])).toEqual([["Capt temp 01", "9 %"]]);
    expect(report.low.map((item) => item.entityId)).toEqual(["sensor.mod_arrosage_jardiniere_battery_state"]);
    expect(report.unavailable).toHaveLength(1);
    expect(report.unavailable[0]).toMatchObject({ key: "prefix:capt_temp_02", name: "Capt temp 02", state: "unknown", since: NOW - 200 * 60_000 });
    expect(report.unavailable[0].entityIds).toHaveLength(3);
    expect(batteries.summarizeReport(report)).toEqual({ tone: "danger", text: "1 pile critique · 1 pile faible · 1 appareil indisponible" });
  });

  it("ignores unknown states unless include_unknown, and domains outside unavailable_domains", () => {
    const report = batteries.discoverBatteries(hassOf(house()), batteries.discoveryOptions());
    expect(report.unavailable).toHaveLength(0);
    const lights = hassOf([state("light.salon", "unavailable"), state("switch.prise", "unavailable")]);
    expect(batteries.discoverBatteries(lights, batteries.discoveryOptions({ unavailable_domains: ["light"] })).unavailable.map((item) => item.entityId))
      .toEqual(["light.salon"]);
    expect(batteries.discoverBatteries(lights, batteries.discoveryOptions({ show_unavailable: false })).unavailable).toHaveLength(0);
  });

  it("skips entities hidden in the registry", () => {
    const hass = hassOf([
      state("sensor.cache_battery", "5", { device_class: "battery" }),
      state("light.cachee", "unavailable"),
    ], { entities: { "sensor.cache_battery": { hidden: true }, "light.cachee": { hidden_by: "user" } } });
    const report = batteries.discoverBatteries(hass, batteries.discoveryOptions());
    expect(report.batteries).toHaveLength(0);
    expect(report.unavailable).toHaveLength(0);
  });
});

describe("thresholds", () => {
  it("classifies percentages with inclusive limits", () => {
    expect(batteries.classifyPercent(9, 20, 10)).toBe("critical");
    expect(batteries.classifyPercent(10, 20, 10)).toBe("critical");
    expect(batteries.classifyPercent(15, 20, 10)).toBe("low");
    expect(batteries.classifyPercent(20, 20, 10)).toBe("low");
    expect(batteries.classifyPercent(21, 20, 10)).toBe("ok");
    expect(batteries.classifyPercent(25, 30, 5)).toBe("low");
  });

  it("parses decimal commas and rejects text", () => {
    expect(batteries.parseBatteryNumber("9")).toBe(9);
    expect(batteries.parseBatteryNumber("98,5")).toBe(98.5);
    expect(batteries.parseBatteryNumber("9.5 %")).toBe(9.5);
    expect(batteries.parseBatteryNumber("low")).toBeUndefined();
    expect(batteries.parseBatteryNumber("")).toBeUndefined();
  });

  it("maps text states in English and French", () => {
    expect(batteries.classifyText("Faible")?.level).toBe("low");
    expect(batteries.classifyText("critical")?.level).toBe("critical");
    expect(batteries.classifyText("full")?.level).toBe("ok");
    expect(batteries.classifyText("charging")).toBeUndefined();
  });

  it("keeps critical_threshold below low_threshold", () => {
    const options = batteries.discoveryOptions({ low_threshold: 15, critical_threshold: 40 });
    expect([options.low, options.critical]).toEqual([15, 15]);
  });
});

describe("include and exclude", () => {
  it("matches ids and globs", () => {
    const match = batteries.globMatcher(["sensor.*_voltage", "light.salon", " "]);
    expect(match("sensor.porte_voltage")).toBe(true);
    expect(match("sensor.porte_voltage_2")).toBe(false);
    expect(match("light.salon")).toBe(true);
    expect(match("light.salon_2")).toBe(false);
    expect(batteries.globMatcher([])("sensor.x")).toBe(false);
  });

  it("removes excluded entities and adds included ones", () => {
    const hass = hassOf([
      state("sensor.porte_battery", "5", { device_class: "battery" }),
      state("sensor.porte_voltage", "unavailable"),
      state("sensor.velo_niveau", "12", { unit_of_measurement: "%", friendly_name: "Vélo" }),
      state("input_boolean.alarme", "unavailable"),
    ]);
    const report = batteries.discoverBatteries(hass, batteries.discoveryOptions({
      exclude: ["sensor.porte_*"],
      include: "sensor.velo_*, input_boolean.alarme",
    }));
    expect(report.batteries.map((item) => item.entityId)).toEqual(["sensor.velo_niveau"]);
    expect(report.low.map((item) => item.name)).toEqual(["Vélo"]);
    expect(report.unavailable.map((item) => item.entityId)).toEqual(["input_boolean.alarme"]);
  });

  it("rejects include values that are neither lists nor text", () => {
    expect(() => batteries.optionList(42, "include")).toThrow("include doit être une liste");
  });
});

describe("grouping of unavailable devices", () => {
  it("groups by registry device and uses its name", () => {
    const hass = hassOf([
      state("sensor.a_temperature", "unavailable", { friendly_name: "A temp" }, ago(30)),
      state("sensor.b_humidity", "unavailable", { friendly_name: "B hum" }, ago(90)),
      state("light.couloir", "unavailable", { friendly_name: "Couloir" }, ago(10)),
    ], {
      entities: { "sensor.a_temperature": { device_id: "d1" }, "sensor.b_humidity": { device_id: "d1" } },
      devices: { d1: { name: "Capteur bureau", name_by_user: "Bureau" } },
    });
    const report = batteries.discoverBatteries(hass, batteries.discoveryOptions());
    expect(report.unavailable.map((item) => [item.key, item.name, item.entityIds.length])).toEqual([
      ["device:d1", "Bureau", 2],
      ["prefix:couloir", "Couloir", 1],
    ]);
    expect(report.unavailable[0].since).toBe(NOW - 90 * 60_000);
  });

  it("groups by identifier prefix without a registry", () => {
    expect(batteries.unavailableGroup(hassOf([]), "sensor.capt_temp_02_temperature").key).toBe("prefix:capt_temp_02");
    expect(batteries.unavailableGroup(hassOf([]), "sensor.capt_temp_02_humidity").key).toBe("prefix:capt_temp_02");
    expect(batteries.unavailableGroup(hassOf([]), "light.salon").key).toBe("prefix:salon");
    expect(batteries.commonNamePrefix(["Capt temp 02 Température", "Capt temp 02 Humidité"])).toBe("Capt temp 02");
  });

  it("names a prefix group from its identifier when the names share nothing", () => {
    const hass = hassOf([
      state("sensor.x9_temperature", "unavailable", { friendly_name: "Température" }),
      state("sensor.x9_humidity", "unavailable", { friendly_name: "Humidité" }),
    ]);
    expect(batteries.discoverBatteries(hass, batteries.discoveryOptions()).unavailable[0].name).toBe("X9");
  });
});

describe("sorting", () => {
  it("lists critical batteries first, lowest first, then low ones", () => {
    const hass = hassOf([
      state("sensor.a_battery", "8", { device_class: "battery" }),
      state("sensor.b_battery", "3", { device_class: "battery" }),
      state("sensor.c_battery", "18", { device_class: "battery" }),
      state("sensor.d_battery_state", "low"),
      state("sensor.e_battery", "70", { device_class: "battery" }),
    ]);
    const report = batteries.discoverBatteries(hass, batteries.discoveryOptions());
    expect(batteries.problemItems(report).map((item) => "entityId" in item && item.entityId)).toEqual([
      "sensor.b_battery", "sensor.a_battery", "sensor.d_battery_state", "sensor.c_battery",
    ]);
    expect(report.batteries.map((item) => item.entityId)).toEqual([
      "sensor.b_battery", "sensor.a_battery", "sensor.d_battery_state", "sensor.c_battery", "sensor.e_battery",
    ]);
  });

  it("lists the longest unavailable devices first, unknown dates last", () => {
    const hass = hassOf([
      state("light.recent", "unavailable", {}, ago(5)),
      state("light.ancien", "unavailable", {}, ago(3000)),
      state("light.sans_date", "unavailable"),
    ]);
    const report = batteries.discoverBatteries(hass, batteries.discoveryOptions());
    expect(report.unavailable.map((item) => item.entityId)).toEqual(["light.ancien", "light.recent", "light.sans_date"]);
  });
});

describe("texts", () => {
  it("pluralises the summary in French", () => {
    const item = { name: "x" } as never;
    expect(batteries.summarizeReport({ critical: [], low: [], unavailable: [] })).toEqual({ tone: "healthy", text: "Tout va bien" });
    expect(batteries.summarizeReport({ critical: [], low: [item, item, item], unavailable: [] })).toEqual({ tone: "warning", text: "3 piles faibles" });
    expect(batteries.summarizeReport({ critical: [item], low: [], unavailable: [item, item] }))
      .toEqual({ tone: "danger", text: "1 pile critique · 2 appareils indisponibles" });
    expect(batteries.summarizeReport({ critical: [item, item], low: [], unavailable: [] }).text).toBe("2 piles critiques");
  });

  it("formats durations in minutes, hours and days", () => {
    expect(batteries.formatSince(NOW - 20_000, NOW)).toBe("depuis moins d'une minute");
    expect(batteries.formatSince(NOW - 12 * 60_000, NOW)).toBe("depuis 12 min");
    expect(batteries.formatSince(NOW - 3 * 3_600_000 - 59 * 60_000, NOW)).toBe("depuis 3 h");
    expect(batteries.formatSince(NOW - 2 * 86_400_000, NOW)).toBe("depuis 2 j");
    expect(batteries.formatSince(undefined, NOW)).toBeUndefined();
  });

  it("strips Battery / Batterie from names", () => {
    expect(batteries.cleanBatteryName("Capt temp 01 Batterie")).toBe("Capt temp 01");
    expect(batteries.cleanBatteryName("Porte entrée Battery level")).toBe("Porte entrée");
    expect(batteries.cleanBatteryName("Batterie du détecteur")).toBe("détecteur");
    expect(batteries.cleanBatteryName("Batterie")).toBe("Batterie");
  });

  it("picks an icon matching the level", () => {
    expect(batteries.batteryIcon({ percent: 9 })).toBe("mdi:battery-10");
    expect(batteries.batteryIcon({ percent: 3 })).toBe("mdi:battery-alert");
    expect(batteries.batteryIcon({ percent: 98 })).toBe("mdi:battery");
    expect(batteries.batteryIcon({ textLevel: "low" })).toBe("mdi:battery-low");
    expect(batteries.batteryIcon({})).toBe("mdi:battery-unknown");
  });
});

describe("card", () => {
  it("normalises its configuration and rejects invalid values", () => {
    const card = new batteries.AuralisBatteriesCard();
    card.setConfig({ type: "custom:auralis-batteries-card" });
    expect(card.config).toMatchObject({
      name: "Batteries et alertes", low_threshold: 20, critical_threshold: 10, max_items: 6,
      show_ok: false, show_unavailable: true, include_unknown: false, include: [], exclude: [],
    });
    expect(() => card.setConfig({ type: "custom:auralis-batteries-card", low_threshold: "beaucoup" as never })).toThrow("low_threshold");
    expect(() => card.setConfig({ type: "custom:auralis-batteries-card", exclude: ["pas une entité"] })).toThrow("motif");
    expect(card.getGridOptions()).toEqual({ columns: 6, min_columns: 4, rows: "auto" });
    expect(batteries.AuralisBatteriesCard.getStubConfig()).toMatchObject({ low_threshold: 20 });
  });

  it("watches battery and monitored entities, and keeps the set while the entity list is stable", () => {
    const card = new batteries.AuralisBatteriesCard();
    card.setConfig({ type: "custom:auralis-batteries-card", exclude: ["sensor.salon_*"] });
    const list = house();
    card.hass = hassOf(list);
    const watched = (card as unknown as { watchedEntityIds(): Set<string> }).watchedEntityIds();
    expect([...watched].sort()).toEqual([
      "sensor.capt_temp_01_battery", "sensor.capt_temp_02_battery", "sensor.capt_temp_02_humidity",
      "sensor.capt_temp_02_temperature", "sensor.mod_arrosage_jardiniere_battery_state",
    ]);
    list[0] = state("sensor.capt_temp_01_battery", "8", { device_class: "battery" });
    card.hass = hassOf(list);
    expect((card as unknown as { watchedEntityIds(): Set<string> }).watchedEntityIds()).toBe(watched);
    card.hass = hassOf([...list, state("sensor.nouveau_battery", "50", { device_class: "battery" })]);
    expect((card as unknown as { watchedEntityIds(): Set<string> }).watchedEntityIds().has("sensor.nouveau_battery")).toBe(true);
  });

  it("changes its signature only when what it shows changes", () => {
    const options = batteries.discoveryOptions();
    const signature = (list: HassEntity[]): string => batteries.reportSignature(batteries.discoverBatteries(hassOf(list), options), false);
    const base = house();
    expect(signature([...base.slice(0, 5), state("sensor.salon_temperature", "22.1", { device_class: "temperature" })])).toBe(signature(base));
    expect(signature([state("sensor.capt_temp_01_battery", "8", { device_class: "battery" }), ...base.slice(1)])).not.toBe(signature(base));
  });
});
