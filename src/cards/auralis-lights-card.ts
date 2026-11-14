import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import { holdMoreInfo, withDragValue } from "./auralis-covers-card";
import type { BaseCardConfig, RoomSceneConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { entity, friendlyName, hexToRgb, isActive, isCommandable, lightBrightness, lightRgbColor, lightSupportsColor, rgbToHex } from "../utils/entities";
import { activateEntity } from "../utils/actions";
import { BOOLEAN, entitySelector, ICON, listSelector, TEXT, YAML, type FormListField } from "../utils/form";

export interface ColorPreset {
  name: string;
  color: string;
  /** Température de blanc (K) envoyée aux lampes qui la gèrent, à la place de la couleur. */
  kelvin?: number;
}
/** Champs d'une ambiance dans l'éditeur visuel. */
const SCENE_FIELDS: Record<string, FormListField> = {
  entity: { label: "Scène ou script", required: true, selector: entitySelector(["scene", "script"]) },
  label: { label: "Nom", selector: TEXT },
  icon: { label: "Icône", selector: ICON },
};

interface LightsGroup {
  name: string;
  lights: string[];
  icon?: string;
  /** Image de la tuile du groupe. `image` reste accepté. */
  background_image?: string;
  image?: string;
  show_lights?: boolean;
  scenes?: RoomSceneConfig[];
}

export interface LightsCardConfig extends BaseCardConfig {
  type: "custom:auralis-lights-card";
  groups?: LightsGroup[];
  lights?: string[];
  scenes?: RoomSceneConfig[];
  preset_colors?: ColorPreset[];
  entity_labels?: Record<string, string>;
  /** Masque l'en-tête (icône, nom, résumé) avec `false`. */
  show_header?: boolean;
  /** `true` remet la couleur, les couleurs prédéfinies et les ambiances sur la carte (sinon dans la fenêtre du groupe). */
  show_colors?: boolean;
}

const DEFAULT_COLORS: ColorPreset[] = [
  { name: "Blanc chaud", color: "#ffd4a3", kelvin: 2700 },
  { name: "Blanc neutre", color: "#ffffff", kelvin: 4000 },
  { name: "Blanc froid", color: "#dce9ff", kelvin: 6000 },
  { name: "Ambre", color: "#ff9d42" },
  { name: "Rose", color: "#ff7eb8" },
  { name: "Violet", color: "#9d79ff" },
  { name: "Bleu", color: "#5caaff" },
  { name: "Vert", color: "#67d7a2" },
];

const validHex = (value: string): boolean => /^#[0-9a-f]{6}$/i.test(value);
/** Lampes et éclairages commandés par relais (interrupteurs marche/arrêt). */
const LIGHT_ID = /^(light|switch)\.[a-z0-9_]+$/;
export const isLight = (id: string): boolean => id.startsWith("light.");
/**
 * Images acceptées : adresse https, fichiers locaux (/local/, /hacsfiles/) et images servies par
 * Home Assistant (/api/…, par exemple /api/image/serve/…). Les URI media-source:// ne sont pas
 * lisibles directement par le navigateur : utiliser l'adresse /local/ ou /api/ correspondante.
 */
const IMAGE_URL = /^(https:\/\/|\/local\/|\/hacsfiles\/|\/api\/)/;

/** La lampe accepte une intensité (une lampe marche/arrêt ou un interrupteur, non). */
export function supportsBrightness(id: string, state?: HassEntity): boolean {
  if (!isLight(id)) return false;
  const modes = state?.attributes.supported_color_modes;
  return typeof state?.attributes.brightness === "number"
    || (Array.isArray(modes) && modes.some((mode) => mode !== "onoff"));
}

/** La lampe accepte une température de blanc en kelvins. */
export function supportsColorTemp(state?: HassEntity): boolean {
  const modes = state?.attributes.supported_color_modes;
  return Array.isArray(modes) && modes.includes("color_temp");
}

/**
 * Lampes visées par un réglage de groupe (intensité, couleur) : seulement celles qui sont
 * allumées, pour ne pas rallumer une pièce entière ; si aucune ne l'est, toutes les lampes
 * compatibles et commandables, qui s'allument alors au réglage choisi.
 */
export function lightTargets(hass: HomeAssistant | undefined, ids: string[], supports: (id: string, state?: HassEntity) => boolean): string[] {
  const usable = [...new Set(ids)].filter((id) => {
    const state = entity(hass, id);
    return isLight(id) && isCommandable(state) && supports(id, state);
  });
  const on = usable.filter((id) => isActive(entity(hass, id)));
  return on.length ? on : usable;
}

/** Lampes d'un groupe à régler en intensité, selon la règle de `lightTargets`. */
export function brightnessTargets(hass: HomeAssistant | undefined, ids: string[]): string[] {
  return lightTargets(hass, ids, supportsBrightness);
}

/**
 * Applique une couleur prédéfinie : les blancs partent en `color_temp_kelvin` vers les lampes qui
 * gèrent la température de blanc, en `rgb_color` vers les autres.
 */
export async function applyLightPreset(hass: HomeAssistant, ids: string[], preset: ColorPreset): Promise<void> {
  const rgb = hexToRgb(preset.color);
  const kelvin = preset.kelvin;
  const byTemperature = kelvin ? ids.filter((id) => supportsColorTemp(entity(hass, id))) : [];
  const byColor = ids.filter((id) => !byTemperature.includes(id) && lightSupportsColor(entity(hass, id)));
  await Promise.all([
    byTemperature.length ? hass.callService("light", "turn_on", { color_temp_kelvin: Math.round(kelvin!) }, { entity_id: byTemperature }) : undefined,
    byColor.length && rgb ? hass.callService("light", "turn_on", { rgb_color: rgb }, { entity_id: byColor }) : undefined,
  ]);
}

/** Image d'un groupe en style CSS (sinon l'image de la carte), ou chaîne vide si l'adresse n'est pas acceptée. */
export function groupImageStyle(group: Pick<LightsGroup, "background_image" | "image">, fallback?: string): string {
  const image = (group.background_image || group.image || fallback)?.trim();
  if (!image || !IMAGE_URL.test(image) || /["'\\;{}]/.test(image)) return "";
  return `background-image:linear-gradient(0deg,rgba(7,13,20,.3),rgba(7,13,20,.05)),url("${image}")`;
}

export class AuralisLightsCard extends AuralisBaseCard<LightsCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    dragValues: { state: true },
  };

  static styles = [AuralisBaseCard.styles, css`
    .lights-shell { padding: 18px; container-type: inline-size; }
    .lights-header .tile-icon { color:var(--auralis-active-ink); background:color-mix(in srgb,var(--auralis-active) 16%,var(--auralis-layer)); }
    .lights-header .tile-icon ha-icon { --mdc-icon-size:25px; color:inherit; }
    .groups { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr)); gap:12px; }
    .group { overflow:hidden; border:1px solid var(--auralis-border); border-radius:20px; background:var(--auralis-layer); }
    .group-photo { position:relative; display:block; width:100%; height:90px; padding:0; overflow:hidden; border:0; color:#fff; cursor:pointer; -webkit-tap-highlight-color:transparent; background:radial-gradient(circle at 22% 35%,color-mix(in srgb,var(--auralis-active) 32%,transparent),transparent 45%),linear-gradient(125deg,#1a2633,#0c1520); background-size:cover; background-position:center; }
    .group-photo::after { position:absolute; inset:0; background:linear-gradient(0deg,rgba(7,13,20,.28),transparent 70%); content:""; pointer-events:none; }
    .group-photo:focus-visible { outline:2px solid var(--auralis-active); outline-offset:-2px; }
    /* Indice discret : un appui sur la photo ouvre tous les réglages du groupe. */
    .photo-hint { position:absolute; right:10px; bottom:10px; z-index:1; display:grid; width:30px; height:30px; place-items:center; border-radius:50%;
      background:rgba(7,13,20,.55); backdrop-filter:blur(6px); }
    .photo-hint ha-icon { --mdc-icon-size:17px; }
    .group-body { padding:14px; }
    .group-top { display:flex; align-items:center; gap:9px; }
    .group-top .tile-icon { flex:0 0 auto; color:var(--auralis-active-ink); background:color-mix(in srgb,var(--auralis-active) 16%,var(--auralis-layer)); }
    .group-title { min-width:0; flex:1; }
    .group-title strong, .group-title small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .group-title small { margin-top:3px; color:var(--auralis-muted); font-size:var(--auralis-text-xs); }
    .group-top .icon-button { flex:0 0 auto; }
    .group-actions { display:flex; gap:7px; margin-top:13px; }
    .control { display:grid; width:var(--auralis-target); height:var(--auralis-target); flex:0 0 auto; place-items:center; border:1px solid var(--auralis-border); border-radius:12px; background:var(--auralis-card); color:var(--auralis-text); cursor:pointer; }
    .control ha-icon { --mdc-icon-size:21px; }
    .control.on { color:var(--auralis-active-ink); }
    .control[disabled], .swatch[disabled], input[disabled] { opacity:.38; cursor:not-allowed; }
    .group-actions .spacer { flex:1; }
    .dimmer { display:flex; min-height:var(--auralis-target); align-items:center; gap:10px; margin-top:10px; }
    .dimmer ha-icon { --mdc-icon-size:18px; color:var(--auralis-active-ink); }
    .dimmer input[type="range"] { min-width:0; min-height:var(--auralis-target); flex:1; accent-color:var(--auralis-active); cursor:pointer; }
    .dimmer output { min-width:38px; color:var(--auralis-muted); font-size:var(--auralis-text-sm); text-align:right; }
    .color-input { width:var(--auralis-target); height:var(--auralis-target); padding:3px; border:1px solid var(--auralis-border); border-radius:12px; background:var(--auralis-card); cursor:pointer; }
    .color-input::-webkit-color-swatch-wrapper { padding:0; }
    .color-input::-webkit-color-swatch { border:0; border-radius:8px; }
    .color-input::-moz-color-swatch { border:0; border-radius:8px; }
    .swatches { display:flex; flex-wrap:wrap; gap:2px; margin-top:8px; }
    /* Pastille de 28 px dans une cible de 44 px. */
    .swatch { width:var(--auralis-target); height:var(--auralis-target); padding:8px; border:0; border-radius:50%; background:transparent; cursor:pointer; }
    .swatch::after { display:block; width:100%; height:100%; box-sizing:border-box; border:3px solid var(--auralis-card); border-radius:50%; background:var(--swatch-color); box-shadow:0 0 0 1px var(--auralis-border); content:""; }
    .swatch:hover::after, .swatch:focus-visible::after { box-shadow:0 0 0 2px var(--auralis-active); }
    .inline-lights { display:grid; gap:3px; padding-top:10px; margin-top:12px; border-top:1px solid var(--auralis-border); }
    .inline-light { display:flex; min-height:var(--auralis-target); align-items:center; gap:8px; font-size:var(--auralis-text-sm); -webkit-touch-callout:none; -webkit-user-select:none; user-select:none; }
    .inline-light .label { min-width:0; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .inline-light .unavailable, .light-head .unavailable { color:var(--auralis-muted); font-size:var(--auralis-text-xs); }
    .inline-light .control ha-icon { --mdc-icon-size:18px; }
    .light-row { padding:14px; border:1px solid var(--auralis-border); border-radius:16px; background:var(--auralis-layer); -webkit-touch-callout:none; -webkit-user-select:none; user-select:none; }
    .light-row + .light-row { margin-top:9px; }
    .light-head { display:flex; align-items:center; gap:10px; }
    .light-head .tile-icon { color:color-mix(in oklab,var(--light-color,var(--auralis-active)),#000 var(--auralis-shade)); }
    .light-head .meta { min-width:0; flex:1; }
    .light-head .name { display:block; overflow:hidden; font-size:var(--auralis-text-md); font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
    .light-head .unavailable { display:block; margin-top:3px; }
    .light-tools { display:flex; align-items:center; gap:10px; margin-top:6px; }
    .light-tools .dimmer { min-width:0; flex:1; margin-top:0; }
    .scene-grid { display:flex; flex-wrap:wrap; gap:9px; margin-top:12px; }
    .scene-item { display:grid; width:70px; gap:4px; justify-items:center; }
    .scene-item .control { width:48px; height:48px; color:var(--auralis-active-ink); }
    .scene-item small { width:70px; overflow:hidden; color:var(--auralis-muted); font-size:var(--auralis-text-xs); text-align:center; text-overflow:ellipsis; white-space:nowrap; }
    .section-caption { margin:17px 0 9px; color:var(--auralis-muted); font-size:var(--auralis-text-xs); font-weight:750; letter-spacing:.08em; text-transform:uppercase; }
    @container (max-width:330px) { .lights-shell { padding:13px; } .group-body { padding:12px; } }
    /* accent_color et card_background, posés sur l'hôte par applyHostPalette(). */
    :host([data-accent]), :host([data-accent]) .dialog-backdrop { --auralis-active:var(--auralis-card-accent); }
    :host([data-background]) ha-card, :host([data-background]) .lights-shell { background:var(--auralis-card-background); }
  `];

  /** Intensités suivies pendant le glissement d'un curseur, par clé. */
  public dragValues: ReadonlyMap<string, number> = new Map();

  public setConfig(config: LightsCardConfig): void {
    const groups = config.groups ?? (config.lights?.length ? [{ name: config.name || "Lumières", lights: config.lights }] : []);
    if (!groups.length || groups.some((group) => !group.name || !Array.isArray(group.lights) || !group.lights.length || group.lights.some((id) => typeof id !== "string" || !LIGHT_ID.test(id)))) {
      throw new Error("Configurez au moins un groupe avec des entités light.* ou switch.*.");
    }
    if (config.preset_colors?.some((preset) => !validHex(preset.color))) throw new Error("Les couleurs prédéfinies doivent être au format #RRGGBB.");
    if (config.preset_colors?.some((preset) => preset.kelvin !== undefined && !(Number(preset.kelvin) >= 1000 && Number(preset.kelvin) <= 12000))) {
      throw new Error("La température de blanc (kelvin) doit être comprise entre 1000 et 12000.");
    }
    this.config = { ...config, theme: config.theme || "carbon", groups };
  }

  static getStubConfig(hass?: HomeAssistant): Partial<LightsCardConfig> {
    const lights = Object.keys(hass?.states ?? {}).filter((id) => /^light\.[a-z0-9_]+$/.test(id)).slice(0, 4);
    return { name: "Lumières", theme: "carbon", lights: lights.length ? lights : ["light.salon"] };
  }

  static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      name: "Titre", icon: "Icône", show_header: "Afficher l’en-tête", theme: "Thème", lights: "Lumières (un seul groupe)",
      groups: "Groupes de lumières", scenes: "Ambiances",
      preset_colors: "Couleurs prédéfinies", entity_labels: "Noms personnalisés",
      background_image: "Image des groupes (https, /local/, /hacsfiles/, /api/)",
      accent_color: "Couleur d’accent", card_background: "Fond de la carte",
      show_colors: "Couleurs et ambiances sur la carte (sinon dans la fenêtre)",
    };
    return { schema: [
      { name: "name", selector: { text: {} } },
      { name: "icon", selector: { icon: {} } },
      { name: "show_header", selector: { boolean: {} } },
      { name: "show_colors", selector: { boolean: {} } },
      { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"], mode: "dropdown" } } },
      { name: "lights", selector: entitySelector(["light", "switch"], { multiple: true }) },
      { name: "groups", selector: listSelector({
        name: { label: "Nom", required: true, selector: TEXT },
        lights: { label: "Lumières", required: true, selector: entitySelector(["light", "switch"], { multiple: true }) },
        icon: { label: "Icône", selector: ICON },
        background_image: { label: "Image de la tuile", selector: TEXT },
        show_lights: { label: "Lister aussi les lumières sur la carte", selector: BOOLEAN },
        scenes: { label: "Ambiances du groupe (YAML : entity, label, icon)", selector: YAML },
      }, { label: "name" }) },
      { name: "scenes", selector: listSelector(SCENE_FIELDS, { label: "label", description: "entity" }) },
      { name: "preset_colors", selector: listSelector({
        name: { label: "Nom", required: true, selector: TEXT },
        color: { label: "Couleur (#RRGGBB)", required: true, selector: TEXT },
        kelvin: { label: "Température de blanc (K)", selector: { number: { min: 1000, max: 12000, step: 100, mode: "box", unit_of_measurement: "K" } } },
      }, { label: "name", description: "color" }) },
      { name: "entity_labels", selector: { object: {} } },
      { name: "background_image", selector: { text: {} } },
      { name: "accent_color", selector: { text: {} } },
      { name: "card_background", selector: { object: {} } },
    ], computeLabel: ({ name }: { name: string }) => labels[name] };
  }

  private groups(): LightsGroup[] { return this.config?.groups || []; }
  private available(group: LightsGroup): string[] { return group.lights.filter((id) => isCommandable(entity(this.hass, id))); }
  private colorIds(group: LightsGroup): string[] { return this.available(group).filter((id) => isLight(id) && lightSupportsColor(entity(this.hass, id))); }
  /** Un groupe d'interrupteurs n'a ni intensité ni couleur à proposer. */
  private onOffOnly(group: LightsGroup): boolean { return !group.lights.some(isLight); }
  private dimmableIds(group: LightsGroup): string[] { return this.available(group).filter((id) => supportsBrightness(id, entity(this.hass, id))); }
  private presets(): ColorPreset[] { return this.config?.preset_colors ?? DEFAULT_COLORS; }
  private scenes(group: LightsGroup): RoomSceneConfig[] { return group.scenes ?? this.config?.scenes ?? []; }
  private label(id: string): string { return this.config?.entity_labels?.[id] || friendlyName(entity(this.hass, id), id); }
  private average(group: LightsGroup): number {
    // Intensité moyenne des lampes allumées : un interrupteur n'a pas d'intensité.
    const values = group.lights.filter(isLight).map((id) => entity(this.hass, id)).filter(isActive).map(lightBrightness);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  }
  private color(group: LightsGroup): string {
    const states = this.colorIds(group).map((id) => entity(this.hass, id));
    return rgbToHex(lightRgbColor(states.find((state) => isActive(state) && lightRgbColor(state)) ?? states[0]));
  }
  /** Lampes visées par la couleur du groupe : les allumées, sinon toutes les compatibles. */
  private colorTargets(group: LightsGroup): string[] {
    return lightTargets(this.hass, group.lights, (_id, state) => lightSupportsColor(state));
  }
  private setDrag(key: string, value: number | undefined): void {
    this.dragValues = withDragValue(this.dragValues, key, value);
  }

  private async power(ids: string[], on: boolean): Promise<void> {
    const hass = this.hass;
    if (!hass || !ids.length) return;
    // Lampes et interrupteurs mélangés : un seul appel générique.
    const domain = ids.every(isLight) ? "light" : ids.every((id) => id.startsWith("switch.")) ? "switch" : "homeassistant";
    await this.runCommand(`power:${on ? "on" : "off"}:${ids.join(",")}`, () => hass.callService(domain, on ? "turn_on" : "turn_off", {}, { entity_id: ids }), {
      errorMessage: on ? "L’allumage a échoué." : "L’extinction a échoué.",
    });
  }
  private async brightness(ids: string[], percentage: number, key = `brightness:${ids.join(",")}`): Promise<void> {
    const hass = this.hass;
    if (!hass || !ids.length) return;
    await this.runCommand(key, () => hass.callService("light", "turn_on", { brightness_pct: Math.round(percentage) }, { entity_id: ids }), {
      errorMessage: "L’intensité n’a pas pu être modifiée.",
    });
  }
  private async colorize(ids: string[], color: string): Promise<void> {
    const hass = this.hass;
    const rgb = hexToRgb(color);
    if (!hass || !ids.length || !rgb) return;
    await this.runCommand(`color:${ids.join(",")}`, () => hass.callService("light", "turn_on", { rgb_color: rgb }, { entity_id: ids }), {
      errorMessage: "La couleur n’a pas pu être modifiée.",
    });
  }
  private async preset(ids: string[], preset: ColorPreset): Promise<void> {
    const hass = this.hass;
    if (!hass || !ids.length) return;
    await this.runCommand(`color:${ids.join(",")}`, () => applyLightPreset(hass, ids, preset), { errorMessage: "La couleur n’a pas pu être modifiée." });
  }
  /** Active une ambiance ; la fenêtre ne se ferme que si l'activation a réussi. */
  private async activateScene(scene: RoomSceneConfig): Promise<void> {
    const hass = this.hass;
    if (!hass) return;
    const ok = await this.runCommand(`scene:${scene.entity}`, () => activateEntity(hass, scene.entity), {
      errorMessage: "L’ambiance n’a pas pu être activée.",
    });
    if (ok) this.closeDialog();
  }

  /** Curseur d'intensité : le remplissage et le pourcentage suivent le doigt, l'envoi part au relâchement. */
  private renderDimmer(key: string, value: number, label: string, targets: string[], disabled: boolean): TemplateResult {
    const shown = this.dragValues.get(key) ?? value;
    return html`<label class="dimmer"><ha-icon icon="mdi:brightness-6"></ha-icon>
      <input type="range" min="1" max="100" .value=${String(Math.max(shown, 1))} aria-label=${label} ?disabled=${disabled}
        aria-busy=${this.isPending(key) ? "true" : "false"}
        @input=${(event: Event) => this.setDrag(key, Number((event.target as HTMLInputElement).value))}
        @change=${(event: Event) => {
          const value = Number((event.target as HTMLInputElement).value);
          this.setDrag(key, value);
          void this.brightness(targets, value, key).finally(() => this.setDrag(key, undefined));
        }} />
      <output>${shown}%</output>
    </label>`;
  }

  private renderSwatches(ids: string[], prefix: string): TemplateResult {
    if (!ids.length) return html``;
    return html`<div class="swatches" role="group" aria-label=${`Couleurs prédéfinies pour ${prefix}`}>
      ${this.presets().map((preset) => html`<button class="swatch" type="button" style=${`--swatch-color:${preset.color}`}
        title=${`${preset.name} · ${prefix}`} aria-label=${`${preset.name} · ${prefix}`} ?disabled=${!ids.length}
        @click=${() => this.preset(ids, preset)}></button>`)}
    </div>`;
  }

  private renderGroup(group: LightsGroup, index: number): TemplateResult {
    const ids = this.available(group);
    const dimmableIds = this.dimmableIds(group);
    const colorIds = this.colorIds(group);
    const active = ids.filter((id) => isActive(entity(this.hass, id))).length;
    const unavailable = group.lights.length - ids.length;
    const scenes = this.scenes(group);
    // Façade : marche, arrêt et intensité. Couleurs, ambiances et lampes une à une sont dans la fenêtre du groupe.
    const showColors = this.config?.show_colors === true;
    return html`<section class="group">
      <button class="group-photo" type="button" style=${groupImageStyle(group, this.config?.background_image)}
        title=${`Réglages de ${group.name}`} aria-label=${`Réglages de ${group.name}`} aria-haspopup="dialog"
        @click=${() => this.openDialog(`group:${index}`)}><span class="photo-hint" aria-hidden="true"><ha-icon icon="mdi:tune-variant"></ha-icon></span></button>
      <div class="group-body">
        <div class="group-top">
          <span class="tile-icon"><ha-icon .icon=${group.icon || "mdi:lightbulb-group-outline"}></ha-icon></span>
          <span class="group-title"><strong>${group.name}</strong><small>${active}/${group.lights.length} allumée${group.lights.length > 1 ? "s" : ""}${unavailable ? ` · ${unavailable} indisponible${unavailable > 1 ? "s" : ""}` : ""}</small></span>
          <button class="icon-button" type="button" title=${`Détails de ${group.name}`} aria-label=${`Détails de ${group.name}`}
            aria-haspopup="dialog" @click=${() => this.openDialog(`group:${index}`)}><ha-icon icon="mdi:chevron-right"></ha-icon></button>
        </div>
        <div class="group-actions">
          <button class="control on" type="button" title=${`Allumer ${group.name}`} aria-label=${`Allumer ${group.name}`}
            ?disabled=${!ids.length} @click=${() => this.power(ids, true)}><ha-icon icon="mdi:lightbulb-group"></ha-icon></button>
          <button class="control" type="button" title=${`Éteindre ${group.name}`} aria-label=${`Éteindre ${group.name}`}
            ?disabled=${!ids.length} @click=${() => this.power(ids, false)}><ha-icon icon="mdi:lightbulb-group-off-outline"></ha-icon></button>
          ${scenes.length && showColors ? html`<button class="control" type="button" title=${`Ambiances de ${group.name}`} aria-label=${`Ambiances de ${group.name}`}
            aria-haspopup="dialog" @click=${() => this.openDialog(`scenes:${index}`)}><ha-icon icon="mdi:creation-outline"></ha-icon></button>` : nothing}
          <span class="spacer"></span>
          ${this.onOffOnly(group) || !showColors ? nothing : html`<input class="color-input" type="color" .value=${this.color(group)} title=${`Couleur de ${group.name}`}
            aria-label=${`Couleur de ${group.name}`} ?disabled=${!colorIds.length}
            @change=${(event: Event) => this.colorize(this.colorTargets(group), (event.target as HTMLInputElement).value)} />`}
        </div>
        ${this.onOffOnly(group) ? nothing : this.renderDimmer(`group:${index}`, this.average(group), `Intensité de ${group.name}`,
          brightnessTargets(this.hass, group.lights), !dimmableIds.length)}
        ${showColors ? this.renderSwatches(this.colorTargets(group), group.name) : nothing}
        ${group.show_lights ? html`<div class="inline-lights">${group.lights.map((id) => {
          const state = entity(this.hass, id);
          const on = isActive(state);
          const commandable = isCommandable(state);
          const label = this.label(id);
          return html`<div class="inline-light" ${holdMoreInfo(id)}><ha-icon .icon=${on ? "mdi:lightbulb-on" : "mdi:lightbulb-outline"}></ha-icon>
            <span class="label">${label}</span>${commandable ? nothing : html`<span class="unavailable">Indisponible</span>`}
            <button class="control" type="button" title=${`${on ? "Éteindre" : "Allumer"} ${label}`} aria-label=${`${on ? "Éteindre" : "Allumer"} ${label}`}
              ?disabled=${!commandable} @click=${() => this.power([id], !on)}><ha-icon .icon=${on ? "mdi:power" : "mdi:lightbulb-outline"}></ha-icon></button></div>`;
        })}</div>` : nothing}
      </div>
    </section>`;
  }

  private renderLight(id: string): TemplateResult {
    const state = entity(this.hass, id);
    const commandable = isCommandable(state);
    const on = isActive(state);
    const supportsColor = isLight(id) && lightSupportsColor(state);
    const label = this.label(id);
    return html`<div class="light-row" ${holdMoreInfo(id)}>
      <div class="light-head">
        <span class="tile-icon" style=${`--light-color:${on ? rgbToHex(lightRgbColor(state)) : "var(--auralis-muted)"}`}><ha-icon .icon=${on ? "mdi:lightbulb-on" : "mdi:lightbulb-outline"}></ha-icon></span>
        <span class="meta"><span class="name">${label}</span>${commandable ? nothing : html`<span class="unavailable">Indisponible</span>`}</span>
        <button class="control" type="button" title=${`Plus d’informations sur ${label}`} aria-label=${`Plus d’informations sur ${label}`}
          @click=${() => this.moreInfo(id)}><ha-icon icon="mdi:information-outline"></ha-icon></button>
        <button class="control ${on ? "on" : ""}" type="button" title=${`${on ? "Éteindre" : "Allumer"} ${label}`} aria-label=${`${on ? "Éteindre" : "Allumer"} ${label}`}
          ?disabled=${!commandable} @click=${() => this.power([id], !on)}><ha-icon .icon=${on ? "mdi:power" : "mdi:lightbulb-outline"}></ha-icon></button>
      </div>
      ${supportsBrightness(id, state) ? html`<div class="light-tools">
        ${this.renderDimmer(`light:${id}`, lightBrightness(state), `Intensité de ${label}`, [id], !commandable)}
        ${supportsColor ? html`<input class="color-input" type="color" .value=${rgbToHex(lightRgbColor(state))}
          title=${`Couleur de ${label}`} aria-label=${`Couleur de ${label}`} ?disabled=${!commandable}
          @change=${(event: Event) => this.colorize([id], (event.target as HTMLInputElement).value)} />` : nothing}
      </div>` : nothing}
      ${supportsColor ? this.renderSwatches(commandable ? [id] : [], label) : nothing}
    </div>`;
  }

  private renderScenes(group: LightsGroup): TemplateResult {
    return html`<div class="scene-grid">${this.scenes(group).map((scene) => {
      const busy = this.isPending(`scene:${scene.entity}`);
      return html`<div class="scene-item">
        <button class="control" type="button" title=${scene.label || scene.entity} aria-label=${`Activer ${scene.label || scene.entity}`}
          ?disabled=${busy} aria-busy=${busy ? "true" : "false"} @click=${() => this.activateScene(scene)}>
          <ha-icon .icon=${scene.icon || "mdi:creation-outline"}></ha-icon></button>
        <small>${scene.label || scene.entity}</small>
      </div>`;
    })}</div>`;
  }

  private renderGroupDialog(group: LightsGroup, index: number): TemplateResult {
    const ids = this.available(group);
    const dimmableIds = this.dimmableIds(group);
    const colorIds = this.colorIds(group);
    const active = ids.filter((id) => isActive(entity(this.hass, id))).length;
    return this.renderDialog(group.name, group.icon || "mdi:lightbulb-group-outline", html`<div class="dialog-body">
      <div class="dialog-overview"><div><span class="eyebrow">Éclairage</span><strong>${active} / ${group.lights.length} allumées</strong>
        <span class="muted">Appui long sur une lumière : fiche Home Assistant</span></div>
        ${this.onOffOnly(group) ? nothing : html`<div class="dialog-stat"><strong>${this.average(group)}%</strong><small>intensité</small></div>`}</div>
      <div class="dialog-section-title">Groupe</div>
      <div class="group-actions">
        <button class="control on" type="button" title="Tout allumer" aria-label="Tout allumer" ?disabled=${!ids.length} @click=${() => this.power(ids, true)}><ha-icon icon="mdi:lightbulb-group"></ha-icon></button>
        <button class="control" type="button" title="Tout éteindre" aria-label="Tout éteindre" ?disabled=${!ids.length} @click=${() => this.power(ids, false)}><ha-icon icon="mdi:lightbulb-group-off-outline"></ha-icon></button>
        ${this.onOffOnly(group) ? nothing : html`<input class="color-input" type="color" .value=${this.color(group)} title="Couleur du groupe" aria-label="Couleur du groupe"
          ?disabled=${!colorIds.length} @change=${(event: Event) => this.colorize(this.colorTargets(group), (event.target as HTMLInputElement).value)} />`}
      </div>
      ${this.onOffOnly(group) ? nothing : this.renderDimmer(`dialog:${index}`, this.average(group), "Intensité du groupe",
        brightnessTargets(this.hass, group.lights), !dimmableIds.length)}
      ${this.renderSwatches(this.colorTargets(group), group.name)}
      ${this.scenes(group).length ? html`<div class="section-caption">Ambiances</div>${this.renderScenes(group)}` : nothing}
      <div class="section-caption">Lumières</div>
      ${group.lights.map((id) => this.renderLight(id))}
    </div>`);
  }

  protected render(): TemplateResult {
    const groups = this.groups();
    const total = groups.reduce((sum, group) => sum + group.lights.length, 0);
    const active = groups.reduce((sum, group) => sum + group.lights.filter((id) => isActive(entity(this.hass, id))).length, 0);
    const unavailable = groups.reduce((sum, group) => sum + group.lights.filter((id) => !isCommandable(entity(this.hass, id))).length, 0);
    const [kind, indexText] = (this.dialog || "").split(":");
    const index = Number(indexText);
    const selected = groups[index];
    const summary = `${active} sur ${total} allumées · ${groups.length} groupe${groups.length > 1 ? "s" : ""}${unavailable ? ` · ${unavailable} indisponible${unavailable > 1 ? "s" : ""}` : ""}`;
    return html`<ha-card><div class="shell lights-shell">
      ${this.config?.show_header !== false ? html`<header class="header lights-header"><span class="tile-icon"><ha-icon .icon=${this.config?.icon || "mdi:lightbulb-group-outline"}></ha-icon></span>
        <div class="title-wrap"><h2>${this.config?.name || "Lumières"}</h2>
          <div class="status-line subtitle"><span class="dot ${unavailable ? "warning" : active ? "healthy" : ""}"></span>${summary}</div></div></header>` : nothing}
      <div class="groups">${groups.map((group, groupIndex) => this.renderGroup(group, groupIndex))}</div>
    </div></ha-card>
    ${selected && kind === "group" ? this.renderGroupDialog(selected, index) : nothing}
    ${selected && kind === "scenes" ? this.renderDialog(`Ambiances · ${selected.name}`, "mdi:creation-outline", html`<div class="dialog-body">${this.renderScenes(selected)}</div>`) : nothing}`;
  }

  public getCardSize(): number { return Math.max(4, this.groups().length * 4); }
  /** Pas de nombre de rangées fixe : Sections suit la hauteur réelle, même avec plusieurs groupes. */
  public getGridOptions(): Record<string, number> { return { columns: 6, min_columns: 3 }; }
}
