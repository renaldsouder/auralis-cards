import { beforeAll, describe, expect, it, vi } from "vitest";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";
import type { ForecastEntry, WeatherCardConfig } from "../src/cards/auralis-weather-card";

let weather: typeof import("../src/cards/auralis-weather-card");
const state = (id: string, value: string, attributes: Record<string, unknown> = {}): HassEntity =>
  ({ entity_id: id, state: value, attributes });
const config: WeatherCardConfig = { type: "custom:auralis-weather-card", entity: "weather.maison" };
const NOW = Date.parse("2026-11-12T13:30:00Z"); // 14 h 30 à Paris

type Internals = {
  now: number;
  forecasts: Record<string, ForecastEntry[] | undefined>;
  syncForecasts(): void;
  view(): Record<string, unknown>;
};

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  weather = await import("../src/cards/auralis-weather-card");
});

describe("Auralis weather card", () => {
  it("requires a weather entity and validates optional entities", () => {
    const card = new weather.AuralisWeatherCard();
    card.setConfig({ ...config, forecast_count: 40, forecast_type: "minutely" as never });
    expect(card.config).toMatchObject({ theme: "carbon", sun_entity: "sun.sun", forecast_type: "daily", forecast_count: 12 });
    card.setConfig(config);
    expect(card.config?.forecast_count).toBeUndefined();
    expect(() => card.setConfig({ type: "custom:auralis-weather-card", entity: "sensor.meteo" })).toThrow();
    expect(() => card.setConfig({ ...config, temperature_entity: "weather.autre" })).toThrow();
    expect(() => card.setConfig({ ...config, sun_entity: "sensor.soleil" })).toThrow();
    expect(() => card.setConfig({ ...config, alert_entity: "pas une entité" })).toThrow();
  });

  it("maps conditions to French labels, night icons and skies", () => {
    expect(weather.conditionStyle("sunny", false)).toMatchObject({ label: "Ensoleillé", icon: "mdi:weather-sunny", stars: false });
    expect(weather.conditionStyle("sunny", true)).toMatchObject({ label: "Nuit claire", icon: "mdi:weather-night", stars: true });
    expect(weather.conditionStyle("partlycloudy", true)).toMatchObject({ icon: "mdi:weather-night-partly-cloudy", stars: true });
    const rainyNight = weather.conditionStyle("rainy", true);
    expect(rainyNight).toMatchObject({ label: "Pluie", stars: false });
    expect(rainyNight.sky.startsWith("linear-gradient(rgba(3,5,16,.48)")).toBe(true);
    expect(weather.conditionStyle("nouvelle-condition", false)).toMatchObject({ label: "nouvelle-condition", icon: "mdi:weather-partly-cloudy" });
  });

  it("reads forecast features and parses forecast entries", () => {
    expect(weather.forecastTypes(3)).toEqual(["daily", "hourly"]);
    expect(weather.forecastTypes(4)).toEqual(["twice_daily"]);
    expect(weather.forecastTypes(undefined)).toEqual([]);
    expect(weather.parseForecast([
      { datetime: "2026-11-13T00:00:00Z", condition: "rainy", temperature: "11,5", templow: 6, precipitation_probability: 70, wind_bearing: "SW" },
      { datetime: "pas une date", temperature: 3 },
      null,
      { datetime: "2026-11-12T00:00:00Z", condition: "sunny", temperature: 14, is_daytime: true },
    ])).toEqual([
      expect.objectContaining({ time: Date.parse("2026-11-12T00:00:00Z"), condition: "sunny", temperature: 14, daytime: true }),
      expect.objectContaining({ temperature: 11.5, low: 6, probability: 70, windBearing: "SW" }),
    ]);
    expect(weather.parseForecast("rien")).toEqual([]);
  });

  it("formats wind directions, greetings and vigilance levels", () => {
    expect(weather.windDirection(0)).toBe("N");
    expect(weather.windDirection(225)).toBe("SO");
    expect(weather.windDirection(-90)).toBe("O");
    expect(weather.windDirection("nw")).toBe("NO");
    expect(weather.windDirection("tempête")).toBeUndefined();
    expect([5, 12, 18, 22, 3].map(weather.greeting)).toEqual(["Bonjour", "Bon après-midi", "Bonsoir", "Bonne nuit", "Bonne nuit"]);
    expect(weather.alertLevel("Orange")).toEqual({ label: "Vigilance orange", color: "#ff9a5c" });
    expect(weather.alertLevel("green")?.label).toBe("Vigilance verte");
    expect(weather.alertLevel("unavailable")).toBeUndefined();
    expect(weather.alertLevel("Canicule")).toMatchObject({ label: "Canicule" });
  });

  it("finds night hours from the next sunset and sunrise", () => {
    const setting = Date.parse("2026-11-12T16:20:00Z");
    const rising = Date.parse("2026-11-13T07:10:00Z");
    expect(weather.nightAt(Date.parse("2026-11-12T15:00:00Z"), setting, rising)).toBe(false);
    expect(weather.nightAt(Date.parse("2026-11-12T22:00:00Z"), setting, rising)).toBe(true);
    expect(weather.nightAt(Date.parse("2026-11-13T12:00:00Z"), setting, rising)).toBe(false);
    expect(weather.nightAt(Date.parse("2026-11-14T03:00:00Z"), setting, rising)).toBe(true);
    expect(weather.nightAt(Date.now(), undefined, rising)).toBeUndefined();
  });

  it("builds temperature range bars from the outdoor colour scale", () => {
    expect(weather.rangePosition(5, 10, 0, 20)).toEqual({ start: 25, size: 25 });
    expect(weather.rangePosition(12, 4, 0, 20)).toEqual({ start: 20, size: 40 });
    expect(weather.rangePosition(3, 3, 3, 3)).toEqual({ start: 0, size: 100 });
    const thresholds = [{ below: 10, color: "#111111" }, { color: "#222222" }];
    expect(weather.rangeGradient(thresholds, 12, 18)).toBe("linear-gradient(90deg, #222222 0%, #222222 100%)");
    expect(weather.rangeGradient(thresholds, 15, 15)).toBe("linear-gradient(90deg, #222222, #222222)");
    expect(weather.rangeGradient(thresholds, 0, 20, "0deg")).toBe("linear-gradient(0deg, #111111 0%, #111111 47%, #222222 53%, #222222 100%)");
  });

  it("subscribes once per forecast type and drops stale subscriptions", async () => {
    const unsubscribe = vi.fn();
    const callbacks: Array<(message: { forecast: unknown }) => void> = [];
    const subscribeMessage = vi.fn(async (callback: (message: { forecast: unknown }) => void) => {
      callbacks.push(callback);
      return unsubscribe;
    });
    const hass = (entityId: string): HomeAssistant => ({
      states: { [entityId]: state(entityId, "cloudy", { supported_features: 3 }) },
      callService: vi.fn(async () => undefined),
      connection: { subscribeMessage: subscribeMessage as never },
    });
    const card = new weather.AuralisWeatherCard();
    Object.defineProperty(card, "isConnected", { value: true });
    const internals = card as unknown as Internals;
    card.setConfig({ ...config, forecast_type: "hourly" });
    card.hass = hass("weather.maison");
    internals.syncForecasts();
    internals.syncForecasts();
    expect(subscribeMessage).toHaveBeenCalledTimes(2);
    expect(subscribeMessage.mock.calls.map((call) => (call as unknown[])[1])).toEqual([
      { type: "weather/subscribe_forecast", forecast_type: "daily", entity_id: "weather.maison" },
      { type: "weather/subscribe_forecast", forecast_type: "hourly", entity_id: "weather.maison" },
    ]);
    callbacks[1]({ forecast: [{ datetime: "2026-11-12T14:00:00Z", temperature: 12 }] });
    expect(internals.forecasts.hourly).toHaveLength(1);

    card.setConfig({ ...config, entity: "weather.chalet" });
    card.hass = hass("weather.chalet");
    internals.syncForecasts();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(unsubscribe).toHaveBeenCalledTimes(2);
    expect(subscribeMessage).toHaveBeenCalledTimes(4);
    callbacks[1]({ forecast: [{ datetime: "2026-11-12T15:00:00Z", temperature: 99 }] });
    expect(internals.forecasts.hourly).toBeUndefined();
  });

  it("retries a failed forecast subscription with a growing delay", async () => {
    vi.useFakeTimers();
    expect([0, 1, 2, 3, 4, 9].map(weather.forecastRetryDelay)).toEqual([30_000, 60_000, 120_000, 240_000, 300_000, 300_000]);
    const subscribeMessage = vi.fn(async () => { throw new Error("weather/subscribe_forecast inconnu"); });
    const card = new weather.AuralisWeatherCard();
    Object.defineProperty(card, "isConnected", { value: true });
    const internals = card as unknown as Internals & { forecastError: boolean };
    card.setConfig({ ...config, forecast_type: "daily" });
    card.hass = {
      states: { "weather.maison": state("weather.maison", "cloudy", { supported_features: 1 }) },
      callService: vi.fn(async () => undefined),
      connection: { subscribeMessage: subscribeMessage as never },
    };
    internals.syncForecasts();
    await vi.advanceTimersByTimeAsync(0);
    expect(internals.forecastError).toBe(true);
    expect(subscribeMessage).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(subscribeMessage).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(subscribeMessage).toHaveBeenCalledTimes(2);
    // Deuxième échec : nouvel essai une minute plus tard.
    await vi.advanceTimersByTimeAsync(59_999);
    expect(subscribeMessage).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(subscribeMessage).toHaveBeenCalledTimes(3);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("keeps the last forecasts while the weather entity is briefly unavailable", () => {
    const subscribeMessage = vi.fn(async () => () => undefined);
    const card = new weather.AuralisWeatherCard();
    Object.defineProperty(card, "isConnected", { value: true });
    const internals = card as unknown as Internals;
    card.setConfig(config);
    const hass = (value: string, attributes: Record<string, unknown>): HomeAssistant => ({
      states: { "weather.maison": state("weather.maison", value, attributes) },
      callService: vi.fn(async () => undefined),
      connection: { subscribeMessage: subscribeMessage as never },
    });
    card.hass = hass("sunny", { supported_features: 3 });
    internals.syncForecasts();
    expect(subscribeMessage).toHaveBeenCalledTimes(2);
    const daily = weather.parseForecast([{ datetime: "2026-11-12T00:00:00Z", temperature: 12 }]);
    internals.forecasts = { daily };
    card.hass = hass("unavailable", {});
    internals.syncForecasts();
    expect(subscribeMessage).toHaveBeenCalledTimes(2);
    expect(internals.forecasts.daily).toBe(daily);
    card.hass = hass("sunny", { supported_features: 3 });
    internals.syncForecasts();
    expect(subscribeMessage).toHaveBeenCalledTimes(2);
    expect(internals.forecasts.daily).toBe(daily);
  });

  it("follows the sun entity and falls back to day/night forecasts in the detail", () => {
    const card = new weather.AuralisWeatherCard();
    const internals = card as unknown as Internals & {
      extraWatchedEntities(): string[];
      detailDays(state?: HassEntity): { type: string; entries: ForecastEntry[] };
    };
    card.setConfig(config);
    expect(internals.extraWatchedEntities()).toEqual(["sun.sun"]);
    card.setConfig({ ...config, sun_entity: "sun.maison" });
    expect(internals.extraWatchedEntities()).toEqual(["sun.maison"]);

    card.hass = { config: { time_zone: "Europe/Paris" }, states: {}, callService: vi.fn(async () => undefined) };
    internals.now = NOW;
    internals.forecasts = { twice_daily: weather.parseForecast([
      { datetime: "2026-11-12T06:00:00Z", temperature: 12, is_daytime: true },
      { datetime: "2026-11-12T18:00:00Z", temperature: 5, is_daytime: false },
    ]) };
    expect(internals.detailDays(state("weather.maison", "sunny", { supported_features: 4 }))).toMatchObject({ type: "twice_daily", entries: [{ temperature: 12 }, { temperature: 5 }] });
  });

  it("prefers local sensors and summarises today from the forecasts", () => {
    const card = new weather.AuralisWeatherCard();
    const internals = card as unknown as Internals;
    card.setConfig({ ...config, temperature_entity: "sensor.porche", humidity_entity: "sensor.porche_humidite", alert_entity: "sensor.vigilance" });
    card.hass = {
      config: { time_zone: "Europe/Paris" },
      states: {
        "weather.maison": state("weather.maison", "sunny", {
          friendly_name: "Maison", temperature: 9, temperature_unit: "°C", humidity: 70, apparent_temperature: 7,
          wind_speed: 14, wind_speed_unit: "km/h", wind_bearing: 315, supported_features: 3,
        }),
        "sensor.porche": state("sensor.porche", "10.6", { unit_of_measurement: "°C" }),
        "sensor.porche_humidite": state("sensor.porche_humidite", "unavailable"),
        "sensor.vigilance": state("sensor.vigilance", "Jaune"),
        "sun.sun": state("sun.sun", "above_horizon", { next_setting: "2026-11-12T16:20:00Z", next_rising: "2026-11-13T07:10:00Z" }),
      },
      callService: vi.fn(async () => undefined),
    };
    internals.now = NOW;
    internals.forecasts = {
      daily: weather.parseForecast([
        { datetime: "2026-11-11T23:00:00Z", condition: "sunny", temperature: 13, templow: 4, precipitation_probability: 10 },
        { datetime: "2026-11-12T23:00:00Z", condition: "rainy", temperature: 11, templow: 6 },
      ]),
      hourly: weather.parseForecast([
        { datetime: "2026-11-12T12:00:00Z", precipitation_probability: 90 },
        { datetime: "2026-11-12T14:00:00Z", precipitation_probability: 10 },
        { datetime: "2026-11-12T15:00:00Z", precipitation_probability: 35 },
        { datetime: "2026-11-12T16:00:00Z", precipitation_probability: 20 },
        { datetime: "2026-11-12T17:00:00Z", precipitation_probability: 80 },
      ]),
    };
    expect(internals.view()).toMatchObject({
      available: true, night: false, place: "Maison", temperature: 10.6, localTemperature: true, temperatureUnit: "°C",
      humidity: 70, feelsLike: 7, windSpeed: 14, windDirection: "NO", high: 13, low: 4, rain: 35,
      style: { label: "Ensoleillé" }, alert: { label: "Vigilance jaune" },
    });
  });
});
