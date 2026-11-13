import { css, html, nothing } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { BaseCardConfig } from "../types/config";
import { fireMoreInfo } from "../utils/actions";
import type { HassEntity } from "../types/home-assistant";
import { entity, formatNumber, numericState } from "../utils/entities";

export interface EnergyCardConfig extends BaseCardConfig {
  type: "custom:auralis-energy-card";
  energy_entity: string;
  power_entity?: string;
  /** Unité affichée (kWh, Wh, m³, L…). Par défaut, celle du capteur ; une énergie est convertie en kWh. */
  unit?: string;
  /** Nombre de décimales des consommations. */
  decimals?: number;
}

export interface EnergyProfile {
  unit: string;
  /** Conversion demandée au Recorder, quand l'unité appartient à une classe qu'il sait convertir. */
  units?: Record<string, string>;
  decimals: number;
  eyebrow: string;
  title: string;
  icon: string;
  rateLabel: string;
  rateIcon: string;
}

const ENERGY_UNITS = ["Wh", "kWh", "MWh", "GWh", "TWh", "MJ", "GJ", "cal", "kcal", "Mcal", "Gcal"];
const VOLUME_UNITS = ["L", "mL", "m³", "ft³", "CCF", "gal", "fl. oz."];

/** Unité, conversion et libellés selon le compteur suivi : électricité, gaz ou eau. */
export function energyProfile(state: HassEntity | undefined, config: Pick<EnergyCardConfig, "unit" | "decimals">): EnergyProfile {
  const native = typeof state?.attributes.unit_of_measurement === "string" ? state.attributes.unit_of_measurement.trim() : "";
  const nativeIsEnergy = !native || ENERGY_UNITS.includes(native);
  const unit = config.unit?.trim() || (nativeIsEnergy ? "kWh" : native);
  const units: Record<string, string> | undefined = ENERGY_UNITS.includes(unit) && nativeIsEnergy ? { energy: unit }
    : VOLUME_UNITS.includes(unit) && VOLUME_UNITS.includes(native) ? { volume: unit } : undefined;
  const configured = Number(config.decimals);
  const decimals = config.decimals !== undefined && Number.isFinite(configured) ? Math.min(3, Math.max(0, Math.round(configured)))
    : ["Wh", "L", "mL"].includes(unit) ? 0 : unit === "m³" ? 2 : 1;
  const deviceClass = state?.attributes.device_class;
  const water = deviceClass === "water" || (!deviceClass && ["L", "mL", "gal"].includes(unit));
  const gas = deviceClass === "gas";
  if (water) return { unit, units, decimals, eyebrow: "Eau", title: "Consommation d’eau", icon: "mdi:water", rateLabel: "Débit instantané", rateIcon: "mdi:water-pump" };
  if (gas) return { unit, units, decimals, eyebrow: "Gaz", title: "Consommation de gaz", icon: "mdi:fire", rateLabel: "Débit instantané", rateIcon: "mdi:gauge" };
  return { unit, units, decimals, eyebrow: "Énergie", title: "Consommation électrique", icon: "mdi:lightning-bolt", rateLabel: "Puissance instantanée", rateIcon: "mdi:flash-outline" };
}

const ENERGY_FACTORS: Record<string, number> = { Wh: 1, kWh: 1e3, MWh: 1e6, GWh: 1e9, TWh: 1e12 };
const VOLUME_FACTORS: Record<string, number> = { mL: 0.001, L: 1, "m³": 1000 };

/** Conversion d'un index entre deux unités de la même famille (énergie ou volume), sinon `undefined`. */
export function convertMeterValue(value: number, from: string, to: string): number | undefined {
  if (from === to) return value;
  for (const factors of [ENERGY_FACTORS, VOLUME_FACTORS]) {
    if (from in factors && to in factors) return (value * factors[from]) / factors[to];
  }
  return undefined;
}

/** Index du compteur dans l'unité et avec les décimales de la carte (unité du capteur si non convertible). */
export function meterReading(state: HassEntity | undefined, profile: Pick<EnergyProfile, "unit" | "decimals">): string {
  const amount = numericState(state, Number.NaN);
  if (!Number.isFinite(amount)) return "—";
  const native = typeof state?.attributes.unit_of_measurement === "string" ? state.attributes.unit_of_measurement.trim() : "";
  const converted = native ? convertMeterValue(amount, native, profile.unit) : undefined;
  return converted === undefined
    ? [formatNumber(amount, profile.decimals), native].filter(Boolean).join(" ")
    : `${formatNumber(converted, profile.decimals)} ${profile.unit}`;
}

interface DailyStatistic {
  start: number;
  change?: number | null;
}

interface DayComparison {
  date: number;
  current?: number;
  previous?: number;
}

const DAY = 86_400_000;
const REFRESH_INTERVAL = 300_000;
/** Premier nouvel essai après un échec, doublé à chaque échec jusqu'à REFRESH_INTERVAL. */
const RETRY_DELAY = 30_000;

/** Délai avant le prochain chargement : 5 min, ou 30 s, 1 min, 2 min… après des échecs. */
export function historyRetryDelay(failures: number): number {
  return failures > 0 ? Math.min(REFRESH_INTERVAL, RETRY_DELAY * 2 ** (failures - 1)) : REFRESH_INTERVAL;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Formats de date mis en cache par fuseau horaire : un Intl.DateTimeFormat coûte cher à créer. */
function cachedFormatter(kind: "day" | "time", timeZone?: string): Intl.DateTimeFormat {
  const key = `${kind}/${timeZone ?? ""}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = kind === "day"
      // ISO calendar labels let us shift whole days even when local days are 23 or 25 hours long.
      ? new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
      : new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" });
    formatters.set(key, formatter);
  }
  return formatter;
}
const shortDate = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export class AuralisEnergyCard extends AuralisBaseCard<EnergyCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    history: { state: true },
    historyError: { state: true },
    activeDay: { state: true },
    updatedAt: { state: true },
  };

  static styles = [AuralisBaseCard.styles, css`
    :host { --energy-current: #ac5200; --energy-previous: #066ab0; }
    :host([data-theme="carbon"]), :host([data-theme="mono"]) {
      --energy-current: #ffb458;
      --energy-previous: #63bbff;
    }
    .energy-shell {
      padding: 14px;
      background: radial-gradient(ellipse at top right, var(--auralis-accent-soft), transparent 70%), var(--auralis-card);
    }
    .energy-header { margin-bottom: 10px; }
    .energy-icon {
      display: grid;
      flex: 0 0 auto;
      width: 38px;
      height: 38px;
      place-items: center;
      border: 1px solid var(--auralis-border);
      border-radius: 13px;
      background: var(--auralis-layer);
    }
    .energy-icon ha-icon { --mdc-icon-size: 22px; color: var(--energy-current); }
    .energy-header h2 { font-size: clamp(15px, 4.8cqw, 17px); letter-spacing: -.025em; }
    .eyebrow { color: var(--auralis-muted); font-size: var(--auralis-text-xs); font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
    .energy-header .eyebrow { margin-bottom: 4px; }
    .totals { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .total {
      min-width: 0;
      padding: 7px 9px;
      border: 1px solid var(--auralis-border);
      border-radius: var(--auralis-radius-md);
      background: var(--auralis-layer);
    }
    .total strong { display: block; font-size: clamp(20px, 7cqw, 28px); line-height: 1.12; letter-spacing: -.05em; }
    .total small { color: var(--auralis-muted); font-size: 11px; }
    .total .unit { margin-inline-start: 4px; color: var(--auralis-muted); font-size: 11px; font-weight: 600; letter-spacing: 0; }
    .current { --series-color: var(--energy-current); }
    .previous { --series-color: var(--energy-previous); }
    .total strong, .tooltip-value strong { color: var(--series-color); }
    .chart-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 5px; margin: 12px 0 7px; }
    .chart-heading .muted { font-size: var(--auralis-text-xs); }
    .chart { position: relative; padding-inline-start: 32px; }
    .plot { position: relative; height: 104px; }
    .gridline { position: absolute; inset-inline: 0; border-top: 1px dashed var(--auralis-border); }
    .gridline:first-child { border-top-style: solid; }
    .gridline span { position: absolute; inset-inline-end: calc(100% + 7px); top: 0; transform: translateY(-50%); color: var(--auralis-muted); font-size: var(--auralis-text-xs); }
    .day-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; }
    .day-grid.controls { position: absolute; inset: 0; }
    .chart-day {
      display: flex;
      min-width: 0;
      align-items: flex-end;
      justify-content: center;
      gap: 3px;
      padding: 0 2px;
      border: 0;
      border-radius: 6px 6px 0 0;
      background: none;
      cursor: pointer;
    }
    .chart-day[aria-expanded="true"] { background: var(--auralis-accent-soft); }
    .chart-day:focus-visible, .reading:focus-visible { outline: 2px solid var(--auralis-info); outline-offset: -2px; }
    .bar { width: 37%; max-width: 22px; min-height: 2px; border-radius: 4px 4px 1px 1px; background: var(--series-color); }
    .bar.previous { opacity: .72; }
    .bar[hidden] { display: block; visibility: hidden; }
    .date-label { padding-top: 6px; color: var(--auralis-muted); font-size: var(--auralis-text-xs); white-space: nowrap; text-align: center; }
    .date-label:last-child { color: var(--auralis-text); font-weight: 700; }
    .tooltip {
      position: absolute;
      inset-block-start: -5px;
      inset-inline-end: 0;
      z-index: 1;
      padding: 8px 10px;
      border: 1px solid var(--auralis-border);
      border-radius: 11px;
      background: var(--auralis-layer);
      box-shadow: var(--auralis-shadow);
      font-size: 11px;
      pointer-events: none;
    }
    .tooltip-value { display: flex; justify-content: space-between; gap: 14px; margin-top: 4px; color: var(--auralis-muted); }
    .empty-chart { display: grid; min-height: 135px; place-items: center; color: var(--auralis-muted); text-align: center; font-size: 12px; }
    .readings { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 1px; margin-top: 12px; overflow: hidden; border: 1px solid var(--auralis-border); border-radius: var(--auralis-radius-lg); background: var(--auralis-border); }
    .reading { display: flex; min-width: 0; min-height: 49px; align-items: center; justify-content: center; gap: 7px; padding: 6px; border: 0; background: var(--auralis-card); color: inherit; text-align: start; cursor: pointer; }
    .reading:hover { background: var(--auralis-layer); }
    .reading ha-icon { --mdc-icon-size: 17px; flex: 0 0 auto; color: var(--auralis-info); }
    .reading small, .reading strong { display: block; }
    .reading small { color: var(--auralis-muted); font-size: var(--auralis-text-xs); }
    .reading strong { font-size: 13px; }
    :host { container-type: inline-size; }
    @container (max-width: 280px) {
      .energy-shell { padding: 12px; }
      .reading ha-icon { display: none; }
      .reading strong { font-size: 12px; }
    }
    /* accent_color colore la semaine en cours ; card_background remplace le fond. */
    :host([data-accent]) { --energy-current: var(--auralis-card-accent); }
    :host([data-background]) ha-card, :host([data-background]) .energy-shell { background: var(--auralis-card-background); }
  `];

  private history?: Map<number, number>;
  private historyError = false;
  private activeDay?: number;
  private timer?: number;
  private retryTimer?: number;
  private failures = 0;
  /** Heure du dernier chargement réussi des statistiques. */
  private updatedAt?: number;
  private request?: { key: string; time: number };

  static getStubConfig(): Partial<EnergyCardConfig> {
    return { energy_entity: "sensor.compteur_energie" };
  }

  static getConfigForm() {
    const labels: Record<string, string> = {
      name: "Titre",
      icon: "Icône",
      theme: "Thème",
      energy_entity: "Capteur de consommation cumulée (électricité, gaz ou eau)",
      power_entity: "Capteur de puissance ou de débit instantané",
      unit: "Unité affichée (vide = celle du capteur)",
      decimals: "Décimales",
      accent_color: "Couleur de la semaine en cours",
      card_background: "Fond de la carte",
    };
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "energy_entity", required: true, selector: { entity: { filter: { domain: "sensor" } } } },
        { name: "power_entity", selector: { entity: { filter: { domain: "sensor" } } } },
        { name: "unit", selector: { select: { options: ["kWh", "Wh", "MWh", "m³", "L"], custom_value: true } } },
        { name: "decimals", selector: { number: { min: 0, max: 3, step: 1, mode: "box" } } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        { name: "icon", selector: { icon: {} } },
        { name: "accent_color", selector: { text: {} } },
        { name: "card_background", selector: { object: {} } },
      ],
      computeLabel: ({ name }: { name: string }) => labels[name],
    };
  }

  public getGridOptions(): Record<string, number> {
    return { ...super.getGridOptions(), columns: 12, min_columns: 6 };
  }

  public setConfig(config: EnergyCardConfig): void {
    if (!config.energy_entity?.trim()) throw new Error("Le capteur d’énergie (energy_entity) est requis.");
    this.config = { ...config, energy_entity: config.energy_entity.trim(), theme: config.theme ?? "auto" };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    void this.refreshHistory();
    this.timer = window.setInterval(() => void this.refreshHistory(), REFRESH_INTERVAL);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this.timer);
    window.clearTimeout(this.retryTimer);
    this.request = undefined;
  }

  protected updated(): void {
    super.updated();
    void this.refreshHistory();
  }

  private get dayFormatter(): Intl.DateTimeFormat {
    return cachedFormatter("day", this.hass?.config?.time_zone);
  }

  private async refreshHistory(): Promise<void> {
    const hass = this.hass;
    const id = this.config?.energy_entity;
    if (!this.isConnected || !hass?.callWS || !id) return;
    const date = this.dayFormatter;
    const profile = this.profile();
    const key = `${id}/${date.resolvedOptions().timeZone}/${profile.unit}`;
    const time = Date.now();
    if (this.request?.key === key && time - this.request.time < historyRetryDelay(this.failures)) return;
    if (this.request?.key !== key) {
      this.history = undefined;
      this.historyError = false;
      this.activeDay = undefined;
      this.updatedAt = undefined;
      this.failures = 0;
    }
    window.clearTimeout(this.retryTimer);
    const request = { key, time };
    this.request = request;
    try {
      const result = await hass.callWS<Record<string, DailyStatistic[]>>({
        type: "recorder/statistics_during_period",
        // Recorder aligns daily bins to the Home Assistant timezone. Include a buffer before J−13.
        start_time: new Date(time - 15 * DAY).toISOString(),
        statistic_ids: [id],
        period: "day",
        types: ["change"],
        ...(profile.units ? { units: profile.units } : {}),
      });
      if (this.request !== request) return;
      this.history = new Map((result[id] ?? []).flatMap(({ start, change }) =>
        typeof change === "number" && Number.isFinite(change) && change >= 0 && Number.isFinite(start)
          ? [[Date.parse(date.format(start)), change] as const]
          : []));
      this.historyError = false;
      this.failures = 0;
      this.updatedAt = time;
    } catch {
      if (this.request !== request) return;
      this.historyError = true;
      // Nouvel essai rapide, puis de plus en plus espacé tant que le Recorder ne répond pas.
      this.failures += 1;
      this.retryTimer = window.setTimeout(() => void this.refreshHistory(), historyRetryDelay(this.failures));
    }
  }

  private profile(): EnergyProfile {
    return energyProfile(entity(this.hass, this.config?.energy_entity), this.config ?? {});
  }

  private renderTotal(label: string, series: string, value?: number) {
    const { unit, decimals } = this.profile();
    return html`<div class="total ${series}">
      <strong>${value === undefined ? "—" : html`${formatNumber(value, decimals)}<span class="unit">${unit}</span>`}</strong>
      <small>${label}</small>
    </div>`;
  }

  private renderChart(days: DayComparison[]) {
    if (!days.some(({ current, previous }) => current !== undefined || previous !== undefined)) {
      const message = this.historyError ? "Historique indisponible" : this.history ? "Aucune statistique de consommation" : "Chargement de l’historique…";
      return html`<p class="empty-chart" role="status">${message}</p>`;
    }
    const peak = Math.max(1, ...days.map(({ current, previous }) => Math.max(current ?? 0, previous ?? 0)));
    const step = 10 ** Math.floor(Math.log10(peak / 2));
    const ceiling = Math.ceil(peak / (2 * step)) * 2 * step;
    const active = days.find(({ date }) => date === this.activeDay);
    const { unit, decimals } = this.profile();
    const value = (number?: number) => number === undefined ? "—" : `${formatNumber(number, decimals)} ${unit}`;
    const bar = (series: string, amount?: number) => html`<span class="bar ${series}"
      aria-hidden="true" ?hidden=${amount === undefined} style=${`height:${((amount ?? 0) / ceiling) * 100}%`}></span>`;

    return html`<div class="chart" @mouseleave=${() => { this.activeDay = undefined; }}
      @keydown=${(event: KeyboardEvent) => { if (event.key === "Escape") this.activeDay = undefined; }}>
      <div class="plot">
        ${[0, 50, 100].map((tick) => html`<div class="gridline" aria-hidden="true" style=${`bottom:${tick}%`}>
          <span>${formatNumber(ceiling * tick / 100, Math.min(decimals, 1))}</span>
        </div>`)}
        <div class="day-grid controls" role="group" aria-label=${`Consommation journalière en ${unit}`}>
          ${days.map((day) => html`<button type="button" class="chart-day"
            aria-label=${`${fullDate.format(day.date)} : ${value(day.current)}. ${fullDate.format(day.date - 7 * DAY)} : ${value(day.previous)}`}
            aria-expanded=${day.date === this.activeDay}
            @pointerenter=${(event: PointerEvent) => { if (event.pointerType === "mouse") this.activeDay = day.date; }}
            @focus=${() => { this.activeDay = day.date; }}
            @blur=${() => { if (this.activeDay === day.date) this.activeDay = undefined; }}
            @click=${() => { this.activeDay = day.date; }}>
            ${bar("current", day.current)}${bar("previous", day.previous)}
          </button>`)}
        </div>
      </div>
      <div class="day-grid" aria-hidden="true">${days.map(({ date }, index) => html`
        <span class="date-label">${index % 2 === 0 ? shortDate.format(date) : nothing}</span>`)}
      </div>
      ${active ? html`<div class="tooltip" aria-hidden="true">
        <div class="tooltip-value current"><span>${fullDate.format(active.date)}</span><strong>${value(active.current)}</strong></div>
        <div class="tooltip-value previous"><span>${fullDate.format(active.date - 7 * DAY)} · J−7</span><strong>${value(active.previous)}</strong></div>
      </div>` : nothing}
    </div>`;
  }

  private renderReading(id: string, label: string, icon: string, profile?: EnergyProfile) {
    const state = entity(this.hass, id);
    const amount = numericState(state, NaN);
    const unit = state?.attributes.unit_of_measurement;
    // L'index suit l'unité et les décimales de la carte ; la puissance garde celles du capteur.
    const formatted = profile ? meterReading(state, profile)
      : Number.isFinite(amount) ? [formatNumber(amount, 2), unit].filter(Boolean).join(" ") : "—";
    return html`<button type="button" class="reading" @click=${() => fireMoreInfo(this, id)}>
      <ha-icon .icon=${icon} aria-hidden="true"></ha-icon><span><small>${label}</small><strong>${formatted}</strong></span>
    </button>`;
  }

  protected render() {
    if (!this.config) return nothing;
    const today = Date.parse(this.dayFormatter.format(Date.now()));
    const profile = this.profile();
    const days = Array.from({ length: 7 }, (_, index): DayComparison => {
      const date = today - (6 - index) * DAY;
      return { date, current: this.history?.get(date), previous: this.history?.get(date - 7 * DAY) };
    });
    const asOf = this.updatedAt === undefined ? undefined : cachedFormatter("time", this.hass?.config?.time_zone).format(this.updatedAt);
    return html`
      <ha-card>
        <div class="energy-shell">
          <header class="header energy-header">
            <span class="energy-icon"><ha-icon .icon=${this.config.icon ?? profile.icon}></ha-icon></span>
            <div class="title-wrap"><p class="eyebrow">${profile.eyebrow}</p><h2>${this.config.name || profile.title}</h2></div>
          </header>
          <div class="totals">
            ${this.renderTotal("Aujourd’hui", "current", days[6].current)}
            ${this.renderTotal("Il y a 7 jours", "previous", days[6].previous)}
          </div>
          <div class="chart-heading">
            <span class="eyebrow">7 jours comparés</span>
            <span class="muted" title="Les consommations viennent des statistiques horaires de Home Assistant : l’heure en cours n’est pas encore comptée.">${this.historyError && this.history ? "Actualisation indisponible" : asOf ? `${profile.unit} · relevé ${asOf}` : profile.unit}</span>
          </div>
          ${this.renderChart(days)}
          <div class="readings">
            ${this.config.power_entity ? this.renderReading(this.config.power_entity, profile.rateLabel, profile.rateIcon) : nothing}
            ${this.renderReading(this.config.energy_entity, "Index compteur", "mdi:counter", profile)}
          </div>
        </div>
      </ha-card>`;
  }
}
