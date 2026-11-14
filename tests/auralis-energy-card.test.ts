import { beforeAll, describe, expect, it, vi } from "vitest";
import type { HassEntity } from "../src/types/home-assistant";

let energy: typeof import("../src/cards/auralis-energy-card");
const state = (id: string, attributes: Record<string, unknown> = {}): HassEntity => ({ entity_id: id, state: "1", attributes });

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  energy = await import("../src/cards/auralis-energy-card");
});

describe("Auralis energy card", () => {
  it("converts electricity to kWh by default and keeps a chosen energy unit", () => {
    expect(energy.energyProfile(state("sensor.compteur", { unit_of_measurement: "Wh", device_class: "energy" }), {}))
      .toMatchObject({ unit: "kWh", units: { energy: "kWh" }, decimals: 1, eyebrow: "Énergie", title: "Consommation électrique" });
    expect(energy.energyProfile(undefined, {})).toMatchObject({ unit: "kWh", units: { energy: "kWh" } });
    expect(energy.energyProfile(state("sensor.compteur", { unit_of_measurement: "kWh" }), { unit: "Wh" }))
      .toMatchObject({ unit: "Wh", units: { energy: "Wh" }, decimals: 0 });
  });

  it("follows gas and water meters in their own units", () => {
    expect(energy.energyProfile(state("sensor.gaz", { unit_of_measurement: "m³", device_class: "gas" }), {}))
      .toMatchObject({ unit: "m³", units: { volume: "m³" }, decimals: 2, eyebrow: "Gaz", icon: "mdi:fire", rateLabel: "Débit instantané" });
    expect(energy.energyProfile(state("sensor.eau", { unit_of_measurement: "m³", device_class: "water" }), { unit: "L" }))
      .toMatchObject({ unit: "L", units: { volume: "L" }, decimals: 0, eyebrow: "Eau", title: "Consommation d’eau" });
    expect(energy.energyProfile(state("sensor.pellets", { unit_of_measurement: "kg" }), { decimals: 9 }))
      .toMatchObject({ unit: "kg", units: undefined, decimals: 3 });
  });

  it("shows the meter index in the card unit and decimals", () => {
    const meter = { entity_id: "sensor.compteur", state: "12345", attributes: { unit_of_measurement: "Wh" } };
    expect(energy.meterReading(meter, { unit: "kWh", decimals: 1 }).replace(/\s/g, " ")).toBe("12,3 kWh");
    const water = { entity_id: "sensor.eau", state: "1.5", attributes: { unit_of_measurement: "m³" } };
    expect(energy.meterReading(water, { unit: "L", decimals: 0 }).replace(/\s/g, " ")).toBe("1 500 L");
    const pellets = { entity_id: "sensor.pellets", state: "42.25", attributes: { unit_of_measurement: "kg" } };
    expect(energy.meterReading(pellets, { unit: "kWh", decimals: 1 })).toBe("42,3 kg");
    expect(energy.meterReading(undefined, { unit: "kWh", decimals: 1 })).toBe("—");
    expect(energy.convertMeterValue(2, "MWh", "kWh")).toBe(2000);
    expect(energy.convertMeterValue(2, "kg", "kWh")).toBeUndefined();
  });

  it("opens a detailed view from its header when navigation_path is set", () => {
    const text = (value: unknown): string => {
      if (Array.isArray(value)) return value.map(text).join("");
      if (value && typeof value === "object" && "strings" in value && "values" in value) {
        const result = value as { strings: readonly string[]; values: unknown[] };
        return result.strings.join("") + result.values.map(text).join("");
      }
      return "";
    };
    const card = new energy.AuralisEnergyCard();
    const header = (card as unknown as { renderHeader(profile: unknown): unknown }).renderHeader.bind(card);
    const profile = { icon: "mdi:lightning-bolt", eyebrow: "Énergie", title: "Consommation électrique" };
    card.setConfig({ type: "custom:auralis-energy-card", energy_entity: "sensor.compteur" });
    expect(text(header(profile))).toContain("<header");
    card.setConfig({ type: "custom:auralis-energy-card", energy_entity: "sensor.compteur", navigation_path: "/maison/energie" });
    expect(text(header(profile))).toContain("<button");
    expect(text(header(profile))).toContain("open-view");
    expect(() => card.setConfig({ type: "custom:auralis-energy-card", energy_entity: "sensor.compteur", navigation_path: "https://exemple.fr" })).toThrow("navigation_path");
    expect(energy.AuralisEnergyCard.getConfigForm().schema.map(({ name }) => name)).toContain("navigation_path");
  });

  it("retries a failed history load after 30 s, then backs off up to 5 minutes", () => {
    expect(energy.historyRetryDelay(0)).toBe(300_000);
    expect(energy.historyRetryDelay(1)).toBe(30_000);
    expect(energy.historyRetryDelay(2)).toBe(60_000);
    expect(energy.historyRetryDelay(3)).toBe(120_000);
    expect(energy.historyRetryDelay(10)).toBe(300_000);
  });

  it("follows the Home Assistant theme by default and offers colours in the editor", () => {
    const card = new energy.AuralisEnergyCard();
    card.setConfig({ type: "custom:auralis-energy-card", energy_entity: "sensor.compteur" });
    expect(card.config?.theme).toBe("auto");
    const fields = energy.AuralisEnergyCard.getConfigForm().schema.map(({ name }) => name);
    expect(fields).toEqual(expect.arrayContaining(["accent_color", "card_background"]));
  });
});

describe("Auralis energy cost", () => {
  const hourly = (from: string, to: string) => {
    const stats = [];
    for (let start = Date.parse(from); start < Date.parse(to); start += 3_600_000) stats.push({ start, change: 1 });
    return stats;
  };

  it("prices each kWh with a plain price, in the card unit", () => {
    const tariff = energy.resolveTariff({ price: 0.2016 }, undefined, "kWh")!;
    expect(tariff).toMatchObject({ basis: "kWh", factor: 1, rate: 0.2016, subscription: 0, currency: "€" });
    expect(energy.formatCost(energy.dayCost(9.13, 0, tariff), tariff.currency)).toBe("1,84 €");
    // Une carte en Wh garde un prix par kWh.
    const wh = energy.resolveTariff({ price: 0.2016 }, undefined, "Wh")!;
    expect(wh).toMatchObject({ basis: "kWh", factor: 0.001 });
    expect(energy.dayCost(9130, 0, wh)).toBeCloseTo(1.8406, 4);
    // Un compteur de gaz est facturé par m³.
    const gas = energy.resolveTariff({ price: "1,25" as unknown as number }, undefined, "m³")!;
    expect(gas).toMatchObject({ basis: "m³", factor: 1, rate: 1.25 });
    expect(energy.formatRate(gas.rate, gas)).toBe("1,25 €/m³");
    expect(energy.resolveTariff({}, undefined, "kWh")).toBeUndefined();
    expect(energy.resolveTariff({ price: 0.2, show_cost: false }, undefined, "kWh")).toBeUndefined();
  });

  it("adds the daily subscription to each known day only", () => {
    const tariff = energy.resolveTariff({ price: 0.2, subscription_per_day: 0.5, currency: "CHF" }, undefined, "kWh")!;
    expect(energy.dayCost(10, 0, tariff)).toBeCloseTo(2.5);
    expect(energy.dayCost(0, 0, tariff)).toBeCloseTo(0.5);
    expect(energy.dayCost(undefined, 0, tariff)).toBeUndefined();
    expect(energy.formatCost(2.5, tariff.currency)).toBe("2,50 CHF");
  });

  it("parses off-peak ranges, including ranges crossing midnight", () => {
    expect(energy.parseOffpeakHours(["22:00-06:00"])).toEqual([[1320, 1440], [0, 360]]);
    expect(energy.parseOffpeakHours("01:30-07:30, 12h30-14h30")).toEqual([[90, 450], [750, 870]]);
    expect(energy.parseOffpeakHours(["23:00-00:00", "25:00-01:00", "nuit", "08:00-08:00", "07:61-08:00"])).toEqual([[1380, 1440]]);
    const ranges = energy.parseOffpeakHours(["22:00-06:00"]);
    expect(energy.offpeakShare(23 * 60, ranges)).toBe(1);
    expect(energy.offpeakShare(6 * 60, ranges)).toBe(0);
    expect(energy.offpeakShare(5 * 60 + 30, ranges)).toBe(0.5);
    // Heure commençant à 23:30 (fuseau décalé d'une demi-heure) : entièrement creuse.
    expect(energy.offpeakShare(23 * 60 + 30, ranges)).toBe(1);
    expect(energy.offpeakShare(60, energy.parseOffpeakHours("01:30-07:30"))).toBe(0.5);

    const tariff = energy.resolveTariff({ price: 0.25, offpeak_price: 0.18, offpeak_hours: "22:00-06:00" }, undefined, "kWh")!;
    expect(tariff.offpeakRate).toBe(0.18);
    expect(energy.dayCost(10, 4, tariff)).toBeCloseTo(6 * 0.25 + 4 * 0.18);
    // Sans plage horaire, le prix des heures creuses est ignoré.
    expect(energy.resolveTariff({ price: 0.25, offpeak_price: 0.18 }, undefined, "kWh")!.offpeakRate).toBeUndefined();
  });

  it("buckets hours by local day in Europe/Paris across daylight saving changes", () => {
    const ranges = energy.parseOffpeakHours(["22:00-06:00"]);
    expect(energy.localClock(Date.parse("2026-03-29T01:00:00Z"), "Europe/Paris")).toEqual({ day: Date.parse("2026-03-29"), minute: 180 });
    // Passage à l'heure d'été : 23 heures, dont 7 creuses (00 h, 01 h, 03 h, 04 h, 05 h, 22 h, 23 h).
    const spring = energy.bucketHourly(hourly("2026-03-28T23:00:00Z", "2026-03-29T22:00:00Z"), "Europe/Paris", ranges);
    expect([...spring.keys()]).toEqual([Date.parse("2026-03-29")]);
    expect(spring.get(Date.parse("2026-03-29"))).toEqual({ total: 23, offpeak: 7 });
    // Passage à l'heure d'hiver : 25 heures, dont 9 creuses (02 h compte deux fois).
    const autumn = energy.bucketHourly(hourly("2026-10-24T22:00:00Z", "2026-10-25T23:00:00Z"), "Europe/Paris", ranges);
    expect([...autumn.keys()]).toEqual([Date.parse("2026-10-25")]);
    expect(autumn.get(Date.parse("2026-10-25"))).toEqual({ total: 25, offpeak: 9 });
    // Valeurs invalides ignorées.
    expect(energy.bucketHourly([{ start: 0, change: -1 }, { start: 0, change: null }], "Europe/Paris", ranges).size).toBe(0);
  });

  it("reads the price sensor unit and falls back to the fixed price", () => {
    expect(energy.parsePriceUnit("EUR/kWh")).toEqual({ factor: 1, per: "kWh" });
    expect(energy.parsePriceUnit("€/kWh")).toEqual({ factor: 1, per: "kWh" });
    expect(energy.parsePriceUnit("c€/kWh")).toEqual({ factor: 0.01, per: "kWh" });
    expect(energy.parsePriceUnit("€/m3")).toEqual({ factor: 1, per: "m³" });
    expect(energy.parsePriceUnit("EUR")).toEqual({ factor: 1, per: undefined });
    expect(energy.parsePriceUnit(undefined)).toEqual({ factor: 1 });

    const price = (value: string, unit: string): HassEntity => ({ entity_id: "sensor.prix", state: value, attributes: { unit_of_measurement: unit } });
    const config = { price_entity: "sensor.prix", price: 0.1 };
    expect(energy.resolveTariff(config, price("201.6", "EUR/MWh"), "kWh")!.rate).toBeCloseTo(0.2016);
    expect(energy.resolveTariff(config, price("20.16", "c€/kWh"), "kWh")!.rate).toBeCloseTo(0.2016);
    expect(energy.resolveTariff(config, price("0.2016", "EUR/kWh"), "Wh")).toMatchObject({ rate: 0.2016, factor: 0.001 });
    expect(energy.resolveTariff(config, price("unavailable", "EUR/kWh"), "kWh")!.rate).toBe(0.1);
    expect(energy.resolveTariff({ price_entity: "sensor.prix" }, undefined, "kWh")).toBeUndefined();
  });

  it("formats costs in French with a non-breaking space", () => {
    expect(energy.formatCost(1.8406)).toBe("1,84 €");
    expect(energy.formatCost(0)).toBe("0,00 €");
    expect(energy.formatCost(1234.5).replace(/\s/g, " ")).toBe("1 234,50 €");
    expect(energy.formatCost(undefined)).toBe("—");
    expect(energy.formatRate(0.2016, { currency: "€", basis: "kWh" })).toBe("0,2016 €/kWh");
  });

  it("asks the Recorder for hourly statistics only when off-peak hours are priced", async () => {
    vi.stubGlobal("window", { setTimeout: vi.fn(), clearTimeout: vi.fn() });
    const callWS = vi.fn(async (message: Record<string, unknown>) => ({
      "sensor.compteur": message.period === "hour" ? hourly("2026-03-28T23:00:00Z", "2026-03-29T22:00:00Z") : [],
    }));
    const load = async (extra: Record<string, unknown>) => {
      const card = new energy.AuralisEnergyCard();
      Object.defineProperty(card, "isConnected", { value: true });
      card.setConfig({ type: "custom:auralis-energy-card", energy_entity: "sensor.compteur", price: 0.25, ...extra });
      card.hass = { states: {}, callService: vi.fn(), callWS: callWS as HomeAssistantCallWS, config: { time_zone: "Europe/Paris" } };
      await (card as unknown as { refreshHistory(): Promise<void> }).refreshHistory();
      return card as unknown as { history?: Map<number, number>; offpeakHistory?: Map<number, number> };
    };
    const plain = await load({});
    expect(callWS).toHaveBeenLastCalledWith(expect.objectContaining({ period: "day" }));
    expect(plain.offpeakHistory).toBeUndefined();
    const offpeak = await load({ offpeak_price: 0.18, offpeak_hours: ["22:00-06:00"] });
    expect(callWS).toHaveBeenLastCalledWith(expect.objectContaining({ period: "hour" }));
    expect(offpeak.history?.get(Date.parse("2026-03-29"))).toBe(23);
    expect(offpeak.offpeakHistory?.get(Date.parse("2026-03-29"))).toBe(7);
  });

  it("offers the cost options in the editor", () => {
    const form = energy.AuralisEnergyCard.getConfigForm();
    const fields = form.schema.map(({ name }) => name);
    expect(fields).toEqual(expect.arrayContaining(["price", "price_entity", "currency", "subscription_per_day", "offpeak_price", "offpeak_hours", "show_cost"]));
    expect(form.computeLabel({ name: "offpeak_hours" })).toMatch(/Heures creuses/);
  });
});

type HomeAssistantCallWS = NonNullable<import("../src/types/home-assistant").HomeAssistant["callWS"]>;
