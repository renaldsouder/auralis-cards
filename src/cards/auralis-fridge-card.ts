import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { displayState, entity, isActive, isAvailable, numericState } from "../utils/entities";
import { fireMoreInfo } from "../utils/actions";

export interface FridgeCardConfig extends BaseCardConfig {
  type: "custom:auralis-fridge-card";
  connected_entity?: string;
  fridge_temperature_entity?: string;
  freezer_temperature_entity?: string;
  fridge_target_entity?: string;
  freezer_target_entity?: string;
  door_entity?: string;
  freezer_door_entity?: string;
  alert_entity?: string;
  filter_entity?: string;
  energy_entity?: string;
  mode_entity?: string;
  quick_cool_entity?: string;
  quick_freeze_entity?: string;
  lock_entity?: string;
  extra_entities?: string[];
}

export type FridgeHealth = "alert" | "open" | "offline" | "ok" | "unknown";
const active = (state?: HassEntity): boolean => isAvailable(state) && isActive(state);

export function fridgeHealth(hass: HomeAssistant | undefined, config: FridgeCardConfig): FridgeHealth {
  if (active(entity(hass, config.alert_entity))) return "alert";
  if (active(entity(hass, config.door_entity)) || active(entity(hass, config.freezer_door_entity))) return "open";
  const connected = entity(hass, config.connected_entity);
  if (config.connected_entity && isAvailable(connected) && !isActive(connected)) return "offline";
  const observed = [config.connected_entity, config.fridge_temperature_entity, config.freezer_temperature_entity,
    config.door_entity, config.freezer_door_entity].filter((id): id is string => Boolean(id));
  return observed.some((id) => isAvailable(entity(hass, id))) ? "ok" : "unknown";
}

const STATUS: Record<FridgeHealth, [string, string]> = {
  alert: ["Alerte du réfrigérateur", "mdi:alert-circle-outline"],
  open: ["Porte ouverte", "mdi:door-open"],
  offline: ["Hors ligne", "mdi:wifi-off"],
  ok: ["Fonctionnement normal", "mdi:check-circle-outline"],
  unknown: ["Données indisponibles", "mdi:help-circle-outline"],
};

export class AuralisFridgeCard extends AuralisBaseCard<FridgeCardConfig> {
  static properties = { ...AuralisBaseCard.properties, actionError: { state: true }, busy: { state: true } };
  static styles = [AuralisBaseCard.styles, css`
    .fridge-shell { min-height:440px; --machine-accent:#83d7e9; }
    .fridge-shell::before { background-image:linear-gradient(90deg,rgba(3,8,15,.74),rgba(3,8,15,.1) 70%),linear-gradient(0deg,rgba(3,8,15,.7),transparent 45%),var(--machine-image,none); }
    .fridge-shell .machine-content { min-height:440px; }
    .fridge-icon { display:grid; width:42px; height:42px; flex:0 0 auto; place-items:center; border:1px solid rgba(255,255,255,.2); border-radius:14px; background:rgba(8,18,27,.58); color:var(--machine-accent); }
    .fridge-icon ha-icon { --mdc-icon-size:25px; }
    .fridge-status { display:flex; align-items:center; gap:7px; margin-top:6px; color:#d8e1e8; font-size:11px; }
    .fridge-status ha-icon { --mdc-icon-size:14px; }
    .fridge-status.alert, .fridge-status.open { color:#ffd27b; }
    .fridge-spacer { min-height:125px; flex:1; }
    .fridge-panel { padding:15px; border:1px solid rgba(207,226,239,.22); border-radius:22px; background:rgba(7,16,23,var(--machine-glass-alpha,.84)); backdrop-filter:blur(18px); }
    .temperature-grid, .detail-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
    .temperature { display:flex; min-width:0; flex-direction:column; padding:12px; border:1px solid rgba(214,230,239,.13); border-radius:16px; background:rgba(255,255,255,.045); }
    .temperature small { display:flex; align-items:center; gap:5px; color:#b8c8d2; font-size:11px; }
    .temperature small ha-icon { --mdc-icon-size:16px; color:var(--machine-accent); }
    .temperature strong { margin-top:8px; color:#fff; font-size:29px; letter-spacing:-.05em; line-height:1; }
    .temperature span { margin-top:5px; color:#a9bbc7; font-size:10px; }
    .fridge-signals { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }
    .fridge-signal { display:flex; align-items:center; gap:6px; min-height:29px; padding:0 9px; border:1px solid rgba(214,230,239,.16); border-radius:999px; background:rgba(255,255,255,.055); color:#dce8ee; font-size:11px; }
    .fridge-signal ha-icon { --mdc-icon-size:16px; color:var(--machine-accent); }
    .fridge-signal.warning ha-icon { color:#ffd27b; }
    .fridge-footer { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:14px; }
    .fridge-footer small { color:#abc0ca; font-size:10px; }
    .detail-tile { display:flex; min-width:0; align-items:center; gap:10px; padding:11px; border:1px solid var(--auralis-border); border-radius:15px; background:var(--auralis-layer); text-align:left; }
    button.detail-tile { width:100%; color:var(--auralis-text); cursor:pointer; }
    .detail-tile ha-icon { --mdc-icon-size:21px; flex:0 0 auto; color:var(--auralis-info); }
    .detail-tile span { min-width:0; flex:1; }
    .detail-tile small, .detail-tile strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .detail-tile small { color:var(--auralis-muted); font-size:10px; }
    .detail-tile strong { margin-top:3px; font-size:13px; }
    .section-caption { margin:17px 0 9px; color:var(--auralis-muted); font-size:11px; font-weight:750; letter-spacing:.08em; text-transform:uppercase; }
    .control-row { display:flex; align-items:center; gap:9px; padding:10px; margin-top:8px; border:1px solid var(--auralis-border); border-radius:15px; background:var(--auralis-layer); }
    .control-row > span { min-width:0; flex:1; font-size:12px; font-weight:650; }
    .control-row button { display:grid; width:35px; height:35px; flex:0 0 auto; place-items:center; border:1px solid var(--auralis-border); border-radius:10px; background:var(--auralis-card); color:var(--auralis-text); cursor:pointer; }
    .control-row button:disabled, .control-row select:disabled { opacity:.45; cursor:not-allowed; }
    .control-row output { min-width:49px; font-size:13px; text-align:center; }
    .control-row select { max-width:55%; padding:7px; border:1px solid var(--auralis-border); border-radius:9px; background:var(--auralis-card); color:var(--auralis-text); }
    .action-error { margin-top:12px; color:var(--auralis-danger); font-size:12px; }
    @container (max-width:330px) { .fridge-shell { padding:13px; } .fridge-panel { padding:11px; } .temperature strong { font-size:24px; } .fridge-spacer { min-height:90px; } }
  `];

  private actionError = "";
  private busy = false;

  public setConfig(config: FridgeCardConfig): void {
    this.config = { ...config, name: config.name || "Frigo connecté", theme: config.theme || "carbon" };
  }
  static getStubConfig(): Partial<FridgeCardConfig> {
    return { name: "Frigo connecté", theme: "carbon", fridge_temperature_entity: "sensor.frigo_temperature" };
  }
  static getConfigForm(): Record<string, unknown> {
    const field = (name: string) => ({ name, selector: { entity: {} } });
    return { schema: [
      { name: "name", selector: { text: {} } },
      { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
      field("connected_entity"), field("fridge_temperature_entity"), field("freezer_temperature_entity"),
      field("fridge_target_entity"), field("freezer_target_entity"), field("door_entity"),
      field("freezer_door_entity"), field("alert_entity"), field("filter_entity"), field("energy_entity"),
      field("mode_entity"), field("quick_cool_entity"), field("quick_freeze_entity"), field("lock_entity"),
      { name: "background_image", selector: { text: {} } },
      { name: "background_position", selector: { text: {} } },
      { name: "accent_color", selector: { text: {} } },
      { name: "image_brightness", selector: { number: { min: 30, max: 100, step: 1, mode: "slider" } } },
      { name: "glass_opacity", selector: { number: { min: 0.45, max: 0.96, step: 0.01, mode: "slider" } } },
    ] };
  }
  public getCardSize(): number { return 7; }
  public getGridOptions(): Record<string, number> { return { rows: 7, min_rows: 5, columns: 6, min_columns: 3 }; }

  private temperature(id?: string): string {
    const state = entity(this.hass, id);
    if (!state || !isAvailable(state)) return "—";
    const value = numericState(state, Number.NaN);
    const unit = typeof state.attributes.unit_of_measurement === "string" ? state.attributes.unit_of_measurement : "°C";
    return Number.isFinite(value) ? `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)} ${unit}` : displayState(this.hass, id);
  }
  private doorLabel(id?: string): string {
    const state = entity(this.hass, id);
    return !isAvailable(state) ? "Indisponible" : isActive(state) ? "Ouverte" : "Fermée";
  }
  private async call(domain: string, service: string, id: string, data: Record<string, unknown> = {}): Promise<void> {
    if (!this.hass || this.busy) return;
    this.busy = true; this.actionError = "";
    try { await this.hass.callService(domain, service, data, { entity_id: id }); }
    catch { this.actionError = "Commande non exécutée. Vérifiez la disponibilité de l’appareil."; }
    finally { this.busy = false; }
  }
  private async adjustTarget(id: string, direction: -1 | 1): Promise<void> {
    const state = entity(this.hass, id);
    if (!state || !isAvailable(state) || !id.startsWith("number.")) return;
    const current = numericState(state, Number.NaN);
    if (!Number.isFinite(current)) return;
    const stepValue = Number(state.attributes.step);
    const step = Number.isFinite(stepValue) && stepValue > 0 ? stepValue : 1;
    const minValue = Number(state.attributes.min);
    const maxValue = Number(state.attributes.max);
    const min = Number.isFinite(minValue) ? minValue : -100;
    const max = Number.isFinite(maxValue) ? maxValue : 100;
    const value = Math.min(max, Math.max(min, Number((current + direction * step).toFixed(3))));
    if (value !== current) await this.call("number", "set_value", id, { value });
  }
  private async quickAction(id: string): Promise<void> {
    const state = entity(this.hass, id);
    if (!isAvailable(state)) return;
    if (id.startsWith("switch.")) await this.call("switch", "toggle", id);
    else if (id.startsWith("button.")) await this.call("button", "press", id);
    else if (id.startsWith("lock.")) await this.call("lock", state?.state === "locked" ? "unlock" : "lock", id);
  }
  private detail(label: string, icon: string, id?: string, value?: string): TemplateResult {
    if (!id) return html``;
    return html`<button class="detail-tile" type="button" aria-label=${`Plus d’informations : ${label}`} @click=${() => fireMoreInfo(this, id)}>
      <ha-icon .icon=${icon}></ha-icon><span><small>${label}</small><strong>${value ?? displayState(this.hass, id)}</strong></span><ha-icon icon="mdi:chevron-right"></ha-icon></button>`;
  }
  private target(label: string, id?: string): TemplateResult {
    if (!id) return html``;
    const state = entity(this.hass, id);
    const enabled = id.startsWith("number.") && isAvailable(state) && Number.isFinite(numericState(state, Number.NaN));
    return html`<div class="control-row"><span>${label}</span>
      <button type="button" aria-label=${`Baisser ${label}`} ?disabled=${!enabled || this.busy} @click=${() => this.adjustTarget(id, -1)}><ha-icon icon="mdi:minus"></ha-icon></button>
      <output>${this.temperature(id)}</output>
      <button type="button" aria-label=${`Augmenter ${label}`} ?disabled=${!enabled || this.busy} @click=${() => this.adjustTarget(id, 1)}><ha-icon icon="mdi:plus"></ha-icon></button></div>`;
  }
  private quick(label: string, icon: string, id?: string): TemplateResult {
    if (!id) return html``;
    const state = entity(this.hass, id);
    const supported = id.startsWith("switch.") || id.startsWith("button.") || id.startsWith("lock.");
    return html`<div class="control-row"><ha-icon .icon=${icon}></ha-icon><span>${label}</span>
      <button type="button" aria-label=${`${label} : ${state?.state || "indisponible"}`} ?disabled=${!supported || !isAvailable(state) || this.busy}
        @click=${() => this.quickAction(id)}><ha-icon .icon=${id.startsWith("button.") ? "mdi:play" : id.startsWith("lock.") ? state?.state === "locked" ? "mdi:lock" : "mdi:lock-open-outline" : isActive(state) ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline"}></ha-icon></button></div>`;
  }
  private renderDetails(): TemplateResult {
    const c = this.config!;
    const mode = entity(this.hass, c.mode_entity);
    const options = Array.isArray(mode?.attributes.options) ? mode.attributes.options.filter((item): item is string => typeof item === "string") : [];
    return this.renderDialog(c.name || "Frigo connecté", "mdi:fridge-outline", html`<div class="dialog-body">
      <div class="dialog-overview"><div><span class="eyebrow">État du réfrigérateur</span><strong>${STATUS[fridgeHealth(this.hass, c)][0]}</strong></div>
        <div class="dialog-stat"><strong>${this.temperature(c.fridge_temperature_entity)}</strong><small>réfrigérateur</small></div></div>
      <div class="detail-grid">
        ${this.detail("Réfrigérateur", "mdi:thermometer", c.fridge_temperature_entity, this.temperature(c.fridge_temperature_entity))}
        ${this.detail("Congélateur", "mdi:snowflake-thermometer", c.freezer_temperature_entity, this.temperature(c.freezer_temperature_entity))}
        ${this.detail("Porte du frigo", "mdi:door", c.door_entity, this.doorLabel(c.door_entity))}
        ${this.detail("Porte du congélateur", "mdi:door", c.freezer_door_entity, this.doorLabel(c.freezer_door_entity))}
        ${this.detail("Alerte", "mdi:alert-circle-outline", c.alert_entity)}
        ${this.detail("Filtre", "mdi:air-filter", c.filter_entity)}
        ${this.detail("Énergie", "mdi:lightning-bolt-outline", c.energy_entity)}
        ${(c.extra_entities || []).map((id) => this.detail(entity(this.hass, id)?.attributes.friendly_name || id, "mdi:information-outline", id))}
      </div>
      ${c.fridge_target_entity || c.freezer_target_entity ? html`<div class="section-caption">Consignes</div>${this.target("Réfrigérateur", c.fridge_target_entity)}${this.target("Congélateur", c.freezer_target_entity)}` : nothing}
      ${c.mode_entity && ["select.", "input_select."].some((prefix) => c.mode_entity!.startsWith(prefix)) && options.length ? html`<div class="section-caption">Mode</div><label class="control-row"><span>Mode de fonctionnement</span>
        <select aria-label="Mode de fonctionnement" ?disabled=${!isAvailable(mode) || this.busy}
          @change=${(event: Event) => this.call(c.mode_entity!.split(".")[0], "select_option", c.mode_entity!, { option: (event.target as HTMLSelectElement).value })}>
          ${options.map((option) => html`<option value=${option} ?selected=${option === mode?.state}>${option}</option>`)}</select></label>` : nothing}
      ${c.quick_cool_entity || c.quick_freeze_entity || c.lock_entity ? html`<div class="section-caption">Fonctions rapides</div>
        ${this.quick("Refroidissement rapide", "mdi:snowflake", c.quick_cool_entity)}
        ${this.quick("Congélation rapide", "mdi:snowflake-alert", c.quick_freeze_entity)}
        ${this.quick("Verrouillage", "mdi:lock-outline", c.lock_entity)}` : nothing}
      ${this.actionError ? html`<p class="action-error" role="alert">${this.actionError}</p>` : nothing}
    </div>`);
  }
  protected render(): TemplateResult {
    if (!this.config) return html``;
    const c = this.config;
    const health = fridgeHealth(this.hass, c);
    return html`<ha-card><div class=${`machine-shell fridge-shell ${this.machineGridClass()}`} style=${this.machineStyle("#83d7e9")}>
      <div class="machine-content"><header class="machine-header"><span class="fridge-icon"><ha-icon .icon=${c.icon || "mdi:fridge-outline"}></ha-icon></span>
        <div><h2>${c.name}</h2><div class=${`fridge-status ${health}`}><ha-icon .icon=${STATUS[health][1]}></ha-icon>${STATUS[health][0]}</div></div></header>
        <div class="fridge-spacer"></div><section class="fridge-panel" aria-label="État du frigo connecté">
          <div class="temperature-grid">
            <div class="temperature"><small><ha-icon icon="mdi:fridge-outline"></ha-icon>Réfrigérateur</small><strong>${this.temperature(c.fridge_temperature_entity)}</strong><span>Consigne ${this.temperature(c.fridge_target_entity)}</span></div>
            <div class="temperature"><small><ha-icon icon="mdi:snowflake"></ha-icon>Congélateur</small><strong>${this.temperature(c.freezer_temperature_entity)}</strong><span>Consigne ${this.temperature(c.freezer_target_entity)}</span></div>
          </div><div class="fridge-signals">
            ${c.door_entity ? html`<span class=${`fridge-signal ${active(entity(this.hass, c.door_entity)) ? "warning" : ""}`}><ha-icon icon="mdi:door"></ha-icon>Frigo ${this.doorLabel(c.door_entity).toLowerCase()}</span>` : nothing}
            ${c.freezer_door_entity ? html`<span class=${`fridge-signal ${active(entity(this.hass, c.freezer_door_entity)) ? "warning" : ""}`}><ha-icon icon="mdi:door"></ha-icon>Congélateur ${this.doorLabel(c.freezer_door_entity).toLowerCase()}</span>` : nothing}
            ${c.mode_entity ? html`<span class="fridge-signal"><ha-icon icon="mdi:cog-outline"></ha-icon>${displayState(this.hass, c.mode_entity)}</span>` : nothing}
          </div><div class="fridge-footer"><small>${c.filter_entity ? `Filtre · ${displayState(this.hass, c.filter_entity)}` : "Suivi et commandes"}</small>
            <button class="machine-accent-action" type="button" aria-label="Détails du frigo" aria-haspopup="dialog" @click=${() => this.openDialog("details")}>Détails <ha-icon icon="mdi:arrow-right"></ha-icon></button></div>
        </section></div></div></ha-card>${this.dialog === "details" ? this.renderDetails() : nothing}`;
  }
}
