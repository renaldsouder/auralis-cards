import { css, html, nothing, svg, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import {
  chartPaths, chartRange, gradientStops, normalizeThresholds, OUTDOOR_THRESHOLDS, temperatureBand, type ClimateThreshold,
} from "./auralis-climate-card";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { fireMoreInfo } from "../utils/actions";
import { entity, formatNumber, friendlyName, isAvailable, numericState } from "../utils/entities";

export type ForecastType = "daily" | "hourly" | "twice_daily";

export interface WeatherCardConfig extends BaseCardConfig {
  /** Entité météo (weather.*) : conditions actuelles et prévisions. */
  entity: string;
  /** Capteur local de température, prioritaire sur celle du service météo. */
  temperature_entity?: string;
  /** Capteur local d'humidité, prioritaire sur celle du service météo. */
  humidity_entity?: string;
  /** Entité soleil pour le lever, le coucher et le mode nuit. */
  sun_entity?: string;
  /** Entité de vigilance (ex. Météo-France) : vert, jaune, orange ou rouge. */
  alert_entity?: string;
  forecast_type?: ForecastType;
  forecast_count?: number;
  show_clock?: boolean;
  show_greeting?: boolean;
  show_forecast?: boolean;
  /** Fond qui suit le temps et le jour ou la nuit (actif par défaut, ignoré si card_background est défini). */
  dynamic_background?: boolean;
  thresholds?: ClimateThreshold[];
}

export interface ForecastEntry {
  time: number;
  condition?: string;
  temperature?: number;
  low?: number;
  precipitation?: number;
  probability?: number;
  windSpeed?: number;
  windBearing?: number | string;
  humidity?: number;
  daytime?: boolean;
}

export interface ConditionStyle {
  label: string;
  icon: string;
  color: string;
  sky: string;
  stars: boolean;
}

type SkyFamily = "sun" | "partly" | "night" | "cloud" | "fog" | "rain" | "storm" | "snow" | "wind" | "alert";

interface ConditionDefinition {
  label: string;
  icon: string;
  color: string;
  family: SkyFamily;
  nightIcon?: string;
  nightColor?: string;
  nightLabel?: string;
}

const CONDITIONS: Record<string, ConditionDefinition> = {
  "clear-night": { label: "Nuit claire", icon: "mdi:weather-night", color: "#d8ccff", family: "night" },
  sunny: { label: "Ensoleillé", icon: "mdi:weather-sunny", color: "#ffc45f", family: "sun", nightIcon: "mdi:weather-night", nightColor: "#d8ccff", nightLabel: "Nuit claire" },
  partlycloudy: { label: "Éclaircies", icon: "mdi:weather-partly-cloudy", color: "#ffd27a", family: "partly", nightIcon: "mdi:weather-night-partly-cloudy", nightColor: "#c9b8ff" },
  cloudy: { label: "Nuageux", icon: "mdi:weather-cloudy", color: "#c3cfdc", family: "cloud" },
  fog: { label: "Brouillard", icon: "mdi:weather-fog", color: "#b8c2cc", family: "fog" },
  rainy: { label: "Pluie", icon: "mdi:weather-rainy", color: "#5aa9ff", family: "rain" },
  pouring: { label: "Fortes pluies", icon: "mdi:weather-pouring", color: "#4d8dff", family: "rain" },
  lightning: { label: "Orages", icon: "mdi:weather-lightning", color: "#c08cff", family: "storm" },
  "lightning-rainy": { label: "Orages et pluie", icon: "mdi:weather-lightning-rainy", color: "#c08cff", family: "storm" },
  snowy: { label: "Neige", icon: "mdi:weather-snowy", color: "#e4f6ff", family: "snow" },
  "snowy-rainy": { label: "Pluie et neige", icon: "mdi:weather-snowy-rainy", color: "#bfe9ff", family: "snow" },
  hail: { label: "Grêle", icon: "mdi:weather-hail", color: "#bfe9ff", family: "snow" },
  windy: { label: "Venteux", icon: "mdi:weather-windy", color: "#6fe0c8", family: "wind" },
  "windy-variant": { label: "Venteux et nuageux", icon: "mdi:weather-windy-variant", color: "#6fe0c8", family: "wind" },
  exceptional: { label: "Conditions exceptionnelles", icon: "mdi:alert-circle-outline", color: "#ff6b74", family: "alert" },
};

const SKIES: Record<SkyFamily, string> = {
  sun: "radial-gradient(circle at 88% 4%, rgba(255,196,95,.5), transparent 42%), linear-gradient(165deg,#173a63 0%,#1f527f 52%,#0c1a2b 100%)",
  partly: "radial-gradient(circle at 88% 4%, rgba(255,210,122,.32), transparent 40%), linear-gradient(165deg,#1d3550 0%,#2a4763 52%,#0e1824 100%)",
  night: "radial-gradient(circle at 82% 8%, rgba(183,156,255,.3), transparent 40%), linear-gradient(165deg,#0c1033 0%,#171b4a 55%,#06081a 100%)",
  cloud: "linear-gradient(165deg,#262f3b 0%,#36404e 52%,#141920 100%)",
  fog: "linear-gradient(180deg,#363c44 0%,#2b3138 48%,#15191e 100%)",
  rain: "radial-gradient(circle at 85% 0%, rgba(90,169,255,.25), transparent 45%), linear-gradient(165deg,#13263b 0%,#1b3450 52%,#0a131e 100%)",
  storm: "radial-gradient(circle at 80% 0%, rgba(192,140,255,.3), transparent 42%), linear-gradient(165deg,#1b1430 0%,#2a1f48 52%,#0c0916 100%)",
  snow: "radial-gradient(circle at 85% 0%, rgba(228,246,255,.25), transparent 45%), linear-gradient(165deg,#1d2e3e 0%,#2e475c 52%,#0f1821 100%)",
  wind: "linear-gradient(165deg,#132d2c 0%,#1e433e 52%,#0b1918 100%)",
  alert: "linear-gradient(165deg,#3a1519 0%,#4a1d23 52%,#160709 100%)",
};

const NIGHT_VEIL = "linear-gradient(rgba(3,5,16,.48),rgba(3,5,16,.48))";
const UNKNOWN_CONDITION: ConditionDefinition = { label: "—", icon: "mdi:weather-partly-cloudy", color: "#c3cfdc", family: "cloud" };
const FORECAST_FEATURES: Array<[ForecastType, number]> = [["daily", 1], ["hourly", 2], ["twice_daily", 4]];
const DEFAULT_COUNTS: Record<ForecastType, number> = { daily: 5, hourly: 8, twice_daily: 6 };
const DAY = 86_400_000;
const HOUR = 3_600_000;
const RAIN_COLOR = "#5aa9ff";
const NEUTRAL_COLOR = "#93a2b5";
const WEATHER_ID = /^weather\.[a-z0-9_]+$/;
const SENSOR_ID = /^sensor\.[a-z0-9_]+$/;
const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/;
const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const toNumber = (value: unknown): number | undefined => {
  const number = typeof value === "string" ? Number.parseFloat(value.replace(",", ".")) : value;
  return isNumber(number) ? number : undefined;
};

/** Libellé, icône, couleur et ciel d'une condition Home Assistant, de jour ou de nuit. */
export function conditionStyle(condition: string | undefined, night: boolean): ConditionStyle {
  const definition = (condition && CONDITIONS[condition]) || { ...UNKNOWN_CONDITION, label: condition || UNKNOWN_CONDITION.label };
  const family: SkyFamily = night && (definition.family === "sun" || definition.family === "partly") ? "night" : definition.family;
  return {
    label: (night && definition.nightLabel) || definition.label,
    icon: (night && definition.nightIcon) || definition.icon,
    color: (night && definition.nightColor) || definition.color,
    sky: night && family !== "night" ? `${NIGHT_VEIL}, ${SKIES[family]}` : SKIES[family],
    stars: night && (family === "night" || definition.family === "partly"),
  };
}

/** Types de prévisions annoncés par l'entité (attribut supported_features). */
export function forecastTypes(features: unknown): ForecastType[] {
  return isNumber(features) ? FORECAST_FEATURES.filter(([, bit]) => (features & bit) !== 0).map(([type]) => type) : [];
}

export function parseForecast(raw: unknown): ForecastEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item: Record<string, unknown> | null) => {
    const time = Date.parse(String(item?.datetime ?? ""));
    if (!item || !Number.isFinite(time)) return [];
    const bearing = item.wind_bearing;
    return [{
      time,
      condition: typeof item.condition === "string" ? item.condition : undefined,
      temperature: toNumber(item.temperature),
      low: toNumber(item.templow),
      precipitation: toNumber(item.precipitation),
      probability: toNumber(item.precipitation_probability),
      windSpeed: toNumber(item.wind_speed),
      windBearing: isNumber(bearing) || typeof bearing === "string" ? bearing : undefined,
      humidity: toNumber(item.humidity),
      daytime: typeof item.is_daytime === "boolean" ? item.is_daytime : undefined,
    }];
  }).sort((a, b) => a.time - b.time);
}

/** Direction du vent en points cardinaux français (degrés ou abréviation anglaise). */
export function windDirection(bearing: unknown): string | undefined {
  const degrees = toNumber(bearing);
  if (degrees !== undefined) return DIRECTIONS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
  if (typeof bearing !== "string" || !/^[nsewo]{1,3}$/i.test(bearing.trim())) return undefined;
  return bearing.trim().toUpperCase().replaceAll("W", "O");
}

export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Bonjour";
  if (hour >= 12 && hour < 18) return "Bon après-midi";
  if (hour >= 18 && hour < 22) return "Bonsoir";
  return "Bonne nuit";
}

/**
 * Nuit à l'instant `time`, d'après les prochains coucher et lever du soleil.
 * La nuit commence à un coucher et dure (lever − coucher) modulo 24 h ; on la répète de jour en jour.
 */
export function nightAt(time: number, nextSetting?: number, nextRising?: number): boolean | undefined {
  if (!isNumber(nextSetting) || !isNumber(nextRising)) return undefined;
  const modulo = (value: number): number => ((value % DAY) + DAY) % DAY;
  return modulo(time - nextSetting) < modulo(nextRising - nextSetting);
}

export interface AlertLevel {
  label: string;
  color: string;
}

export function alertLevel(state: string | undefined): AlertLevel | undefined {
  const value = state?.trim().toLowerCase();
  if (!value || value === "unknown" || value === "unavailable") return undefined;
  if (["vert", "verte", "green", "0", "1"].includes(value)) return { label: "Vigilance verte", color: "#5bd69b" };
  if (["jaune", "yellow", "2"].includes(value)) return { label: "Vigilance jaune", color: "#f5d547" };
  if (["orange", "3"].includes(value)) return { label: "Vigilance orange", color: "#ff9a5c" };
  if (["rouge", "red", "4"].includes(value)) return { label: "Vigilance rouge", color: "#ff6b74" };
  return { label: state!.trim(), color: NEUTRAL_COLOR };
}

/** Dégradé CSS d'une barre de températures : du plus froid (début) au plus chaud (fin). */
export function rangeGradient(thresholds: ClimateThreshold[], low: number, high: number, direction = "90deg"): string {
  const stops = gradientStops(thresholds, Math.min(low, high), Math.max(low, high));
  if (stops.length === 1) return `linear-gradient(${direction}, ${stops[0].color}, ${stops[0].color})`;
  const parts = [...stops].reverse().map((stop) => `${stop.color} ${Math.round((1 - stop.offset) * 1000) / 10}%`);
  return `linear-gradient(${direction}, ${parts.join(", ")})`;
}

/** Position d'une plage [low, high] dans l'échelle [min, max], en pourcentages. */
export function rangePosition(low: number, high: number, min: number, max: number): { start: number; size: number } {
  const span = max - min;
  if (!(span > 0)) return { start: 0, size: 100 };
  const clamp = (value: number): number => Math.min(100, Math.max(0, value));
  const start = clamp(((Math.min(low, high) - min) / span) * 100);
  const end = clamp(((Math.max(low, high) - min) / span) * 100);
  return { start: Math.round(start * 10) / 10, size: Math.round((end - start) * 10) / 10 };
}

interface Slot {
  entry: ForecastEntry;
  label: string;
  style: ConditionStyle;
  current: boolean;
}

interface WeatherView {
  state?: HassEntity;
  available: boolean;
  night: boolean;
  style: ConditionStyle;
  place: string;
  temperature?: number;
  temperatureUnit: string;
  localTemperature: boolean;
  feelsLike?: number;
  humidity?: number;
  windSpeed?: number;
  windUnit?: string;
  windDirection?: string;
  high?: number;
  low?: number;
  rain?: number;
  nextRising?: number;
  nextSetting?: number;
  alert?: AlertLevel;
}

type Unsubscribe = () => unknown;

export class AuralisWeatherCard extends AuralisBaseCard<WeatherCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    forecasts: { state: true },
    forecastError: { state: true },
    now: { state: true },
    detailTab: { state: true },
  };

  static styles = [AuralisBaseCard.styles, css`
    .weather-shell, .weather-content { min-height:0; }
    .weather-shell { transition:background .6s ease; }
    .stars { position:absolute; inset:0; opacity:.55; pointer-events:none; background-image:
      radial-gradient(1px 1px at 8% 14%, #fff, transparent 70%), radial-gradient(1px 1px at 19% 38%, #fff, transparent 70%),
      radial-gradient(1.5px 1.5px at 31% 9%, #fff, transparent 70%), radial-gradient(1px 1px at 44% 27%, #fff, transparent 70%),
      radial-gradient(1px 1px at 57% 6%, #fff, transparent 70%), radial-gradient(1.5px 1.5px at 66% 33%, #fff, transparent 70%),
      radial-gradient(1px 1px at 74% 15%, #fff, transparent 70%), radial-gradient(1px 1px at 92% 29%, #fff, transparent 70%),
      radial-gradient(1px 1px at 13% 58%, #fff, transparent 70%), radial-gradient(1px 1px at 51% 48%, #fff, transparent 70%); }
    .weather-top { display:flex; min-height:24px; align-items:center; justify-content:space-between; gap:10px; }
    .eyebrow-line { overflow:hidden; color:#d3dcea; font-size:12px; font-weight:650; text-overflow:ellipsis; white-space:nowrap; }
    .eyebrow-line::first-letter { text-transform:uppercase; }
    .chip { --band:#93a2b5; display:inline-flex; min-height:30px; align-items:center; gap:7px; padding:5px 11px; border:1px solid rgba(195,211,229,.16); border-radius:999px; background:rgba(9,14,20,.42); color:#c5d0dd; font-size:11px; white-space:nowrap; backdrop-filter:blur(10px); }
    .chip strong { color:#fff; font-weight:700; }
    .chip ha-icon { --mdc-icon-size:15px; color:var(--band); }
    .chip.alert { border-color:color-mix(in srgb,var(--band) 55%,transparent); background:color-mix(in srgb,var(--band) 16%,rgba(9,14,20,.5)); color:var(--band); font-weight:700; }
    .hero, .forecast { width:100%; margin:0; padding:0; border:0; background:none; color:inherit; font:inherit; text-align:start; cursor:pointer; }
    .hero { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:end; gap:14px; margin-top:6px; }
    .hero:focus-visible, .forecast:focus-visible, .tabs button:focus-visible { outline:2px solid var(--condition,var(--auralis-info)); outline-offset:3px; border-radius:16px; }
    .hero-left { display:block; min-width:0; }
    .clock { display:block; color:#fff; font-size:62px; font-weight:300; font-variant-numeric:tabular-nums; letter-spacing:-.05em; line-height:1; }
    .place-name { display:block; overflow:hidden; color:#fff; font-size:23px; font-weight:700; letter-spacing:-.04em; text-overflow:ellipsis; white-space:nowrap; }
    .place { display:flex; min-width:0; align-items:center; gap:5px; margin-top:8px; color:#b3c0d2; font-size:12px; }
    .place ha-icon { --mdc-icon-size:14px; flex:0 0 auto; }
    .place span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .now { display:grid; min-width:0; justify-items:end; text-align:end; }
    .now-main { display:flex; align-items:center; gap:10px; }
    .now-icon { --mdc-icon-size:60px; color:var(--condition); filter:drop-shadow(0 0 18px color-mix(in srgb,var(--condition) 55%,transparent)); animation:float 7s ease-in-out infinite; }
    .now-temp { color:var(--band); font-size:46px; font-weight:720; letter-spacing:-.05em; line-height:1; white-space:nowrap; }
    .now-temp small { margin-inline-start:2px; color:#cfd9e5; font-size:18px; font-weight:520; letter-spacing:0; }
    .now-label { margin-top:7px; color:#f4f7fb; font-size:14px; font-weight:680; }
    .now-sub { margin-top:3px; color:#b0bdcd; font-size:11px; white-space:nowrap; }
    .chips { display:flex; flex-wrap:wrap; gap:7px; margin-top:16px; }
    .forecast { display:grid; grid-auto-columns:minmax(54px,1fr); grid-auto-flow:column; gap:4px; margin-top:14px; padding:10px 8px; overflow-x:auto; border:1px solid rgba(195,211,229,.14); border-radius:20px; background:rgba(6,10,16,.42); backdrop-filter:blur(12px); scrollbar-width:none; }
    .forecast::-webkit-scrollbar { display:none; }
    .slot { --condition:#c3cfdc; --band:#fff; display:flex; min-width:0; flex-direction:column; align-items:center; gap:5px; padding:5px 2px 6px; border-radius:14px; }
    .slot.current { background:rgba(255,255,255,.07); }
    .slot-label { color:#c9d3df; font-size:11px; font-weight:680; white-space:nowrap; }
    .slot ha-icon { --mdc-icon-size:25px; color:var(--condition); filter:drop-shadow(0 0 8px color-mix(in srgb,var(--condition) 35%,transparent)); }
    .slot-rain { min-height:12px; color:#86c4ff; font-size:9.5px; font-weight:750; }
    .slot-high { color:var(--band); font-size:14px; font-weight:760; }
    .slot-low { color:#8fa0b4; font-size:11px; font-weight:600; }
    .track { position:relative; width:6px; height:44px; border-radius:999px; background:rgba(255,255,255,.08); }
    .track span { position:absolute; inset-inline:0; min-height:6px; border-radius:999px; background:var(--range); box-shadow:0 0 10px color-mix(in srgb,var(--band) 40%,transparent); }
    .forecast-empty { display:grid; min-height:60px; margin-top:14px; place-items:center; border-radius:18px; background:rgba(6,10,16,.35); color:#9aa8b9; font-size:11px; }
    @keyframes float { 0%, 100% { transform:translateY(0); } 50% { transform:translateY(-4px); } }
    @media (prefers-reduced-motion: reduce) { .now-icon { animation:none; } .weather-shell { transition:none; } }
    @container (max-width:430px) {
      .clock { font-size:48px; }
      .now-icon { --mdc-icon-size:46px; }
      .now-temp { font-size:36px; }
    }
    @container (max-width:340px) {
      .clock { font-size:42px; }
      .now-main { gap:6px; }
      .now-icon { --mdc-icon-size:38px; }
      .now-temp { font-size:31px; }
      .now-temp small { font-size:15px; }
      .now-label { font-size:13px; }
      .now-sub { font-size:10px; }
    }
    @container (max-width:280px) {
      .hero { grid-template-columns:1fr; align-items:start; gap:10px; }
      .now { justify-items:start; text-align:start; }
      .now-main { flex-direction:row-reverse; }
    }

    .d-hero { --condition:#c3cfdc; --band:#fff; }
    .d-hero .now-main { gap:12px; }
    .d-hero ha-icon { --mdc-icon-size:48px; color:var(--condition); }
    .d-hero strong { color:var(--band); font-size:30px; letter-spacing:-.05em; }
    .stat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(98px,1fr)); gap:8px; }
    .stat-grid .dialog-stat { min-width:0; }
    .stat-grid .dialog-stat strong { display:block; overflow:hidden; font-size:15px; text-overflow:ellipsis; white-space:nowrap; }
    .stat-grid .dialog-stat ha-icon { --mdc-icon-size:16px; color:var(--auralis-muted); }
    .tabs button { color:var(--auralis-muted); }
    .tabs button.active { color:var(--auralis-text); }
    .chart { margin:0; padding:12px 12px 8px; border:1px solid var(--auralis-border); border-radius:18px; background:rgba(255,255,255,.03); }
    .plot { position:relative; height:132px; }
    .plot svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
    .plot .gridline { position:absolute; inset-inline:0; border-top:1px dashed var(--auralis-border); }
    .plot .axis { position:absolute; inset-inline-start:0; z-index:1; padding:1px 5px; border-radius:6px; background:rgba(11,17,24,.7); color:var(--auralis-muted); font-size:10px; }
    .plot .axis.top { top:2px; }
    .plot .axis.bottom { bottom:2px; }
    .time-axis { display:flex; justify-content:space-between; padding-top:7px; color:var(--auralis-muted); font-size:10px; }
    .legend { display:flex; gap:12px; padding-top:6px; color:var(--auralis-muted); font-size:10px; }
    .legend i { display:inline-block; width:9px; height:9px; margin-inline-end:5px; border-radius:3px; vertical-align:-1px; }
    .hours { display:grid; grid-auto-columns:58px; grid-auto-flow:column; gap:6px; margin-top:10px; padding-bottom:4px; overflow-x:auto; }
    .hour { --condition:#c3cfdc; --band:#fff; display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px 4px; border:1px solid var(--auralis-border); border-radius:14px; background:rgba(255,255,255,.03); color:var(--auralis-muted); font-size:11px; }
    .hour ha-icon { --mdc-icon-size:22px; color:var(--condition); }
    .hour strong { color:var(--band); font-size:13px; }
    .hour .slot-rain { font-size:10px; }
    .days { display:grid; gap:6px; }
    .day-row { --condition:#c3cfdc; display:grid; grid-template-columns:64px 24px minmax(0,1fr) 34px minmax(54px,1.3fr) 34px; align-items:center; gap:8px; padding:9px 12px; border:1px solid var(--auralis-border); border-radius:14px; background:rgba(255,255,255,.03); font-size:12px; }
    .day-row > strong { font-size:12px; }
    .day-row ha-icon { --mdc-icon-size:22px; color:var(--condition); }
    .day-cond { overflow:hidden; color:var(--auralis-muted); text-overflow:ellipsis; white-space:nowrap; }
    .day-cond b { color:#86c4ff; font-weight:700; }
    .day-low { color:var(--auralis-muted); text-align:end; }
    .day-high { font-weight:760; }
    .hbar { position:relative; height:6px; border-radius:999px; background:rgba(255,255,255,.08); }
    .hbar span { position:absolute; inset-block:0; min-width:6px; border-radius:999px; background:var(--range); }
    .muted-note { margin:0; color:var(--auralis-muted); font-size:12px; text-align:center; }
    @media (max-width:520px) {
      .day-row { grid-template-columns:52px 24px auto 30px minmax(40px,1fr) 30px; gap:6px; padding:9px 10px; }
      .day-cond .text { display:none; }
    }
  `];

  private forecasts: Partial<Record<ForecastType, ForecastEntry[]>> = {};
  private forecastError = false;
  private now = Date.now();
  private detailTab: "hourly" | "daily" = "hourly";
  private clockTimer?: number;
  private subscriptionKey?: string;
  private unsubscribers: Array<Promise<Unsubscribe | undefined>> = [];

  static getStubConfig(hass?: HomeAssistant): Partial<WeatherCardConfig> {
    const first = Object.keys(hass?.states ?? {}).find((id) => id.startsWith("weather."));
    return { theme: "carbon", entity: first ?? "weather.forecast_home" };
  }

  static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      entity: "Entité météo", temperature_entity: "Capteur de température local", humidity_entity: "Capteur d’humidité local",
      sun_entity: "Entité soleil", alert_entity: "Entité de vigilance", forecast_type: "Prévisions affichées",
      forecast_count: "Nombre de prévisions", show_clock: "Afficher l’horloge", show_greeting: "Afficher la salutation",
      show_forecast: "Afficher les prévisions", dynamic_background: "Fond selon la météo", thresholds: "Paliers de couleur",
      name: "Nom du lieu", icon: "Icône", theme: "Thème", accent_color: "Couleur d’accent", card_background: "Fond de la carte",
    };
    return {
      schema: [
        { name: "entity", required: true, selector: { entity: { domain: "weather" } } },
        { name: "temperature_entity", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
        { name: "humidity_entity", selector: { entity: { domain: "sensor", device_class: "humidity" } } },
        { name: "sun_entity", selector: { entity: { domain: "sun" } } },
        { name: "alert_entity", selector: { entity: {} } },
        { name: "forecast_type", selector: { select: { options: [
          { value: "daily", label: "Jours" }, { value: "hourly", label: "Heures" }, { value: "twice_daily", label: "Jour et nuit" },
        ] } } },
        { name: "forecast_count", selector: { number: { min: 1, max: 12, step: 1, mode: "box" } } },
        { name: "show_clock", selector: { boolean: {} } },
        { name: "show_greeting", selector: { boolean: {} } },
        { name: "show_forecast", selector: { boolean: {} } },
        { name: "dynamic_background", selector: { boolean: {} } },
        { name: "name", selector: { text: {} } },
        { name: "thresholds", selector: { object: {} } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        { name: "icon", selector: { icon: {} } },
        { name: "accent_color", selector: { text: {} } },
        { name: "card_background", selector: { object: {} } },
      ],
      computeLabel: ({ name }: { name: string }) => labels[name],
    };
  }

  public setConfig(config: WeatherCardConfig): void {
    if (!config || typeof config.entity !== "string" || !WEATHER_ID.test(config.entity)) {
      throw new Error("Configurez une entité météo : entity: weather.xxx");
    }
    const optional = (id: unknown, pattern: RegExp): boolean => id === undefined || id === null || id === "" || (typeof id === "string" && pattern.test(id));
    if (!optional(config.temperature_entity, SENSOR_ID) || !optional(config.humidity_entity, SENSOR_ID)) {
      throw new Error("temperature_entity et humidity_entity doivent être des capteurs (sensor.*).");
    }
    if (!optional(config.sun_entity, /^sun\.[a-z0-9_]+$/) || !optional(config.alert_entity, ENTITY_ID)) {
      throw new Error("sun_entity doit être une entité sun.* et alert_entity un identifiant d’entité valide.");
    }
    const type = config.forecast_type && config.forecast_type in DEFAULT_COUNTS ? config.forecast_type : "daily";
    const count = Number(config.forecast_count);
    this.config = {
      ...config,
      theme: config.theme || "carbon",
      sun_entity: config.sun_entity || "sun.sun",
      forecast_type: type,
      forecast_count: config.forecast_count !== undefined && Number.isFinite(count) ? Math.round(Math.min(12, Math.max(1, count))) : undefined,
      thresholds: normalizeThresholds(config.thresholds, OUTDOOR_THRESHOLDS),
    };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.now = Date.now();
    this.scheduleClock();
    this.syncForecasts();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this.clockTimer);
    this.unsubscribeForecasts();
  }

  protected updated(): void {
    super.updated();
    this.syncForecasts();
  }

  /** Réveil à chaque nouvelle minute pour l'horloge, la salutation et les libellés « Auj. ». */
  private scheduleClock(): void {
    window.clearTimeout(this.clockTimer);
    this.clockTimer = window.setTimeout(() => {
      this.now = Date.now();
      this.scheduleClock();
    }, 60_000 - (Date.now() % 60_000) + 50);
  }

  /** Types à suivre : celui du bandeau, plus les heures et les jours pour la fenêtre de détail. */
  private wantedTypes(state: HassEntity): ForecastType[] {
    const supported = forecastTypes(state.attributes.supported_features);
    const strip = this.stripType(supported);
    return supported.filter((type) => type === strip || type === "hourly" || type === "daily");
  }

  private stripType(supported: ForecastType[]): ForecastType {
    const wanted = this.config?.forecast_type ?? "daily";
    if (!supported.length || supported.includes(wanted)) return wanted;
    return (["daily", "twice_daily", "hourly"] as ForecastType[]).find((type) => supported.includes(type)) ?? wanted;
  }

  /** Abonnements weather/subscribe_forecast : recréés seulement quand l'entité ou les types changent. */
  private syncForecasts(): void {
    const config = this.config;
    const connection = this.hass?.connection;
    const state = entity(this.hass, config?.entity);
    if (!config || !connection || !state || !this.isConnected) return;
    const types = this.wantedTypes(state);
    const key = `${config.entity}/${types.join(",")}`;
    if (key === this.subscriptionKey) return;
    this.unsubscribeForecasts();
    this.subscriptionKey = key;
    this.forecasts = {};
    this.forecastError = false;
    for (const type of types) {
      const subscription = connection.subscribeMessage<{ forecast?: unknown }>((message) => {
        if (this.subscriptionKey !== key) return;
        this.forecasts = { ...this.forecasts, [type]: parseForecast(message?.forecast) };
      }, { type: "weather/subscribe_forecast", forecast_type: type, entity_id: config.entity })
        .catch(() => {
          if (this.subscriptionKey === key) this.forecastError = true;
          return undefined;
        });
      this.unsubscribers.push(subscription);
    }
  }

  private unsubscribeForecasts(): void {
    for (const subscription of this.unsubscribers) {
      void subscription.then((unsubscribe) => unsubscribe?.()).catch(() => undefined);
    }
    this.unsubscribers = [];
    this.subscriptionKey = undefined;
  }

  /** Prévisions d'un type : abonnement, ou ancien attribut `forecast` des intégrations qui n'ont pas migré. */
  private forecast(type: ForecastType, state?: HassEntity): ForecastEntry[] {
    const subscribed = this.forecasts[type];
    if (subscribed) return subscribed;
    if (!state || forecastTypes(state.attributes.supported_features).length) return [];
    const legacy = parseForecast(state.attributes.forecast);
    const hourly = legacy.length > 1 && legacy[1].time - legacy[0].time <= 3 * HOUR;
    return (type === "hourly") === hourly ? legacy : [];
  }

  private format(time: number, options: Intl.DateTimeFormatOptions, locale = "fr-FR"): string {
    try {
      return new Intl.DateTimeFormat(locale, { ...options, timeZone: this.hass?.config?.time_zone }).format(time);
    } catch {
      return new Intl.DateTimeFormat(locale, options).format(time);
    }
  }

  /** Jour civil triable (AAAA-MM-JJ) dans le fuseau de Home Assistant. */
  private dayKey(time: number): string {
    return this.format(time, { year: "numeric", month: "2-digit", day: "2-digit" }, "en-CA");
  }

  private hourOf(time: number): number {
    return Number(this.format(time, { hour: "numeric", hourCycle: "h23" }).replace(/\D/g, "")) || 0;
  }

  private dayLabel(time: number): string {
    const key = this.dayKey(time);
    if (key === this.dayKey(this.now)) return "Auj.";
    if (key === this.dayKey(this.now + DAY)) return "Dem.";
    const label = this.format(time, { weekday: "short" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  private clock(time: number): string {
    return this.format(time, { hour: "2-digit", minute: "2-digit" });
  }

  private reading(id?: string): number | undefined {
    const state = entity(this.hass, id);
    const value = isAvailable(state) ? numericState(state, Number.NaN) : Number.NaN;
    return Number.isFinite(value) ? value : undefined;
  }

  private sunTimes(): { night?: boolean; rising?: number; setting?: number } {
    const sun = entity(this.hass, this.config?.sun_entity);
    if (!isAvailable(sun)) return {};
    const parse = (value: unknown): number | undefined => {
      const time = Date.parse(String(value ?? ""));
      return Number.isFinite(time) ? time : undefined;
    };
    const night = sun!.state === "below_horizon" ? true : sun!.state === "above_horizon" ? false : undefined;
    return { night, rising: parse(sun!.attributes.next_rising), setting: parse(sun!.attributes.next_setting) };
  }

  private entryNight(entry: ForecastEntry, type: ForecastType, sun: { rising?: number; setting?: number }): boolean {
    if (type === "daily") return false;
    if (entry.daytime !== undefined) return !entry.daytime;
    const fromSun = nightAt(entry.time, sun.setting, sun.rising);
    if (fromSun !== undefined) return fromSun;
    const hour = this.hourOf(entry.time);
    return hour < 7 || hour >= 20;
  }

  /** Prévisions à venir : à partir d'aujourd'hui pour les jours, de l'heure en cours pour les heures. */
  private upcoming(type: ForecastType, state?: HassEntity): ForecastEntry[] {
    const entries = this.forecast(type, state);
    if (type === "daily") {
      const today = this.dayKey(this.now);
      return entries.filter((entry) => this.dayKey(entry.time) >= today);
    }
    const margin = type === "hourly" ? HOUR : 12 * HOUR;
    return entries.filter((entry) => entry.time > this.now - margin);
  }

  private view(): WeatherView {
    const config = this.config!;
    const state = entity(this.hass, config.entity);
    const available = isAvailable(state);
    const attributes = state?.attributes ?? {};
    const sun = this.sunTimes();
    const hour = this.hourOf(this.now);
    const night = sun.night ?? (state?.state === "clear-night" || hour < 7 || hour >= 20);
    const localTemperature = this.reading(config.temperature_entity);
    const localUnit = entity(this.hass, config.temperature_entity)?.attributes.unit_of_measurement;
    const unit = typeof attributes.temperature_unit === "string" ? attributes.temperature_unit : typeof localUnit === "string" ? localUnit : "°C";
    const today = this.upcoming("daily", state).find((entry) => this.dayKey(entry.time) === this.dayKey(this.now));
    const nextHours = this.upcoming("hourly", state).slice(0, 3).map((entry) => entry.probability).filter(isNumber);
    const alert = config.alert_entity ? entity(this.hass, config.alert_entity) : undefined;
    return {
      state,
      available,
      night,
      style: conditionStyle(available ? state!.state : undefined, night),
      place: config.name?.trim() || friendlyName(state, "Météo"),
      temperature: localTemperature ?? (available ? toNumber(attributes.temperature) : undefined),
      temperatureUnit: unit,
      localTemperature: localTemperature !== undefined,
      feelsLike: toNumber(attributes.apparent_temperature),
      humidity: this.reading(config.humidity_entity) ?? toNumber(attributes.humidity),
      windSpeed: toNumber(attributes.wind_speed),
      windUnit: typeof attributes.wind_speed_unit === "string" ? attributes.wind_speed_unit : "km/h",
      windDirection: windDirection(attributes.wind_bearing),
      high: today?.temperature,
      low: today?.low,
      rain: nextHours.length ? Math.max(...nextHours) : today?.probability,
      nextRising: sun.rising,
      nextSetting: sun.setting,
      alert: alert ? alertLevel(alert.state) : undefined,
    };
  }

  private bandColor(value?: number): string {
    return temperatureBand(value, this.config?.thresholds ?? OUTDOOR_THRESHOLDS)?.color ?? "#f4f8fc";
  }

  private degrees(value?: number, digits = 0): string {
    return value === undefined ? "—" : `${formatNumber(value, digits)}°`;
  }

  private shellStyle(view: WeatherView): string {
    const config = this.config!;
    const base = this.machineStyle(view.style.color);
    if (config.card_background || config.dynamic_background === false) return `${base};--condition:${view.style.color}`;
    return `${base};--machine-base-background:${view.style.sky};--condition:${view.style.color}`;
  }

  private slots(view: WeatherView): { type: ForecastType; slots: Slot[] } {
    const supported = forecastTypes(view.state?.attributes.supported_features);
    const type = this.stripType(supported);
    const count = this.config?.forecast_count ?? DEFAULT_COUNTS[type];
    const sun = { rising: view.nextRising, setting: view.nextSetting };
    const entries = this.upcoming(type, view.state).slice(0, count);
    return {
      type,
      slots: entries.map((entry, index) => ({
        entry,
        current: index === 0,
        style: conditionStyle(entry.condition, this.entryNight(entry, type, sun)),
        label: type === "hourly"
          ? index === 0 ? "Maint." : this.format(entry.time, { hour: "2-digit" })
          : type === "twice_daily" ? `${this.dayLabel(entry.time)} ${entry.daytime === false ? "nuit" : "jour"}` : this.dayLabel(entry.time),
      })),
    };
  }

  private renderChips(view: WeatherView): TemplateResult | typeof nothing {
    const chips: TemplateResult[] = [];
    const chip = (icon: string, label: string, value: string, color = "#9fb3c8") => html`<span class="chip" style=${`--band:${color}`}>
      <ha-icon .icon=${icon}></ha-icon>${label}<strong>${value}</strong></span>`;
    if (view.humidity !== undefined) chips.push(chip("mdi:water-percent", "Humidité", `${formatNumber(view.humidity)} %`, "#63bbff"));
    if (view.windSpeed !== undefined) {
      chips.push(chip("mdi:weather-windy", "Vent", `${formatNumber(view.windSpeed)} ${view.windUnit}${view.windDirection ? ` ${view.windDirection}` : ""}`, "#6fe0c8"));
    }
    if (view.rain !== undefined) chips.push(chip("mdi:umbrella-outline", "Pluie", `${formatNumber(view.rain)} %`, RAIN_COLOR));
    const sunEvent = view.night ? view.nextRising : view.nextSetting;
    if (sunEvent !== undefined) {
      chips.push(view.night
        ? chip("mdi:weather-sunset-up", "Lever", this.clock(sunEvent), "#ffc45f")
        : chip("mdi:weather-sunset-down", "Coucher", this.clock(sunEvent), "#ff9a5c"));
    }
    return chips.length ? html`<div class="chips">${chips}</div>` : nothing;
  }

  private renderStrip(view: WeatherView): TemplateResult | typeof nothing {
    if (this.config?.show_forecast === false) return nothing;
    const { type, slots } = this.slots(view);
    if (!slots.length) {
      const message = this.forecastError ? "Prévisions indisponibles" : this.hass?.connection ? "Chargement des prévisions…" : "Aucune prévision";
      return view.available ? html`<div class="forecast-empty" role="status">${message}</div>` : nothing;
    }
    const values = slots.flatMap(({ entry }) => [entry.temperature, entry.low]).filter(isNumber);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const thresholds = this.config?.thresholds ?? OUTDOOR_THRESHOLDS;
    const title = type === "hourly" ? "Prévisions heure par heure" : "Prévisions des prochains jours";
    return html`<button type="button" class="forecast" aria-label=${`${title}, voir le détail`}
      @click=${() => this.openDetail(type === "hourly" ? "hourly" : "daily")}>
      ${slots.map(({ entry, label, style, current }) => {
        const high = entry.temperature;
        const low = entry.low ?? high;
        const position = high !== undefined ? rangePosition(low!, high, min, max) : undefined;
        const single = entry.low === undefined;
        return html`<span class="slot ${current ? "current" : ""}" style=${`--condition:${style.color};--band:${this.bandColor(high)}`}
          title=${`${label} : ${style.label}`}>
          <span class="slot-label">${label}</span>
          <ha-icon .icon=${style.icon}></ha-icon>
          <span class="slot-rain">${entry.probability !== undefined && entry.probability >= 20 ? `${formatNumber(entry.probability)} %` : ""}</span>
          <span class="slot-high">${this.degrees(high)}</span>
          ${position ? html`<span class="track" aria-hidden="true"><span style=${single
            ? `bottom:calc(${position.start}% - 3px);height:6px;--range:${this.bandColor(high)}`
            : `bottom:${position.start}%;height:${position.size}%;--range:${rangeGradient(thresholds, low!, high!, "0deg")}`}></span></span>` : nothing}
          ${single ? nothing : html`<span class="slot-low">${this.degrees(entry.low)}</span>`}
        </span>`;
      })}
    </button>`;
  }

  private openDetail(tab: "hourly" | "daily"): void {
    const state = this.view().state;
    const hasHourly = this.upcoming("hourly", state).length > 0;
    const hasDaily = this.upcoming("daily", state).length > 0;
    this.detailTab = tab === "hourly" && !hasHourly && hasDaily ? "daily" : tab === "daily" && !hasDaily && hasHourly ? "hourly" : tab;
    this.openDialog("weather");
  }

  private renderHourlyChart(entries: ForecastEntry[], sun: { rising?: number; setting?: number }): TemplateResult {
    const values = entries.map((entry) => entry.temperature);
    const [min, max] = chartRange(values, 4);
    const { line, area } = chartPaths(values, 300, 110, min, max);
    const thresholds = this.config?.thresholds ?? OUTDOOR_THRESHOLDS;
    const stops = gradientStops(thresholds, min, max);
    const step = entries.length > 1 ? 300 / (entries.length - 1) : 300;
    const width = Math.max(2, step * 0.55);
    const unit = this.view().temperatureUnit;
    const first = entries[0].time;
    const last = entries[entries.length - 1].time;
    const hasRain = entries.some((entry) => isNumber(entry.probability) && entry.probability > 0);
    return html`<figure class="chart" role="img" aria-label=${`Température et risque de pluie sur ${entries.length} heures`}>
      <div class="plot">
        <span class="gridline" style="top:0"></span><span class="gridline" style="top:50%"></span><span class="gridline" style="top:100%"></span>
        <span class="axis top">${formatNumber(max, 0)} ${unit}</span>
        <span class="axis bottom">${formatNumber(min, 0)} ${unit}</span>
        <svg viewBox="0 0 300 110" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="weather-hourly" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="110">
            ${stops.map((stop) => svg`<stop offset=${stop.offset} stop-color=${stop.color}></stop>`)}
          </linearGradient></defs>
          ${entries.map((entry, index) => isNumber(entry.probability) && entry.probability > 0
            ? svg`<rect x=${Math.max(0, index * step - width / 2)} y=${110 - (entry.probability / 100) * 40} width=${width}
                height=${(entry.probability / 100) * 40} rx="1" fill=${RAIN_COLOR} opacity=".32"></rect>`
            : nothing)}
          <path d=${area} fill="url(#weather-hourly)" opacity=".14"></path>
          <path d=${line} fill="none" stroke="url(#weather-hourly)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>
        </svg>
      </div>
      <div class="time-axis" aria-hidden="true">
        <span>${this.clock(first)}</span><span>${this.clock((first + last) / 2)}</span><span>${this.dayKey(last) === this.dayKey(first) ? "" : "Dem. "}${this.clock(last)}</span>
      </div>
      ${hasRain ? html`<div class="legend" aria-hidden="true"><span><i style=${`background:${RAIN_COLOR};opacity:.6`}></i>Risque de pluie</span></div>` : nothing}
    </figure>
    <div class="hours">
      ${entries.map((entry, index) => {
        const style = conditionStyle(entry.condition, this.entryNight(entry, "hourly", sun));
        return html`<div class="hour" style=${`--condition:${style.color};--band:${this.bandColor(entry.temperature)}`} title=${style.label}>
          <span>${index === 0 ? "Maint." : this.format(entry.time, { hour: "2-digit" })}</span>
          <ha-icon .icon=${style.icon}></ha-icon>
          <strong>${this.degrees(entry.temperature)}</strong>
          <span class="slot-rain">${isNumber(entry.probability) && entry.probability > 0 ? `${formatNumber(entry.probability)} %` : ""}</span>
        </div>`;
      })}
    </div>`;
  }

  private renderDays(entries: ForecastEntry[]): TemplateResult {
    const values = entries.flatMap((entry) => [entry.temperature, entry.low]).filter(isNumber);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const thresholds = this.config?.thresholds ?? OUTDOOR_THRESHOLDS;
    return html`<div class="days">
      ${entries.map((entry) => {
        const style = conditionStyle(entry.condition, false);
        const high = entry.temperature;
        const low = entry.low ?? high;
        const position = high !== undefined ? rangePosition(low!, high, min, max) : undefined;
        const wind = entry.windSpeed !== undefined ? `, vent ${formatNumber(entry.windSpeed)}` : "";
        return html`<div class="day-row" style=${`--condition:${style.color}`} title=${`${style.label}${wind}`}>
          <strong>${this.dayLabel(entry.time)}</strong>
          <ha-icon .icon=${style.icon}></ha-icon>
          <span class="day-cond"><span class="text">${style.label}</span>${entry.probability !== undefined && entry.probability >= 20 ? html` <b>${formatNumber(entry.probability)} %</b>` : nothing}</span>
          <span class="day-low">${entry.low === undefined ? "" : this.degrees(entry.low)}</span>
          <span class="hbar" aria-hidden="true">${position ? html`<span style=${`left:${position.start}%;width:${position.size}%;--range:${rangeGradient(thresholds, low!, high!)}`}></span>` : nothing}</span>
          <span class="day-high" style=${`color:${this.bandColor(high)}`}>${this.degrees(high)}</span>
        </div>`;
      })}
    </div>`;
  }

  private renderDetail(view: WeatherView): TemplateResult {
    const attributes = view.state?.attributes ?? {};
    const unit = (key: string, fallback: string): string => (typeof attributes[key] === "string" ? String(attributes[key]) : fallback);
    const stats: Array<[string, string, string | undefined]> = [
      ["mdi:thermometer-lines", "ressenti", view.feelsLike === undefined ? undefined : this.degrees(view.feelsLike, 1)],
      ["mdi:water-percent", "humidité", view.humidity === undefined ? undefined : `${formatNumber(view.humidity)} %`],
      ["mdi:water-thermometer-outline", "point de rosée", toNumber(attributes.dew_point) === undefined ? undefined : this.degrees(toNumber(attributes.dew_point), 1)],
      ["mdi:gauge", "pression", toNumber(attributes.pressure) === undefined ? undefined : `${formatNumber(toNumber(attributes.pressure)!)} ${unit("pressure_unit", "hPa")}`],
      ["mdi:weather-windy", "vent", view.windSpeed === undefined ? undefined : `${formatNumber(view.windSpeed)} ${view.windUnit}${view.windDirection ? ` ${view.windDirection}` : ""}`],
      ["mdi:weather-dust", "rafales", toNumber(attributes.wind_gust_speed) === undefined ? undefined : `${formatNumber(toNumber(attributes.wind_gust_speed)!)} ${view.windUnit}`],
      ["mdi:sun-wireless-outline", "indice UV", toNumber(attributes.uv_index) === undefined ? undefined : formatNumber(toNumber(attributes.uv_index)!, 1)],
      ["mdi:cloud-percent-outline", "nuages", toNumber(attributes.cloud_coverage) === undefined ? undefined : `${formatNumber(toNumber(attributes.cloud_coverage)!)} %`],
      ["mdi:eye-outline", "visibilité", toNumber(attributes.visibility) === undefined ? undefined : `${formatNumber(toNumber(attributes.visibility)!, 1)} ${unit("visibility_unit", "km")}`],
      ["mdi:weather-sunset-up", "lever", view.nextRising === undefined ? undefined : this.clock(view.nextRising)],
      ["mdi:weather-sunset-down", "coucher", view.nextSetting === undefined ? undefined : this.clock(view.nextSetting)],
    ];
    const hourly = this.upcoming("hourly", view.state).slice(0, 24);
    const daily = this.upcoming("daily", view.state).slice(0, 10);
    const tabs = [
      ...(hourly.length ? [{ key: "hourly" as const, label: "Prochaines heures" }] : []),
      ...(daily.length ? [{ key: "daily" as const, label: "Prochains jours" }] : []),
    ];
    const tab = tabs.find((item) => item.key === this.detailTab)?.key ?? tabs[0]?.key;
    const sun = { rising: view.nextRising, setting: view.nextSetting };
    const context = [
      view.feelsLike !== undefined ? `Ressenti ${this.degrees(view.feelsLike)}` : undefined,
      view.high !== undefined ? `max ${this.degrees(view.high)}` : undefined,
      view.low !== undefined ? `min ${this.degrees(view.low)}` : undefined,
    ].filter(Boolean).join(" · ");
    return this.renderDialog(view.place, view.style.icon, html`<div class="dialog-body">
      <div class="dialog-overview d-hero" style=${`--condition:${view.style.color};--band:${this.bandColor(view.temperature)}`}>
        <div><span class="eyebrow">${view.localTemperature ? "Capteur local" : "Maintenant"}</span>
          <strong>${view.temperature === undefined ? "—" : `${formatNumber(view.temperature, 1)} ${view.temperatureUnit}`}</strong>
          <span class="muted">${view.style.label}${context ? ` · ${context}` : ""}</span></div>
        <ha-icon .icon=${view.style.icon}></ha-icon>
      </div>
      ${view.alert ? html`<div class="chips" style="margin:0 0 14px"><span class="chip alert" style=${`--band:${view.alert.color}`}>
        <ha-icon icon="mdi:alert-outline"></ha-icon>${view.alert.label}</span></div>` : nothing}
      <div class="stat-grid">
        ${stats.filter(([, , value]) => value !== undefined).map(([icon, label, value]) => html`<div class="dialog-stat">
          <ha-icon .icon=${icon}></ha-icon><strong>${value}</strong><small>${label}</small></div>`)}
      </div>
      ${tabs.length > 1 ? html`<div class="tabs" role="group" aria-label="Prévisions affichées" style="margin-top:16px">
        ${tabs.map((item) => html`<button type="button" class=${item.key === tab ? "active" : ""} aria-pressed=${item.key === tab}
          @click=${() => { this.detailTab = item.key; }}>${item.label}</button>`)}
      </div>` : nothing}
      <section class="dialog-section">
        ${tab === "hourly" ? html`<p class="dialog-section-title">Prochaines ${hourly.length} heures</p>${this.renderHourlyChart(hourly, sun)}`
          : tab === "daily" ? html`<p class="dialog-section-title">Prochains jours</p>${this.renderDays(daily)}`
          : html`<p class="muted-note">${this.forecastError ? "Prévisions indisponibles" : "Aucune prévision pour le moment"}</p>`}
      </section>
      <div class="actions">
        <button class="action" type="button" @click=${() => fireMoreInfo(this, this.config!.entity)}><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon>Service météo</button>
        ${this.config?.temperature_entity ? html`<button class="action" type="button" @click=${() => fireMoreInfo(this, this.config!.temperature_entity)}><ha-icon icon="mdi:thermometer"></ha-icon>Capteur local</button>` : nothing}
        ${this.config?.alert_entity ? html`<button class="action" type="button" @click=${() => fireMoreInfo(this, this.config!.alert_entity)}><ha-icon icon="mdi:alert-outline"></ha-icon>Vigilance</button>` : nothing}
      </div>
    </div>`);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this.config;
    if (!config) return nothing;
    const view = this.view();
    const date = this.format(this.now, { weekday: "long", day: "numeric", month: "long" });
    const eyebrow = config.show_greeting === false ? date : `${greeting(this.hourOf(this.now))} · ${date}`;
    const showClock = config.show_clock !== false;
    const sub = [
      view.feelsLike !== undefined ? `Ressenti ${this.degrees(view.feelsLike)}` : undefined,
      view.high !== undefined || view.low !== undefined ? `↑ ${this.degrees(view.high)}  ↓ ${this.degrees(view.low)}` : undefined,
    ].filter(Boolean).join(" · ");
    const description = view.available
      ? `${view.place} : ${view.style.label}, ${view.temperature === undefined ? "" : `${formatNumber(view.temperature, 1)} ${view.temperatureUnit}`}. Voir le détail.`
      : `${view.place} : météo indisponible`;
    return html`<ha-card><div class="machine-shell weather-shell ${this.machineGridClass()}" style=${this.shellStyle(view)}>
      ${view.style.stars && !config.card_background && config.dynamic_background !== false ? html`<div class="stars" aria-hidden="true"></div>` : nothing}
      <div class="machine-content weather-content">
        <div class="weather-top">
          <span class="eyebrow-line">${eyebrow}</span>
          ${view.alert ? html`<span class="chip alert" style=${`--band:${view.alert.color}`}><ha-icon icon="mdi:alert-outline"></ha-icon>${view.alert.label}</span>` : nothing}
        </div>
        <button type="button" class="hero" aria-label=${description} @click=${() => this.openDetail("hourly")}>
          <span class="hero-left">
            ${showClock ? html`<span class="clock">${this.clock(this.now)}</span>` : html`<span class="place-name">${view.place}</span>`}
            <span class="place"><ha-icon .icon=${config.icon || "mdi:map-marker-outline"}></ha-icon>
              <span>${showClock ? view.place : view.localTemperature ? "Capteur local" : "Service météo"}</span></span>
          </span>
          <span class="now" style=${`--band:${this.bandColor(view.temperature)}`}>
            <span class="now-main">
              <ha-icon class="now-icon" .icon=${view.style.icon}></ha-icon>
              <span class="now-temp">${view.temperature === undefined ? "—" : formatNumber(view.temperature, 1)}<small>${view.temperature === undefined ? "" : view.temperatureUnit}</small></span>
            </span>
            <span class="now-label">${view.available ? view.style.label : "Indisponible"}</span>
            ${sub ? html`<span class="now-sub">${sub}</span>` : nothing}
          </span>
        </button>
        ${this.renderChips(view)}
        ${this.renderStrip(view)}
      </div>
    </div></ha-card>
    ${this.dialog === "weather" ? this.renderDetail(view) : nothing}`;
  }

  public getCardSize(): number {
    return this.config?.show_forecast === false ? 3 : 5;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, min_columns: 6 };
  }
}
