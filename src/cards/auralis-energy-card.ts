import { css, html, nothing } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { BaseCardConfig } from "../types/config";
import { fireMoreInfo } from "../utils/actions";
import { entity, formatNumber, numericState } from "../utils/entities";

interface EnergyCardConfig extends BaseCardConfig {
  type: "custom:auralis-energy-card";
  energy_entity: string;
  power_entity?: string;
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
const shortDate = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export class AuralisEnergyCard extends AuralisBaseCard<EnergyCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    history: { state: true },
    historyError: { state: true },
    activeDay: { state: true },
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
    .eyebrow { color: var(--auralis-muted); font-size: 9px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
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
    .chart-heading .muted { font-size: 10px; }
    .chart { position: relative; padding-inline-start: 29px; }
    .plot { position: relative; height: 104px; }
    .gridline { position: absolute; inset-inline: 0; border-top: 1px dashed var(--auralis-border); }
    .gridline:first-child { border-top-style: solid; }
    .gridline span { position: absolute; inset-inline-end: calc(100% + 7px); top: 0; transform: translateY(-50%); color: var(--auralis-muted); font-size: 10px; }
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
    .date-label { padding-top: 6px; color: var(--auralis-muted); font-size: 10px; white-space: nowrap; text-align: center; }
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
    .readings { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 1px; margin-top: 8px; border-radius: var(--auralis-radius-lg); background: var(--auralis-border); }
    .reading { display: flex; min-width: 0; min-height: 49px; align-items: center; justify-content: center; gap: 7px; padding: 6px; border: 0; background: var(--auralis-card); color: inherit; text-align: start; cursor: pointer; }
    .reading:hover { background: var(--auralis-layer); }
    .reading ha-icon { --mdc-icon-size: 17px; flex: 0 0 auto; color: var(--auralis-info); }
    .reading small, .reading strong { display: block; }
    .reading small { color: var(--auralis-muted); font-size: 10px; }
    .reading strong { font-size: 13px; }
    :host { container-type: inline-size; }
    @container (max-width: 280px) {
      .energy-shell { padding: 12px; }
      .date-label { font-size: 9px; }
      .reading ha-icon { display: none; }
      .reading strong { font-size: 12px; }
    }
  `];

  private history?: Map<number, number>;
  private historyError = false;
  private activeDay?: number;
  private timer?: number;
  private request?: { key: string; time: number };

  static getStubConfig(): Partial<EnergyCardConfig> {
    return { energy_entity: "sensor.compteur_energie" };
  }

  static getConfigForm() {
    const labels: Record<string, string> = {
      name: "Titre",
      icon: "Icône",
      theme: "Thème",
      energy_entity: "Capteur d’énergie cumulée",
      power_entity: "Capteur de puissance instantanée",
    };
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "energy_entity", required: true, selector: { entity: { filter: { domain: "sensor" } } } },
        { name: "power_entity", selector: { entity: { filter: { domain: "sensor" } } } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        { name: "icon", selector: { icon: {} } },
      ],
      computeLabel: ({ name }: { name: string }) => labels[name],
    };
  }

  public getGridOptions(): Record<string, number> {
    return { ...super.getGridOptions(), columns: 12, min_columns: 6 };
  }

  public setConfig(config: EnergyCardConfig): void {
    if (!config.energy_entity?.trim()) throw new Error("Le capteur d’énergie (energy_entity) est requis.");
    this.config = { ...config, energy_entity: config.energy_entity.trim(), theme: config.theme ?? "carbon" };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    void this.refreshHistory();
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

  private get dayFormatter(): Intl.DateTimeFormat {
    // ISO calendar labels let us shift whole days even when local days are 23 or 25 hours long.
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: this.hass?.config?.time_zone,
      year: "numeric", month: "2-digit", day: "2-digit",
    });
  }

  private async refreshHistory(): Promise<void> {
    const hass = this.hass;
    const id = this.config?.energy_entity;
    if (!this.isConnected || !hass?.callWS || !id) return;
    const date = this.dayFormatter;
    const key = `${id}/${date.resolvedOptions().timeZone}`;
    const time = Date.now();
    if (this.request?.key === key && time - this.request.time < REFRESH_INTERVAL) return;
    if (this.request?.key !== key) {
      this.history = undefined;
      this.historyError = false;
      this.activeDay = undefined;
    }
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
        units: { energy: "kWh" },
      });
      if (this.request !== request) return;
      this.history = new Map((result[id] ?? []).flatMap(({ start, change }) =>
        typeof change === "number" && Number.isFinite(change) && change >= 0 && Number.isFinite(start)
          ? [[Date.parse(date.format(start)), change] as const]
          : []));
      this.historyError = false;
    } catch {
      if (this.request === request) this.historyError = true;
    }
  }

  private renderTotal(label: string, series: string, value?: number) {
    return html`<div class="total ${series}">
      <strong>${value === undefined ? "—" : html`${formatNumber(value, 1)}<span class="unit">kWh</span>`}</strong>
      <small>${label}</small>
    </div>`;
  }

  private renderChart(days: DayComparison[]) {
    if (!days.some(({ current, previous }) => current !== undefined || previous !== undefined)) {
      const message = this.historyError ? "Historique indisponible" : this.history ? "Aucune statistique d’énergie" : "Chargement de l’historique…";
      return html`<p class="empty-chart" role="status">${message}</p>`;
    }
    const peak = Math.max(1, ...days.map(({ current, previous }) => Math.max(current ?? 0, previous ?? 0)));
    const step = 10 ** Math.floor(Math.log10(peak / 2));
    const ceiling = Math.ceil(peak / (2 * step)) * 2 * step;
    const active = days.find(({ date }) => date === this.activeDay);
    const value = (number?: number) => number === undefined ? "—" : `${formatNumber(number, 1)} kWh`;
    const bar = (series: string, amount?: number) => html`<span class="bar ${series}"
      aria-hidden="true" ?hidden=${amount === undefined} style=${`height:${((amount ?? 0) / ceiling) * 100}%`}></span>`;

    return html`<div class="chart" @mouseleave=${() => { this.activeDay = undefined; }}
      @keydown=${(event: KeyboardEvent) => { if (event.key === "Escape") this.activeDay = undefined; }}>
      <div class="plot">
        ${[0, 50, 100].map((tick) => html`<div class="gridline" aria-hidden="true" style=${`bottom:${tick}%`}>
          <span>${formatNumber(ceiling * tick / 100, 1)}</span>
        </div>`)}
        <div class="day-grid controls" role="group" aria-label="Consommation journalière en kilowattheures">
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

  private renderReading(id: string, label: string, icon: string) {
    const state = entity(this.hass, id);
    const amount = numericState(state, NaN);
    const unit = state?.attributes.unit_of_measurement;
    const formatted = Number.isFinite(amount) ? [formatNumber(amount, 2), unit].filter(Boolean).join(" ") : "—";
    return html`<button type="button" class="reading" @click=${() => fireMoreInfo(this, id)}>
      <ha-icon .icon=${icon} aria-hidden="true"></ha-icon><span><small>${label}</small><strong>${formatted}</strong></span>
    </button>`;
  }

  protected render() {
    if (!this.config) return nothing;
    const today = Date.parse(this.dayFormatter.format(Date.now()));
    const days = Array.from({ length: 7 }, (_, index): DayComparison => {
      const date = today - (6 - index) * DAY;
      return { date, current: this.history?.get(date), previous: this.history?.get(date - 7 * DAY) };
    });
    return html`
      <ha-card>
        <div class="energy-shell">
          <header class="header energy-header">
            <span class="energy-icon"><ha-icon .icon=${this.config.icon ?? "mdi:lightning-bolt"}></ha-icon></span>
            <div class="title-wrap"><p class="eyebrow">Énergie</p><h2>${this.config.name || "Consommation électrique"}</h2></div>
          </header>
          <div class="totals">
            ${this.renderTotal("Aujourd’hui", "current", days[6].current)}
            ${this.renderTotal("Il y a 7 jours", "previous", days[6].previous)}
          </div>
          <div class="chart-heading">
            <span class="eyebrow">7 jours comparés</span>
            <span class="muted">${this.historyError && this.history ? "Actualisation indisponible" : "kWh"}</span>
          </div>
          ${this.renderChart(days)}
        </div>
      </ha-card>
      <ha-card class="readings">
        ${this.config.power_entity ? this.renderReading(this.config.power_entity, "Puissance instantanée", "mdi:flash-outline") : nothing}
        ${this.renderReading(this.config.energy_entity, "Index compteur", "mdi:counter")}
      </ha-card>`;
  }
}
