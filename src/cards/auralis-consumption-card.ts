import { css, html, nothing, svg, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import { chartPaths, chartPeriods, niceTicks, parseHistory, resampleHistory, seriesStyle, valuesAt } from "./auralis-climate-card";
import type { BaseCardConfig } from "../types/config";
import type { HomeAssistant } from "../types/home-assistant";
import { entity, formatNumber, friendlyName, isAvailable, numericState } from "../utils/entities";
import { entitySelector, ICON, listSelector, TEXT } from "../utils/form";

/** Un appareil suivi : sa puissance instantanée (W) et/ou son compteur d'énergie cumulée (kWh). */
export interface ConsumptionDeviceConfig {
  name?: string;
  icon?: string;
  power_entity?: string;
  energy_entity?: string;
  /** Couleur de la courbe (sinon la couleur de sa position dans la liste). */
  color?: string;
}

export type ConsumptionMetric = "power" | "energy";

export interface ConsumptionCardConfig extends BaseCardConfig {
  type: "custom:auralis-consumption-card";
  devices: ConsumptionDeviceConfig[];
  /** Puissance de toute la maison (compteur, en W ou VA) : ligne « Maison », hors du graphe tant qu'elle n'est pas choisie. */
  total_power_entity?: string;
  /** Énergie de toute la maison (compteur cumulé en kWh). */
  total_energy_entity?: string;
  /** Période affichée au départ, en heures (1 à 168). */
  graph_hours?: number;
  /** Mesure affichée au départ : `power` (courbes de puissance) ou `energy` (kWh cumulés sur la période). */
  chart_metric?: ConsumptionMetric;
  show_summary?: boolean;
  show_header?: boolean;
}

type Series = Array<number | undefined>;

interface StatisticRow {
  start?: number | string;
  change?: number | null;
}

interface DeviceView {
  index: number;
  device: ConsumptionDeviceConfig;
  label: string;
  icon: string;
  color: string;
  dash: string;
  power?: number;
  powerUnit: string;
  available: boolean;
}

interface ChartSeries {
  index: number;
  label: string;
  color: string;
  dash: string;
  values: Series;
  unit: string;
}

interface HistoryState {
  key: string;
  time: number;
  hours: number;
  metric: ConsumptionMetric;
  series: Record<string, Series>;
  /** Énergie totale de la période, par compteur. */
  totals: Record<string, number | undefined>;
}

const HOUR = 3_600_000;
const REFRESH_INTERVAL = 300_000;
const LONG_REFRESH_INTERVAL = 1_800_000;
const POWER_BUCKETS = 96;
const TOTAL = -1;
const SENSOR_ID = /^sensor\.[a-z0-9_]+$/;
const SAFE_COLOR = /^[#\w(),.%\s-]+$/;
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const round = (value: number): number => Math.round(value * 100) / 100;

/** « 1 250 W », « 13 W ». */
export function formatPower(value: number | undefined, unit = "W"): string {
  return value === undefined ? "—" : `${formatNumber(value, value < 10 ? 1 : 0)} ${unit}`;
}

/** « 0,42 kWh », « 12,3 kWh », « 128 kWh ». */
export function formatEnergy(value: number | undefined): string {
  if (value === undefined) return "—";
  return `${formatNumber(value, value < 10 ? 2 : value < 100 ? 1 : 0)} kWh`;
}

/**
 * Énergie cumulée heure par heure depuis le début de la période, à partir des statistiques
 * horaires (`change`) du Recorder : une valeur par heure, la dernière étant le total de la période.
 */
export function cumulativeSeries(rows: StatisticRow[] | undefined, start: number, hours: number): { values: Series; total?: number } {
  const size = Math.max(1, Math.round(hours));
  const first = Math.floor(start / HOUR) * HOUR;
  const changes = new Array<number | undefined>(size).fill(undefined);
  for (const row of rows ?? []) {
    const time = typeof row.start === "number" ? row.start : Date.parse(String(row.start ?? ""));
    if (!Number.isFinite(time) || !isNumber(row.change) || row.change < 0) continue;
    const index = Math.floor((time - first) / HOUR);
    if (index < 0 || index >= size) continue;
    changes[index] = (changes[index] ?? 0) + row.change;
  }
  if (!changes.some(isNumber)) return { values: [] };
  let sum = 0;
  let last = changes.length - 1;
  while (last > 0 && changes[last] === undefined) last -= 1;
  const values = changes.map((change, index) => {
    if (index > last) return undefined;
    sum += change ?? 0;
    return round(sum * 1000) / 1000;
  });
  return { values, total: sum };
}

export class AuralisConsumptionCard extends AuralisBaseCard<ConsumptionCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    history: { state: true },
    historyError: { state: true },
    metric: { state: true },
    hours: { state: true },
    focused: { state: true },
    hoverIndex: { state: true },
  };

  static styles = [AuralisBaseCard.styles, css`
    .consumption-shell { --machine-accent:#f2b84b; background:var(--auralis-card-background,var(--auralis-card)); color:var(--auralis-text); }
    .consumption-shell:not(.has-image)::before { display:none; }
    .consumption-shell, .consumption-content { min-height:0; }
    .consumption-header { align-items:center; padding-right:0; }
    .consumption-header .badge { display:grid; width:var(--auralis-target); height:var(--auralis-target); flex:0 0 auto; place-items:center; border:1px solid var(--auralis-border); border-radius:14px; background:color-mix(in srgb,var(--machine-accent) 14%,var(--auralis-layer)); color:color-mix(in oklab,var(--machine-accent),#000 var(--auralis-shade)); }
    .consumption-header .badge ha-icon { --mdc-icon-size:23px; }
    .consumption-header h2 { overflow:hidden; color:inherit; font-size:var(--auralis-title-size); text-overflow:ellipsis; white-space:nowrap; }
    .consumption-header .machine-status { margin-top:5px; color:var(--auralis-muted); }
    .summary { display:flex; flex-wrap:wrap; gap:7px; margin-top:14px; }
    .chip { --band:var(--auralis-muted); display:inline-flex; min-height:30px; align-items:center; gap:7px; padding:5px 11px; border:1px solid var(--auralis-border); border-radius:999px; background:var(--auralis-layer); color:var(--auralis-muted); font-size:var(--auralis-text-xs); backdrop-filter:blur(10px); }
    .chip strong { color:var(--auralis-text); font-weight:700; white-space:nowrap; }
    .chip .swatch { width:8px; height:8px; flex:0 0 auto; border-radius:50%; background:var(--band); box-shadow:0 0 0 4px color-mix(in srgb,var(--band) 18%,transparent); }
    .chip ha-icon { --mdc-icon-size:15px; }
    .chip.alert { border-color:color-mix(in srgb,var(--auralis-active) 45%,transparent); color:var(--auralis-active-ink); }
    /* Palette catégorielle partagée avec le graphe des températures (daltonisme compris), claire puis sombre. */
    .consumption-shell { --series-1:#2a78d6; --series-2:#eb6834; --series-3:#1baf7a; --series-4:#eda100; --series-5:#e87ba4; --series-6:#008300; --series-7:#6250d6; --series-8:#e34948; }
    :host([data-theme="carbon"]) .consumption-shell, :host([data-theme="mono"]) .consumption-shell, .consumption-shell.has-image {
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
    .gplot { position:relative; flex:1; min-height:200px; margin:10px 0 0 44px; touch-action:pan-y; }
    .gplot svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
    .gplot .gridline { position:absolute; inset-inline:0; border-top:1px dashed var(--auralis-border); pointer-events:none; }
    .gplot .tick { position:absolute; inset-inline-end:calc(100% + 6px); color:var(--auralis-muted); font-size:var(--auralis-text-xs); line-height:1; transform:translateY(-50%); white-space:nowrap; }
    .gplot .cross { position:absolute; top:0; bottom:0; width:0; border-inline-start:1px solid color-mix(in srgb,var(--auralis-text) 45%,transparent); pointer-events:none; }
    .gplot .dot { position:absolute; width:9px; height:9px; margin:-4.5px 0 0 -4.5px; border:2px solid var(--auralis-surface); border-radius:50%; background:var(--color); pointer-events:none; }
    .gplot .tip { position:absolute; top:6px; z-index:2; display:grid; min-width:160px; max-width:230px; gap:3px; padding:8px 10px; border:1px solid var(--auralis-border); border-radius:12px; background:color-mix(in srgb,var(--auralis-surface) 94%,transparent); box-shadow:0 10px 26px rgba(0,0,0,.25); font-size:var(--auralis-text-xs); pointer-events:none; }
    .gplot .tip.left { right:calc(100% - var(--x) + 12px); }
    .gplot .tip.right { left:calc(var(--x) + 12px); }
    .tip .tip-time { color:var(--auralis-muted); font-weight:650; }
    .tip .tip-row { display:flex; align-items:center; gap:6px; }
    .tip .tip-row span:nth-child(2) { overflow:hidden; flex:1; color:var(--auralis-muted); text-overflow:ellipsis; white-space:nowrap; }
    .tip .tip-row strong { color:var(--auralis-text); font-weight:700; }
    .key { width:16px; height:0; flex:0 0 auto; border-top:3px solid var(--color); border-radius:2px; }
    .key.dashed { border-top-style:dashed; }
    .key.dotted { border-top-style:dotted; }
    .key.total { border-top-width:4px; }
    .time-axis { display:flex; justify-content:space-between; margin-left:44px; padding-top:7px; color:var(--auralis-muted); font-size:var(--auralis-text-xs); }
    .chart-empty { display:grid; flex:1; min-height:200px; margin:0; place-items:center; color:var(--auralis-muted); font-size:var(--auralis-text-sm); text-align:center; }
    .legend { display:grid; min-width:0; grid-template-columns:repeat(2,minmax(0,1fr)); align-content:start; gap:6px; margin:0; padding:0; list-style:none; }
    .legend li { display:flex; min-width:0; }
    .legend li.wide { grid-column:1 / -1; }
    .legend-row { display:flex; width:100%; min-width:0; min-height:56px; flex-direction:column; justify-content:center; gap:5px; padding:7px 9px; border:1px solid color-mix(in srgb,var(--color) 45%,var(--auralis-border)); border-radius:14px; background:linear-gradient(160deg,color-mix(in srgb,var(--color) 14%,transparent),transparent 65%),var(--auralis-layer); color:inherit; cursor:pointer; font:inherit; text-align:start; backdrop-filter:blur(12px); transition:border-color .15s ease, opacity .15s ease, box-shadow .15s ease; }
    .legend-row:hover { border-color:var(--color); }
    .legend-row.active { border-color:var(--color); box-shadow:0 0 0 2px var(--color); }
    .legend-row.muted { opacity:.5; }
    .legend-row .line { display:flex; min-width:0; align-items:center; gap:6px; }
    .legend-row .key { width:12px; }
    .legend-row .name { overflow:hidden; color:var(--auralis-muted); font-size:var(--auralis-text-xs); font-weight:650; text-overflow:ellipsis; white-space:nowrap; }
    .legend-row .values { display:flex; align-items:baseline; gap:7px; color:var(--auralis-muted); font-size:var(--auralis-text-xs); white-space:nowrap; }
    .legend-row .values strong { color:var(--auralis-text); font-size:17px; font-weight:740; letter-spacing:-.03em; line-height:1; }
    @container (max-width:640px) {
      .chart-layout { grid-template-columns:1fr; }
      .legend { grid-template-columns:repeat(auto-fill,minmax(118px,1fr)); }
    }
  `];

  private history?: HistoryState;
  private historyError = false;
  private metric: ConsumptionMetric = "power";
  private hours = 24;
  private focused?: number;
  private hoverIndex?: number;
  private timer?: number;
  private request?: { key: string; time: number };
  private configuredMetric?: ConsumptionMetric;
  private configuredHours?: number;

  static getStubConfig(hass?: HomeAssistant): Partial<ConsumptionCardConfig> {
    const power = Object.values(hass?.states ?? {})
      .filter((state) => SENSOR_ID.test(state.entity_id) && state.attributes.device_class === "power")
      .slice(0, 4)
      .map((state) => ({ power_entity: state.entity_id }));
    return {
      name: "Consommation par appareil",
      theme: "carbon",
      devices: power.length ? power : [{ name: "Lave-linge", power_entity: "sensor.lave_linge_puissance" }],
    };
  }

  static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      name: "Titre", icon: "Icône", show_header: "Afficher l’en-tête", show_summary: "Afficher le résumé", theme: "Thème",
      devices: "Appareils", total_power_entity: "Puissance de toute la maison (compteur)",
      total_energy_entity: "Énergie de toute la maison (compteur cumulé)", graph_hours: "Période au départ (heures)",
      chart_metric: "Mesure affichée au départ", accent_color: "Couleur d’accent", card_background: "Fond de la carte",
    };
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "devices", required: true, selector: listSelector({
          name: { label: "Nom", selector: TEXT },
          power_entity: { label: "Capteur de puissance (W)", selector: entitySelector("sensor", { deviceClass: "power" }) },
          energy_entity: { label: "Compteur d’énergie (kWh)", selector: entitySelector("sensor", { deviceClass: "energy" }) },
          icon: { label: "Icône", selector: ICON },
          color: { label: "Couleur de la courbe (#RRGGBB)", selector: TEXT },
        }, { label: "name", description: "power_entity" }) },
        { name: "total_power_entity", selector: entitySelector("sensor") },
        { name: "total_energy_entity", selector: entitySelector("sensor", { deviceClass: "energy" }) },
        { name: "chart_metric", selector: { select: { mode: "dropdown", options: [
          { value: "power", label: "Puissance (W)" },
          { value: "energy", label: "Énergie cumulée (kWh)" },
        ] } } },
        { name: "graph_hours", selector: { number: { min: 1, max: 168, step: 1, mode: "box" } } },
        { name: "show_summary", selector: { boolean: {} } },
        { name: "show_header", selector: { boolean: {} } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        { name: "icon", selector: { icon: {} } },
        { name: "accent_color", selector: { text: {} } },
        { name: "card_background", selector: { object: {} } },
      ],
      computeLabel: ({ name }: { name: string }) => labels[name],
    };
  }

  public setConfig(config: ConsumptionCardConfig): void {
    const devices = Array.isArray(config.devices) ? config.devices : [];
    const optional = (id: unknown): boolean => id === undefined || id === null || id === "" || (typeof id === "string" && SENSOR_ID.test(id));
    if (!devices.length || devices.some((device) => !device || !(device.power_entity || device.energy_entity)
      || !optional(device.power_entity) || !optional(device.energy_entity))) {
      throw new Error("Configurez au moins un appareil avec power_entity ou energy_entity (sensor.*).");
    }
    if (!optional(config.total_power_entity) || !optional(config.total_energy_entity)) {
      throw new Error("total_power_entity et total_energy_entity doivent être des capteurs sensor.*.");
    }
    if (config.chart_metric !== undefined && config.chart_metric !== "power" && config.chart_metric !== "energy") {
      throw new Error("chart_metric doit valoir power ou energy.");
    }
    const hours = Number(config.graph_hours);
    this.config = {
      ...config,
      name: config.name || "Consommation par appareil",
      theme: config.theme || "carbon",
      devices,
      graph_hours: Number.isFinite(hours) && config.graph_hours !== undefined ? Math.round(Math.min(168, Math.max(1, hours))) : 24,
    };
    if (this.focused !== undefined && this.focused >= devices.length) this.focused = undefined;
    // Sans mesure d'un type, la carte montre l'autre ; un choix fait à l'écran reste en place.
    const metric = config.chart_metric ?? (devices.some((device) => device.power_entity) ? "power" : "energy");
    if (metric !== this.configuredMetric) {
      this.configuredMetric = metric;
      this.metric = metric;
    }
    if (this.config.graph_hours !== this.configuredHours) {
      this.configuredHours = this.config.graph_hours;
      this.hours = this.config.graph_hours ?? 24;
    }
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.timer = window.setInterval(() => void this.refreshHistory(), REFRESH_INTERVAL);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this.timer);
    this.request = undefined;
  }

  protected updated(): void {
    super.updated();
    void this.refreshHistory();
  }

  private ids(metric: ConsumptionMetric): string[] {
    const config = this.config;
    if (!config) return [];
    const ids = metric === "power"
      ? [...config.devices.map((device) => device.power_entity), config.total_power_entity]
      : [...config.devices.map((device) => device.energy_entity), config.total_energy_entity];
    return [...new Set(ids.filter((id): id is string => Boolean(id)))];
  }

  /** Puissance : historique ré-échantillonné ; énergie : statistiques horaires cumulées. Un seul appel par période. */
  private async refreshHistory(): Promise<void> {
    if (!this.hass?.callWS || !this.config) return;
    const metric = this.metric;
    const hours = this.hours;
    const ids = this.ids(metric);
    const key = `${metric}/${ids.join(",")}/${hours}`;
    const time = Date.now();
    const interval = hours > 48 ? LONG_REFRESH_INTERVAL : REFRESH_INTERVAL;
    if (this.request?.key === key && time - this.request.time < interval) return;
    if (this.request?.key !== key) {
      this.history = undefined;
      this.historyError = false;
    }
    const request = { key, time };
    this.request = request;
    if (!ids.length) {
      this.history = { key, time, hours, metric, series: {}, totals: {} };
      return;
    }
    const start = time - hours * HOUR;
    try {
      let series: Record<string, Series> = {};
      let totals: Record<string, number | undefined> = {};
      if (metric === "power") {
        const result = await this.hass.callWS<Record<string, unknown>>({
          type: "history/history_during_period",
          start_time: new Date(start).toISOString(),
          end_time: new Date(time).toISOString(),
          entity_ids: ids,
          include_start_time_state: true,
          significant_changes_only: false,
          minimal_response: true,
          no_attributes: true,
        });
        series = Object.fromEntries(ids.map((id) => [id, resampleHistory(parseHistory(result?.[id]), start, time, POWER_BUCKETS)]));
      } else {
        const result = await this.hass.callWS<Record<string, StatisticRow[]>>({
          type: "recorder/statistics_during_period",
          start_time: new Date(Math.floor(start / HOUR) * HOUR).toISOString(),
          statistic_ids: ids,
          period: "hour",
          types: ["change"],
          units: { energy: "kWh" },
        });
        for (const id of ids) {
          const cumulative = cumulativeSeries(result?.[id], start, hours);
          series[id] = cumulative.values;
          totals[id] = cumulative.total;
        }
      }
      if (this.request !== request) return;
      this.history = { key, time, hours, metric, series, totals };
      this.historyError = false;
    } catch {
      if (this.request === request) this.historyError = true;
    }
  }

  private reading(id?: string): number | undefined {
    const state = entity(this.hass, id);
    const value = isAvailable(state) ? numericState(state, Number.NaN) : Number.NaN;
    return Number.isFinite(value) ? value : undefined;
  }

  private unitOf(id: string | undefined, fallback: string): string {
    const unit = entity(this.hass, id)?.attributes.unit_of_measurement;
    return typeof unit === "string" && unit.trim() ? unit.trim() : fallback;
  }

  private view(device: ConsumptionDeviceConfig, index: number): DeviceView {
    const id = device.power_entity || device.energy_entity;
    const { slot, dash } = seriesStyle(index);
    const custom = device.color?.trim();
    const power = this.reading(device.power_entity);
    return {
      index,
      device,
      label: device.name?.trim() || friendlyName(entity(this.hass, id), id ?? ""),
      icon: device.icon || "mdi:power-plug-outline",
      color: custom && SAFE_COLOR.test(custom) ? custom : `var(--series-${slot})`,
      dash,
      power,
      powerUnit: this.unitOf(device.power_entity, "W"),
      available: device.power_entity ? power !== undefined : isAvailable(entity(this.hass, device.energy_entity)),
    };
  }

  /** Série affichée : l'historique de puissance se termine sur la mesure actuelle. */
  private withCurrent(series: Series | undefined, current?: number): Series {
    if (!series?.length) return [];
    return current === undefined || this.metric !== "power" ? series : [...series.slice(0, -1), current];
  }

  private periodLabel(hours: number): string {
    return hours % 24 === 0 && hours >= 48 ? `${hours / 24} jours` : `${hours} h`;
  }

  private shortPeriod(hours: number): string {
    return hours % 24 === 0 && hours >= 48 ? `${hours / 24} j` : `${hours} h`;
  }

  private timeLabel(time: number, hours: number): string {
    const options: Intl.DateTimeFormatOptions = hours <= 48 ? { hour: "2-digit", minute: "2-digit" } : { weekday: "short", day: "numeric" };
    return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: this.hass?.config?.time_zone }).format(time);
  }

  private pointLabel(time: number, hours: number): string {
    const options: Intl.DateTimeFormatOptions = hours <= 48 ? { hour: "2-digit", minute: "2-digit" } : { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
    return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: this.hass?.config?.time_zone }).format(time);
  }

  private valueText(value: number | undefined, unit: string): string {
    return this.metric === "power" ? formatPower(value, unit) : formatEnergy(value);
  }

  /** Touche un appareil (ou la maison) : sa courbe seule ; un nouvel appui revient à tous les appareils. */
  private toggleFocus(index: number): void {
    this.focused = this.focused === index ? undefined : index;
    this.hoverIndex = undefined;
  }

  private setHours(hours: number): void {
    this.hours = hours;
    this.hoverIndex = undefined;
  }

  private setMetric(metric: ConsumptionMetric): void {
    this.metric = metric;
    this.hoverIndex = undefined;
  }

  private onPlotPointer(event: PointerEvent, length: number): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!rect.width || length < 2) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    this.hoverIndex = Math.round(ratio * (length - 1));
  }

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

  private totalId(): string | undefined {
    return this.metric === "power" ? this.config?.total_power_entity : this.config?.total_energy_entity;
  }

  private chartSeries(views: DeviceView[]): { devices: ChartSeries[]; total?: ChartSeries } {
    const history = this.history?.metric === this.metric && this.history.hours === this.hours ? this.history : undefined;
    const devices = views.flatMap((view): ChartSeries[] => {
      const id = this.metric === "power" ? view.device.power_entity : view.device.energy_entity;
      if (!id) return [];
      const values = this.withCurrent(history?.series[id], view.power);
      return values.some(isNumber) ? [{ index: view.index, label: view.label, color: view.color, dash: view.dash, values, unit: view.powerUnit }] : [];
    });
    const totalId = this.totalId();
    if (!totalId) return { devices };
    const values = this.withCurrent(history?.series[totalId], this.metric === "power" ? this.reading(totalId) : undefined);
    return values.some(isNumber)
      ? { devices, total: { index: TOTAL, label: "Maison", color: "var(--auralis-text)", dash: "", values, unit: this.unitOf(totalId, "W") } }
      : { devices };
  }

  private energyTotal(id?: string): number | undefined {
    const history = this.history?.metric === "energy" && this.history.hours === this.hours ? this.history : undefined;
    return id ? history?.totals[id] : undefined;
  }

  private renderSummary(views: DeviceView[]): TemplateResult | typeof nothing {
    if (this.config?.show_summary === false) return nothing;
    const chips: TemplateResult[] = [];
    const chip = (label: string, value: string, color = "var(--machine-accent)") =>
      html`<span class="chip" style=${`--band:${color}`}><span class="swatch"></span>${label}<strong>${value}</strong></span>`;
    const totalId = this.config?.total_power_entity;
    const house = this.reading(totalId);
    if (house !== undefined) chips.push(chip("Maison", formatPower(house, this.unitOf(totalId, "W"))));
    const measured = views.filter((view) => view.power !== undefined);
    if (measured.length) {
      const sum = measured.reduce((total, view) => total + view.power!, 0);
      const share = house && house > 0 ? ` · ${formatNumber(Math.min(100, (sum / house) * 100))} %` : "";
      chips.push(chip("Appareils suivis", `${formatPower(sum)}${share}`, "var(--series-1)"));
      const top = measured.reduce((a, b) => (b.power! > a.power! ? b : a));
      if (top.power! > 0) chips.push(chip("Plus gros poste", `${top.label} · ${formatPower(top.power, top.powerUnit)}`, top.color));
    }
    if (this.metric === "energy") {
      const total = views.map((view) => this.energyTotal(view.device.energy_entity)).filter(isNumber).reduce((sum, value) => sum + value, 0);
      if (total > 0) chips.push(chip(`Appareils sur ${this.periodLabel(this.hours)}`, formatEnergy(total), "var(--series-3)"));
    }
    const unavailable = views.filter((view) => !view.available).length;
    if (unavailable) chips.push(html`<span class="chip alert"><ha-icon icon="mdi:lan-disconnect"></ha-icon>${unavailable} appareil${unavailable > 1 ? "s" : ""} indisponible${unavailable > 1 ? "s" : ""}</span>`);
    return chips.length ? html`<div class="summary">${chips}</div>` : nothing;
  }

  private renderGlobalChart(views: DeviceView[]): TemplateResult {
    const metric = this.metric;
    const hours = this.hours;
    const history = this.history?.metric === metric && this.history.hours === hours ? this.history : undefined;
    const end = history?.time ?? Date.now();
    const start = end - hours * HOUR;
    const focusTotal = this.focused === TOTAL;
    const focused = this.focused !== undefined && this.focused >= 0 ? views[this.focused] : undefined;
    const { devices, total } = this.chartSeries(views);
    // La maison écraserait les appareils : elle n'est tracée que seule.
    const series: ChartSeries[] = focused ? devices.filter((item) => item.index === focused.index)
      : focusTotal ? (total ? [total] : [])
        : devices;
    const title = focused ? focused.label : focusTotal ? "Maison" : "Tous les appareils";
    const metricLabel = metric === "power" ? "Puissance" : "Énergie cumulée";
    const hasPower = Boolean(this.config?.devices.some((device) => device.power_entity) || this.config?.total_power_entity);
    const hasEnergy = Boolean(this.config?.devices.some((device) => device.energy_entity) || this.config?.total_energy_entity);
    const tools = html`<div class="chart-tools">
      ${focused || focusTotal ? html`<button type="button" class="icon-button" title="Tous les appareils" aria-label="Revenir à tous les appareils"
          @click=${() => this.toggleFocus(this.focused!)}><ha-icon icon="mdi:chart-multiline"></ha-icon></button>` : nothing}
      ${focused ? html`<button type="button" class="icon-button" title=${`Fiche : ${focused.label}`} aria-label=${`Fiche Home Assistant de ${focused.label}`}
          @click=${() => this.moreInfo(focused.device.power_entity || focused.device.energy_entity)}><ha-icon icon="mdi:information-outline"></ha-icon></button>` : nothing}
      <div class="segmented" role="group" aria-label="Période affichée">
        ${chartPeriods(this.config?.graph_hours ?? 24).map((item) => html`<button type="button" class="icon-button text ${hours === item ? "active" : ""}"
          aria-pressed=${hours === item ? "true" : "false"} title=${this.periodLabel(item)} @click=${() => this.setHours(item)}>${this.shortPeriod(item)}</button>`)}
      </div>
      ${hasPower && hasEnergy ? html`<div class="segmented" role="group" aria-label="Mesure affichée">
        ${(["power", "energy"] as const).map((item) => {
          const label = item === "power" ? "Puissance (W)" : "Énergie cumulée (kWh)";
          return html`<button type="button" class="icon-button ${metric === item ? "active" : ""}" aria-pressed=${metric === item ? "true" : "false"}
            title=${label} aria-label=${label} @click=${() => this.setMetric(item)}>
            <ha-icon icon=${item === "power" ? "mdi:flash-outline" : "mdi:counter"}></ha-icon></button>`;
        })}
      </div>` : nothing}
    </div>`;
    const head = html`<div class="global-head">
      <div class="global-title"><strong>${title}</strong><small>${metricLabel} · ${this.periodLabel(hours)}</small></div>
      ${tools}
    </div>`;
    if (!series.length) {
      const missing = focused && !(metric === "power" ? focused.device.power_entity : focused.device.energy_entity);
      const message = missing ? (metric === "power" ? "Pas de capteur de puissance pour cet appareil." : "Pas de compteur d’énergie pour cet appareil.")
        : this.historyError ? "Historique indisponible" : history || !this.hass?.callWS ? "Aucune mesure sur cette période" : "Chargement de l’historique…";
      return html`<section class="global">${head}<p class="chart-empty" role="status">${message}</p></section>`;
    }
    const values = series.flatMap((item) => item.values.filter(isNumber));
    const scale = niceTicks(0, Math.max(...values), metric === "power" ? 10 : 0.1);
    const span = scale.max - scale.min || 1;
    const length = Math.max(...series.map((item) => item.values.length));
    const top = (value: number): number => round(((scale.max - value) / span) * 100);
    const hover = this.hoverIndex !== undefined && this.hoverIndex < length ? this.hoverIndex : undefined;
    const x = hover === undefined ? 0 : round((hover / Math.max(1, length - 1)) * 100);
    const time = hover === undefined || hover === length - 1 ? end : start + (end - start) * (hover / Math.max(1, length - 1));
    const single = series.length === 1 ? series[0] : undefined;
    const area = single ? chartPaths(single.values, 100, 100, scale.min, scale.max).area : "";
    const keyClass = (item: ChartSeries): string => item.index === TOTAL ? "key total" : item.dash ? (item.dash.startsWith("6") ? "key dashed" : "key dotted") : "key";
    const unit = metric === "power" ? (single?.unit ?? "W") : "kWh";
    const tickText = (tick: number): string => metric === "power"
      ? formatNumber(tick, tick < 10 && !Number.isInteger(tick) ? 1 : 0)
      : formatNumber(tick, tick < 1 ? 2 : tick < 10 ? 1 : 0);
    const subject = focused ? focused.label : focusTotal ? "la maison" : `${series.length} appareils`;
    return html`<section class="global">
      ${head}
      <div class="gplot" role="img" tabindex="0"
        aria-label=${`${metricLabel} de ${subject} sur ${this.periodLabel(hours)}, jusqu’à ${tickText(scale.max)} ${unit}. Flèches gauche et droite pour lire les valeurs.`}
        @pointermove=${(event: PointerEvent) => this.onPlotPointer(event, length)}
        @pointerdown=${(event: PointerEvent) => this.onPlotPointer(event, length)}
        @pointerleave=${() => { this.hoverIndex = undefined; }}
        @keydown=${(event: KeyboardEvent) => this.onPlotKey(event, length)}
        @blur=${() => { this.hoverIndex = undefined; }}>
        ${scale.ticks.map((tick) => html`<span class="gridline" style=${`top:${top(tick)}%`}></span>
          <span class="tick" style=${`top:${top(tick)}%`}>${tickText(tick)}</span>`)}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          ${single ? svg`<path d=${area} style=${`fill:${single.color}`} opacity=".12"></path>` : nothing}
          ${series.map((item) => svg`<path d=${chartPaths(item.values, 100, 100, scale.min, scale.max).line} fill="none" style=${`stroke:${item.color}`}
            stroke-width=${single ? 2.6 : 1.8} stroke-dasharray=${item.dash || nothing} opacity=${single ? 1 : 0.9}
            stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>`)}
        </svg>
        ${hover === undefined ? nothing : html`
          <span class="cross" style=${`left:${x}%`}></span>
          ${valuesAt(series, hover).map((item) => html`<span class="dot" style=${`left:${x}%;top:${top(item.value)}%;--color:${item.color}`}></span>`)}
          <div class="tip ${x > 55 ? "left" : "right"}" style=${`--x:${x}%`}>
            <span class="tip-time">${hover === length - 1 ? "Maintenant" : this.pointLabel(time, hours)}</span>
            ${valuesAt(series, hover).map((item) => html`<span class="tip-row"><span class=${keyClass(item)} style=${`--color:${item.color}`}></span>
              <span>${item.label}</span><strong>${this.valueText(item.value, item.unit)}</strong></span>`)}
          </div>`}
      </div>
      <div class="time-axis" aria-hidden="true">
        <span>${this.timeLabel(start, hours)}</span><span>${this.timeLabel((start + end) / 2, hours)}</span><span>Maintenant</span>
      </div>
    </section>`;
  }

  /** Liste à droite : la maison puis chaque appareil, puissance actuelle et énergie de la période ; un appui isole une courbe. */
  private renderLegend(views: DeviceView[]): TemplateResult {
    const metric = this.metric;
    const keyClass = (dash: string): string => (dash ? (dash.startsWith("6") ? "key dashed" : "key dotted") : "key");
    const row = (options: { focus: number; name: string; color: string; key: string; power?: number; powerUnit: string; energy?: number; extra?: string; missing: boolean }) => {
      const active = this.focused === options.focus;
      const muted = options.missing || (this.focused !== undefined && !active) || (this.focused === undefined && options.focus === TOTAL);
      const powerText = formatPower(options.power, options.powerUnit);
      const energyText = options.energy === undefined ? undefined : formatEnergy(options.energy);
      const values = metric === "power"
        ? html`<strong>${powerText}</strong>${energyText ? html`<span>${energyText}</span>` : nothing}`
        : html`<strong>${energyText ?? "—"}</strong>${options.power !== undefined ? html`<span>${powerText}</span>` : nothing}`;
      const label = [options.name, `puissance ${powerText}`, energyText ? `énergie sur ${this.periodLabel(this.hours)} ${energyText}` : undefined].filter(Boolean).join(", ");
      return html`<li class=${options.extra ?? ""}><button type="button" class="legend-row ${active ? "active" : ""} ${muted ? "muted" : ""}"
        style=${`--color:${options.color}`} aria-pressed=${active ? "true" : "false"} aria-label=${label}
        title=${active ? "Revenir à tous les appareils" : "Afficher seule cette courbe"} @click=${() => this.toggleFocus(options.focus)}>
        <span class="line"><span class=${options.key} style=${`--color:${options.color}`}></span><span class="name">${options.name}</span></span>
        <span class="values">${values}</span>
      </button></li>`;
    };
    const config = this.config!;
    const hasTotal = Boolean(config.total_power_entity || config.total_energy_entity);
    return html`<ul class="legend" aria-label="Appareils du graphe">
      ${hasTotal ? row({
        focus: TOTAL, name: "Maison", color: "var(--auralis-text)", key: "key total", extra: "wide",
        power: this.reading(config.total_power_entity), powerUnit: this.unitOf(config.total_power_entity, "W"),
        energy: this.energyTotal(config.total_energy_entity), missing: !(metric === "power" ? config.total_power_entity : config.total_energy_entity),
      }) : nothing}
      ${views.map((view) => row({
        focus: view.index, name: view.label, color: view.color, key: keyClass(view.dash), power: view.power, powerUnit: view.powerUnit,
        energy: this.energyTotal(view.device.energy_entity), missing: !(metric === "power" ? view.device.power_entity : view.device.energy_entity),
      }))}
    </ul>`;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this.config;
    if (!config) return nothing;
    const views = config.devices.map((device, index) => this.view(device, index));
    const available = views.filter((view) => view.available).length;
    const status = available === views.length
      ? `${views.length} appareil${views.length > 1 ? "s" : ""} · courbes sur ${this.periodLabel(this.hours)}`
      : `${available} appareil${available > 1 ? "s" : ""} sur ${views.length} disponible${available > 1 ? "s" : ""}`;
    return html`<ha-card><div class="machine-shell consumption-shell ${this.machineGridClass()}" style=${this.machineStyle("#f2b84b")}>
      <div class="machine-content consumption-content">
        ${config.show_header !== false ? html`<header class="machine-header consumption-header">
          <span class="badge"><ha-icon .icon=${config.icon || "mdi:chart-timeline-variant"}></ha-icon></span>
          <div class="title-wrap"><h2>${config.name}</h2>
            <div class="machine-status"><span class="dot ${available === views.length ? "healthy" : available ? "warning" : "danger"}"></span>${status}</div>
          </div>
        </header>` : nothing}
        ${this.renderSummary(views)}
        <div class="chart-layout">${this.renderGlobalChart(views)}${this.renderLegend(views)}</div>
      </div>
    </div></ha-card>`;
  }

  public getCardSize(): number {
    return 7;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, min_columns: 6 };
  }
}
