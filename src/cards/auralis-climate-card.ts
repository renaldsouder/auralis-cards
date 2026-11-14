import { css, html, nothing, svg, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { fireMoreInfo } from "../utils/actions";
import { entity, formatNumber, friendlyName, isAvailable, numericState } from "../utils/entities";
import { BOOLEAN, entitySelector, ICON, listSelector, TEXT, type FormListField } from "../utils/form";

/** Palier de couleur : s'applique aux valeurs strictement inférieures à `below`. Le dernier palier n'a pas de borne. */
export interface ClimateThreshold {
  below?: number;
  color: string;
  label?: string;
}

/** Champs d'un palier de couleur dans l'éditeur visuel (cartes Climat et Météo). */
export const THRESHOLD_FIELDS: Record<string, FormListField> = {
  below: { label: "Sous la valeur (vide pour le dernier palier)", selector: { number: { step: 0.5, mode: "box" } } },
  color: { label: "Couleur (#RRGGBB)", required: true, selector: TEXT },
  label: { label: "Libellé", selector: TEXT },
};

export interface ClimateRoomConfig {
  name?: string;
  icon?: string;
  temperature_entity: string;
  humidity_entity?: string;
  battery_entity?: string;
  /** Capteur extérieur : utilise l'échelle extérieure et reste hors de la moyenne. */
  outdoor?: boolean;
  /** Couleur de la courbe dans le graphe global (sinon la couleur de sa position dans la liste). */
  color?: string;
}

export type ClimateLayout = "tiles" | "chart";
export type ChartMetric = "temperature" | "humidity";

export interface ClimateCardConfig extends BaseCardConfig {
  type: "custom:auralis-climate-card";
  rooms: ClimateRoomConfig[];
  columns?: number;
  graph_hours?: number;
  low_battery?: number;
  show_summary?: boolean;
  /** Masque l'en-tête (icône, nom, état) avec `false`. */
  show_header?: boolean;
  thresholds?: ClimateThreshold[];
  outdoor_thresholds?: ClimateThreshold[];
  /** `tiles` (une tuile par pièce) ou `chart` (toutes les courbes dans un seul graphe). */
  layout?: ClimateLayout;
  /** Mesure affichée à l'ouverture du graphe global. */
  chart_metric?: ChartMetric;
}

export interface HistoryPoint {
  time: number;
  value: number;
}

export interface GradientStop {
  offset: number;
  color: string;
}

type Series = Array<number | undefined>;

export const INDOOR_THRESHOLDS: ClimateThreshold[] = [
  { below: 17, color: "#5aa9ff", label: "Froid" },
  { below: 19, color: "#5fd4e6", label: "Frais" },
  { below: 22, color: "#5bd69b", label: "Confort" },
  { below: 24, color: "#ffc45f", label: "Doux" },
  { below: 26, color: "#ff9a5c", label: "Chaud" },
  { color: "#ff6b74", label: "Très chaud" },
];

export const OUTDOOR_THRESHOLDS: ClimateThreshold[] = [
  { below: 0, color: "#cfe9ff", label: "Gel" },
  { below: 10, color: "#7ccbff", label: "Froid" },
  { below: 15, color: "#4d9fff", label: "Frais" },
  { below: 19, color: "#8fe3b0", label: "Doux" },
  { below: 25, color: "#5bd69b", label: "Agréable" },
  { below: 30, color: "#ff9a5c", label: "Chaud" },
  { color: "#ff6b74", label: "Très chaud" },
];

const HOUR = 3_600_000;
const REFRESH_INTERVAL = 300_000;
/** Au-delà de 48 h, l'historique est plus lourd et bouge peu : il est renouvelé toutes les 30 minutes. */
const LONG_REFRESH_INTERVAL = 1_800_000;
const MEAN = "mean";
const TILE_BUCKETS = 48;
const CHART_BUCKETS = 96;
/** Nombre de couleurs de courbe ; au-delà, les mêmes couleurs reviennent en tirets puis en pointillés. */
export const SERIES_SLOTS = 8;
const DASHES = ["", "6 4", "1.5 4"];
const DETAIL_BUCKETS = 96;
const DETAIL_PERIODS = [{ hours: 24, label: "24 h" }, { hours: 168, label: "7 jours" }];
const HUMIDITY_COLOR = "#63bbff";
const NEUTRAL_COLOR = "#93a2b5";
const SENSOR_ID = /^sensor\.[a-z0-9_]+$/;
const SAFE_COLOR = /^[#\w(),.%\s-]+$/;

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const round = (value: number): number => Math.round(value * 100) / 100;

/** Trie les paliers, écarte les couleurs non sûres et garantit un dernier palier sans borne. */
export function normalizeThresholds(input: unknown, fallback: ClimateThreshold[]): ClimateThreshold[] {
  if (!Array.isArray(input)) return fallback;
  const valid = input.filter((item): item is ClimateThreshold =>
    Boolean(item) && typeof item === "object" && typeof item.color === "string" && SAFE_COLOR.test(item.color.trim())
    && (item.below === undefined || isNumber(item.below)));
  const bounded = valid.filter((item) => item.below !== undefined).sort((a, b) => a.below! - b.below!);
  const open = valid.filter((item) => item.below === undefined).at(-1) ?? bounded.at(-1);
  if (!open) return fallback;
  return [...bounded, { ...open, below: undefined }].map((item) => ({ ...item, color: item.color.trim() }));
}

export function temperatureBand(value: number | undefined, thresholds: ClimateThreshold[]): ClimateThreshold | undefined {
  if (!isNumber(value) || !thresholds.length) return undefined;
  return thresholds.find((item) => item.below !== undefined && value < item.below) ?? thresholds[thresholds.length - 1];
}

/** Accepte le format compact de Home Assistant ({ s, lu }) et l'ancien format ({ state, last_changed }). */
export function parseHistory(raw: unknown): HistoryPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item: Record<string, unknown> | null) => {
    const value = Number.parseFloat(String(item?.s ?? item?.state ?? "").replace(",", "."));
    const seconds = isNumber(item?.lu) ? item.lu : isNumber(item?.lc) ? item.lc : undefined;
    const time = seconds !== undefined ? seconds * 1000 : Date.parse(String(item?.last_updated ?? item?.last_changed ?? ""));
    return Number.isFinite(value) && Number.isFinite(time) ? [{ time, value }] : [];
  }).sort((a, b) => a.time - b.time);
}

/** Moyenne par intervalle régulier ; un intervalle vide reprend la dernière valeur connue. */
export function resampleHistory(points: HistoryPoint[], start: number, end: number, buckets: number): Series {
  const size = Math.max(1, Math.floor(buckets));
  const sums = new Array<number>(size).fill(0);
  const counts = new Array<number>(size).fill(0);
  let carry: number | undefined;
  for (const { time, value } of points) {
    if (time > end) continue;
    if (time < start) { carry = value; continue; }
    const index = Math.min(size - 1, Math.floor(((time - start) / Math.max(1, end - start)) * size));
    sums[index] += value;
    counts[index] += 1;
  }
  return sums.map((sum, index) => {
    if (counts[index]) carry = sum / counts[index];
    return carry;
  });
}

export interface SeriesStats {
  min: number;
  max: number;
  mean: number;
}

/**
 * Minimum, maximum et moyenne sur les mesures brutes de la période, pas sur les moyennes par
 * intervalle du tracé (qui écrêtent les pics). La valeur en cours au début de la période et la
 * mesure actuelle comptent. La moyenne est pondérée par la durée de chaque valeur : un capteur
 * qui envoie dix mesures en une minute ne pèse pas plus qu'une valeur stable pendant une heure.
 */
export function pointStats(points: HistoryPoint[], start: number, end: number, current?: number): SeriesStats | undefined {
  const before = points.filter((point) => point.time < start).at(-1);
  const inside = points.filter((point) => point.time >= start && point.time <= end);
  const timeline = [...(before ? [{ time: start, value: before.value }] : []), ...inside];
  const values = [...timeline.map((point) => point.value), ...(isNumber(current) ? [current] : [])];
  if (!values.length) return undefined;
  let weighted = 0;
  let duration = 0;
  timeline.forEach((point, index) => {
    const span = (timeline[index + 1]?.time ?? end) - point.time;
    if (span > 0) {
      weighted += point.value * span;
      duration += span;
    }
  });
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    mean: duration > 0 ? weighted / duration : values.reduce((sum, value) => sum + value, 0) / values.length,
  };
}

/** Extrêmes de la période complétés par la mesure actuelle (affichée sur la tuile). */
export function withCurrentStats(stats: SeriesStats | undefined, current?: number): SeriesStats | undefined {
  if (!isNumber(current)) return stats;
  if (!stats) return { min: current, max: current, mean: current };
  return { ...stats, min: Math.min(stats.min, current), max: Math.max(stats.max, current) };
}

export function seriesStats(values: Series): SeriesStats | undefined {
  const defined = values.filter(isNumber);
  if (!defined.length) return undefined;
  return {
    min: Math.min(...defined),
    max: Math.max(...defined),
    mean: defined.reduce((sum, value) => sum + value, 0) / defined.length,
  };
}

/** Étendue verticale du tracé : au moins `minimumSpan`, avec une marge pour ne pas coller aux bords. */
export function chartRange(values: Series, minimumSpan = 2): [number, number] {
  const stats = seriesStats(values);
  if (!stats) return [0, minimumSpan];
  const span = Math.max(stats.max - stats.min, minimumSpan);
  const middle = (stats.max + stats.min) / 2;
  return [middle - span * 0.6, middle + span * 0.6];
}

export function chartPaths(values: Series, width: number, height: number, min: number, max: number): { line: string; area: string } {
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.flatMap((value, index) => isNumber(value)
    ? [[round(index * step), round(height - ((value - min) / span) * height)] as const]
    : []);
  if (!points.length) return { line: "", area: "" };
  if (points.length === 1) points.unshift([0, points[0][1]], [width, points[0][1]]);
  const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`).join(" ");
  return { line, area: `${line} L${points[points.length - 1][0]} ${height} L${points[0][0]} ${height} Z` };
}

/** Dégradé vertical : la courbe change de couleur en traversant un palier. Offset 0 = haut du tracé. */
export function gradientStops(thresholds: ClimateThreshold[], min: number, max: number): GradientStop[] {
  const colorAt = (value: number): string => temperatureBand(value, thresholds)?.color ?? NEUTRAL_COLOR;
  const span = max - min;
  if (!(span > 0)) return [{ offset: 0, color: colorAt(max) }];
  const blend = 0.03;
  const stops: GradientStop[] = [{ offset: 0, color: colorAt(max) }];
  const bounds = thresholds.flatMap(({ below }) => below !== undefined && below > min && below < max ? [below] : [])
    .sort((a, b) => b - a);
  for (const bound of bounds) {
    const offset = (max - bound) / span;
    stops.push(
      { offset: round(Math.max(0, offset - blend)), color: colorAt(bound) },
      { offset: round(Math.min(1, offset + blend)), color: colorAt(bound - span * 1e-6) },
    );
  }
  stops.push({ offset: 1, color: colorAt(min) });
  return stops;
}

/** Couleur et trait d'une courbe : la couleur suit la position de la pièce dans la liste, pas son rang. */
export function seriesStyle(index: number): { slot: number; dash: string } {
  const safe = Math.max(0, Math.floor(index));
  return { slot: (safe % SERIES_SLOTS) + 1, dash: DASHES[Math.min(DASHES.length - 1, Math.floor(safe / SERIES_SLOTS))] };
}

/** Graduations « rondes » (pas de 1, 2, 2,5 ou 5 × 10^n) qui couvrent l'étendue, avec au moins `minimumSpan`. */
export function niceTicks(min: number, max: number, minimumSpan = 2, target = 4): { min: number; max: number; ticks: number[] } {
  if (!isNumber(min) || !isNumber(max)) return { min: 0, max: minimumSpan, ticks: [0, minimumSpan] };
  let low = Math.min(min, max);
  let high = Math.max(min, max);
  if (high - low < minimumSpan) {
    const middle = (high + low) / 2;
    low = middle - minimumSpan / 2;
    high = middle + minimumSpan / 2;
  }
  const rough = (high - low) / Math.max(1, target - 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ?? 10 * power;
  const start = Math.floor(low / step) * step;
  const end = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end + step / 2; value += step) ticks.push(round(value));
  return { min: round(start), max: round(end), ticks };
}

/** Valeurs de chaque courbe à un instant du graphe, de la plus haute à la plus basse. */
export function valuesAt<T extends { values: Series }>(series: T[], index: number): Array<T & { value: number }> {
  return series.flatMap((item) => {
    const value = item.values[index];
    return isNumber(value) ? [{ ...item, value }] : [];
  }).sort((a, b) => b.value - a.value);
}

/** Moyenne point par point de plusieurs courbes ; un point sans aucune valeur reste vide. */
export function meanSeries(list: Series[]): Series {
  const length = Math.max(0, ...list.map((values) => values.length));
  return Array.from({ length }, (_, index) => {
    const defined = list.map((values) => values[index]).filter(isNumber);
    return defined.length ? defined.reduce((sum, value) => sum + value, 0) / defined.length : undefined;
  });
}

/** Moyenne des valeurs connues, ou rien. */
export function meanOf(values: Array<number | undefined>): number | undefined {
  const defined = values.filter(isNumber);
  return defined.length ? defined.reduce((sum, value) => sum + value, 0) / defined.length : undefined;
}

/** Périodes proposées dans le graphe global : 24 h, 3 jours et 7 jours, plus la durée configurée si elle diffère. */
export function chartPeriods(configured = 24): number[] {
  return [...new Set([configured, 24, 72, 168])].filter((hours) => hours >= 1 && hours <= 168).sort((a, b) => a - b);
}

interface ChartSeries {
  index: number;
  label: string;
  color: string;
  dash: string;
  values: Series;
}

interface RoomView {
  index: number;
  room: ClimateRoomConfig;
  label: string;
  icon: string;
  available: boolean;
  temperature?: number;
  unit: string;
  humidity?: number;
  battery?: number;
  lowBattery: boolean;
  thresholds: ClimateThreshold[];
  band?: ClimateThreshold;
}

interface HistoryState {
  key: string;
  time: number;
  hours: number;
  series: Record<string, Series>;
  /** Statistiques calculées sur les mesures brutes de chaque entité. */
  stats: Record<string, SeriesStats | undefined>;
}

export class AuralisClimateCard extends AuralisBaseCard<ClimateCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    history: { state: true },
    historyError: { state: true },
    selectedRoom: { state: true },
    detailHours: { state: true },
    detail: { state: true },
    detailError: { state: true },
    chartMetric: { state: true },
    focusedRoom: { state: true },
    chartHours: { state: true },
    hoverIndex: { state: true },
  };

  static styles = [AuralisBaseCard.styles, css`
    /* Fond et texte suivent le thème ; une image de fond garde un voile sombre et un texte clair. */
    .climate-shell { --machine-accent:#79d6f2; background:var(--auralis-card-background,var(--auralis-card)); color:var(--auralis-text); }
    .climate-shell:not(.has-image)::before { display:none; }
    /* Jetons sombres de la façade photo : voir .machine-shell dans les styles partagés. */
    .climate-shell.has-image { background:var(--auralis-card-background,#090d12); }
    .climate-shell, .climate-content { min-height:0; }
    .climate-header { align-items:center; padding-right:0; }
    .climate-header .badge { display:grid; width:var(--auralis-target); height:var(--auralis-target); flex:0 0 auto; place-items:center; border:1px solid var(--auralis-border); border-radius:14px; background:color-mix(in srgb,var(--machine-accent) 14%,var(--auralis-layer)); color:color-mix(in oklab,var(--machine-accent),#000 var(--auralis-shade)); }
    .climate-header .badge ha-icon { --mdc-icon-size:23px; }
    .climate-header h2 { overflow:hidden; color:inherit; font-size:var(--auralis-title-size); text-overflow:ellipsis; white-space:nowrap; }
    .climate-header .machine-status { margin-top:5px; color:var(--auralis-muted); }
    .summary { display:flex; flex-wrap:wrap; gap:7px; margin-top:14px; }
    .chip { --band:var(--auralis-muted); display:inline-flex; min-height:30px; align-items:center; gap:7px; padding:5px 11px; border:1px solid var(--auralis-border); border-radius:999px; background:var(--auralis-layer); color:var(--auralis-muted); font-size:var(--auralis-text-xs); backdrop-filter:blur(10px); }
    .chip strong { color:var(--auralis-text); font-weight:700; white-space:nowrap; }
    .chip .swatch { width:8px; height:8px; flex:0 0 auto; border-radius:50%; background:var(--band); box-shadow:0 0 0 4px color-mix(in srgb,var(--band) 18%,transparent); }
    .chip ha-icon { --mdc-icon-size:15px; }
    .chip.alert { border-color:color-mix(in srgb,var(--auralis-active) 45%,transparent); color:var(--auralis-active-ink); }
    .rooms { display:grid; grid-template-columns:repeat(auto-fill,minmax(132px,1fr)); gap:10px; margin-top:14px; }
    .rooms.fixed { grid-template-columns:repeat(var(--climate-columns),minmax(0,1fr)); }
    .room { --band:var(--auralis-muted); display:flex; min-width:0; flex-direction:column; padding:12px 12px 10px; overflow:hidden; border:1px solid color-mix(in srgb,var(--band) 38%,var(--auralis-border)); border-radius:18px; background:linear-gradient(160deg,color-mix(in srgb,var(--band) 14%,transparent),transparent 62%),var(--auralis-layer); color:inherit; cursor:pointer; text-align:start; backdrop-filter:blur(12px); transition:border-color .15s ease; }
    .room:hover { border-color:color-mix(in srgb,var(--band) 80%,transparent); }
    .room:focus-visible, .tabs button:focus-visible { outline:2px solid var(--band,var(--auralis-info)); outline-offset:2px; }
    .room.unavailable { opacity:.55; }
    .room-head { display:flex; min-width:0; align-items:center; gap:7px; color:var(--auralis-muted); font-size:var(--auralis-text-xs); font-weight:650; }
    .room-head ha-icon { --mdc-icon-size:16px; flex:0 0 auto; color:color-mix(in oklab,var(--band),#000 var(--auralis-shade)); }
    .room-head .name { overflow:hidden; flex:1; text-overflow:ellipsis; white-space:nowrap; }
    .room-head .battery { color:var(--auralis-active-ink); }
    .room-value { display:flex; align-items:baseline; gap:3px; margin-top:8px; }
    .room-value strong { color:color-mix(in oklab,var(--band),#000 var(--auralis-shade)); font-size:28px; font-weight:740; letter-spacing:-.05em; line-height:1; }
    .room-value small { color:var(--auralis-muted); font-size:var(--auralis-text-xs); }
    .band-label { min-width:0; align-self:center; padding:3px 8px; margin-inline-start:auto; overflow:hidden; border-radius:999px; background:color-mix(in srgb,var(--band) 16%,transparent); color:color-mix(in oklab,var(--band),#000 var(--auralis-shade)); font-size:var(--auralis-text-xs); font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
    .spark { display:block; width:100%; height:34px; margin-top:9px; overflow:visible; filter:brightness(calc(100% - var(--auralis-shade))); }
    .spark-empty { display:grid; height:34px; margin-top:9px; place-items:center; border-radius:9px; background:color-mix(in srgb,var(--auralis-muted) 8%,transparent); color:var(--auralis-muted); font-size:var(--auralis-text-xs); }
    .room-foot { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:8px; color:var(--auralis-muted); font-size:var(--auralis-text-xs); white-space:nowrap; }
    .room-foot span { display:inline-flex; align-items:center; gap:3px; }
    .room-foot ha-icon { --mdc-icon-size:13px; color:color-mix(in oklab,#63bbff,#000 var(--auralis-shade)); }
    .detail-now { --band:var(--auralis-muted); }
    .detail-now strong { color:color-mix(in oklab,var(--band),#000 var(--auralis-shade)); font-size:30px; letter-spacing:-.05em; }
    .stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-bottom:10px; }
    .stats .dialog-stat { --band:var(--auralis-text); min-width:0; }
    .stats .dialog-stat strong { color:color-mix(in oklab,var(--band),#000 var(--auralis-shade)); }
    .chart { margin:0; padding:12px 12px 8px; border:1px solid var(--auralis-border); border-radius:18px; background:color-mix(in srgb,var(--auralis-text) 3%,transparent); }
    .plot { position:relative; height:132px; }
    .plot svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; filter:brightness(calc(100% - var(--auralis-shade))); }
    .plot .gridline { position:absolute; inset-inline:0; border-top:1px dashed var(--auralis-border); }
    .plot .axis { position:absolute; inset-inline-start:0; z-index:1; padding:1px 5px; border-radius:6px; background:color-mix(in srgb,var(--auralis-surface) 70%,transparent); color:var(--auralis-muted); font-size:var(--auralis-text-xs); }
    .plot .axis.top { top:2px; }
    .plot .axis.bottom { bottom:2px; }
    .time-axis { display:flex; justify-content:space-between; padding-top:7px; color:var(--auralis-muted); font-size:var(--auralis-text-xs); }
    .chart-empty { display:grid; min-height:132px; margin:0; place-items:center; color:var(--auralis-muted); font-size:var(--auralis-text-sm); text-align:center; }
    .tabs button { min-height:var(--auralis-target); color:var(--auralis-muted); }
    .tabs button.active { color:var(--auralis-text); }
    /* Graphe global. Couleurs des courbes : palette catégorielle validée (daltonisme compris), claire par défaut, sombre sur les thèmes sombres. */
    .climate-shell { --series-1:#2a78d6; --series-2:#eb6834; --series-3:#1baf7a; --series-4:#eda100; --series-5:#e87ba4; --series-6:#008300; --series-7:#6250d6; --series-8:#e34948; }
    :host([data-theme="carbon"]) .climate-shell, :host([data-theme="mono"]) .climate-shell, .climate-shell.has-image {
      --series-1:#3987e5; --series-2:#d95926; --series-3:#199e70; --series-4:#c98500; --series-5:#d55181; --series-6:#0ca30c; --series-7:#9085e9; --series-8:#e66767;
    }
    .chart-layout { display:grid; grid-template-columns:minmax(0,1fr) minmax(236px,272px); gap:12px; margin-top:14px; }
    .global { display:flex; min-width:0; flex-direction:column; padding:14px 14px 10px; border:1px solid var(--auralis-border); border-radius:18px; background:var(--auralis-layer); backdrop-filter:blur(12px); }
    .global-head { display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px; min-height:var(--auralis-target); }
    .global-title { min-width:140px; flex:1; }
    .global-title strong { display:block; overflow:hidden; font-size:var(--auralis-text-lg); font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
    .global-title small { color:var(--auralis-muted); font-size:var(--auralis-text-sm); }
    .chart-tools { display:flex; flex:0 1 auto; flex-wrap:wrap; align-items:center; justify-content:flex-end; gap:6px; }
    .chart-tools .segmented { display:flex; gap:2px; padding:3px; border:1px solid var(--auralis-border); border-radius:999px; background:color-mix(in srgb,var(--auralis-text) 4%,transparent); }
    .icon-button { display:inline-grid; width:var(--auralis-target); height:var(--auralis-target); place-items:center; padding:0; border:0; border-radius:999px; background:transparent; color:var(--auralis-muted); cursor:pointer; }
    .chart-tools > .icon-button { border:1px solid var(--auralis-border); }
    .icon-button.text { width:auto; min-width:var(--auralis-target); padding:0 10px; font:inherit; font-size:var(--auralis-text-md); font-weight:700; white-space:nowrap; }
    .icon-button ha-icon { --mdc-icon-size:24px; }
    .icon-button:hover { color:var(--auralis-text); }
    .icon-button.active { background:color-mix(in srgb,var(--auralis-text) 12%,transparent); color:var(--auralis-text); }
    .icon-button:focus-visible, .legend-row:focus-visible, .gplot:focus-visible { outline:2px solid var(--auralis-info); outline-offset:2px; }
    .gplot { position:relative; flex:1; min-height:200px; margin:10px 0 0 34px; touch-action:pan-y; }
    .gplot svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
    .gplot .gridline { position:absolute; inset-inline:0; border-top:1px dashed var(--auralis-border); pointer-events:none; }
    .gplot .tick { position:absolute; inset-inline-end:calc(100% + 6px); color:var(--auralis-muted); font-size:var(--auralis-text-xs); line-height:1; transform:translateY(-50%); white-space:nowrap; }
    .gplot .cross { position:absolute; top:0; bottom:0; width:0; border-inline-start:1px solid color-mix(in srgb,var(--auralis-text) 45%,transparent); pointer-events:none; }
    .gplot .dot { position:absolute; width:9px; height:9px; margin:-4.5px 0 0 -4.5px; border:2px solid var(--auralis-surface); border-radius:50%; background:var(--color); pointer-events:none; }
    .gplot .tip { position:absolute; top:6px; z-index:2; display:grid; min-width:150px; max-width:220px; gap:3px; padding:8px 10px; border:1px solid var(--auralis-border); border-radius:12px; background:color-mix(in srgb,var(--auralis-surface) 94%,transparent); box-shadow:0 10px 26px rgba(0,0,0,.25); font-size:var(--auralis-text-xs); pointer-events:none; }
    .gplot .tip.left { right:calc(100% - var(--x) + 12px); }
    .gplot .tip.right { left:calc(var(--x) + 12px); }
    .tip .tip-time { color:var(--auralis-muted); font-weight:650; }
    .tip .tip-row { display:flex; align-items:center; gap:6px; }
    .tip .tip-row span:nth-child(2) { overflow:hidden; flex:1; color:var(--auralis-muted); text-overflow:ellipsis; white-space:nowrap; }
    .tip .tip-row strong { color:var(--auralis-text); font-weight:700; }
    .key { width:16px; height:0; flex:0 0 auto; border-top:3px solid var(--color); border-radius:2px; }
    .key.dashed { border-top-style:dashed; }
    .key.dotted { border-top-style:dotted; }
    .key.mean { border-top-width:4px; }
    .tip .tip-row.mean span:nth-child(2) { color:var(--auralis-text); font-weight:650; }
    .global .time-axis { margin-left:34px; }
    .global .chart-empty { flex:1; min-height:200px; }
    /* Pièces : deux colonnes de boutons compacts ; la bordure suit le palier de température, comme les tuiles. */
    .legend { display:grid; min-width:0; grid-template-columns:repeat(2,minmax(0,1fr)); align-content:start; gap:6px; margin:0; padding:0; list-style:none; }
    .legend li { display:flex; min-width:0; }
    .legend li.wide { grid-column:1 / -1; }
    .legend-row { --band:var(--auralis-muted); display:flex; width:100%; min-width:0; min-height:56px; flex-direction:column; justify-content:center; gap:5px; padding:7px 9px; border:1px solid color-mix(in srgb,var(--band) 55%,var(--auralis-border)); border-radius:14px; background:linear-gradient(160deg,color-mix(in srgb,var(--band) 14%,transparent),transparent 65%),var(--auralis-layer); color:inherit; cursor:pointer; font:inherit; text-align:start; backdrop-filter:blur(12px); transition:border-color .15s ease, opacity .15s ease, box-shadow .15s ease; }
    .legend-row:hover { border-color:var(--band); }
    .legend-row.active { border-color:var(--band); box-shadow:0 0 0 2px var(--color); }
    .legend-row.muted { opacity:.5; }
    .legend-row .line { display:flex; min-width:0; align-items:center; gap:6px; }
    .legend-row .key { width:12px; }
    .legend-row .name { overflow:hidden; color:var(--auralis-muted); font-size:var(--auralis-text-xs); font-weight:650; text-overflow:ellipsis; white-space:nowrap; }
    .legend-row .values { display:flex; align-items:baseline; gap:7px; color:var(--auralis-muted); font-size:var(--auralis-text-xs); white-space:nowrap; }
    .legend-row .values strong { color:var(--auralis-text); font-size:17px; font-weight:740; letter-spacing:-.03em; line-height:1; }
    .legend-row .values strong.band { color:color-mix(in oklab,var(--band),#000 var(--auralis-shade)); }
    @container (max-width:640px) {
      .chart-layout { grid-template-columns:1fr; }
      .legend { grid-template-columns:repeat(auto-fill,minmax(118px,1fr)); }
    }
    @container (max-width:520px) { .rooms.fixed { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @container (max-width:330px) {
      .room { padding:11px 10px 9px; }
      .room-value strong { font-size:25px; }
      .room-value small { display:none; }
      .band-label { padding:3px 7px; }
    }
    @container (max-width:250px) { .rooms, .rooms.fixed { grid-template-columns:1fr; } }
  `];

  private history?: HistoryState;
  private historyError = false;
  private selectedRoom?: number;
  private detailHours = 24;
  private detail?: HistoryState;
  private detailError = false;
  private timer?: number;
  private historyRequest?: { key: string; time: number };
  private detailRequest?: { key: string; time: number };
  private chartMetric: ChartMetric = "temperature";
  /** Pièce affichée seule dans le graphe global, ou la moyenne intérieure. */
  private focusedRoom?: number | typeof MEAN;
  private chartHours = 24;
  private configuredHours?: number;
  private hoverIndex?: number;
  private configuredMetric?: ChartMetric;

  static getStubConfig(hass?: HomeAssistant): Partial<ClimateCardConfig> {
    const temperatures = Object.values(hass?.states ?? {})
      .filter((state) => SENSOR_ID.test(state.entity_id) && state.attributes.device_class === "temperature")
      .slice(0, 3)
      .map((state) => ({ temperature_entity: state.entity_id }));
    return {
      name: "Températures",
      theme: "carbon",
      rooms: temperatures.length
        ? temperatures
        : [{ name: "Salon", temperature_entity: "sensor.salon_temperature", humidity_entity: "sensor.salon_humidity" }],
    };
  }

  static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      name: "Titre", icon: "Icône", show_header: "Afficher l’en-tête", theme: "Thème", rooms: "Pièces",
      columns: "Colonnes (vide = automatique)", graph_hours: "Durée des courbes (heures)", low_battery: "Seuil de batterie faible (%)",
      show_summary: "Afficher le résumé", layout: "Disposition", chart_metric: "Mesure affichée au départ (graphe global)", thresholds: "Paliers de couleur intérieurs", outdoor_thresholds: "Paliers de couleur extérieurs",
      accent_color: "Couleur d’accent", background_image: "Image de fond", background_position: "Cadrage de l’image",
      image_opacity: "Opacité de l’image", card_background: "Fond de la carte", show_grid: "Afficher la trame",
    };
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "rooms", required: true, selector: listSelector({
          name: { label: "Nom", selector: TEXT },
          temperature_entity: { label: "Capteur de température", required: true, selector: entitySelector("sensor", { deviceClass: "temperature" }) },
          humidity_entity: { label: "Capteur d’humidité", selector: entitySelector("sensor", { deviceClass: "humidity" }) },
          battery_entity: { label: "Pile du capteur", selector: entitySelector("sensor", { deviceClass: "battery" }) },
          icon: { label: "Icône", selector: ICON },
          outdoor: { label: "Capteur extérieur (hors de la moyenne)", selector: BOOLEAN },
          color: { label: "Couleur de la courbe (graphe global, #RRGGBB)", selector: TEXT },
        }, { label: "name", description: "temperature_entity" }) },
        { name: "layout", selector: { select: { mode: "dropdown", options: [
          { value: "tiles", label: "Tuiles (une par pièce)" },
          { value: "chart", label: "Graphe global (toutes les pièces)" },
        ] } } },
        { name: "chart_metric", selector: { select: { mode: "dropdown", options: [
          { value: "temperature", label: "Température" },
          { value: "humidity", label: "Humidité" },
        ] } } },
        { name: "columns", selector: { number: { min: 1, max: 6, step: 1, mode: "box" } } },
        { name: "graph_hours", selector: { number: { min: 1, max: 168, step: 1, mode: "box" } } },
        { name: "low_battery", selector: { number: { min: 0, max: 100, step: 1, mode: "slider" } } },
        { name: "show_summary", selector: { boolean: {} } },
        { name: "show_header", selector: { boolean: {} } },
        { name: "thresholds", selector: listSelector(THRESHOLD_FIELDS, { label: "color", description: "below" }) },
        { name: "outdoor_thresholds", selector: listSelector(THRESHOLD_FIELDS, { label: "color", description: "below" }) },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        { name: "icon", selector: { icon: {} } },
        { name: "accent_color", selector: { text: {} } },
        { name: "background_image", selector: { text: {} } },
        { name: "background_position", selector: { text: {} } },
        { name: "image_opacity", selector: { number: { min: 0, max: 100, step: 1, mode: "slider" } } },
        { name: "card_background", selector: { object: {} } },
        { name: "show_grid", selector: { boolean: {} } },
      ],
      computeLabel: ({ name }: { name: string }) => labels[name],
    };
  }

  public setConfig(config: ClimateCardConfig): void {
    const rooms = Array.isArray(config.rooms) ? config.rooms : [];
    const optionalSensor = (id: unknown): boolean => id === undefined || id === null || id === "" || (typeof id === "string" && SENSOR_ID.test(id));
    if (!rooms.length || rooms.some((room) => !room || typeof room.temperature_entity !== "string" || !SENSOR_ID.test(room.temperature_entity)
      || !optionalSensor(room.humidity_entity) || !optionalSensor(room.battery_entity))) {
      throw new Error("Configurez au moins une pièce avec un capteur temperature_entity (sensor.*). humidity_entity et battery_entity sont facultatifs.");
    }
    const bounded = (value: unknown, min: number, max: number): number | undefined => {
      const number = Number(value);
      return value !== undefined && value !== null && value !== "" && Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : undefined;
    };
    if (config.layout !== undefined && config.layout !== "tiles" && config.layout !== "chart") {
      throw new Error("layout doit valoir tiles ou chart.");
    }
    if (config.chart_metric !== undefined && config.chart_metric !== "temperature" && config.chart_metric !== "humidity") {
      throw new Error("chart_metric doit valoir temperature ou humidity.");
    }
    const columns = bounded(config.columns, 1, 6);
    this.config = {
      ...config,
      name: config.name || "Températures",
      theme: config.theme || "carbon",
      rooms,
      columns: columns === undefined ? undefined : Math.round(columns),
      graph_hours: Math.round(bounded(config.graph_hours, 1, 168) ?? 24),
      low_battery: bounded(config.low_battery, 0, 100) ?? 20,
      thresholds: normalizeThresholds(config.thresholds, INDOOR_THRESHOLDS),
      outdoor_thresholds: normalizeThresholds(config.outdoor_thresholds, OUTDOOR_THRESHOLDS),
    };
    if (this.selectedRoom !== undefined && this.selectedRoom >= rooms.length) this.closeDialog();
    if (typeof this.focusedRoom === "number" && this.focusedRoom >= rooms.length) this.focusedRoom = undefined;
    // La mesure et la période choisies à l'écran restent en place, sauf si la configuration en demande d'autres.
    const metric = config.chart_metric ?? "temperature";
    if (metric !== this.configuredMetric) {
      this.configuredMetric = metric;
      this.chartMetric = metric;
    }
    const hours = this.config.graph_hours ?? 24;
    if (hours !== this.configuredHours) {
      this.configuredHours = hours;
      this.chartHours = hours;
    }
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.timer = window.setInterval(() => void this.refreshAll(), REFRESH_INTERVAL);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this.timer);
    this.historyRequest = undefined;
    this.detailRequest = undefined;
  }

  protected updated(): void {
    super.updated();
    void this.refreshAll();
  }

  protected closeDialog(): void {
    super.closeDialog();
    this.selectedRoom = undefined;
  }

  private async refreshAll(): Promise<void> {
    await Promise.all([this.refreshHistory(), this.refreshDetail()]);
  }

  private async fetchSeries(ids: string[], hours: number, buckets: number, time: number): Promise<Pick<HistoryState, "series" | "stats">> {
    const start = time - hours * HOUR;
    const result = await this.hass!.callWS!<Record<string, unknown>>({
      type: "history/history_during_period",
      start_time: new Date(start).toISOString(),
      end_time: new Date(time).toISOString(),
      entity_ids: ids,
      include_start_time_state: true,
      significant_changes_only: false,
      minimal_response: true,
      no_attributes: true,
    });
    const points = Object.fromEntries(ids.map((id) => [id, parseHistory(result?.[id])]));
    return {
      // Les intervalles ne servent qu'au tracé ; les statistiques viennent des mesures brutes.
      series: Object.fromEntries(ids.map((id) => [id, resampleHistory(points[id], start, time, buckets)])),
      stats: Object.fromEntries(ids.map((id) => [id, pointStats(points[id], start, time)])),
    };
  }

  /** Courbes des tuiles (températures) ou du graphe global (températures et humidités) : un seul appel, rafraîchi toutes les cinq minutes. */
  private async refreshHistory(): Promise<void> {
    const config = this.config;
    if (!this.hass?.callWS || !config) return;
    const chart = config.layout === "chart";
    const ids = [...new Set(config.rooms.flatMap((room) => chart
      ? [room.temperature_entity, room.humidity_entity].filter((id): id is string => Boolean(id))
      : [room.temperature_entity]))];
    const hours = chart ? this.chartHours : config.graph_hours ?? 24;
    const buckets = chart ? CHART_BUCKETS : TILE_BUCKETS;
    const key = `${ids.join(",")}/${hours}/${buckets}`;
    const time = Date.now();
    const interval = hours > 48 ? LONG_REFRESH_INTERVAL : REFRESH_INTERVAL;
    if (this.historyRequest?.key === key && time - this.historyRequest.time < interval) return;
    if (this.historyRequest?.key !== key) {
      this.history = undefined;
      this.historyError = false;
    }
    const request = { key, time };
    this.historyRequest = request;
    try {
      const loaded = await this.fetchSeries(ids, hours, buckets, time);
      if (this.historyRequest !== request) return;
      this.history = { key, time, hours, ...loaded };
      this.historyError = false;
    } catch {
      if (this.historyRequest === request) this.historyError = true;
    }
  }

  /** Courbes de la fenêtre : température et humidité de la pièce ouverte, sur la période choisie. */
  private async refreshDetail(): Promise<void> {
    const room = this.selectedRoom === undefined ? undefined : this.config?.rooms[this.selectedRoom];
    if (!this.hass?.callWS || !room || this.dialog !== "room") return;
    const ids = [room.temperature_entity, room.humidity_entity].filter((id): id is string => Boolean(id));
    const hours = this.detailHours;
    const key = `${ids.join(",")}/${hours}`;
    const time = Date.now();
    if (this.detailRequest?.key === key && time - this.detailRequest.time < REFRESH_INTERVAL) return;
    if (this.detailRequest?.key !== key) {
      this.detail = undefined;
      this.detailError = false;
    }
    const request = { key, time };
    this.detailRequest = request;
    try {
      const loaded = await this.fetchSeries(ids, hours, DETAIL_BUCKETS, time);
      if (this.detailRequest !== request) return;
      this.detail = { key, time, hours, ...loaded };
      this.detailError = false;
    } catch {
      if (this.detailRequest === request) this.detailError = true;
    }
  }

  private reading(id?: string): number | undefined {
    const state = entity(this.hass, id);
    const value = isAvailable(state) ? numericState(state, Number.NaN) : Number.NaN;
    return Number.isFinite(value) ? value : undefined;
  }

  private view(room: ClimateRoomConfig, index: number): RoomView {
    const state: HassEntity | undefined = entity(this.hass, room.temperature_entity);
    const temperature = this.reading(room.temperature_entity);
    const unit = state?.attributes.unit_of_measurement;
    const battery = this.reading(room.battery_entity);
    const thresholds = (room.outdoor ? this.config?.outdoor_thresholds : this.config?.thresholds) ?? INDOOR_THRESHOLDS;
    return {
      index,
      room,
      label: room.name?.trim() || friendlyName(state, room.temperature_entity),
      icon: room.icon || (room.outdoor ? "mdi:tree-outline" : "mdi:home-thermometer-outline"),
      available: temperature !== undefined,
      temperature,
      unit: typeof unit === "string" && unit.trim() ? unit.trim() : "°C",
      humidity: this.reading(room.humidity_entity),
      battery,
      lowBattery: battery !== undefined && battery <= (this.config?.low_battery ?? 20),
      thresholds,
      band: temperatureBand(temperature, thresholds),
    };
  }

  /** Série affichée : l'historique, terminé par la mesure actuelle pour que la courbe rejoigne la valeur de la tuile. */
  private withCurrent(series: Series | undefined, current?: number): Series {
    if (!series?.length) return [];
    return current === undefined ? series : [...series.slice(0, -1), current];
  }

  private temperature(value: number | undefined, unit: string): string {
    return value === undefined ? "—" : `${formatNumber(value, 1)} ${unit}`;
  }

  private periodLabel(hours: number): string {
    if (hours % 24 === 0 && hours >= 48) return `${hours / 24} jours`;
    return `${hours} h`;
  }

  private timeLabel(time: number, hours: number): string {
    const options: Intl.DateTimeFormatOptions = hours <= 48 ? { hour: "2-digit", minute: "2-digit" } : { weekday: "short", day: "numeric" };
    return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: this.hass?.config?.time_zone }).format(time);
  }

  private openRoom(index: number): void {
    this.selectedRoom = index;
    this.detailHours = 24;
    this.openDialog("room");
  }

  private renderGradient(id: string, stops: GradientStop[], height: number): TemplateResult {
    return svg`<linearGradient id=${id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2=${height}>
      ${stops.map((stop) => svg`<stop offset=${stop.offset} stop-color=${stop.color}></stop>`)}
    </linearGradient>`;
  }

  private renderSummary(views: RoomView[]): TemplateResult | typeof nothing {
    if (this.config?.show_summary === false) return nothing;
    const indoor = views.filter((view) => !view.room.outdoor && view.temperature !== undefined);
    const outdoor = views.filter((view) => view.room.outdoor && view.temperature !== undefined);
    const chip = (label: string, view: RoomView, detail?: string) => html`<span class="chip" style=${`--band:${view.band?.color ?? NEUTRAL_COLOR}`}>
      <span class="swatch"></span>${label}<strong>${detail ? `${detail} · ` : ""}${this.temperature(view.temperature, view.unit)}</strong></span>`;
    const chips: TemplateResult[] = [];
    if (indoor.length > 1) {
      const mean = indoor.reduce((sum, view) => sum + view.temperature!, 0) / indoor.length;
      const coldest = indoor.reduce((a, b) => (b.temperature! < a.temperature! ? b : a));
      const warmest = indoor.reduce((a, b) => (b.temperature! > a.temperature! ? b : a));
      const meanView: RoomView = { ...indoor[0], temperature: mean, band: temperatureBand(mean, indoor[0].thresholds) };
      chips.push(chip("Moyenne", meanView));
      // Humidité moyenne des pièces intérieures équipées d'un capteur d'humidité.
      const humidity = meanOf(indoor.map((view) => view.humidity));
      if (humidity !== undefined) {
        chips.push(html`<span class="chip" style=${`--band:${HUMIDITY_COLOR}`}><span class="swatch"></span>Humidité moyenne<strong>${formatNumber(humidity)} %</strong></span>`);
      }
      chips.push(chip("Plus frais", coldest, coldest.label), chip("Plus chaud", warmest, warmest.label));
    }
    for (const view of outdoor) chips.push(chip(outdoor.length > 1 ? view.label : "Extérieur", view));
    const lowBatteries = views.filter((view) => view.lowBattery).length;
    const unavailable = views.filter((view) => !view.available).length;
    if (lowBatteries) chips.push(html`<span class="chip alert"><ha-icon icon="mdi:battery-alert-variant-outline"></ha-icon>${lowBatteries} batterie${lowBatteries > 1 ? "s" : ""} faible${lowBatteries > 1 ? "s" : ""}</span>`);
    if (unavailable) chips.push(html`<span class="chip alert"><ha-icon icon="mdi:lan-disconnect"></ha-icon>${unavailable} capteur${unavailable > 1 ? "s" : ""} indisponible${unavailable > 1 ? "s" : ""}</span>`);
    return chips.length ? html`<div class="summary">${chips}</div>` : nothing;
  }

  private renderRoom(view: RoomView): TemplateResult {
    const hours = this.history?.hours ?? this.config?.graph_hours ?? 24;
    const values = this.withCurrent(this.history?.series[view.room.temperature_entity], view.temperature);
    const raw = this.history?.stats[view.room.temperature_entity];
    const stats = raw ? withCurrentStats(raw, view.temperature) : undefined;
    const [min, max] = chartRange(values);
    const { line, area } = chartPaths(values, 100, 34, min, max);
    const gradient = `spark-${view.index}`;
    const color = view.band?.color ?? NEUTRAL_COLOR;
    const description = [
      `${view.label} : ${view.available ? this.temperature(view.temperature, view.unit) : "indisponible"}`,
      view.band?.label,
      view.humidity !== undefined ? `humidité ${formatNumber(view.humidity)} %` : undefined,
      view.lowBattery ? `batterie faible ${formatNumber(view.battery!)} %` : undefined,
    ].filter(Boolean).join(", ");
    return html`<button type="button" class="room ${view.available ? "" : "unavailable"}" style=${`--band:${color}`}
      aria-label=${description} @click=${() => this.openRoom(view.index)}>
      <span class="room-head">
        <ha-icon .icon=${view.icon}></ha-icon><span class="name">${view.label}</span>
        ${view.lowBattery ? html`<ha-icon class="battery" icon="mdi:battery-alert-variant-outline" title=${`Batterie faible : ${formatNumber(view.battery!)} %`}></ha-icon>` : nothing}
      </span>
      <span class="room-value">
        <strong>${view.temperature === undefined ? "—" : formatNumber(view.temperature, 1)}</strong>
        ${view.temperature === undefined ? nothing : html`<small>${view.unit}</small>`}
        <span class="band-label">${view.available ? view.band?.label ?? "" : "Indisponible"}</span>
      </span>
      ${line
        ? html`<svg class="spark" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
            <defs>${this.renderGradient(gradient, gradientStops(view.thresholds, min, max), 34)}</defs>
            <path d=${area} fill=${`url(#${gradient})`} opacity=".16"></path>
            <path d=${line} fill="none" stroke=${`url(#${gradient})`} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>
          </svg>`
        : html`<span class="spark-empty">${this.historyError ? "Historique indisponible" : this.history || !this.hass?.callWS ? "Aucun historique" : "Chargement…"}</span>`}
      <span class="room-foot">
        <span>${view.humidity !== undefined ? html`<ha-icon icon="mdi:water-percent"></ha-icon>${formatNumber(view.humidity)} %` : nothing}</span>
        ${stats ? html`<span title=${`Minimum et maximum sur ${this.periodLabel(hours)}`}>${formatNumber(stats.min, 1)}° – ${formatNumber(stats.max, 1)}°</span>` : nothing}
      </span>
    </button>`;
  }

  private renderChart(options: {
    id: string; label: string; values: Series; unit: string; digits: number; minimumSpan: number;
    thresholds?: ClimateThreshold[]; hours: number; end: number;
  }): TemplateResult {
    const { id, label, values, unit, digits, hours, end } = options;
    if (!values.some(isNumber)) {
      const message = this.detailError ? "Historique indisponible" : this.detail || !this.hass?.callWS ? "Aucun historique sur cette période" : "Chargement de l’historique…";
      return html`<p class="chart chart-empty" role="status">${message}</p>`;
    }
    const [min, max] = chartRange(values, options.minimumSpan);
    const { line, area } = chartPaths(values, 300, 110, min, max);
    const stops = options.thresholds ? gradientStops(options.thresholds, min, max) : [{ offset: 0, color: HUMIDITY_COLOR }];
    const start = end - hours * HOUR;
    return html`<figure class="chart" role="img" aria-label=${`${label} sur ${this.periodLabel(hours)}`}>
      <div class="plot">
        <span class="gridline" style="top:0"></span><span class="gridline" style="top:50%"></span><span class="gridline" style="top:100%"></span>
        <span class="axis top">${formatNumber(max, digits)} ${unit}</span>
        <span class="axis bottom">${formatNumber(min, digits)} ${unit}</span>
        <svg viewBox="0 0 300 110" preserveAspectRatio="none" aria-hidden="true">
          <defs>${this.renderGradient(id, stops, 110)}</defs>
          <path d=${area} fill=${`url(#${id})`} opacity=".14"></path>
          <path d=${line} fill="none" stroke=${`url(#${id})`} stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>
        </svg>
      </div>
      <div class="time-axis" aria-hidden="true">
        <span>${this.timeLabel(start, hours)}</span><span>${this.timeLabel((start + end) / 2, hours)}</span><span>Maintenant</span>
      </div>
    </figure>`;
  }

  private renderRoomDialog(view: RoomView): TemplateResult {
    const hours = this.detailHours;
    const loaded = this.detail?.hours === hours ? this.detail : undefined;
    const end = loaded?.time ?? Date.now();
    const temperatures = this.withCurrent(loaded?.series[view.room.temperature_entity], view.temperature);
    const humidities = view.room.humidity_entity ? this.withCurrent(loaded?.series[view.room.humidity_entity], view.humidity) : [];
    const raw = loaded?.stats[view.room.temperature_entity];
    const stats = raw ? withCurrentStats(raw, view.temperature) : undefined;
    const stat = (label: string, value?: number) => html`<div class="dialog-stat" style=${`--band:${temperatureBand(value, view.thresholds)?.color ?? "var(--auralis-text)"}`}>
      <strong>${this.temperature(value, view.unit)}</strong><small>${label}</small></div>`;
    const context = [
      view.available ? view.band?.label : "Capteur indisponible",
      view.humidity !== undefined ? `Humidité ${formatNumber(view.humidity)} %` : undefined,
    ].filter(Boolean).join(" · ");
    return this.renderDialog(view.label, view.icon, html`<div class="dialog-body">
      <div class="dialog-overview detail-now" style=${`--band:${view.band?.color ?? NEUTRAL_COLOR}`}>
        <div><span class="eyebrow">Température actuelle</span><strong>${this.temperature(view.temperature, view.unit)}</strong><span class="muted">${context}</span></div>
        ${view.battery !== undefined ? html`<div class="dialog-stat"><strong>${formatNumber(view.battery)} %</strong><small>${view.lowBattery ? "batterie faible" : "batterie"}</small></div>` : nothing}
      </div>
      <div class="tabs" role="group" aria-label="Période affichée">
        ${DETAIL_PERIODS.map((period) => html`<button type="button" class=${period.hours === hours ? "active" : ""}
          aria-pressed=${period.hours === hours} @click=${() => { this.detailHours = period.hours; }}>${period.label}</button>`)}
      </div>
      <section class="dialog-section">
        <p class="dialog-section-title">Température · ${this.periodLabel(hours)}</p>
        <div class="stats">${stat("minimum", stats?.min)}${stat("moyenne", stats?.mean)}${stat("maximum", stats?.max)}</div>
        ${this.renderChart({ id: "detail-temperature", label: "Température", values: temperatures, unit: view.unit, digits: 1, minimumSpan: 2, thresholds: view.thresholds, hours, end })}
      </section>
      ${view.room.humidity_entity ? html`<section class="dialog-section">
        <p class="dialog-section-title">Humidité · ${this.periodLabel(hours)}</p>
        ${this.renderChart({ id: "detail-humidity", label: "Humidité", values: humidities, unit: "%", digits: 0, minimumSpan: 10, hours, end })}
      </section>` : nothing}
      <div class="actions">
        <button class="action" type="button" @click=${() => fireMoreInfo(this, view.room.temperature_entity)}><ha-icon icon="mdi:thermometer"></ha-icon>Température</button>
        ${view.room.humidity_entity ? html`<button class="action" type="button" @click=${() => fireMoreInfo(this, view.room.humidity_entity)}><ha-icon icon="mdi:water-percent"></ha-icon>Humidité</button>` : nothing}
        ${view.room.battery_entity ? html`<button class="action" type="button" @click=${() => fireMoreInfo(this, view.room.battery_entity)}><ha-icon icon="mdi:battery-outline"></ha-icon>Batterie</button>` : nothing}
      </div>
    </div>`);
  }

  private seriesColor(room: ClimateRoomConfig, index: number): { color: string; dash: string } {
    const { slot, dash } = seriesStyle(index);
    const custom = room.color?.trim();
    return { color: custom && SAFE_COLOR.test(custom) ? custom : `var(--series-${slot})`, dash };
  }

  /** Touche une pièce : sa courbe s'affiche seule ; la toucher à nouveau revient à toutes les pièces. */
  private toggleFocus(index: number | typeof MEAN): void {
    this.focusedRoom = this.focusedRoom === index ? undefined : index;
    this.hoverIndex = undefined;
  }

  private setHours(hours: number): void {
    this.chartHours = hours;
    this.hoverIndex = undefined;
  }

  private shortPeriod(hours: number): string {
    return hours % 24 === 0 && hours >= 48 ? `${hours / 24} j` : `${hours} h`;
  }

  /** Heure d'un point du graphe ; au-delà de 48 h, le jour aussi. */
  private pointLabel(time: number, hours: number): string {
    const options: Intl.DateTimeFormatOptions = hours <= 48 ? { hour: "2-digit", minute: "2-digit" } : { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
    return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: this.hass?.config?.time_zone }).format(time);
  }

  private setMetric(metric: ChartMetric): void {
    this.chartMetric = metric;
    this.hoverIndex = undefined;
  }

  private onPlotPointer(event: PointerEvent, length: number): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!rect.width || length < 2) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    this.hoverIndex = Math.round(ratio * (length - 1));
  }

  /** Clavier : les flèches parcourent le graphe (Maj pour aller plus vite), Début et Fin vont aux extrémités. */
  private onPlotKey(event: KeyboardEvent, length: number): void {
    if (length < 2) return;
    if (event.key === "Escape") {
      this.hoverIndex = undefined;
      return;
    }
    const current = this.hoverIndex ?? length - 1;
    const step = event.shiftKey ? 8 : 1;
    const next = event.key === "ArrowLeft" ? current - step
      : event.key === "ArrowRight" ? current + step
        : event.key === "Home" ? 0
          : event.key === "End" ? length - 1 : undefined;
    if (next === undefined) return;
    event.preventDefault();
    this.hoverIndex = Math.min(length - 1, Math.max(0, next));
  }

  private metricText(value: number | undefined, metric: ChartMetric, unit: string): string {
    if (value === undefined) return "—";
    return metric === "temperature" ? `${formatNumber(value, 1)} ${unit}` : `${formatNumber(value)} %`;
  }

  /** Courbes de la mesure affichée : une par pièce intérieure, la moyenne intérieure, et la pièce isolée le cas échéant. */
  private chartSeries(views: RoomView[], metric: ChartMetric, history?: HistoryState): { rooms: ChartSeries[]; mean?: ChartSeries } {
    const rooms = views.flatMap((view): ChartSeries[] => {
      const id = metric === "temperature" ? view.room.temperature_entity : view.room.humidity_entity;
      if (!id) return [];
      const values = this.withCurrent(history?.series[id], metric === "temperature" ? view.temperature : view.humidity);
      return values.some(isNumber) ? [{ index: view.index, label: view.label, ...this.seriesColor(view.room, view.index), values }] : [];
    });
    const indoor = rooms.filter((item) => !views[item.index]?.room.outdoor);
    if (indoor.length < 2) return { rooms };
    const values = meanSeries(indoor.map((item) => item.values));
    return { rooms, mean: { index: -1, label: "Moyenne intérieure", color: "var(--auralis-text)", dash: "", values } };
  }

  private renderGlobalChart(views: RoomView[]): TemplateResult {
    const metric = this.chartMetric;
    const hours = this.chartHours;
    const history = this.history?.hours === hours ? this.history : undefined;
    const end = history?.time ?? Date.now();
    const start = end - hours * HOUR;
    const focusMean = this.focusedRoom === MEAN;
    const focused = typeof this.focusedRoom === "number" ? views[this.focusedRoom] : undefined;
    const unit = metric === "temperature" ? (focused ?? views.find((view) => !view.room.outdoor) ?? views[0]).unit : "%";
    const metricLabel = metric === "temperature" ? "Température" : "Humidité";
    const { rooms, mean } = this.chartSeries(views, metric, history);
    // Toutes les pièces : l'extérieur reste hors du graphe pour ne pas écraser les courbes intérieures ; la moyenne passe au-dessus.
    const series: ChartSeries[] = focused ? rooms.filter((item) => item.index === focused.index)
      : focusMean ? (mean ? [mean] : [])
        : [...rooms.filter((item) => !views[item.index]?.room.outdoor), ...(mean ? [mean] : [])];
    const title = focused ? focused.label : focusMean ? "Moyenne intérieure" : "Toutes les pièces";
    const periods = chartPeriods(this.config?.graph_hours ?? 24);
    const tools = html`<div class="chart-tools">
      ${focused || focusMean ? html`<button type="button" class="icon-button" title="Toutes les pièces" aria-label="Revenir à toutes les pièces"
          @click=${() => this.toggleFocus(this.focusedRoom!)}><ha-icon icon="mdi:chart-multiline"></ha-icon></button>` : nothing}
      ${focused ? html`<button type="button" class="icon-button" title=${`Détails : ${focused.label}`} aria-label=${`Détails de ${focused.label}`}
          @click=${() => this.openRoom(focused.index)}><ha-icon icon="mdi:information-outline"></ha-icon></button>` : nothing}
      <div class="segmented" role="group" aria-label="Période affichée">
        ${periods.map((item) => html`<button type="button" class="icon-button text ${hours === item ? "active" : ""}" aria-pressed=${hours === item ? "true" : "false"}
          title=${this.periodLabel(item)} @click=${() => this.setHours(item)}>${this.shortPeriod(item)}</button>`)}
      </div>
      <div class="segmented" role="group" aria-label="Mesure affichée">
        ${(["temperature", "humidity"] as const).map((item) => {
          const label = item === "temperature" ? "Température" : "Humidité";
          return html`<button type="button" class="icon-button ${metric === item ? "active" : ""}" aria-pressed=${metric === item ? "true" : "false"}
            title=${label} aria-label=${label} @click=${() => this.setMetric(item)}>
            <ha-icon icon=${item === "temperature" ? "mdi:thermometer" : "mdi:water-percent"}></ha-icon></button>`;
        })}
      </div>
    </div>`;
    const head = html`<div class="global-head">
      <div class="global-title"><strong>${title}</strong><small>${metricLabel} · ${this.periodLabel(hours)}</small></div>
      ${tools}
    </div>`;
    if (!series.length) {
      const message = focused && metric === "humidity" && !focused.room.humidity_entity
        ? "Pas de capteur d’humidité pour cette pièce."
        : this.historyError ? "Historique indisponible" : history || !this.hass?.callWS ? "Aucun historique sur cette période" : "Chargement de l’historique…";
      return html`<section class="global">${head}<p class="chart chart-empty" role="status">${message}</p></section>`;
    }
    const values = series.flatMap((item) => item.values.filter(isNumber));
    const scale = niceTicks(Math.min(...values), Math.max(...values), metric === "temperature" ? 2 : 10);
    const span = scale.max - scale.min || 1;
    const length = Math.max(...series.map((item) => item.values.length));
    const top = (value: number): number => round(((scale.max - value) / span) * 100);
    const hover = this.hoverIndex !== undefined && this.hoverIndex < length ? this.hoverIndex : undefined;
    const x = hover === undefined ? 0 : round((hover / Math.max(1, length - 1)) * 100);
    const time = hover === undefined || hover === length - 1 ? end : start + (end - start) * (hover / Math.max(1, length - 1));
    const digits = metric === "temperature" ? 1 : 0;
    const single = series.length === 1 ? series[0] : undefined;
    const area = single ? chartPaths(single.values, 100, 100, scale.min, scale.max).area : "";
    const keyClass = (item: ChartSeries): string => item.index < 0 ? "key mean" : item.dash ? (item.dash.startsWith("6") ? "key dashed" : "key dotted") : "key";
    const subject = focused ? focused.label : focusMean ? "la moyenne intérieure" : `${series.length - (mean ? 1 : 0)} pièces et leur moyenne`;
    return html`<section class="global">
      ${head}
      <div class="gplot" role="img" tabindex="0"
        aria-label=${`${metricLabel} de ${subject} sur ${this.periodLabel(hours)}, de ${formatNumber(scale.min, digits)} à ${formatNumber(scale.max, digits)} ${unit}. Flèches gauche et droite pour lire les valeurs.`}
        @pointermove=${(event: PointerEvent) => this.onPlotPointer(event, length)}
        @pointerdown=${(event: PointerEvent) => this.onPlotPointer(event, length)}
        @pointerleave=${() => { this.hoverIndex = undefined; }}
        @keydown=${(event: KeyboardEvent) => this.onPlotKey(event, length)}
        @blur=${() => { this.hoverIndex = undefined; }}>
        ${scale.ticks.map((tick) => html`<span class="gridline" style=${`top:${top(tick)}%`}></span>
          <span class="tick" style=${`top:${top(tick)}%`}>${formatNumber(tick, Number.isInteger(tick) ? 0 : 1)}${metric === "temperature" ? "°" : " %"}</span>`)}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          ${single ? svg`<path d=${area} style=${`fill:${single.color}`} opacity=".12"></path>` : nothing}
          ${series.map((item) => svg`<path d=${chartPaths(item.values, 100, 100, scale.min, scale.max).line} fill="none" style=${`stroke:${item.color}`}
            stroke-width=${single ? 2.6 : item.index < 0 ? 3.2 : 1.8} stroke-dasharray=${item.dash || nothing} opacity=${item.index < 0 || single ? 1 : 0.9}
            stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>`)}
        </svg>
        ${hover === undefined ? nothing : html`
          <span class="cross" style=${`left:${x}%`}></span>
          ${valuesAt(series, hover).map((item) => html`<span class="dot" style=${`left:${x}%;top:${top(item.value)}%;--color:${item.color}`}></span>`)}
          <div class="tip ${x > 55 ? "left" : "right"}" style=${`--x:${x}%`}>
            <span class="tip-time">${hover === length - 1 ? "Maintenant" : this.pointLabel(time, hours)}</span>
            ${valuesAt(series, hover).map((item) => html`<span class="tip-row ${item.index < 0 ? "mean" : ""}"><span class=${keyClass(item)} style=${`--color:${item.color}`}></span>
              <span>${item.label}</span><strong>${this.metricText(item.value, metric, unit)}</strong></span>`)}
          </div>`}
      </div>
      <div class="time-axis" aria-hidden="true">
        <span>${this.timeLabel(start, hours)}</span><span>${this.timeLabel((start + end) / 2, hours)}</span><span>Maintenant</span>
      </div>
    </section>`;
  }

  /** Liste à droite du graphe : la moyenne intérieure puis chaque pièce, avec ses valeurs actuelles ; un appui affiche une courbe seule. */
  private renderLegend(views: RoomView[]): TemplateResult {
    const metric = this.chartMetric;
    const keyClass = (dash: string): string => (dash ? (dash.startsWith("6") ? "key dashed" : "key dotted") : "key");
    const short = (value: number | undefined): string => (value === undefined ? "—" : `${formatNumber(value, 1)}°`);
    const button = (options: {
      focus: number | typeof MEAN; name: string; color: string; key: string; band?: ClimateThreshold;
      temperature?: number; humidity?: number; hasHumidity: boolean; unit: string; outdoor?: boolean; extra?: string;
    }) => {
      const active = this.focusedRoom === options.focus;
      const missing = metric === "humidity" && !options.hasHumidity;
      const muted = missing || (this.focusedRoom === undefined ? Boolean(options.outdoor) : !active);
      const temperature = this.metricText(options.temperature, "temperature", options.unit);
      const humidity = options.hasHumidity ? this.metricText(options.humidity, "humidity", "%") : undefined;
      const label = [`${options.name}${options.outdoor ? " (extérieur)" : ""}`, `température ${temperature}`, options.band?.label,
        humidity ? `humidité ${humidity}` : undefined].filter(Boolean).join(", ");
      const values = metric === "temperature"
        ? html`<strong class="band">${short(options.temperature)}</strong>${humidity ? html`<span>${humidity}</span>` : nothing}`
        : html`<strong>${humidity ?? "—"}</strong><span>${short(options.temperature)}</span>`;
      return html`<li class=${options.extra ?? ""}><button type="button" class="legend-row ${active ? "active" : ""} ${muted ? "muted" : ""}"
        style=${`--color:${options.color};--band:${options.band?.color ?? NEUTRAL_COLOR}`}
        aria-pressed=${active ? "true" : "false"} aria-label=${label} title=${active ? "Revenir à toutes les pièces" : "Afficher seule cette courbe"}
        @click=${() => this.toggleFocus(options.focus)}>
        <span class="line"><span class=${options.key}></span><span class="name">${options.name}</span></span>
        <span class="values">${values}</span>
      </button></li>`;
    };
    // Moyenne intérieure : capteurs disponibles hors extérieur, comme le résumé.
    const indoor = views.filter((view) => !view.room.outdoor);
    const meanTemperature = meanOf(indoor.map((view) => view.temperature));
    const meanHumidity = meanOf(indoor.map((view) => view.humidity));
    const reference = indoor[0];
    return html`<ul class="legend" aria-label="Pièces du graphe">
      ${indoor.length >= 2 && reference ? button({
        focus: MEAN, name: "Moyenne intérieure", color: "var(--auralis-text)", key: "key mean", extra: "wide",
        band: temperatureBand(meanTemperature, reference.thresholds), temperature: meanTemperature, humidity: meanHumidity,
        hasHumidity: meanHumidity !== undefined, unit: reference.unit,
      }) : nothing}
      ${views.map((view) => {
        const { color, dash } = this.seriesColor(view.room, view.index);
        return button({
          focus: view.index, name: view.label, color, key: keyClass(dash), band: view.band, temperature: view.temperature,
          humidity: view.humidity, hasHumidity: Boolean(view.room.humidity_entity), unit: view.unit, outdoor: view.room.outdoor,
        });
      })}
    </ul>`;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this.config;
    if (!config) return nothing;
    const views = config.rooms.map((room, index) => this.view(room, index));
    const available = views.filter((view) => view.available).length;
    const hours = config.layout === "chart" ? this.chartHours : config.graph_hours ?? 24;
    const selected = this.dialog === "room" && this.selectedRoom !== undefined ? views[this.selectedRoom] : undefined;
    const status = available === views.length
      ? `${views.length} pièce${views.length > 1 ? "s" : ""} · courbes sur ${this.periodLabel(hours)}`
      : `${available} capteur${available > 1 ? "s" : ""} sur ${views.length} disponible${available > 1 ? "s" : ""}`;
    const image = Boolean(config.background_image?.trim());
    return html`<ha-card><div class="machine-shell climate-shell ${image ? "has-image" : ""} ${this.machineGridClass()}" style=${this.machineStyle("#79d6f2")}>
      <div class="machine-content climate-content">
        ${config.show_header !== false ? html`<header class="machine-header climate-header">
          <span class="badge"><ha-icon .icon=${config.icon || "mdi:home-thermometer-outline"}></ha-icon></span>
          <div class="title-wrap"><h2>${config.name}</h2>
            <div class="machine-status"><span class="dot ${available === views.length ? "healthy" : available ? "warning" : "danger"}"></span>${status}</div>
          </div>
        </header>` : nothing}
        ${this.renderSummary(views)}
        ${config.layout === "chart"
          ? html`<div class="chart-layout">${this.renderGlobalChart(views)}${this.renderLegend(views)}</div>`
          : html`<div class="rooms ${config.columns ? "fixed" : ""}" style=${config.columns ? `--climate-columns:${config.columns}` : ""}>
            ${views.map((view) => this.renderRoom(view))}
          </div>`}
      </div>
    </div></ha-card>
    ${selected ? this.renderRoomDialog(selected) : nothing}`;
  }

  public getCardSize(): number {
    if (this.config?.layout === "chart") return 7;
    return 3 + Math.ceil((this.config?.rooms.length ?? 1) / 3) * 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, min_columns: 6 };
  }
}
