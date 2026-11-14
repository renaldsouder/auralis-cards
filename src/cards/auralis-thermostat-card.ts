import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { entity, friendlyName, isAvailable, isCommandable } from "../utils/entities";

export interface ThermostatCardConfig extends BaseCardConfig {
  type: "custom:auralis-thermostat-card";
  entity?: string;
  entities?: string[];
  entity_labels?: Record<string, string>;
  /** Masque l'en-tête (icône, nom, état) avec `false`. */
  show_header?: boolean;
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
const CLIMATE_ID = /^climate\.[a-z0-9_]+$/;

function attributeNumber(state: HassEntity | undefined, key: string): number | undefined {
  const value = state?.attributes[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/* -------------------------------------------------------------------------------------------
 * Consigne : saisie locale immédiate, un seul envoi après la dernière pression.
 * Partagé avec la carte Pièce (pavé thermostat sur la photo).
 * ----------------------------------------------------------------------------------------- */

/** Délai sans nouvelle pression avant d'envoyer la consigne. */
export const SETPOINT_DELAY = 700;
/** Durée maximale d'affichage d'une consigne envoyée que Home Assistant ne confirme pas. */
export const SETPOINT_CONFIRM_WINDOW = 5_000;

export type SetpointField = "temperature" | "target_temp_low" | "target_temp_high";
export type Setpoints = Partial<Record<SetpointField, number>>;
export interface SetpointLimits { step: number; min: number; max: number }

/** Consigne simple du thermostat, sans jamais la remplacer par la température mesurée. */
export function thermostatTarget(state?: HassEntity): number | undefined {
  return attributeNumber(state, "temperature");
}

/** Consignes connues : simple (`temperature`) ou plage (`target_temp_low` / `target_temp_high`). */
export function readSetpoints(state?: HassEntity): Setpoints {
  const values: Setpoints = {};
  for (const field of ["temperature", "target_temp_low", "target_temp_high"] as const) {
    const value = attributeNumber(state, field);
    if (value !== undefined) values[field] = value;
  }
  return values;
}

/** Pas et bornes du thermostat ; `step` remplace le pas de l'appareil quand il est valide. */
export function setpointLimits(state?: HassEntity, step?: number): SetpointLimits {
  const deviceStep = attributeNumber(state, "target_temp_step");
  const configured = Number(step);
  return {
    step: Number.isFinite(configured) && configured > 0 ? configured : deviceStep && deviceStep > 0 ? deviceStep : 0.5,
    min: attributeNumber(state, "min_temp") ?? 5,
    max: attributeNumber(state, "max_temp") ?? 35,
  };
}

/** Valeur suivante d'une consigne, bornée et arrondie ; `undefined` si elle ne change pas. */
export function stepSetpoint(value: number | undefined, direction: -1 | 1, limits: SetpointLimits): number | undefined {
  if (value === undefined || limits.min > limits.max) return undefined;
  const next = Math.min(limits.max, Math.max(limits.min, Math.round((value + direction * limits.step) * 1000) / 1000));
  return next === value ? undefined : next;
}

export function nextThermostatTarget(state: HassEntity | undefined, direction: -1 | 1): number | undefined {
  if (!isAvailable(state)) return undefined;
  return stepSetpoint(thermostatTarget(state), direction, setpointLimits(state));
}

/** Données de `climate.set_temperature` : la consigne simple, ou les deux bornes de la plage. */
export function setpointPayload(pending: Setpoints, current: Setpoints): Setpoints {
  if (pending.temperature !== undefined) return { temperature: pending.temperature };
  const low = pending.target_temp_low ?? current.target_temp_low;
  const high = pending.target_temp_high ?? current.target_temp_high;
  return { ...(low !== undefined ? { target_temp_low: low } : {}), ...(high !== undefined ? { target_temp_high: high } : {}) };
}

interface PendingSetpoint {
  values: Setpoints;
  seq: number;
  timer?: ReturnType<typeof setTimeout>;
  sentAt?: number;
}

/**
 * Consignes saisies localement : chaque pression change aussitôt la valeur affichée, une seule
 * commande part 700 ms après la dernière pression, et la valeur reste affichée jusqu'à ce que
 * Home Assistant la confirme (5 s au plus). En cas d'échec, l'affichage revient à l'état réel.
 */
export class SetpointBuffer {
  private readonly entries = new Map<string, PendingSetpoint>();
  private seq = 0;

  constructor(
    private readonly options: {
      state: (entityId: string) => HassEntity | undefined;
      send: (entityId: string, values: Setpoints, seq: number) => Promise<boolean>;
      changed: () => void;
      delay?: number;
    },
  ) {}

  /** Consignes affichées : la saisie locale en attente, sinon celles de Home Assistant. */
  values(entityId: string): Setpoints {
    const real = readSetpoints(this.options.state(entityId));
    const entry = this.entries.get(entityId);
    if (!entry) return real;
    if (entry.sentAt !== undefined) {
      const confirmed = Object.entries(entry.values).every(([field, value]) => real[field as SetpointField] === value);
      if (confirmed || Date.now() - entry.sentAt > SETPOINT_CONFIRM_WINDOW) {
        this.entries.delete(entityId);
        return real;
      }
    }
    return { ...real, ...entry.values };
  }

  /** Vrai tant qu'une saisie locale n'est pas envoyée ou pas confirmée. */
  pending(entityId: string): boolean {
    this.values(entityId);
    return this.entries.has(entityId);
  }

  /** Change une consigne d'un pas ; `false` si elle est déjà à sa borne ou inconnue. */
  adjust(entityId: string, field: SetpointField, direction: -1 | 1, limits: SetpointLimits): boolean {
    const current = this.values(entityId);
    const next = stepSetpoint(current[field], direction, limits);
    if (next === undefined) return false;
    if (field === "target_temp_low" && current.target_temp_high !== undefined && next > current.target_temp_high) return false;
    if (field === "target_temp_high" && current.target_temp_low !== undefined && next < current.target_temp_low) return false;
    const entry = this.entries.get(entityId) ?? { values: {}, seq: 0 };
    if (entry.sentAt !== undefined) entry.values = {};
    entry.values = { ...entry.values, [field]: next };
    entry.seq = ++this.seq;
    entry.sentAt = undefined;
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => void this.flush(entityId), this.options.delay ?? SETPOINT_DELAY);
    this.entries.set(entityId, entry);
    this.options.changed();
    return true;
  }

  /** Envoie tout de suite la saisie en attente d'une entité. */
  async flush(entityId: string): Promise<void> {
    const entry = this.entries.get(entityId);
    if (!entry || entry.sentAt !== undefined) return;
    clearTimeout(entry.timer);
    entry.timer = undefined;
    const seq = entry.seq;
    const payload = setpointPayload(entry.values, readSetpoints(this.options.state(entityId)));
    const ok = await this.options.send(entityId, payload, seq);
    const current = this.entries.get(entityId);
    // De nouvelles pressions ont eu lieu pendant l'envoi : elles partiront à leur tour.
    if (!current || current.seq !== seq) return;
    if (ok) {
      current.sentAt = Date.now();
      setTimeout(() => this.options.changed(), SETPOINT_CONFIRM_WINDOW + 50);
    } else {
      this.entries.delete(entityId);
    }
    this.options.changed();
  }

  /** Abandonne les saisies en attente (carte retirée de la page). */
  dispose(): void {
    for (const entry of this.entries.values()) clearTimeout(entry.timer);
    this.entries.clear();
  }
}

/* ----------------------------------------------------------------------------------------- */

function temperatureLabel(value: number | undefined, unit: string): string {
  return value === undefined ? "—" : `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}${unit}`;
}

export class AuralisThermostatCard extends AuralisBaseCard<ThermostatCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    selectedEntity: { state: true },
  };
  static styles = [AuralisBaseCard.styles, css`
    /* Fond et texte suivent le thème ; une image de fond garde un voile sombre et un texte clair. */
    .thermostat-shell { --machine-accent:#ffbd78; background:var(--auralis-card-background,var(--auralis-card)); color:var(--auralis-text); }
    .thermostat-shell:not(.has-image)::before { display:none; }
    /* Jetons sombres de la façade photo : voir .machine-shell dans les styles partagés. */
    .thermostat-shell.has-image { background:var(--auralis-card-background,#090d12); }
    .thermostat-shell, .thermostat-content { min-height:0; }
    .thermostat-header { padding-right:52px; }
    .thermostat-header .badge { display:grid; width:var(--auralis-target); height:var(--auralis-target); flex:0 0 auto; place-items:center; border:1px solid var(--auralis-border); border-radius:14px; background:color-mix(in srgb,var(--machine-accent) 14%,var(--auralis-layer)); color:color-mix(in oklab,var(--machine-accent),#000 var(--auralis-shade)); }
    .thermostat-header .badge ha-icon { --mdc-icon-size:23px; }
    .thermostat-header h2 { overflow:hidden; color:inherit; font-size:var(--auralis-title-size); text-overflow:ellipsis; white-space:nowrap; }
    .thermostat-header .machine-status { margin-top:5px; color:var(--auralis-muted); }
    .info-button { position:absolute; z-index:2; top:0; right:0; display:grid; width:var(--auralis-target); height:var(--auralis-target); place-items:center; border:1px solid var(--auralis-border); border-radius:13px; background:var(--auralis-layer); color:var(--auralis-text); cursor:pointer; }
    .info-button ha-icon { --mdc-icon-size:20px; }
    .selector { display:flex; gap:7px; overflow-x:auto; padding:2px 1px 8px; margin-top:18px; scrollbar-width:thin; }
    .selector button { flex:0 0 auto; min-height:var(--auralis-target); max-width:170px; padding:7px 12px; overflow:hidden; border:1px solid var(--auralis-border); border-radius:12px; background:var(--auralis-layer); color:var(--auralis-muted); cursor:pointer; text-overflow:ellipsis; white-space:nowrap; }
    .selector button[aria-pressed="true"] { border-color:color-mix(in srgb,var(--machine-accent) 60%,transparent); background:color-mix(in srgb,var(--machine-accent) 17%,var(--auralis-layer)); color:var(--auralis-text); }
    .selector .unavailable { opacity:.5; }
    .dial-wrap { display:grid; flex:1; min-height:204px; place-items:center; padding:18px 0 10px; }
    .dial { --dial-position:0%; display:grid; width:190px; height:190px; place-items:center; border-radius:50%; background:conic-gradient(from 220deg,var(--machine-accent) var(--dial-position),color-mix(in srgb,var(--auralis-muted) 22%,transparent) var(--dial-position) 78%,transparent 78%); box-shadow:0 0 0 7px var(--auralis-layer),0 0 0 8px var(--auralis-border); }
    .dial-inner { display:grid; width:164px; height:164px; place-content:center; border-radius:50%; background:var(--auralis-card); text-align:center; }
    .dial-inner small { color:var(--auralis-muted); font-size:var(--auralis-text-xs); letter-spacing:.08em; text-transform:uppercase; }
    .dial-inner strong { margin-top:3px; color:var(--auralis-text); font-size:43px; letter-spacing:-.06em; line-height:1.05; }
    .dial-inner span { margin-top:6px; color:var(--auralis-muted); font-size:var(--auralis-text-sm); }
    .thermostat-panel { padding:15px; border-color:var(--auralis-border); background:var(--auralis-layer); }
    .panel-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .panel-head + .panel-head { margin-top:10px; }
    .panel-title { min-width:0; }
    .panel-title small { display:block; color:var(--auralis-muted); font-size:var(--auralis-text-xs); text-transform:uppercase; letter-spacing:.08em; }
    /* Deux lignes au plus plutôt qu'un libellé tronqué à côté des boutons − / +. */
    .panel-title strong { display:-webkit-box; overflow:hidden; margin-top:4px; font-size:17px; line-height:1.25; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
    .stepper { display:flex; align-items:center; gap:8px; }
    .stepper button { display:grid; width:var(--auralis-target); height:var(--auralis-target); flex:0 0 auto; place-items:center; border:1px solid var(--auralis-border); border-radius:13px; background:var(--auralis-card); color:var(--auralis-text); cursor:pointer; font-size:24px; line-height:1; }
    .stepper button:hover, .mode-button:hover, .info-button:hover { border-color:var(--machine-accent); }
    .stepper button:disabled, .mode-button:disabled { cursor:not-allowed; opacity:.42; }
    .stepper output { min-width:58px; color:color-mix(in oklab,var(--machine-accent),#000 var(--auralis-shade)); font-size:21px; font-weight:750; text-align:center; white-space:nowrap; }
    .stepper output.pending { opacity:.8; }
    .metrics { display:flex; flex-wrap:wrap; gap:7px 18px; padding-top:13px; margin-top:13px; border-top:1px solid var(--auralis-border); }
    .metrics span { color:var(--auralis-muted); font-size:var(--auralis-text-xs); }
    .metrics strong { margin-left:5px; color:var(--auralis-text); }
    .modes { display:flex; flex-wrap:wrap; gap:7px; margin-top:13px; }
    .mode-button { display:flex; min-height:var(--auralis-target); align-items:center; gap:6px; padding:7px 11px; border:1px solid var(--auralis-border); border-radius:11px; background:var(--auralis-card); color:var(--auralis-muted); cursor:pointer; font-size:var(--auralis-text-sm); font-weight:700; }
    .mode-button ha-icon { --mdc-icon-size:17px; }
    .mode-button[aria-pressed="true"] { border-color:color-mix(in srgb,var(--machine-accent) 65%,transparent); background:color-mix(in srgb,var(--machine-accent) 17%,var(--auralis-card)); color:var(--auralis-text); }
    @container (max-width:350px) {
      .thermostat-shell { padding:14px; }
      .dial { width:168px; height:168px; }
      .dial-inner { width:144px; height:144px; }
      .panel-head { align-items:flex-start; flex-direction:column; }
      .stepper { width:100%; justify-content:space-between; }
    }
  `];

  private selectedEntity?: string;
  private readonly setpoints = new SetpointBuffer({
    state: (id) => entity(this.hass, id),
    send: (id, values, seq) => {
      const hass = this.hass;
      if (!hass) return Promise.resolve(false);
      return this.runCommand(`setpoint:${id}:${seq}`, () => hass.callService("climate", "set_temperature", values, { entity_id: id }), {
        errorMessage: "La consigne n’a pas pu être modifiée.",
      });
    },
    changed: () => this.requestUpdate(),
  });

  public setConfig(config: ThermostatCardConfig): void {
    const additional = Array.isArray(config.entities) ? config.entities : [];
    const ids = [config.entity, ...additional].filter((id): id is string => typeof id === "string" && id.length > 0);
    if (!ids.length || ids.some((id) => !CLIMATE_ID.test(id))) {
      throw new Error("Configurez une ou plusieurs entités climate.*.");
    }
    const normalized = [...new Set(ids)];
    this.config = { ...config, name: config.name || "Thermostats", theme: config.theme || "carbon", entities: normalized };
    if (!normalized.includes(this.selectedEntity || "")) this.selectedEntity = normalized[0];
  }
  static getStubConfig(hass?: HomeAssistant): Partial<ThermostatCardConfig> {
    const climate = Object.keys(hass?.states ?? {}).find((id) => CLIMATE_ID.test(id));
    return { name: "Thermostats", theme: "carbon", entity: climate || "climate.salon" };
  }
  static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      name: "Titre", icon: "Icône", show_header: "Afficher l’en-tête", entity: "Thermostat", entities: "Autres thermostats",
      entity_labels: "Noms personnalisés", theme: "Thème", background_image: "Image de fond", background_position: "Cadrage de l’image",
      image_opacity: "Opacité de l’image (%)", accent_color: "Couleur d’accent", card_background: "Fond de la carte", show_grid: "Afficher la trame",
    };
    return { schema: [
      { name: "name", selector: { text: {} } },
      { name: "icon", selector: { icon: {} } },
      { name: "show_header", selector: { boolean: {} } },
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
    ], computeLabel: ({ name }: { name: string }) => labels[name] };
  }

  public disconnectedCallback(): void {
    this.setpoints.dispose();
    super.disconnectedCallback();
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
  /** Une pression change la consigne affichée ; l'envoi part après la dernière pression. */
  private adjustTemperature(id: string, direction: -1 | 1, field: SetpointField = "temperature"): boolean {
    const state = entity(this.hass, id);
    if (!this.hass || !isCommandable(state)) return false;
    return this.setpoints.adjust(id, field, direction, setpointLimits(state));
  }
  private async setMode(id: string, mode: string): Promise<void> {
    const state = entity(this.hass, id);
    const modes = state?.attributes.hvac_modes;
    const hass = this.hass;
    if (!hass || !isCommandable(state) || !Array.isArray(modes) || !modes.includes(mode) || state?.state === mode) return;
    await this.runCommand(`mode:${id}`, () => hass.callService("climate", "set_hvac_mode", { hvac_mode: mode }, { entity_id: id }), {
      errorMessage: "Le mode n’a pas pu être modifié.",
    });
  }

  private renderStepper(id: string, field: SetpointField, title: string, label: string, noun: string): TemplateResult {
    const state = entity(this.hass, id);
    const values = this.setpoints.values(id);
    const limits = setpointLimits(state);
    const commandable = isCommandable(state);
    const value = values[field];
    const blocked = (direction: -1 | 1) => {
      const next = stepSetpoint(value, direction, limits);
      if (!commandable || next === undefined) return true;
      if (field === "target_temp_low" && values.target_temp_high !== undefined) return next > values.target_temp_high;
      if (field === "target_temp_high" && values.target_temp_low !== undefined) return next < values.target_temp_low;
      return false;
    };
    const pending = this.setpoints.pending(id);
    const name = this.label(id);
    return html`<div class="panel-head"><div class="panel-title"><small>${title}</small><strong>${label}</strong></div>
      <div class="stepper">
        <button type="button" aria-label=${`Baisser ${noun} de ${name}`} ?disabled=${blocked(-1)} @click=${() => this.adjustTemperature(id, -1, field)}>−</button>
        <output class=${pending ? "pending" : ""} aria-live="polite" aria-busy=${pending ? "true" : "false"}>${temperatureLabel(value, this.unit(state))}</output>
        <button type="button" aria-label=${`Augmenter ${noun} de ${name}`} ?disabled=${blocked(1)} @click=${() => this.adjustTemperature(id, 1, field)}>+</button>
      </div>
    </div>`;
  }

  protected render(): TemplateResult {
    const ids = this.ids();
    const id = ids.includes(this.selectedEntity || "") ? this.selectedEntity! : ids[0];
    const state = entity(this.hass, id);
    const available = isAvailable(state);
    const commandable = isCommandable(state);
    const values = this.setpoints.values(id);
    const target = available ? values.temperature : undefined;
    const current = available ? attributeNumber(state, "current_temperature") : undefined;
    const range = available && target === undefined && values.target_temp_low !== undefined && values.target_temp_high !== undefined;
    const humidity = available ? attributeNumber(state, "current_humidity") : undefined;
    const unit = this.unit(state);
    const min = attributeNumber(state, "min_temp") ?? 5;
    const max = attributeNumber(state, "max_temp") ?? 35;
    const dialValue = target ?? (range ? values.target_temp_high : undefined);
    const position = dialValue !== undefined && max > min ? Math.max(0, Math.min(78, ((dialValue - min) / (max - min)) * 78)) : 0;
    const modes = commandable && Array.isArray(state?.attributes.hvac_modes)
      ? state.attributes.hvac_modes.filter((mode): mode is string => typeof mode === "string") : [];
    const status = !available ? "Indisponible" : ACTION_LABELS[String(state?.attributes.hvac_action)] || MODE_LABELS[state?.state || ""] || state?.state;
    const modeBusy = this.isPending(`mode:${id}`);
    const image = Boolean(this.config?.background_image?.trim());
    return html`<ha-card><div class="machine-shell thermostat-shell ${image ? "has-image" : ""} ${this.machineGridClass()}" style=${this.machineStyle("#ffbd78")}>
      <div class="machine-content thermostat-content">
        ${this.config?.show_header !== false ? html`<header class="machine-header thermostat-header">
          <span class="badge"><ha-icon .icon=${this.config?.icon || "mdi:thermostat"}></ha-icon></span>
          <div class="title-wrap"><h2>${this.config?.name || "Thermostats"}</h2>
            <div class="machine-status"><span class="dot ${available ? (state?.state === "off" ? "" : "healthy") : "danger"}"></span>${this.label(id)} · ${status}</div>
          </div>
        </header>` : nothing}
        <button class="info-button" type="button" title=${`Détails de ${this.label(id)}`} aria-label=${`Détails de ${this.label(id)}`}
          @click=${() => this.moreInfo(id)}><ha-icon icon="mdi:information-outline"></ha-icon></button>
        ${ids.length > 1 ? html`<nav class="selector" aria-label="Choisir un thermostat">
          ${ids.map((item) => html`<button type="button" class=${isAvailable(entity(this.hass, item)) ? "" : "unavailable"}
            aria-pressed=${item === id} @click=${() => { this.selectedEntity = item; }}>${this.label(item)}</button>`)}
        </nav>` : nothing}
        <div class="dial-wrap"><div class="dial" style=${`--dial-position:${position}%`}>
          <div class="dial-inner"><small>Température actuelle</small><strong>${temperatureLabel(current, unit)}</strong><span>${status}</span></div>
        </div></div>
        <section class="machine-panel thermostat-panel">
          ${range
            ? html`${this.renderStepper(id, "target_temp_low", "Minimum", "Plage de température", "le minimum")}${this.renderStepper(id, "target_temp_high", "Maximum", "Plage de température", "le maximum")}`
            : this.renderStepper(id, "temperature", "Consigne", !available ? "Indisponible" : target !== undefined ? "Température souhaitée" : "Réglage indisponible", "la consigne")}
          <div class="metrics"><span>Mode <strong>${MODE_LABELS[state?.state || ""] || (available ? state?.state : "Indisponible")}</strong></span>
            ${humidity !== undefined ? html`<span>Humidité <strong>${humidity.toLocaleString("fr-FR")}%</strong></span>` : nothing}</div>
          ${modes.length ? html`<div class="modes" role="group" aria-label=${`Modes de ${this.label(id)}`}>
            ${modes.map((mode) => html`<button class="mode-button" type="button" aria-pressed=${mode === state?.state}
              ?disabled=${modeBusy} aria-busy=${modeBusy ? "true" : "false"} @click=${() => this.setMode(id, mode)}>
              <ha-icon .icon=${MODE_ICONS[mode] || "mdi:tune"}></ha-icon>${MODE_LABELS[mode] || mode}</button>`)}
          </div>` : nothing}
        </section>
      </div>
    </div></ha-card>`;
  }
  public getCardSize(): number { return 6; }
  /** Pas de nombre de rangées fixe : Sections suit la hauteur réelle (sélecteur, plage, modes). */
  public getGridOptions(): Record<string, number> { return { columns: 6, min_columns: 3 }; }
}
