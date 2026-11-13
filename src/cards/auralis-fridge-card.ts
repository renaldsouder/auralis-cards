import { css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { displayState, entity, isActive, isAvailable, isCommandable, numericState } from "../utils/entities";
import { severityClass, type Severity } from "../utils/severity";
import { formLabels } from "../utils/machines";
import { ENTITY, entitySelector, type FormSelector } from "../utils/form";

export interface FridgeCardConfig extends BaseCardConfig {
  type: "custom:auralis-fridge-card";
  /** Thermostat climate.* du réfrigérateur : température, consigne et mode. */
  climate_entity?: string;
  /** Thermostat climate.* du congélateur. */
  freezer_climate_entity?: string;
  /** Connexion de l'appareil (nom commun à toutes les cartes machines). */
  status_entity?: string;
  /** Ancien nom de `status_entity`, toujours accepté. */
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
  /** Au-delà de cette température (8 °C par défaut), celle du réfrigérateur passe en alerte. */
  fridge_alert_above?: number;
  /** Au-delà de cette température (−12 °C par défaut), celle du congélateur passe en alerte. */
  freezer_alert_above?: number;
}

export type FridgeHealth = "alert" | "open" | "offline" | "ok" | "unknown";
const active = (state?: HassEntity): boolean => isAvailable(state) && isActive(state);
const isClimate = (id?: string): boolean => Boolean(id?.startsWith("climate."));

/** Seuils d'alerte par défaut des températures, en °C. */
export const FRIDGE_ALERT_ABOVE = 8;
export const FREEZER_ALERT_ABOVE = -12;
/** Délai pendant lequel les appuis sur − et + s'accumulent avant l'envoi de la consigne. */
export const TARGET_DEBOUNCE = 700;
/** Au-delà de ce délai sans nouvel état de l'appareil, la consigne affichée revient à la valeur réelle. */
const TARGET_CONFIRM_TIMEOUT = 10_000;

/** Nombre lu dans un attribut ; `null`, `undefined` ou une chaîne vide signifient « absent ». */
function attributeNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) return undefined;
  const number = Number(typeof value === "string" ? value.replace(",", ".") : value);
  return Number.isFinite(number) ? number : undefined;
}

/** Température lue sur un capteur, un réglage number.* ou un thermostat climate.* (mesure ou consigne). */
export function fridgeTemperature(state: HassEntity | undefined, role: "current" | "target" = "current"): number | undefined {
  if (!state || !isAvailable(state)) return undefined;
  if (state.entity_id.startsWith("climate.")) {
    return attributeNumber(role === "target" ? state.attributes.temperature : state.attributes.current_temperature);
  }
  const value = numericState(state, Number.NaN);
  return Number.isFinite(value) ? value : undefined;
}

/** Une température au-delà du seuil configuré passe en rouge. */
export function fridgeTemperatureLevel(value: number | undefined, alertAbove: number | undefined, fallback: number): Severity {
  const threshold = typeof alertAbove === "number" && Number.isFinite(alertAbove) ? alertAbove : fallback;
  return value !== undefined && value > threshold ? "critical" : "normal";
}

/** Les thermostats remplissent les champs de température et de consigne laissés vides. */
export function normalizeFridgeConfig(config: FridgeCardConfig): FridgeCardConfig {
  const fridge = isClimate(config.climate_entity) ? config.climate_entity : undefined;
  const freezer = isClimate(config.freezer_climate_entity) ? config.freezer_climate_entity : undefined;
  const connection = config.status_entity || config.connected_entity;
  return {
    ...config,
    status_entity: connection,
    connected_entity: connection,
    fridge_temperature_entity: config.fridge_temperature_entity || fridge,
    fridge_target_entity: config.fridge_target_entity || fridge,
    freezer_temperature_entity: config.freezer_temperature_entity || freezer,
    freezer_target_entity: config.freezer_target_entity || freezer,
    mode_entity: config.mode_entity || fridge,
  };
}

export function fridgeHealth(hass: HomeAssistant | undefined, config: FridgeCardConfig): FridgeHealth {
  const connectedEntity = config.status_entity || config.connected_entity;
  if (active(entity(hass, config.alert_entity))) return "alert";
  if (active(entity(hass, config.door_entity)) || active(entity(hass, config.freezer_door_entity))) return "open";
  const connected = entity(hass, connectedEntity);
  if (connectedEntity && isAvailable(connected) && !isActive(connected)) return "offline";
  const observed = [connectedEntity, config.fridge_temperature_entity, config.freezer_temperature_entity,
    config.door_entity, config.freezer_door_entity].filter((id): id is string => Boolean(id));
  return observed.some((id) => isAvailable(entity(hass, id))) ? "ok" : "unknown";
}

const STATUS: Record<FridgeHealth, [string, string]> = {
  alert: ["Alerte du réfrigérateur", "mdi:alert-circle-outline"],
  open: ["Porte ouverte", "mdi:door-open"],
  offline: ["Hors ligne", "mdi:wifi-off"],
  ok: ["Fonctionnement normal", "mdi:check-circle-outline"],
  unknown: ["Indisponible", "mdi:help-circle-outline"],
};

const FORM_LABELS: Record<string, string> = {
  climate_entity: "Thermostat du réfrigérateur (climate)",
  freezer_climate_entity: "Thermostat du congélateur (climate)",
  status_entity: "Connexion de l’appareil",
  fridge_temperature_entity: "Température du réfrigérateur",
  freezer_temperature_entity: "Température du congélateur",
  fridge_target_entity: "Consigne du réfrigérateur",
  freezer_target_entity: "Consigne du congélateur",
  door_entity: "Porte du réfrigérateur",
  freezer_door_entity: "Porte du congélateur",
  alert_entity: "Alerte",
  filter_entity: "Filtre",
  energy_entity: "Énergie",
  mode_entity: "Mode de fonctionnement",
  quick_cool_entity: "Refroidissement rapide",
  quick_freeze_entity: "Congélation rapide",
  lock_entity: "Verrouillage",
  extra_entities: "Entités supplémentaires (fenêtre de détails)",
  fridge_alert_above: "Alerte réfrigérateur au-delà de (°C)",
  freezer_alert_above: "Alerte congélateur au-delà de (°C)",
};

export class AuralisFridgeCard extends AuralisBaseCard<FridgeCardConfig> {
  static styles = [AuralisBaseCard.styles, css`
    .fridge-shell { min-height:440px; --machine-accent:#83d7e9; }
    .fridge-shell::before { background-image:linear-gradient(90deg,rgba(3,8,15,.74),rgba(3,8,15,.1) 70%),linear-gradient(0deg,rgba(3,8,15,.7),transparent 45%),var(--machine-image,none); }
    .fridge-shell .machine-content { min-height:440px; }
    .fridge-icon { display:grid; width:42px; height:42px; flex:0 0 auto; place-items:center; border:1px solid rgba(255,255,255,.2); border-radius:14px; background:rgba(8,18,27,.58); color:var(--machine-accent); }
    .fridge-icon ha-icon { --mdc-icon-size:25px; }
    .fridge-status { display:flex; align-items:center; gap:7px; margin-top:6px; color:#d8e1e8; font-size:var(--auralis-text-xs); }
    .fridge-status ha-icon { --mdc-icon-size:14px; }
    .fridge-status.alert { color:#ff8a92; }
    .fridge-status.open { color:#ffd27b; }
    .fridge-status.offline, .fridge-status.unknown { color:#9aa7b4; }
    .fridge-spacer { min-height:125px; flex:1; }
    .fridge-panel { padding:15px; border:1px solid rgba(207,226,239,.22); border-radius:22px; background:rgba(7,16,23,var(--machine-glass-alpha,.84)); backdrop-filter:blur(18px); }
    .temperature-grid, .detail-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
    .temperature { display:flex; min-width:0; flex-direction:column; padding:12px; border:1px solid rgba(214,230,239,.13); border-radius:16px; background:rgba(255,255,255,.045); color:inherit; font:inherit; text-align:left; }
    button.temperature { cursor:pointer; }
    .temperature.wide { grid-column:1 / -1; }
    .temperature small { display:flex; align-items:center; gap:5px; color:#b8c8d2; font-size:var(--auralis-text-xs); }
    .temperature small ha-icon { --mdc-icon-size:16px; color:var(--machine-accent); }
    .temperature strong { margin-top:8px; color:#fff; font-size:29px; letter-spacing:-.05em; line-height:1; }
    .temperature.sev-critical { border-color:color-mix(in srgb, #ff727c 55%, transparent); }
    .temperature.sev-critical strong { color:#ff8a92; }
    .temperature span { margin-top:5px; color:#a9bbc7; font-size:var(--auralis-text-xs); }
    .fridge-signals { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }
    .fridge-signal { display:flex; align-items:center; gap:6px; min-height:29px; padding:0 9px; border:1px solid rgba(214,230,239,.16); border-radius:999px; background:rgba(255,255,255,.055); color:#dce8ee; font-size:var(--auralis-text-xs); }
    .fridge-signal ha-icon { --mdc-icon-size:16px; color:var(--machine-accent); }
    .fridge-signal.warning ha-icon { color:#ffd27b; }
    .fridge-signal.muted { color:#9aa7b4; }
    .fridge-signal.muted ha-icon { color:#9aa7b4; }
    .fridge-footer { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:14px; }
    .fridge-footer small { color:#abc0ca; font-size:var(--auralis-text-xs); }
    .detail-tile { display:flex; min-width:0; min-height:var(--auralis-target); align-items:center; gap:10px; padding:11px; border:1px solid var(--auralis-border); border-radius:15px; background:var(--auralis-layer); text-align:left; }
    button.detail-tile { width:100%; color:var(--auralis-text); cursor:pointer; }
    .detail-tile ha-icon { --mdc-icon-size:21px; flex:0 0 auto; color:var(--auralis-info); }
    .detail-tile span { min-width:0; flex:1; }
    .detail-tile small, .detail-tile strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .detail-tile small { color:var(--auralis-muted); font-size:var(--auralis-text-xs); }
    .detail-tile strong { margin-top:3px; font-size:13px; }
    .detail-tile.sev-critical strong, .sev-text.sev-critical { color:var(--auralis-danger); }
    .section-caption { margin:17px 0 9px; color:var(--auralis-muted); font-size:var(--auralis-text-xs); font-weight:750; letter-spacing:.08em; text-transform:uppercase; }
    .control-row { display:flex; align-items:center; gap:9px; padding:10px; margin-top:8px; border:1px solid var(--auralis-border); border-radius:15px; background:var(--auralis-layer); }
    .control-row > span { min-width:0; flex:1; font-size:12px; font-weight:650; }
    .control-row button { display:grid; width:var(--auralis-target); height:var(--auralis-target); flex:0 0 auto; place-items:center; border:1px solid var(--auralis-border); border-radius:12px; background:var(--auralis-card); color:var(--auralis-text); cursor:pointer; }
    .control-row button:disabled, .control-row select:disabled { opacity:.45; cursor:not-allowed; }
    .control-row output { min-width:49px; font-size:13px; text-align:center; }
    .control-row output.optimistic { color:var(--auralis-info); }
    .control-row select { max-width:55%; min-height:var(--auralis-target); padding:7px; border:1px solid var(--auralis-border); border-radius:9px; background:var(--auralis-card); color:var(--auralis-text); }
    @container (max-width:330px) { .fridge-shell { padding:13px; } .fridge-panel { padding:11px; } .temperature strong { font-size:24px; } .fridge-spacer { min-height:90px; } }
  `];

  /** Consignes affichées avant leur confirmation par Home Assistant, par entité. */
  private optimisticTargets = new Map<string, number>();
  /** État de l'entité au moment de l'envoi : la consigne optimiste tombe dès qu'il change. */
  private sentTargets = new Map<string, HassEntity | undefined>();
  private targetTimers = new Map<string, number>();

  public setConfig(config: FridgeCardConfig): void {
    for (const key of ["climate_entity", "freezer_climate_entity"] as const) {
      if (config[key] && !isClimate(config[key])) throw new Error(`${key} doit être une entité climate.*.`);
    }
    this.config = { ...normalizeFridgeConfig(config), name: config.name || "Frigo connecté", theme: config.theme || "auto" };
  }
  static getStubConfig(): Partial<FridgeCardConfig> {
    return { name: "Frigo connecté", theme: "carbon", fridge_temperature_entity: "sensor.frigo_temperature" };
  }
  static getConfigForm(): Record<string, unknown> {
    const field = (name: string, selector: FormSelector = ENTITY) => ({ name, selector });
    // La température et la consigne se lisent aussi sur le thermostat climate.*.
    const temperature = entitySelector(["sensor", "climate"]);
    const target = entitySelector(["number", "input_number", "climate", "sensor"]);
    const door = entitySelector("binary_sensor");
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        field("climate_entity", entitySelector("climate")),
        field("freezer_climate_entity", entitySelector("climate")),
        field("status_entity"),
        field("fridge_temperature_entity", temperature), field("freezer_temperature_entity", temperature),
        field("fridge_target_entity", target), field("freezer_target_entity", target),
        field("door_entity", door), field("freezer_door_entity", door),
        field("alert_entity"), field("filter_entity"), field("energy_entity", entitySelector("sensor")),
        field("mode_entity", entitySelector(["select", "input_select", "climate"])),
        field("quick_cool_entity", entitySelector(["switch", "button"])), field("quick_freeze_entity", entitySelector(["switch", "button"])),
        field("lock_entity", entitySelector(["lock", "switch", "button"])),
        { name: "extra_entities", selector: { entity: { multiple: true } } },
        { name: "fridge_alert_above", selector: { number: { min: -5, max: 20, step: 0.5, mode: "box", unit_of_measurement: "°C" } } },
        { name: "freezer_alert_above", selector: { number: { min: -40, max: 0, step: 0.5, mode: "box", unit_of_measurement: "°C" } } },
        { name: "background_image", selector: { text: {} } },
        { name: "background_position", selector: { text: {} } },
        { name: "card_background", selector: { object: {} } },
        { name: "accent_color", selector: { text: {} } },
        { name: "image_brightness", selector: { number: { min: 30, max: 100, step: 1, mode: "slider" } } },
        { name: "glass_opacity", selector: { number: { min: 0.45, max: 0.96, step: 0.01, mode: "slider" } } },
      ],
      computeLabel: formLabels(FORM_LABELS),
      computeHelper: (schema: { name?: string }) =>
        schema.name === "status_entity" ? "L’ancien nom connected_entity reste accepté en YAML." : undefined,
    };
  }
  public getCardSize(): number { return 7; }
  public getGridOptions(): Record<string, number> { return { rows: 7, min_rows: 5, columns: 6, min_columns: 3 }; }

  public disconnectedCallback(): void {
    for (const timer of this.targetTimers.values()) window.clearTimeout(timer);
    this.targetTimers.clear();
    super.disconnectedCallback();
  }

  /** La consigne optimiste disparaît quand Home Assistant publie le nouvel état de l'entité. */
  protected willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (!changed.has("hass")) return;
    for (const [id, sent] of this.sentTargets) {
      if (entity(this.hass, id) === sent || this.targetTimers.has(id)) continue;
      this.sentTargets.delete(id);
      this.optimisticTargets.delete(id);
    }
  }

  private temperatureUnit(state?: HassEntity): string {
    return typeof state?.attributes.unit_of_measurement === "string" ? state.attributes.unit_of_measurement
      : this.hass?.config?.unit_system?.temperature || "°C";
  }

  private formatTemperature(value: number, state?: HassEntity): string {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)} ${this.temperatureUnit(state)}`;
  }

  private temperature(id?: string, role: "current" | "target" = "current"): string {
    const state = entity(this.hass, id);
    if (!state || !isAvailable(state)) return "—";
    const optimistic = role === "target" && id ? this.optimisticTargets.get(id) : undefined;
    const value = optimistic ?? fridgeTemperature(state, role);
    if (value !== undefined) return this.formatTemperature(value, state);
    return isClimate(id) ? "—" : displayState(this.hass, id);
  }

  private temperatureLevel(id: string | undefined, freezer: boolean): Severity {
    const value = fridgeTemperature(entity(this.hass, id));
    return freezer
      ? fridgeTemperatureLevel(value, this.config?.freezer_alert_above, FREEZER_ALERT_ABOVE)
      : fridgeTemperatureLevel(value, this.config?.fridge_alert_above, FRIDGE_ALERT_ABOVE);
  }

  /** Mode affiché : l'option choisie, ou le préréglage d'un thermostat (rien s'il n'en a pas). */
  private modeLabel(): string {
    const id = this.config?.mode_entity;
    if (!id) return "";
    if (!isClimate(id)) return displayState(this.hass, id);
    const preset = entity(this.hass, id)?.attributes.preset_mode;
    return typeof preset === "string" && preset !== "none" ? preset : "";
  }
  private doorLabel(id?: string): string {
    const state = entity(this.hass, id);
    return !isAvailable(state) ? "État inconnu" : isActive(state) ? "Ouverte" : "Fermée";
  }
  private doorSignal(label: string, id?: string): TemplateResult | typeof nothing {
    if (!id) return nothing;
    const state = entity(this.hass, id);
    const known = isAvailable(state);
    const open = known && isActive(state);
    return html`<span class=${`fridge-signal ${open ? "warning" : known ? "" : "muted"}`}><ha-icon icon=${open ? "mdi:door-open" : "mdi:door"}></ha-icon>${known
      ? `${label} ${open ? "ouverte" : "fermée"}`
      : `${label} : état inconnu`}</span>`;
  }

  private call(key: string, domain: string, service: string, id: string, data: Record<string, unknown> = {}): Promise<boolean> {
    const hass = this.hass;
    if (!hass) return Promise.resolve(false);
    return this.runCommand(key, () => hass.callService(domain, service, data, { entity_id: id }), {
      errorMessage: "Commande non exécutée. Vérifiez la disponibilité de l’appareil.",
    });
  }

  /**
   * − et + modifient d'abord une consigne locale ; la valeur n'est envoyée qu'après une courte
   * pause, pour que plusieurs appuis rapides donnent une seule commande avec la bonne valeur.
   */
  private adjustTarget(id: string, direction: -1 | 1): void {
    const state = entity(this.hass, id);
    const climate = isClimate(id);
    if (!state || !isAvailable(state) || !(id.startsWith("number.") || climate)) return;
    const current = this.optimisticTargets.get(id) ?? fridgeTemperature(state, "target");
    if (current === undefined) return;
    const stepValue = Number(climate ? state.attributes.target_temp_step : state.attributes.step);
    const step = Number.isFinite(stepValue) && stepValue > 0 ? stepValue : climate ? 0.5 : 1;
    const minValue = attributeNumber(climate ? state.attributes.min_temp : state.attributes.min);
    const maxValue = attributeNumber(climate ? state.attributes.max_temp : state.attributes.max);
    const min = minValue ?? -100;
    const max = maxValue ?? 100;
    const value = Math.min(max, Math.max(min, Number((current + direction * step).toFixed(3))));
    if (value === current) return;
    this.optimisticTargets.set(id, value);
    window.clearTimeout(this.targetTimers.get(id));
    this.targetTimers.set(id, window.setTimeout(() => void this.commitTarget(id), TARGET_DEBOUNCE));
    this.requestUpdate();
  }

  /** Envoie la consigne locale ; en cas d'échec, l'affichage revient à la valeur de l'appareil. */
  private async commitTarget(id: string): Promise<void> {
    window.clearTimeout(this.targetTimers.get(id));
    this.targetTimers.delete(id);
    const value = this.optimisticTargets.get(id);
    if (value === undefined) return;
    const key = `target:${id}`;
    if (this.isPending(key)) {
      // Une commande précédente n'a pas encore répondu : la nouvelle valeur partira juste après.
      this.targetTimers.set(id, window.setTimeout(() => void this.commitTarget(id), TARGET_DEBOUNCE));
      return;
    }
    const sent = entity(this.hass, id);
    this.sentTargets.set(id, sent);
    const ok = isClimate(id)
      ? await this.call(key, "climate", "set_temperature", id, { temperature: value })
      : await this.call(key, "number", "set_value", id, { value });
    if (!ok && !this.targetTimers.has(id)) {
      this.dropOptimisticTarget(id);
    } else if (ok) {
      // Un appareil qui ignore la commande sans publier d'état ne garde pas la valeur affichée.
      window.setTimeout(() => {
        if (this.sentTargets.get(id) === sent && !this.targetTimers.has(id)) this.dropOptimisticTarget(id);
      }, TARGET_CONFIRM_TIMEOUT);
    }
  }

  private dropOptimisticTarget(id: string): void {
    this.optimisticTargets.delete(id);
    this.sentTargets.delete(id);
    this.requestUpdate();
  }

  private async quickAction(id: string): Promise<void> {
    const state = entity(this.hass, id);
    if (!isCommandable(state)) return;
    const key = `quick:${id}`;
    if (id.startsWith("switch.")) await this.call(key, "switch", "toggle", id);
    else if (id.startsWith("button.")) await this.call(key, "button", "press", id);
    else if (id.startsWith("lock.")) await this.call(key, "lock", state?.state === "locked" ? "unlock" : "lock", id);
  }

  /** Fiche Home Assistant d'une entité ; la fenêtre Auralis est fermée pour ne pas la masquer. */
  private openEntity(id: string): void {
    if (this.dialog !== null) this.closeDialog();
    this.moreInfo(id);
  }

  private detail(label: string, icon: string, id?: string, value?: string, level: Severity = "normal"): TemplateResult {
    if (!id) return html``;
    return html`<button class="detail-tile ${severityClass(level)}" type="button" aria-label=${`Plus d’informations : ${label}`} @click=${() => this.openEntity(id)}>
      <ha-icon .icon=${icon}></ha-icon><span><small>${label}</small><strong>${value ?? displayState(this.hass, id)}</strong></span><ha-icon icon="mdi:chevron-right"></ha-icon></button>`;
  }
  private target(label: string, id?: string): TemplateResult {
    if (!id) return html``;
    const state = entity(this.hass, id);
    const enabled = (id.startsWith("number.") || isClimate(id)) && fridgeTemperature(state, "target") !== undefined;
    const optimistic = this.optimisticTargets.has(id);
    return html`<div class="control-row"><span>${label}</span>
      <button type="button" aria-label=${`Baisser ${label}`} ?disabled=${!enabled} @click=${() => this.adjustTarget(id, -1)}><ha-icon icon="mdi:minus"></ha-icon></button>
      <output class=${optimistic ? "optimistic" : ""} aria-live="polite" aria-busy=${optimistic ? "true" : "false"}>${this.temperature(id, "target")}</output>
      <button type="button" aria-label=${`Augmenter ${label}`} ?disabled=${!enabled} @click=${() => this.adjustTarget(id, 1)}><ha-icon icon="mdi:plus"></ha-icon></button></div>`;
  }
  private quick(label: string, icon: string, id?: string): TemplateResult {
    if (!id) return html``;
    const state = entity(this.hass, id);
    const supported = id.startsWith("switch.") || id.startsWith("button.") || id.startsWith("lock.");
    const pending = this.isPending(`quick:${id}`);
    const stateIcon = id.startsWith("button.") ? "mdi:play" : id.startsWith("lock.") ? state?.state === "locked" ? "mdi:lock" : "mdi:lock-open-outline" : isActive(state) ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline";
    return html`<div class="control-row"><ha-icon .icon=${icon}></ha-icon><span>${label}</span>
      <button type="button" aria-label=${`${label} : ${isCommandable(state) ? displayState(this.hass, id, "prêt") : "indisponible"}`} aria-busy=${pending ? "true" : "false"}
        ?disabled=${!supported || !isCommandable(state) || pending}
        @click=${() => this.quickAction(id)}><ha-icon .icon=${pending ? "mdi:timer-sand" : stateIcon}></ha-icon></button></div>`;
  }
  private renderDetails(): TemplateResult {
    const c = this.config!;
    const mode = entity(this.hass, c.mode_entity);
    const climateMode = isClimate(c.mode_entity);
    const rawOptions = climateMode ? mode?.attributes.preset_modes : mode?.attributes.options;
    const options = Array.isArray(rawOptions) ? rawOptions.filter((item): item is string => typeof item === "string") : [];
    const currentMode = climateMode ? mode?.attributes.preset_mode : mode?.state;
    const knownMode = typeof currentMode === "string" && options.includes(currentMode);
    const modePending = this.isPending("mode");
    return this.renderDialog(c.name || "Frigo connecté", c.icon || "mdi:fridge-outline", html`<div class="dialog-body">
      <div class="dialog-overview"><div><span class="eyebrow">État du réfrigérateur</span><strong>${STATUS[fridgeHealth(this.hass, c)][0]}</strong></div>
        <div class="dialog-stat"><strong class="sev-text ${severityClass(this.temperatureLevel(c.fridge_temperature_entity, false))}">${this.temperature(c.fridge_temperature_entity)}</strong><small>réfrigérateur</small></div></div>
      <div class="detail-grid">
        ${this.detail("Réfrigérateur", "mdi:thermometer", c.fridge_temperature_entity, this.temperature(c.fridge_temperature_entity), this.temperatureLevel(c.fridge_temperature_entity, false))}
        ${this.detail("Congélateur", "mdi:snowflake-thermometer", c.freezer_temperature_entity, this.temperature(c.freezer_temperature_entity), this.temperatureLevel(c.freezer_temperature_entity, true))}
        ${this.detail("Porte du frigo", "mdi:door", c.door_entity, this.doorLabel(c.door_entity))}
        ${this.detail("Porte du congélateur", "mdi:door", c.freezer_door_entity, this.doorLabel(c.freezer_door_entity))}
        ${this.detail("Alerte", "mdi:alert-circle-outline", c.alert_entity)}
        ${this.detail("Filtre", "mdi:air-filter", c.filter_entity)}
        ${this.detail("Énergie", "mdi:lightning-bolt-outline", c.energy_entity)}
        ${(c.extra_entities || []).map((id) => this.detail(entity(this.hass, id)?.attributes.friendly_name || id, "mdi:information-outline", id))}
      </div>
      ${c.fridge_target_entity || c.freezer_target_entity ? html`<div class="section-caption">Consignes</div>${this.target("Réfrigérateur", c.fridge_target_entity)}${this.target("Congélateur", c.freezer_target_entity)}` : nothing}
      ${c.mode_entity && ["select.", "input_select.", "climate."].some((prefix) => c.mode_entity!.startsWith(prefix)) && options.length ? html`<div class="section-caption">Mode</div><label class="control-row"><span>Mode de fonctionnement</span>
        <select aria-label="Mode de fonctionnement" aria-busy=${modePending ? "true" : "false"} ?disabled=${!isAvailable(mode) || modePending}
          @change=${(event: Event) => {
            const option = (event.target as HTMLSelectElement).value;
            if (!option) return;
            if (climateMode) void this.call("mode", "climate", "set_preset_mode", c.mode_entity!, { preset_mode: option });
            else void this.call("mode", c.mode_entity!.split(".")[0], "select_option", c.mode_entity!, { option });
          }}>
          <option value="" disabled ?selected=${!knownMode}>Choisir un mode…</option>
          ${options.map((option) => html`<option value=${option} ?selected=${option === currentMode}>${option}</option>`)}</select></label>` : nothing}
      ${c.quick_cool_entity || c.quick_freeze_entity || c.lock_entity ? html`<div class="section-caption">Fonctions rapides</div>
        ${this.quick("Refroidissement rapide", "mdi:snowflake", c.quick_cool_entity)}
        ${this.quick("Congélation rapide", "mdi:snowflake-alert", c.quick_freeze_entity)}
        ${this.quick("Verrouillage", "mdi:lock-outline", c.lock_entity)}` : nothing}
    </div>`);
  }

  /** Tuile de température de la façade ; un appui ouvre la fiche de la sonde. */
  private temperatureTile(label: string, icon: string, currentId: string | undefined, targetId: string | undefined, freezer: boolean, wide: boolean): TemplateResult {
    const classes = `temperature ${wide ? "wide" : ""} ${severityClass(this.temperatureLevel(currentId, freezer))}`;
    const content = html`<small><ha-icon .icon=${icon}></ha-icon>${label}</small><strong>${this.temperature(currentId)}</strong><span>Consigne ${this.temperature(targetId, "target")}</span>`;
    return currentId
      ? html`<button type="button" class=${classes} aria-label=${`${label} : ${this.temperature(currentId)}`} @click=${() => this.openEntity(currentId)}>${content}</button>`
      : html`<div class=${classes}>${content}</div>`;
  }

  protected render(): TemplateResult {
    if (!this.config) return html``;
    const c = this.config;
    const health = fridgeHealth(this.hass, c);
    // Le congélateur n'apparaît que s'il est configuré.
    const hasFreezer = Boolean(c.freezer_temperature_entity || c.freezer_target_entity || c.freezer_climate_entity);
    return html`<ha-card><div class=${`machine-shell fridge-shell ${this.machineGridClass()}`} style=${this.machineStyle("#83d7e9")}>
      <div class="machine-content"><header class="machine-header"><span class="fridge-icon"><ha-icon .icon=${c.icon || "mdi:fridge-outline"}></ha-icon></span>
        <div><h2>${c.name}</h2><div class=${`fridge-status ${health}`}><ha-icon .icon=${STATUS[health][1]}></ha-icon>${STATUS[health][0]}</div></div></header>
        <div class="fridge-spacer"></div><section class="fridge-panel" aria-label="État du frigo connecté">
          <div class="temperature-grid">
            ${this.temperatureTile("Réfrigérateur", "mdi:fridge-outline", c.fridge_temperature_entity, c.fridge_target_entity, false, !hasFreezer)}
            ${hasFreezer ? this.temperatureTile("Congélateur", "mdi:snowflake", c.freezer_temperature_entity, c.freezer_target_entity, true, false) : nothing}
          </div><div class="fridge-signals">
            ${this.doorSignal("Porte du frigo", c.door_entity)}
            ${this.doorSignal("Porte du congélateur", c.freezer_door_entity)}
            ${this.modeLabel() ? html`<span class="fridge-signal"><ha-icon icon="mdi:cog-outline"></ha-icon>${this.modeLabel()}</span>` : nothing}
          </div><div class="fridge-footer"><small>${c.filter_entity ? `Filtre · ${displayState(this.hass, c.filter_entity)}` : "Suivi et commandes"}</small>
            <button class="machine-accent-action" type="button" aria-label="Détails du frigo" aria-haspopup="dialog" @click=${() => this.openDialog("details")}>Détails <ha-icon icon="mdi:arrow-right"></ha-icon></button></div>
        </section></div></div></ha-card>${this.dialog === "details" ? this.renderDetails() : nothing}`;
  }
}
