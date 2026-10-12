import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { SwitchesCardConfig, SwitchesGroupConfig } from "../types/config";
import { entity, friendlyName } from "../utils/entities";
import { fireMoreInfo } from "../utils/actions";

interface GroupStats {
  total: number;
  active: number;
  available: number;
  availableIds: string[];
}

export class AuralisSwitchesCard extends AuralisBaseCard<SwitchesCardConfig> {
  static styles = [AuralisBaseCard.styles, css`
    .switches-root { --switch-accent:var(--machine-accent,#ffc45f); }
    ha-card { background:var(--machine-base-background,#09111a); }
    .switches-shell { padding:16px; background:var(--machine-base-background,linear-gradient(145deg,#09111a,#0d1822 58%,#081018)); color:#f4f8fc; container-type:inline-size; }
    .switches-shell.show-grid::before { position:absolute; inset:0; background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px); background-size:28px 28px; content:""; pointer-events:none; }
    .switches-header { position:relative; display:flex; align-items:center; gap:11px; margin:0 0 18px; }
    .switches-header .tile-icon { width:43px; height:43px; flex:0 0 auto; background:color-mix(in srgb,var(--switch-accent) 20%,#142635); color:var(--switch-accent); }
    .switches-header h2 { font-size:21px; }
    .switches-summary { margin-top:4px; color:#a7b4c2; font-size:11px; }
    .switches-count { padding:10px 13px; border-radius:14px; background:#1b2b38; color:#f4f8fc; font-size:12px; font-weight:750; white-space:nowrap; }
    .switches-count::before { display:inline-block; width:7px; height:7px; margin-right:8px; border-radius:50%; background:var(--switch-accent); content:""; }
    .section-label { position:relative; margin:0 0 10px; color:#93a7ba; font-size:10px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
    .groups-grid { position:relative; display:grid; grid-template-columns:repeat(var(--group-columns,2),minmax(0,1fr)); gap:11px; }
    .group-tile { position:relative; display:flex; min-width:0; min-height:186px; overflow:hidden; flex-direction:column; isolation:isolate; border:1px solid rgba(169,190,214,.23); border-radius:18px; background:radial-gradient(circle at 25% 25%,color-mix(in srgb,var(--switch-accent) 20%,transparent),transparent 55%),#172430; color:#fff; }
    .group-tile:hover,.group-tile:focus-within { border-color:var(--switch-accent); }
    .group-tile::after { position:absolute; z-index:-1; inset:0; background:linear-gradient(180deg,rgba(4,10,17,.48),rgba(4,10,17,.1) 42%,rgba(4,10,17,.9)); content:""; pointer-events:none; }
    .group-photo { position:absolute; z-index:-2; inset:0; width:100%; height:100%; object-fit:cover; opacity:var(--machine-image-opacity,1); filter:brightness(var(--machine-image-brightness,.72)); pointer-events:none; }
    .group-open { display:flex; min-height:131px; flex:1; flex-direction:column; justify-content:space-between; padding:13px; border:0; background:transparent; color:inherit; text-align:left; cursor:pointer; }
    .group-top { display:flex; align-items:center; }
    .group-top .tile-icon { width:37px; height:37px; flex:0 0 auto; background:rgba(33,43,48,.86); color:var(--switch-accent); }
    .group-copy { display:block; min-width:0; }
    .group-name { min-width:0; overflow:hidden; font-size:20px; font-weight:780; text-overflow:ellipsis; white-space:nowrap; text-shadow:0 2px 5px #000; }
    .group-state { color:#e5edf3; font-size:12px; text-shadow:0 1px 4px #000; }
    .group-power { position:relative; display:flex; min-height:47px; align-items:center; justify-content:space-between; margin:0 12px 12px; padding:0 15px; overflow:hidden; border:1px solid rgba(216,229,238,.4); border-radius:13px; background:rgba(14,29,41,var(--machine-glass-alpha,.84)); color:#cbd8e3; cursor:pointer; }
    .group-power.on { border-color:color-mix(in srgb,var(--switch-accent) 72%,#fff); background:color-mix(in srgb,var(--switch-accent) 20%,rgba(14,29,41,.9)); }
    .group-power.mixed { border-color:color-mix(in srgb,var(--switch-accent) 52%,#fff); }
    .group-power ha-icon { position:relative; z-index:1; --mdc-icon-size:21px; }
    .group-power ha-icon:first-child { color:#d5dfe8; }
    .group-power ha-icon:last-child { color:var(--switch-accent); }
    .group-power.on ha-icon:last-child { color:#172430; }
    .group-power-thumb { position:absolute; top:5px; left:5px; width:35px; height:35px; border-radius:10px; background:#526777; box-shadow:0 2px 9px rgba(0,0,0,.35); transition:left .18s ease,background .18s ease; }
    .group-power.on .group-power-thumb { left:calc(100% - 40px); background:var(--switch-accent); }
    .group-power.mixed .group-power-thumb { left:calc(50% - 17px); background:color-mix(in srgb,var(--switch-accent) 58%,#526777); }
    .group-power:disabled,.switch-toggle:disabled { opacity:.45; cursor:not-allowed; }
    .group-open:focus-visible,.group-power:focus-visible,.switch-toggle:focus-visible,.switch-info:focus-visible { outline:2px solid var(--switch-accent); outline-offset:-2px; }
    .dialog-header .tile-icon { color:var(--switch-accent); }
    .switch-row { display:flex; min-width:0; align-items:center; gap:11px; padding:12px; border:1px solid var(--auralis-border); border-radius:15px; background:var(--auralis-layer); }
    .switch-row + .switch-row { margin-top:8px; }
    .switch-row .tile-icon { flex:0 0 auto; color:var(--auralis-muted); }
    .switch-row .tile-icon.on { background:color-mix(in srgb,var(--switch-accent) 18%,var(--auralis-layer)); color:var(--switch-accent); }
    .switch-meta { min-width:0; flex:1; }
    .switch-meta strong,.switch-meta small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .switch-meta strong { font-size:13px; }
    .switch-meta small { margin-top:4px; color:var(--auralis-muted); font-size:11px; }
    .switch-info { display:grid; width:33px; height:33px; flex:0 0 auto; place-items:center; border:0; border-radius:9px; background:transparent; color:var(--auralis-muted); cursor:pointer; }
    .switch-info ha-icon { --mdc-icon-size:19px; }
    .switch-toggle { position:relative; width:48px; height:28px; flex:0 0 auto; padding:0; border:0; border-radius:18px; background:#506273; cursor:pointer; }
    .switch-toggle::after { position:absolute; top:4px; left:4px; width:20px; height:20px; border-radius:50%; background:#e5edf4; content:""; transition:transform .18s ease; }
    .switch-toggle[aria-checked="true"] { background:var(--switch-accent); }
    .switch-toggle[aria-checked="true"]::after { transform:translateX(20px); background:#16212b; }
    @container (max-width:720px) { .groups-grid:not(.single-column) { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @container (max-width:430px) { .groups-grid { grid-template-columns:1fr; } .switches-count { display:none; } }
  `];

  private pending = new Set<string>();

  public setConfig(config: SwitchesCardConfig): void {
    const groups = config.groups ?? (config.switches?.length ? [{ name: config.name || "Prises", switches: config.switches }] : []);
    if (!groups.length || groups.some((group) => !group || typeof group.name !== "string" || !group.name.trim() || !Array.isArray(group.switches) || !group.switches.length || group.switches.some((id) => typeof id !== "string" || !/^switch\.[a-zA-Z0-9_]+$/.test(id)))) {
      throw new Error("Configurez un ou plusieurs interrupteurs switch.* dans au moins un groupe.");
    }
    if (config.group_columns !== undefined && (!Number.isInteger(config.group_columns) || config.group_columns < 1 || config.group_columns > 4)) {
      throw new Error("group_columns doit être un nombre entier entre 1 et 4.");
    }
    this.config = { ...config, theme: config.theme || "carbon", groups };
  }

  static getStubConfig(): Partial<SwitchesCardConfig> {
    return { name: "Prises", theme: "carbon", switches: ["switch.prise_salon"] };
  }

  static getConfigForm(): Record<string, unknown> {
    return { schema: [
      { name: "name", selector: { text: {} } },
      { name: "icon", selector: { icon: {} } },
      { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"], mode: "dropdown" } } },
      { name: "switches", selector: { entity: { multiple: true, filter: { domain: "switch" } } } },
      { name: "groups", selector: { object: {} } },
      { name: "group_columns", selector: { number: { min: 1, max: 4, step: 1, mode: "box" } } },
      { name: "show_header", selector: { boolean: {} } },
      { name: "show_group_label", selector: { boolean: {} } },
      { name: "entity_labels", selector: { object: {} } },
      { name: "background_image", selector: { text: {} } },
      { name: "background_position", selector: { text: {} } },
      { name: "accent_color", selector: { text: {} } },
      { name: "image_brightness", selector: { number: { min: 30, max: 100, step: 1, mode: "box" } } },
      { name: "image_opacity", selector: { number: { min: 0, max: 100, step: 1, mode: "box" } } },
      { name: "glass_opacity", selector: { number: { min: 0.45, max: 0.96, step: 0.01, mode: "box" } } },
      { name: "card_background", selector: { object: {} } },
      { name: "show_grid", selector: { boolean: {} } },
    ] };
  }

  private groups(): SwitchesGroupConfig[] { return this.config?.groups || []; }
  private ids(group: SwitchesGroupConfig): string[] { return [...new Set(group.switches)]; }
  private operational(id: string): boolean { const state = entity(this.hass, id)?.state; return state === "on" || state === "off"; }
  private available(id: string): boolean { return this.operational(id) && !this.pending.has(id); }
  private active(id: string): boolean { return entity(this.hass, id)?.state === "on"; }
  private groupStats(group: SwitchesGroupConfig): GroupStats {
    const ids = this.ids(group);
    return { total: ids.length, active: ids.filter((id) => this.active(id)).length,
      available: ids.filter((id) => this.operational(id)).length, availableIds: ids.filter((id) => this.available(id)) };
  }
  private label(id: string): string { return this.config?.entity_labels?.[id] || friendlyName(entity(this.hass, id), id); }

  private async power(ids: string[], on: boolean): Promise<void> {
    const target = [...new Set(ids)].filter((id) => this.available(id) && this.active(id) !== on);
    if (!this.hass || !target.length) return;
    target.forEach((id) => this.pending.add(id));
    this.requestUpdate();
    try { await this.hass.callService("switch", on ? "turn_on" : "turn_off", {}, { entity_id: target }); }
    finally { target.forEach((id) => this.pending.delete(id)); this.requestUpdate(); }
  }

  private renderGroup(group: SwitchesGroupConfig, index: number): TemplateResult {
    const stats = this.groupStats(group);
    const ids = this.ids(group);
    const availableIds = ids.filter((id) => this.operational(id));
    const allOn = availableIds.length > 0 && availableIds.every((id) => this.active(id));
    const anyOn = availableIds.some((id) => this.active(id));
    const mode = allOn ? "on" : anyOn ? "mixed" : "off";
    const busy = ids.some((id) => this.pending.has(id));
    const action = allOn ? "Éteindre" : "Allumer";
    const image = group.background_image?.trim() || this.config?.background_image?.trim();
    const position = group.background_position?.trim() || this.config?.background_position?.trim();
    const safePosition = position && /^[\w\s.%+-]+$/.test(position) ? position : "center";
    const status = stats.available === 0 ? "Indisponible" : stats.total === 1
      ? (stats.active ? "Allumé" : "Éteint") : `${stats.active} sur ${stats.total} allumés`;
    return html`<section class="group-tile">
      ${image ? html`<img class="group-photo" src=${image} alt="" style=${`object-position:${safePosition}`} loading="lazy" />` : nothing}
      <button class="group-open" type="button" aria-haspopup="dialog" aria-label=${`Afficher les interrupteurs du groupe ${group.name}`}
        @click=${() => this.openDialog(`group:${index}`)}>
        <span class="group-top"><span class="tile-icon"><ha-icon .icon=${group.icon || "mdi:power-socket-eu"}></ha-icon></span></span>
        <span class="group-copy"><span class="group-name">${group.name}</span><br/><span class="group-state">${status}</span></span>
      </button>
      <button class=${`group-power ${mode}`} type="button" title=${`${action} le groupe ${group.name}`}
        aria-label=${`${action} tous les interrupteurs du groupe ${group.name}`} aria-pressed=${mode === "mixed" ? "mixed" : allOn ? "true" : "false"}
        ?disabled=${!availableIds.length || busy} @click=${() => this.power(availableIds, !allOn)}>
        <ha-icon icon="mdi:power-off"></ha-icon><span class="group-power-thumb"></span><ha-icon icon="mdi:power-on"></ha-icon>
      </button>
    </section>`;
  }

  private renderSwitch(id: string): TemplateResult {
    const state = entity(this.hass, id);
    const on = this.active(id);
    const label = this.label(id);
    const status = this.pending.has(id) ? "Commande en cours…" : !this.available(id) ? "Indisponible" : on ? "Allumé" : "Éteint";
    return html`<div class="switch-row"><span class="tile-icon ${on ? "on" : ""}"><ha-icon .icon=${state?.attributes.icon || "mdi:power-socket-eu"}></ha-icon></span>
      <span class="switch-meta"><strong>${label}</strong><small>${status}</small></span>
      <button class="switch-info" type="button" aria-label=${`Plus d’informations sur ${label}`} title=${`Plus d’informations sur ${label}`}
        @click=${() => fireMoreInfo(this, id)}><ha-icon icon="mdi:information-outline"></ha-icon></button>
      <button class="switch-toggle" type="button" role="switch" aria-checked=${on ? "true" : "false"} aria-label=${`${on ? "Éteindre" : "Allumer"} ${label}`}
        ?disabled=${!this.available(id)} @click=${() => this.power([id], !on)}></button></div>`;
  }

  private renderGroupDialog(group: SwitchesGroupConfig): TemplateResult {
    const stats = this.groupStats(group);
    const ids = this.ids(group);
    return this.renderDialog(group.name, group.icon || "mdi:power-socket-eu", html`<div class="dialog-body">
      <div class="dialog-overview"><div><span class="eyebrow">État du groupe</span>
        <strong>${stats.active} interrupteur${stats.active === 1 ? "" : "s"} allumé${stats.active === 1 ? "" : "s"} sur ${stats.total}</strong>
        <span class="muted">Commandes directes pour les prises disponibles.</span></div>
        <div class="dialog-stat"><strong>${stats.available}/${stats.total}</strong><small>disponibles</small></div></div>
      <div class="dialog-section-title">Interrupteurs</div>
      ${ids.map((id) => this.renderSwitch(id))}
    </div>`);
  }

  protected render(): TemplateResult {
    if (!this.config || !this.hass) return html``;
    const groups = this.groups();
    const columns = Math.min(this.config.group_columns ?? 2, groups.length);
    const ids = [...new Set(groups.flatMap((group) => group.switches))];
    const active = ids.filter((id) => this.active(id)).length;
    const selectedIndex = this.dialog?.startsWith("group:") ? Number(this.dialog.slice(6)) : -1;
    const selected = Number.isInteger(selectedIndex) ? groups[selectedIndex] : undefined;
    return html`<div class="switches-root" style=${this.machineStyle("var(--auralis-active)")}><ha-card><div class="switches-shell ${this.machineGridClass()}">
      ${this.config.show_header !== false ? html`<header class="switches-header"><span class="tile-icon"><ha-icon .icon=${this.config.icon || "mdi:power-socket-eu"}></ha-icon></span>
        <div class="title-wrap"><h2>${this.config.name || "Prises & interrupteurs"}</h2><div class="switches-summary">${active} allumé${active === 1 ? "" : "s"} sur ${ids.length} · ${groups.length} groupe${groups.length === 1 ? "" : "s"}</div></div>
        <span class="switches-count">${active}/${ids.length} actifs</span></header>` : nothing}
      ${this.config.show_group_label !== false ? html`<p class="section-label">Groupes d’interrupteurs</p>` : nothing}
      <div class="groups-grid ${columns === 1 ? "single-column" : ""}" style=${`--group-columns:${columns}`}>
        ${groups.map((group, index) => this.renderGroup(group, index))}</div>
    </div></ha-card>${selected ? this.renderGroupDialog(selected) : nothing}</div>`;
  }

  public getCardSize(): number { const count = this.groups().length; const columns = Math.min(this.config?.group_columns ?? 2, count || 1); return 2 + Math.ceil(count / Math.min(columns, 2)) * 3; }
  public getGridOptions(): Record<string, number> { return { columns: 6, min_columns: 3 }; }
}
