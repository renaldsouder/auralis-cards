import { css, html, nothing, svg, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { fireMoreInfo } from "../utils/actions";
import { entity, formatNumber, friendlyName, isAvailable, numericState } from "../utils/entities";

/** Palier de couleur : s'applique aux valeurs strictement inférieures à `below`. Le dernier palier n'a pas de borne. */
export interface ClimateThreshold {
  below?: number;
  color: string;
  label?: string;
}

export interface ClimateRoomConfig {
  name?: string;
  icon?: string;
  temperature_entity: string;
  humidity_entity?: string;
  battery_entity?: string;
  /** Capteur extérieur : utilise l'échelle extérieure et reste hors de la moyenne. */
  outdoor?: boolean;
}

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
const TILE_BUCKETS = 48;
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
      name: "Titre", icon: "Icône", show_header: "Afficher l’en-tête", theme: "Thème", rooms: "Pièces (name, temperature_entity, humidity_entity, battery_entity, outdoor)",
      columns: "Colonnes (vide = automatique)", graph_hours: "Durée des courbes (heures)", low_battery: "Seuil de batterie faible (%)",
      show_summary: "Afficher le résumé", thresholds: "Paliers de couleur intérieurs", outdoor_thresholds: "Paliers de couleur extérieurs",
      accent_color: "Couleur d’accent", background_image: "Image de fond", background_position: "Cadrage de l’image",
      image_opacity: "Opacité de l’image", card_background: "Fond de la carte", show_grid: "Afficher la trame",
    };
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "rooms", required: true, selector: { object: {} } },
        { name: "columns", selector: { number: { min: 1, max: 6, step: 1, mode: "box" } } },
        { name: "graph_hours", selector: { number: { min: 1, max: 168, step: 1, mode: "box" } } },
        { name: "low_battery", selector: { number: { min: 0, max: 100, step: 1, mode: "slider" } } },
        { name: "show_summary", selector: { boolean: {} } },
        { name: "show_header", selector: { boolean: {} } },
        { name: "thresholds", selector: { object: {} } },
        { name: "outdoor_thresholds", selector: { object: {} } },
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

  /** Courbes des tuiles : un seul appel pour toutes les températures, rafraîchi toutes les cinq minutes. */
  private async refreshHistory(): Promise<void> {
    const config = this.config;
    if (!this.hass?.callWS || !config) return;
    const ids = [...new Set(config.rooms.map((room) => room.temperature_entity))];
    const hours = config.graph_hours ?? 24;
    const key = `${ids.join(",")}/${hours}`;
    const time = Date.now();
    if (this.historyRequest?.key === key && time - this.historyRequest.time < REFRESH_INTERVAL) return;
    if (this.historyRequest?.key !== key) {
      this.history = undefined;
      this.historyError = false;
    }
    const request = { key, time };
    this.historyRequest = request;
    try {
      const loaded = await this.fetchSeries(ids, hours, TILE_BUCKETS, time);
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
      chips.push(chip("Moyenne", meanView), chip("Plus frais", coldest, coldest.label), chip("Plus chaud", warmest, warmest.label));
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

  protected render(): TemplateResult | typeof nothing {
    const config = this.config;
    if (!config) return nothing;
    const views = config.rooms.map((room, index) => this.view(room, index));
    const available = views.filter((view) => view.available).length;
    const hours = config.graph_hours ?? 24;
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
        <div class="rooms ${config.columns ? "fixed" : ""}" style=${config.columns ? `--climate-columns:${config.columns}` : ""}>
          ${views.map((view) => this.renderRoom(view))}
        </div>
      </div>
    </div></ha-card>
    ${selected ? this.renderRoomDialog(selected) : nothing}`;
  }

  public getCardSize(): number {
    return 3 + Math.ceil((this.config?.rooms.length ?? 1) / 3) * 2;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, min_columns: 6 };
  }
}
