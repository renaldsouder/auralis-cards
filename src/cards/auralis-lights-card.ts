import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { BaseCardConfig, RoomSceneConfig } from "../types/config";
import { entity, friendlyName, isActive, isAvailable, lightBrightness, lightRgbColor, lightSupportsColor, rgbToHex } from "../utils/entities";
import { activateEntity, fireMoreInfo, setLightColor } from "../utils/actions";

interface ColorPreset { name: string; color: string }
interface LightsGroup {
  name: string;
  lights: string[];
  icon?: string;
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
}

const DEFAULT_COLORS: ColorPreset[] = [
  { name: "Blanc chaud", color: "#ffd4a3" },
  { name: "Blanc neutre", color: "#ffffff" },
  { name: "Ambre", color: "#ff9d42" },
  { name: "Rose", color: "#ff7eb8" },
  { name: "Violet", color: "#9d79ff" },
  { name: "Bleu", color: "#5caaff" },
  { name: "Vert", color: "#67d7a2" },
];

const validHex = (value: string): boolean => /^#[0-9a-f]{6}$/i.test(value);

export class AuralisLightsCard extends AuralisBaseCard<LightsCardConfig> {
  static styles = [AuralisBaseCard.styles, css`
    .lights-shell { padding: 18px; container-type: inline-size; }
    .lights-header { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
    .lights-header .tile-icon { width:44px; height:44px; color:var(--auralis-active); background:color-mix(in srgb,var(--auralis-active) 16%,var(--auralis-layer)); }
    .lights-header .tile-icon ha-icon { --mdc-icon-size:25px; }
    .lights-summary { margin-top:4px; color:var(--auralis-muted); font-size:12px; }
    .groups { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr)); gap:12px; }
    .group { overflow:hidden; border:1px solid var(--auralis-border); border-radius:20px; background:var(--auralis-layer); }
    .group-photo { position:relative; height:90px; overflow:hidden; background:radial-gradient(circle at 22% 35%,color-mix(in srgb,var(--auralis-active) 32%,transparent),transparent 45%),linear-gradient(125deg,#1a2633,#0c1520); background-size:cover; background-position:center; }
    .group-photo::after { position:absolute; inset:0; background:linear-gradient(0deg,rgba(7,13,20,.28),transparent 70%); content:""; pointer-events:none; }
    .group-body { padding:14px; }
    .group-top { display:flex; align-items:center; gap:9px; }
    .group-top .tile-icon { flex:0 0 auto; color:var(--auralis-active); background:color-mix(in srgb,var(--auralis-active) 16%,var(--auralis-layer)); }
    .group-title { min-width:0; flex:1; }
    .group-title strong, .group-title small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .group-title small { margin-top:3px; color:var(--auralis-muted); font-size:11px; }
    .group-top .icon-button { flex:0 0 auto; }
    .group-actions { display:flex; gap:7px; margin-top:13px; }
    .control { display:grid; width:42px; height:42px; flex:0 0 auto; place-items:center; border:1px solid var(--auralis-border); border-radius:12px; background:var(--auralis-card); color:var(--auralis-text); cursor:pointer; }
    .control ha-icon { --mdc-icon-size:21px; }
    .control.on { color:var(--auralis-active); }
    .control[disabled], .swatch[disabled], input[disabled] { opacity:.38; cursor:not-allowed; }
    .group-actions .spacer { flex:1; }
    .dimmer { display:flex; align-items:center; gap:10px; margin-top:14px; }
    .dimmer ha-icon { --mdc-icon-size:18px; color:var(--auralis-active); }
    .dimmer input { min-width:0; flex:1; accent-color:var(--auralis-active); cursor:pointer; }
    .dimmer output { min-width:35px; color:var(--auralis-muted); font-size:12px; text-align:right; }
    .color-input { width:42px; height:42px; padding:3px; border:1px solid var(--auralis-border); border-radius:12px; background:var(--auralis-card); cursor:pointer; }
    .color-input::-webkit-color-swatch-wrapper { padding:0; }
    .color-input::-webkit-color-swatch { border:0; border-radius:8px; }
    .color-input::-moz-color-swatch { border:0; border-radius:8px; }
    .swatches { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }
    .swatch { width:28px; height:28px; padding:3px; border:1px solid var(--auralis-border); border-radius:50%; background:var(--auralis-card); cursor:pointer; }
    .swatch::after { display:block; width:100%; height:100%; border-radius:50%; background:var(--swatch-color); content:""; }
    .inline-lights { display:grid; gap:3px; padding-top:10px; margin-top:12px; border-top:1px solid var(--auralis-border); }
    .inline-light { display:flex; min-height:34px; align-items:center; gap:8px; font-size:12px; }
    .inline-light span { min-width:0; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .inline-light .control { width:32px; height:32px; border-radius:9px; }
    .inline-light .control ha-icon { --mdc-icon-size:18px; }
    .light-row { padding:14px; border:1px solid var(--auralis-border); border-radius:16px; background:var(--auralis-layer); }
    .light-row + .light-row { margin-top:9px; }
    .light-head { display:flex; align-items:center; gap:10px; }
    .light-head .tile-icon { color:var(--auralis-active); }
    .light-head .name { min-width:0; flex:1; overflow:hidden; font-size:13px; font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
    .light-head .control { width:38px; height:38px; }
    .light-row .dimmer { margin-top:10px; }
    .light-row .swatches { margin-top:10px; }
    .scene-grid { display:flex; flex-wrap:wrap; gap:9px; margin-top:12px; }
    .scene-item { display:grid; width:56px; gap:4px; justify-items:center; }
    .scene-item .control { width:46px; height:46px; color:var(--auralis-active); }
    .scene-item small { width:70px; overflow:hidden; color:var(--auralis-muted); font-size:10px; text-align:center; text-overflow:ellipsis; white-space:nowrap; }
    .section-caption { margin:17px 0 9px; color:var(--auralis-muted); font-size:11px; font-weight:750; letter-spacing:.08em; text-transform:uppercase; }
    @container (max-width:330px) { .lights-shell { padding:13px; } .group-body { padding:12px; } }
  `];

  public setConfig(config: LightsCardConfig): void {
    const groups = config.groups ?? (config.lights?.length ? [{ name: config.name || "Lumières", lights: config.lights }] : []);
    if (!groups.length || groups.some((group) => !group.name || !Array.isArray(group.lights) || !group.lights.length || group.lights.some((id) => !id.startsWith("light.")))) {
      throw new Error("Configurez au moins un groupe avec des entités light.*.");
    }
    if (config.preset_colors?.some((preset) => !validHex(preset.color))) throw new Error("Les couleurs prédéfinies doivent être au format #RRGGBB.");
    this.config = { ...config, theme: config.theme || "carbon", groups };
  }

  static getStubConfig(): Partial<LightsCardConfig> {
    return { name: "Lumières", theme: "carbon", lights: [] };
  }

  static getConfigForm(): Record<string, unknown> {
    return { schema: [
      { name: "name", selector: { text: {} } },
      { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"], mode: "dropdown" } } },
      { name: "lights", selector: { entity: { multiple: true, filter: { domain: "light" } } } },
      { name: "groups", selector: { object: {} } },
      { name: "scenes", selector: { object: {} } },
      { name: "preset_colors", selector: { object: {} } },
      { name: "entity_labels", selector: { object: {} } },
    ] };
  }

  private groups(): LightsGroup[] { return this.config?.groups || []; }
  private available(group: LightsGroup): string[] { return group.lights.filter((id) => isAvailable(entity(this.hass, id))); }
  private colorIds(group: LightsGroup): string[] { return this.available(group).filter((id) => lightSupportsColor(entity(this.hass, id))); }
  private supportsBrightness(id: string): boolean {
    const state = entity(this.hass, id);
    const modes = state?.attributes.supported_color_modes;
    return typeof state?.attributes.brightness === "number"
      || (Array.isArray(modes) && modes.some((mode) => mode !== "onoff"));
  }
  private dimmableIds(group: LightsGroup): string[] { return this.available(group).filter((id) => this.supportsBrightness(id)); }
  private presets(): ColorPreset[] { return this.config?.preset_colors ?? DEFAULT_COLORS; }
  private scenes(group: LightsGroup): RoomSceneConfig[] { return group.scenes ?? this.config?.scenes ?? []; }
  private label(id: string): string { return this.config?.entity_labels?.[id] || friendlyName(entity(this.hass, id), id); }
  private average(group: LightsGroup): number {
    const values = group.lights.map((id) => entity(this.hass, id)).filter(isActive).map(lightBrightness);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  }
  private color(group: LightsGroup): string {
    const states = this.colorIds(group).map((id) => entity(this.hass, id));
    return rgbToHex(lightRgbColor(states.find((state) => isActive(state) && lightRgbColor(state)) ?? states[0]));
  }
  private imageStyle(group: LightsGroup): string {
    const image = group.image?.trim();
    if (!image || !/^(https:\/\/|\/local\/|\/hacsfiles\/)/.test(image) || /["'\\;{}]/.test(image)) return "";
    return `background-image:linear-gradient(0deg,rgba(7,13,20,.3),rgba(7,13,20,.05)),url("${image}")`;
  }

  private async power(ids: string[], on: boolean): Promise<void> {
    if (!this.hass || !ids.length) return;
    await this.hass.callService("light", on ? "turn_on" : "turn_off", {}, { entity_id: ids });
  }
  private async brightness(ids: string[], percentage: number): Promise<void> {
    if (!this.hass || !ids.length) return;
    await this.hass.callService("light", "turn_on", { brightness_pct: Math.round(percentage) }, { entity_id: ids });
  }
  private async colorize(ids: string[], color: string): Promise<void> {
    if (this.hass && ids.length && validHex(color)) await setLightColor(this.hass, ids, color);
  }

  private renderSwatches(ids: string[], prefix: string): TemplateResult {
    if (!ids.length) return html``;
    return html`<div class="swatches" aria-label=${`Couleurs prédéfinies pour ${prefix}`}>
      ${this.presets().map((preset) => html`<button class="swatch" type="button" style=${`--swatch-color:${preset.color}`}
        title=${`${preset.name} · ${prefix}`} aria-label=${`${preset.name} · ${prefix}`} ?disabled=${!ids.length}
        @click=${() => this.colorize(ids, preset.color)}></button>`)}
    </div>`;
  }

  private renderGroup(group: LightsGroup, index: number): TemplateResult {
    const ids = this.available(group);
    const dimmableIds = this.dimmableIds(group);
    const colorIds = this.colorIds(group);
    const active = ids.filter((id) => isActive(entity(this.hass, id))).length;
    const average = this.average(group);
    const scenes = this.scenes(group);
    return html`<section class="group">
      <div class="group-photo" style=${this.imageStyle(group)}></div>
      <div class="group-body">
        <div class="group-top">
          <span class="tile-icon"><ha-icon .icon=${group.icon || "mdi:lightbulb-group-outline"}></ha-icon></span>
          <span class="group-title"><strong>${group.name}</strong><small>${active}/${group.lights.length} allumée${group.lights.length > 1 ? "s" : ""}</small></span>
          <button class="icon-button" type="button" title=${`Détails de ${group.name}`} aria-label=${`Détails de ${group.name}`}
            aria-haspopup="dialog" @click=${() => this.openDialog(`group:${index}`)}><ha-icon icon="mdi:chevron-right"></ha-icon></button>
        </div>
        <div class="group-actions">
          <button class="control on" type="button" title=${`Allumer ${group.name}`} aria-label=${`Allumer ${group.name}`}
            ?disabled=${!ids.length} @click=${() => this.power(ids, true)}><ha-icon icon="mdi:lightbulb-group"></ha-icon></button>
          <button class="control" type="button" title=${`Éteindre ${group.name}`} aria-label=${`Éteindre ${group.name}`}
            ?disabled=${!ids.length} @click=${() => this.power(ids, false)}><ha-icon icon="mdi:lightbulb-group-off-outline"></ha-icon></button>
          ${scenes.length ? html`<button class="control" type="button" title=${`Ambiances de ${group.name}`} aria-label=${`Ambiances de ${group.name}`}
            aria-haspopup="dialog" @click=${() => this.openDialog(`scenes:${index}`)}><ha-icon icon="mdi:creation-outline"></ha-icon></button>` : nothing}
          <span class="spacer"></span>
          <input class="color-input" type="color" .value=${this.color(group)} title=${`Couleur de ${group.name}`}
            aria-label=${`Couleur de ${group.name}`} ?disabled=${!colorIds.length}
            @change=${(event: Event) => this.colorize(colorIds, (event.target as HTMLInputElement).value)} />
        </div>
        <label class="dimmer"><ha-icon icon="mdi:brightness-6"></ha-icon>
          <input type="range" min="1" max="100" .value=${String(Math.max(average, 1))}
            aria-label=${`Intensité de ${group.name}`} ?disabled=${!dimmableIds.length}
            @change=${(event: Event) => this.brightness(dimmableIds, Number((event.target as HTMLInputElement).value))} />
          <output>${average}%</output>
        </label>
        ${this.renderSwatches(colorIds, group.name)}
        ${group.show_lights ? html`<div class="inline-lights">${group.lights.map((id) => {
          const state = entity(this.hass, id);
          const on = isActive(state);
          return html`<div class="inline-light"><ha-icon .icon=${on ? "mdi:lightbulb-on" : "mdi:lightbulb-outline"}></ha-icon><span>${this.label(id)}</span>
            <button class="control" type="button" title=${`${on ? "Éteindre" : "Allumer"} ${this.label(id)}`} aria-label=${`${on ? "Éteindre" : "Allumer"} ${this.label(id)}`}
              ?disabled=${!isAvailable(state)} @click=${() => this.power([id], !on)}><ha-icon .icon=${on ? "mdi:power" : "mdi:lightbulb-outline"}></ha-icon></button></div>`;
        })}</div>` : nothing}
      </div>
    </section>`;
  }

  private renderLight(id: string): TemplateResult {
    const state = entity(this.hass, id);
    const available = isAvailable(state);
    const on = isActive(state);
    const supportsColor = lightSupportsColor(state);
    const brightness = lightBrightness(state);
    const label = this.label(id);
    return html`<div class="light-row">
      <div class="light-head">
        <span class="tile-icon" style=${`color:${on ? rgbToHex(lightRgbColor(state)) : "var(--auralis-muted)"}`}><ha-icon .icon=${on ? "mdi:lightbulb-on" : "mdi:lightbulb-outline"}></ha-icon></span>
        <span class="name">${label}</span>
        <button class="control" type="button" title=${`Plus d’informations sur ${label}`} aria-label=${`Plus d’informations sur ${label}`}
          @click=${() => fireMoreInfo(this, id)}><ha-icon icon="mdi:information-outline"></ha-icon></button>
        <button class="control ${on ? "on" : ""}" type="button" title=${`${on ? "Éteindre" : "Allumer"} ${label}`} aria-label=${`${on ? "Éteindre" : "Allumer"} ${label}`}
          ?disabled=${!available} @click=${() => this.power([id], !on)}><ha-icon .icon=${on ? "mdi:power" : "mdi:lightbulb-outline"}></ha-icon></button>
      </div>
      <label class="dimmer"><ha-icon icon="mdi:brightness-6"></ha-icon>
        <input type="range" min="1" max="100" .value=${String(Math.max(brightness, 1))} aria-label=${`Intensité de ${label}`}
          ?disabled=${!available || !this.supportsBrightness(id)} @change=${(event: Event) => this.brightness([id], Number((event.target as HTMLInputElement).value))} />
        <output>${brightness}%</output>
        ${supportsColor ? html`<input class="color-input" type="color" .value=${rgbToHex(lightRgbColor(state))}
          title=${`Couleur de ${label}`} aria-label=${`Couleur de ${label}`} ?disabled=${!available}
          @change=${(event: Event) => this.colorize([id], (event.target as HTMLInputElement).value)} />` : nothing}
      </label>
      ${supportsColor ? this.renderSwatches(available ? [id] : [], label) : nothing}
    </div>`;
  }

  private renderScenes(group: LightsGroup): TemplateResult {
    return html`<div class="scene-grid">${this.scenes(group).map((scene) => html`<div class="scene-item">
      <button class="control" type="button" title=${scene.label || scene.entity} aria-label=${`Activer ${scene.label || scene.entity}`}
        @click=${async () => { if (this.hass) await activateEntity(this.hass, scene.entity); this.closeDialog(); }}>
        <ha-icon .icon=${scene.icon || "mdi:creation-outline"}></ha-icon></button>
      <small>${scene.label || scene.entity}</small>
    </div>`)}</div>`;
  }

  private renderGroupDialog(group: LightsGroup): TemplateResult {
    const ids = this.available(group);
    const dimmableIds = this.dimmableIds(group);
    const colorIds = this.colorIds(group);
    const active = ids.filter((id) => isActive(entity(this.hass, id))).length;
    return this.renderDialog(group.name, group.icon || "mdi:lightbulb-group-outline", html`<div class="dialog-body">
      <div class="dialog-overview"><div><span class="eyebrow">Éclairage</span><strong>${active} / ${group.lights.length} allumées</strong></div>
        <div class="dialog-stat"><strong>${this.average(group)}%</strong><small>intensité</small></div></div>
      <div class="dialog-section-title">Groupe</div>
      <div class="group-actions">
        <button class="control on" type="button" title="Tout allumer" aria-label="Tout allumer" ?disabled=${!ids.length} @click=${() => this.power(ids, true)}><ha-icon icon="mdi:lightbulb-group"></ha-icon></button>
        <button class="control" type="button" title="Tout éteindre" aria-label="Tout éteindre" ?disabled=${!ids.length} @click=${() => this.power(ids, false)}><ha-icon icon="mdi:lightbulb-group-off-outline"></ha-icon></button>
        <input class="color-input" type="color" .value=${this.color(group)} title="Couleur du groupe" aria-label="Couleur du groupe"
          ?disabled=${!colorIds.length} @change=${(event: Event) => this.colorize(colorIds, (event.target as HTMLInputElement).value)} />
      </div>
      <label class="dimmer"><ha-icon icon="mdi:brightness-6"></ha-icon><input type="range" min="1" max="100"
        .value=${String(Math.max(this.average(group), 1))} aria-label="Intensité du groupe" ?disabled=${!dimmableIds.length}
        @change=${(event: Event) => this.brightness(dimmableIds, Number((event.target as HTMLInputElement).value))} /><output>${this.average(group)}%</output></label>
      ${this.renderSwatches(colorIds, group.name)}
      ${this.scenes(group).length ? html`<div class="section-caption">Ambiances</div>${this.renderScenes(group)}` : nothing}
      <div class="section-caption">Lumières</div>
      ${group.lights.map((id) => this.renderLight(id))}
    </div>`);
  }

  protected render(): TemplateResult {
    const groups = this.groups();
    const total = groups.reduce((sum, group) => sum + group.lights.length, 0);
    const active = groups.reduce((sum, group) => sum + group.lights.filter((id) => isActive(entity(this.hass, id))).length, 0);
    const [kind, indexText] = (this.dialog || "").split(":");
    const selected = groups[Number(indexText)];
    return html`<ha-card><div class="shell lights-shell">
      <header class="lights-header"><span class="tile-icon"><ha-icon .icon=${this.config?.icon || "mdi:lightbulb-group-outline"}></ha-icon></span>
        <div class="title-wrap"><h2>${this.config?.name || "Lumières"}</h2><div class="lights-summary">${active} sur ${total} allumées · ${groups.length} groupe${groups.length > 1 ? "s" : ""}</div></div></header>
      <div class="groups">${groups.map((group, index) => this.renderGroup(group, index))}</div>
    </div></ha-card>
    ${selected && kind === "group" ? this.renderGroupDialog(selected) : nothing}
    ${selected && kind === "scenes" ? this.renderDialog(`Ambiances · ${selected.name}`, "mdi:creation-outline", html`<div class="dialog-body">${this.renderScenes(selected)}</div>`) : nothing}`;
  }

  public getCardSize(): number { return Math.max(4, this.groups().length * 4); }
  public getGridOptions(): Record<string, number> { return { rows: 7, min_rows: 4, columns: 6, min_columns: 3 }; }
}
