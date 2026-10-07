import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { fireMoreInfo } from "../utils/actions";
import { entity, friendlyName, isAvailable } from "../utils/entities";

export interface ThermostatCardConfig extends BaseCardConfig {
  type: "custom:auralis-thermostat-card";
  entity?: string;
  entities?: string[];
  entity_labels?: Record<string, string>;
}

const MODE_LABELS: Record<string, string> = {
  off: "Arrêt", heat: "Chauffage", cool: "Climatisation", heat_cool: "Auto",
  auto: "Automatique", dry: "Déshumidifier", fan_only: "Ventilation",
};
const MODE_ICONS: Record<string, string> = {
  off: "mdi:power", heat: "mdi:fire", cool: "mdi:snowflake", heat_cool: "mdi:autorenew",
  auto: "mdi:autorenew", dry: "mdi:water-off", fan_only: "mdi:fan",
};
const ACTION_LABELS: Record<string, string> = {
  heating: "Chauffage en cours", cooling: "Refroidissement en cours",
  drying: "Déshumidification en cours", fan: "Ventilation en cours",
  idle: "En attente", off: "Arrêt",
};
function attributeNumber(state: HassEntity | undefined, key: string): number | undefined {
  const value = state?.attributes[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
export function thermostatTarget(state?: HassEntity): number | undefined {
  return attributeNumber(state, "temperature");
}
export function nextThermostatTarget(state: HassEntity | undefined, direction: -1 | 1): number | undefined {
  if (!isAvailable(state)) return undefined;
  const target = thermostatTarget(state);
  if (target === undefined) return undefined;
  const rawStep = attributeNumber(state, "target_temp_step");
  const step = rawStep && rawStep > 0 ? rawStep : 0.5;
  const min = attributeNumber(state, "min_temp") ?? 5;
  const max = attributeNumber(state, "max_temp") ?? 35;
  if (min > max) return undefined;
  const next = Math.min(max, Math.max(min, Math.round((target + direction * step) * 1000) / 1000));
  return next === target ? undefined : next;
}
function temperatureLabel(value: number | undefined, unit: string): string {
  return value === undefined ? "—" : `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}${unit}`;
}

export class AuralisThermostatCard extends AuralisBaseCard<ThermostatCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    selectedEntity: { state: true },
    pendingEntity: { state: true },
    errorMessage: { state: true },
  };
  static styles = [AuralisBaseCard.styles, css`
    .thermostat-shell, .thermostat-content { min-height:488px; }
    .thermostat-shell { --machine-accent:#ffbd78; }
    .thermostat-header { padding-right:44px; }
    .thermostat-header .badge { display:grid; width:39px; height:39px; flex:0 0 auto; place-items:center; border:1px solid rgba(255,255,255,.2); border-radius:14px; background:rgba(12,19,27,.72); color:var(--machine-accent); }
    .thermostat-header .badge ha-icon { --mdc-icon-size:23px; }
    .thermostat-header h2 { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .thermostat-header .machine-status { margin-top:5px; }
    .info-button { position:absolute; top:0; right:0; display:grid; width:40px; height:40px; place-items:center; border:1px solid rgba(195,211,229,.2); border-radius:13px; background:rgba(9,14,20,.78); color:#d9e4f0; cursor:pointer; }
    .info-button ha-icon { --mdc-icon-size:20px; }
    .selector { display:flex; gap:7px; overflow-x:auto; padding:2px 1px 8px; margin-top:18px; scrollbar-width:thin; }
    .selector button { flex:0 0 auto; min-height:37px; max-width:170px; padding:7px 11px; overflow:hidden; border:1px solid rgba(195,211,229,.19); border-radius:12px; background:rgba(9,14,20,.7); color:#bbc8d6; cursor:pointer; text-overflow:ellipsis; white-space:nowrap; }
    .selector button[aria-pressed="true"] { border-color:color-mix(in srgb,var(--machine-accent) 60%,transparent); background:color-mix(in srgb,var(--machine-accent) 17%,rgba(9,14,20,.9)); color:#fff; }
    .selector .unavailable { opacity:.5; }
    .dial-wrap { display:grid; flex:1; min-height:204px; place-items:center; padding:18px 0 10px; }
    .dial { --dial-position:0%; display:grid; width:190px; height:190px; place-items:center; border-radius:50%; background:conic-gradient(from 220deg,var(--machine-accent) var(--dial-position),rgba(255,255,255,.12) var(--dial-position) 78%,transparent 78%); box-shadow:0 0 0 7px rgba(8,12,18,.72),0 0 0 8px rgba(195,211,229,.16); }
    .dial-inner { display:grid; width:164px; height:164px; place-content:center; border-radius:50%; background:rgba(11,17,24,.93); text-align:center; }
    .dial-inner small { color:#9caabb; font-size:11px; letter-spacing:.08em; text-transform:uppercase; }
    .dial-inner strong { margin-top:3px; color:#fff; font-size:43px; letter-spacing:-.06em; line-height:1.05; }
    .dial-inner span { margin-top:6px; color:#c2ceda; font-size:12px; }
    .thermostat-panel { padding:15px; }
    .panel-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .panel-title { min-width:0; }
    .panel-title small { display:block; color:#9baabd; font-size:10px; text-transform:uppercase; letter-spacing:.08em; }
    .panel-title strong { display:block; overflow:hidden; margin-top:4px; font-size:17px; text-overflow:ellipsis; white-space:nowrap; }
    .stepper { display:flex; align-items:center; gap:8px; }
    .stepper button { display:grid; width:41px; height:41px; flex:0 0 auto; place-items:center; border:1px solid rgba(195,211,229,.22); border-radius:13px; background:rgba(255,255,255,.07); color:#fff; cursor:pointer; font-size:24px; line-height:1; }
    .stepper button:hover, .mode-button:hover, .info-button:hover { border-color:var(--machine-accent); }
    .stepper button:disabled, .mode-button:disabled, .info-button:disabled { cursor:not-allowed; opacity:.42; }
    .stepper output { min-width:58px; color:var(--machine-accent); font-size:21px; font-weight:750; text-align:center; white-space:nowrap; }
    .metrics { display:flex; flex-wrap:wrap; gap:7px 18px; padding-top:13px; margin-top:13px; border-top:1px solid rgba(195,211,229,.13); }
    .metrics span { color:#9baabd; font-size:11px; }
    .metrics strong { margin-left:5px; color:#edf3f9; }
    .modes { display:flex; flex-wrap:wrap; gap:7px; margin-top:13px; }
    .mode-button { display:flex; min-height:37px; align-items:center; gap:6px; padding:7px 10px; border:1px solid rgba(195,211,229,.2); border-radius:11px; background:rgba(255,255,255,.05); color:#c5d0dc; cursor:pointer; font-size:11px; font-weight:700; }
    .mode-button ha-icon { --mdc-icon-size:17px; }
    .mode-button[aria-pressed="true"] { border-color:color-mix(in srgb,var(--machine-accent) 65%,transparent); background:color-mix(in srgb,var(--machine-accent) 17%,rgba(9,14,20,.7)); color:#fff; }
    .error { margin-top:10px; color:#ff979d; font-size:11px; }
    @container (max-width:350px) {
      .thermostat-shell { padding:14px; }
      .thermostat-header h2 { font-size:20px; }
      .dial { width:168px; height:168px; }
      .dial-inner { width:144px; height:144px; }
      .panel-head { align-items:flex-start; flex-direction:column; }
      .stepper { width:100%; justify-content:space-between; }
    }
  `];

  private selectedEntity?: string;
  private pendingEntity?: string;
  private errorMessage?: string;

  public setConfig(config: ThermostatCardConfig): void {
    const additional = Array.isArray(config.entities) ? config.entities : [];
    const ids = [config.entity, ...additional].filter((id): id is string => typeof id === "string" && id.length > 0);
    if (!ids.length || ids.some((id) => !/^climate\.[a-z0-9_]+$/.test(id))) {
      throw new Error("Configurez une ou plusieurs entités climate.*.");
    }
    const normalized = [...new Set(ids)];
    this.config = { ...config, name: config.name || "Thermostats", theme: config.theme || "carbon", entities: normalized };
    if (!normalized.includes(this.selectedEntity || "")) this.selectedEntity = normalized[0];
  }
  static getStubConfig(): Partial<ThermostatCardConfig> {
    return { name: "Thermostats", theme: "carbon", entity: "climate.salon" };
  }
  static getConfigForm(): Record<string, unknown> {
    return { schema: [
      { name: "name", selector: { text: {} } },
      { name: "entity", selector: { entity: { filter: { domain: "climate" } } } },
      { name: "entities", selector: { entity: { multiple: true, filter: { domain: "climate" } } } },
      { name: "entity_labels", selector: { object: {} } },
      { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
      { name: "background_image", selector: { text: {} } },
      { name: "background_position", selector: { text: {} } },
      { name: "image_opacity", selector: { number: { min: 0, max: 100, step: 1, mode: "slider" } } },
      { name: "accent_color", selector: { text: {} } },
      { name: "card_background", selector: { object: {} } },
      { name: "show_grid", selector: { boolean: {} } },
    ] };
  }
  private ids(): string[] { return this.config?.entities ?? []; }
  private label(id: string): string {
    return this.config?.entity_labels?.[id] || friendlyName(entity(this.hass, id), id);
  }
  private unit(state: HassEntity | undefined): string {
    const hassUnit = (this.hass as (HomeAssistant & { config?: { unit_system?: { temperature?: string } } }) | undefined)?.config?.unit_system?.temperature;
    const unit = state?.attributes.temperature_unit ?? state?.attributes.unit_of_measurement ?? hassUnit;
    return typeof unit === "string" && unit.trim() ? unit : "°C";
  }
  private async adjustTemperature(id: string, direction: -1 | 1): Promise<void> {
    const next = nextThermostatTarget(entity(this.hass, id), direction);
    if (!this.hass || next === undefined || this.pendingEntity) return;
    this.pendingEntity = id;
    this.errorMessage = undefined;
    try {
      await this.hass.callService("climate", "set_temperature", { temperature: next }, { entity_id: id });
    } catch {
      this.errorMessage = "La consigne n’a pas pu être modifiée.";
    } finally {
      this.pendingEntity = undefined;
    }
  }
  private async setMode(id: string, mode: string): Promise<void> {
    const state = entity(this.hass, id);
    const modes = state?.attributes.hvac_modes;
    if (!this.hass || !isAvailable(state) || !Array.isArray(modes) || !modes.includes(mode) || this.pendingEntity || state?.state === mode) return;
    this.pendingEntity = id;
    this.errorMessage = undefined;
    try {
      await this.hass.callService("climate", "set_hvac_mode", { hvac_mode: mode }, { entity_id: id });
    } catch {
      this.errorMessage = "Le mode n’a pas pu être modifié.";
    } finally {
      this.pendingEntity = undefined;
    }
  }
  protected render(): TemplateResult {
    const ids = this.ids();
    const id = ids.includes(this.selectedEntity || "") ? this.selectedEntity! : ids[0];
    const state = entity(this.hass, id);
    const available = isAvailable(state);
    const target = available ? thermostatTarget(state) : undefined;
    const current = available ? attributeNumber(state, "current_temperature") : undefined;
    const low = available ? attributeNumber(state, "target_temp_low") : undefined;
    const high = available ? attributeNumber(state, "target_temp_high") : undefined;
    const humidity = available ? attributeNumber(state, "current_humidity") : undefined;
    const unit = this.unit(state);
    const min = attributeNumber(state, "min_temp") ?? 5;
    const max = attributeNumber(state, "max_temp") ?? 35;
    const position = target !== undefined && max > min ? Math.max(0, Math.min(78, ((target - min) / (max - min)) * 78)) : 0;
    const modes = available && Array.isArray(state?.attributes.hvac_modes)
      ? state.attributes.hvac_modes.filter((mode): mode is string => typeof mode === "string") : [];
    const status = !available ? "Indisponible" : ACTION_LABELS[String(state?.attributes.hvac_action)] || MODE_LABELS[state?.state || ""] || state?.state;
    const targetLabel = target !== undefined ? temperatureLabel(target, unit)
      : low !== undefined && high !== undefined ? `${temperatureLabel(low, unit)} – ${temperatureLabel(high, unit)}` : "—";
    const canDecrease = nextThermostatTarget(state, -1) !== undefined && !this.pendingEntity;
    const canIncrease = nextThermostatTarget(state, 1) !== undefined && !this.pendingEntity;
    return html`<ha-card><div class="machine-shell thermostat-shell ${this.machineGridClass()}" style=${this.machineStyle("#ffbd78")}>
      <div class="machine-content thermostat-content">
        <header class="machine-header thermostat-header">
          <span class="badge"><ha-icon .icon=${this.config?.icon || "mdi:thermostat"}></ha-icon></span>
          <div class="title-wrap"><h2>${this.config?.name || "Thermostats"}</h2>
            <div class="machine-status"><span class="dot ${available ? (state?.state === "off" ? "" : "healthy") : "danger"}"></span>${this.label(id)} · ${status}</div>
          </div>
        </header>
        <button class="info-button" type="button" title=${`Détails de ${this.label(id)}`} aria-label=${`Détails de ${this.label(id)}`}
          ?disabled=${!available} @click=${() => fireMoreInfo(this, id)}><ha-icon icon="mdi:information-outline"></ha-icon></button>
        ${ids.length > 1 ? html`<nav class="selector" aria-label="Choisir un thermostat">
          ${ids.map((item) => html`<button type="button" class=${isAvailable(entity(this.hass, item)) ? "" : "unavailable"}
            aria-pressed=${item === id} @click=${() => { this.selectedEntity = item; this.errorMessage = undefined; }}>${this.label(item)}</button>`)}
        </nav>` : nothing}
        <div class="dial-wrap"><div class="dial" style=${`--dial-position:${position}%`}>
          <div class="dial-inner"><small>Température actuelle</small><strong>${temperatureLabel(current, unit)}</strong><span>${status}</span></div>
        </div></div>
        <section class="machine-panel thermostat-panel">
          <div class="panel-head"><div class="panel-title"><small>Consigne</small><strong>${target !== undefined ? "Température souhaitée" : low !== undefined && high !== undefined ? "Plage de température" : "Réglage indisponible"}</strong></div>
            <div class="stepper">
              <button type="button" aria-label=${`Baisser la consigne de ${this.label(id)}`} ?disabled=${!canDecrease} @click=${() => this.adjustTemperature(id, -1)}>−</button>
              <output aria-live="polite">${targetLabel}</output>
              <button type="button" aria-label=${`Augmenter la consigne de ${this.label(id)}`} ?disabled=${!canIncrease} @click=${() => this.adjustTemperature(id, 1)}>+</button>
            </div>
          </div>
          <div class="metrics"><span>Mode <strong>${MODE_LABELS[state?.state || ""] || (available ? state?.state : "—")}</strong></span>
            ${humidity !== undefined ? html`<span>Humidité <strong>${humidity.toLocaleString("fr-FR")}%</strong></span>` : nothing}</div>
          ${modes.length ? html`<div class="modes" role="group" aria-label=${`Modes de ${this.label(id)}`}>
            ${modes.map((mode) => html`<button class="mode-button" type="button" aria-pressed=${mode === state?.state}
              ?disabled=${!!this.pendingEntity} @click=${() => this.setMode(id, mode)}>
              <ha-icon .icon=${MODE_ICONS[mode] || "mdi:tune"}></ha-icon>${MODE_LABELS[mode] || mode}</button>`)}
          </div>` : nothing}
          ${this.errorMessage ? html`<p class="error" role="alert">${this.errorMessage}</p>` : nothing}
        </section>
      </div>
    </div></ha-card>`;
  }
  public getCardSize(): number { return 6; }
  public getGridOptions(): Record<string, number> { return { rows: 7, min_rows: 5, columns: 6, min_columns: 3 }; }
}
