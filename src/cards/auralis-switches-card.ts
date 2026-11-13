import { css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import { holdMoreInfo } from "./auralis-covers-card";
import type { SwitchesCardConfig, SwitchesGroupConfig } from "../types/config";
import type { HomeAssistant } from "../types/home-assistant";
import { entity, friendlyName, isCommandable } from "../utils/entities";
import { entitySelector, ICON, listSelector, TEXT } from "../utils/form";

interface GroupStats {
  total: number;
  active: number;
  available: number;
  availableIds: string[];
}

/** État attendu après une commande, affiché jusqu'à confirmation par Home Assistant. */
interface Expectation {
  on: boolean;
  until: number;
}

/** Durée maximale d'affichage d'un état attendu que Home Assistant ne confirme pas. */
export const CONFIRM_WINDOW = 5_000;
const SWITCH_ID = /^switch\.[a-z0-9_]+$/;

export class AuralisSwitchesCard extends AuralisBaseCard<SwitchesCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    expected: { state: true },
  };

  static styles = [AuralisBaseCard.styles, css`
    .switches-root { --switch-accent:var(--machine-accent,var(--auralis-active)); }
    :host([data-background]) ha-card { background:var(--auralis-card-background); }
    .switches-shell { position:relative; padding:16px; background:var(--auralis-card-background,var(--auralis-card)); color:var(--auralis-text); container-type:inline-size; }
    .switches-shell.show-grid::before { position:absolute; inset:0; background-image:linear-gradient(color-mix(in srgb,var(--auralis-text) 4%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--auralis-text) 4%,transparent) 1px,transparent 1px); background-size:28px 28px; content:""; pointer-events:none; }
    .switches-header { position:relative; }
    .switches-header .tile-icon { width:var(--auralis-target); height:var(--auralis-target); flex:0 0 auto; background:color-mix(in srgb,var(--switch-accent) 18%,var(--auralis-layer)); color:var(--switch-accent); }
    .switches-header .tile-icon ha-icon { --mdc-icon-size:24px; color:inherit; }
    .switches-count { padding:10px 13px; border-radius:14px; background:var(--auralis-layer); color:var(--auralis-text); font-size:var(--auralis-text-sm); font-weight:750; white-space:nowrap; }
    .switches-count::before { display:inline-block; width:7px; height:7px; margin-right:8px; border-radius:50%; background:var(--switch-accent); content:""; }
    .section-label { position:relative; margin:0 0 10px; color:var(--auralis-muted); font-size:var(--auralis-text-xs); font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
    .groups-grid { position:relative; display:grid; grid-template-columns:repeat(var(--group-columns,2),minmax(0,1fr)); gap:11px; }
    .group-tile { position:relative; display:flex; min-width:0; min-height:186px; overflow:hidden; flex-direction:column; isolation:isolate; border:1px solid var(--auralis-border); border-radius:18px; background:radial-gradient(circle at 25% 25%,color-mix(in srgb,var(--switch-accent) 18%,transparent),transparent 55%),var(--auralis-layer); color:var(--auralis-text); }
    .group-tile:hover,.group-tile:focus-within { border-color:var(--switch-accent); }
    /* Photo : voile sombre et texte clair pour rester lisible quel que soit le thème. */
    .group-tile.has-photo { border-color:rgba(169,190,214,.23); background:#172430; color:#fff; }
    .group-tile.has-photo::after { position:absolute; z-index:-1; inset:0; background:linear-gradient(180deg,rgba(4,10,17,.48),rgba(4,10,17,.1) 42%,rgba(4,10,17,.9)); content:""; pointer-events:none; }
    .group-photo { position:absolute; z-index:-2; inset:0; width:100%; height:100%; object-fit:cover; opacity:var(--machine-image-opacity,1); filter:brightness(var(--machine-image-brightness,.72)); pointer-events:none; }
    .group-open { display:flex; min-height:131px; flex:1; flex-direction:column; justify-content:space-between; padding:13px; border:0; background:transparent; color:inherit; text-align:left; cursor:pointer; }
    .group-top { display:flex; align-items:center; }
    .group-top .tile-icon { width:37px; height:37px; flex:0 0 auto; background:color-mix(in srgb,var(--switch-accent) 16%,var(--auralis-card)); color:var(--switch-accent); }
    .has-photo .group-top .tile-icon { background:rgba(33,43,48,.86); }
    .group-copy { display:block; min-width:0; }
    .group-name { min-width:0; overflow:hidden; font-size:var(--auralis-title-size); font-weight:780; text-overflow:ellipsis; white-space:nowrap; }
    .group-state { color:var(--auralis-muted); font-size:var(--auralis-text-sm); }
    .has-photo .group-name { text-shadow:0 2px 5px #000; }
    .has-photo .group-state { color:#e5edf3; text-shadow:0 1px 4px #000; }
    .group-power { position:relative; display:flex; min-height:47px; align-items:center; justify-content:space-between; margin:0 12px 12px; padding:0 15px; overflow:hidden; border:1px solid var(--auralis-border); border-radius:13px; background:var(--auralis-card); color:var(--auralis-muted); cursor:pointer; }
    .has-photo .group-power { border-color:rgba(216,229,238,.4); background:rgba(14,29,41,var(--machine-glass-alpha,.84)); color:#cbd8e3; }
    .group-power.on { border-color:color-mix(in srgb,var(--switch-accent) 72%,transparent); background:color-mix(in srgb,var(--switch-accent) 20%,var(--auralis-card)); }
    .has-photo .group-power.on { background:color-mix(in srgb,var(--switch-accent) 20%,rgba(14,29,41,.9)); }
    .group-power.mixed { border-color:color-mix(in srgb,var(--switch-accent) 52%,transparent); }
    .group-power ha-icon { position:relative; z-index:1; --mdc-icon-size:21px; }
    .group-power ha-icon:last-child { color:var(--switch-accent); }
    .group-power.on ha-icon:last-child { color:#172430; }
    .group-power-thumb { position:absolute; top:5px; left:5px; width:35px; height:35px; border-radius:10px; background:color-mix(in srgb,var(--auralis-muted) 55%,var(--auralis-layer)); box-shadow:0 2px 9px rgba(0,0,0,.25); transition:left .18s ease,background .18s ease; }
    .group-power.on .group-power-thumb { left:calc(100% - 40px); background:var(--switch-accent); }
    .group-power.mixed .group-power-thumb { left:calc(50% - 17px); background:color-mix(in srgb,var(--switch-accent) 58%,var(--auralis-muted)); }
    .group-power:disabled,.switch-toggle:disabled { opacity:.45; cursor:not-allowed; }
    .group-open:focus-visible,.group-power:focus-visible,.switch-toggle:focus-visible,.switch-info:focus-visible { outline:2px solid var(--switch-accent); outline-offset:-2px; }
    .dialog-header .tile-icon { color:var(--switch-accent); }
    .group-bar { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-bottom:14px; }
    .switch-row { display:flex; min-width:0; align-items:center; gap:11px; padding:12px; border:1px solid var(--auralis-border); border-radius:15px; background:var(--auralis-layer); -webkit-touch-callout:none; -webkit-user-select:none; user-select:none; }
    .switch-row + .switch-row { margin-top:8px; }
    .switch-row .tile-icon { flex:0 0 auto; color:var(--auralis-muted); }
    .switch-row .tile-icon.on { background:color-mix(in srgb,var(--switch-accent) 18%,var(--auralis-layer)); color:var(--switch-accent); }
    .switch-meta { min-width:0; flex:1; }
    .switch-meta strong,.switch-meta small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .switch-meta strong { font-size:var(--auralis-text-md); }
    .switch-meta small { margin-top:4px; color:var(--auralis-muted); font-size:var(--auralis-text-xs); }
    .switch-info { display:grid; width:var(--auralis-target); height:var(--auralis-target); flex:0 0 auto; place-items:center; border:0; border-radius:11px; background:transparent; color:var(--auralis-muted); cursor:pointer; }
    .switch-info ha-icon { --mdc-icon-size:20px; }
    /* Cible de 52 × 44 px, interrupteur dessiné au centre. */
    .switch-toggle { position:relative; width:52px; height:var(--auralis-target); flex:0 0 auto; padding:0; border:0; background:transparent; cursor:pointer; }
    .switch-toggle::before { position:absolute; top:8px; left:2px; width:48px; height:28px; border-radius:18px; background:color-mix(in srgb,var(--auralis-muted) 55%,var(--auralis-layer)); content:""; transition:background .18s ease; }
    .switch-toggle::after { position:absolute; top:12px; left:6px; width:20px; height:20px; border-radius:50%; background:#e5edf4; content:""; transition:transform .18s ease; }
    .switch-toggle[aria-checked="true"]::before { background:var(--switch-accent); }
    .switch-toggle[aria-checked="true"]::after { transform:translateX(20px); background:#16212b; }
    @container (max-width:720px) { .groups-grid:not(.single-column) { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    /* Même seuil que la carte Volets : une colonne sous 360 px. */
    @container (max-width:360px) { .groups-grid, .groups-grid:not(.single-column) { grid-template-columns:1fr; } .switches-count { display:none; } }
  `];

  /** États attendus après une commande, par interrupteur. */
  protected expected: ReadonlyMap<string, Expectation> = new Map();
  private expiryTimer?: number;

  public setConfig(config: SwitchesCardConfig): void {
    const groups = config.groups ?? (config.switches?.length ? [{ name: config.name || "Prises", switches: config.switches }] : []);
    if (!groups.length || groups.some((group) => !group || typeof group.name !== "string" || !group.name.trim() || !Array.isArray(group.switches) || !group.switches.length || group.switches.some((id) => typeof id !== "string" || !SWITCH_ID.test(id)))) {
      throw new Error("Configurez un ou plusieurs interrupteurs switch.* dans au moins un groupe.");
    }
    for (const [name, value] of [["group_columns", config.group_columns], ["columns", config.columns]] as const) {
      if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > 4)) {
        throw new Error(`${name} doit être un nombre entier entre 1 et 4.`);
      }
    }
    // `columns` est un alias de `group_columns`, comme sur la carte Volets.
    this.config = { ...config, theme: config.theme || "carbon", groups, group_columns: config.group_columns ?? config.columns };
  }

  static getStubConfig(hass?: HomeAssistant): Partial<SwitchesCardConfig> {
    const switches = Object.keys(hass?.states ?? {}).filter((id) => SWITCH_ID.test(id)).slice(0, 3);
    return { name: "Prises", theme: "carbon", switches: switches.length ? switches : ["switch.prise_salon"] };
  }

  static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      name: "Titre", icon: "Icône", theme: "Thème", switches: "Interrupteurs (un seul groupe)",
      groups: "Groupes d’interrupteurs", group_columns: "Colonnes de groupes",
      show_header: "Afficher l’en-tête", show_group_label: "Afficher le titre des groupes", entity_labels: "Noms personnalisés",
      background_image: "Image de fond des groupes", background_position: "Cadrage de l’image", accent_color: "Couleur d’accent",
      image_brightness: "Luminosité de l’image (%)", image_opacity: "Opacité de l’image (%)", glass_opacity: "Opacité des commandes sur photo",
      card_background: "Fond de la carte", show_grid: "Afficher la trame",
    };
    return { schema: [
      { name: "name", selector: { text: {} } },
      { name: "icon", selector: { icon: {} } },
      { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"], mode: "dropdown" } } },
      { name: "switches", selector: entitySelector("switch", { multiple: true }) },
      { name: "groups", selector: listSelector({
        name: { label: "Nom", required: true, selector: TEXT },
        switches: { label: "Interrupteurs", required: true, selector: entitySelector("switch", { multiple: true }) },
        icon: { label: "Icône", selector: ICON },
        background_image: { label: "Image de fond", selector: TEXT },
        background_position: { label: "Cadrage de l’image", selector: TEXT },
      }, { label: "name" }) },
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
    ], computeLabel: ({ name }: { name: string }) => labels[name] };
  }

  public disconnectedCallback(): void {
    clearTimeout(this.expiryTimer);
    super.disconnectedCallback();
  }

  /** Oublie les états attendus confirmés par Home Assistant ou expirés. */
  protected willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (!this.expected.size) return;
    const now = Date.now();
    const next = new Map([...this.expected].filter(([id, wanted]) => now < wanted.until && this.realState(id) !== (wanted.on ? "on" : "off")));
    if (next.size !== this.expected.size) this.expected = next;
  }

  private groups(): SwitchesGroupConfig[] { return this.config?.groups || []; }
  private ids(group: SwitchesGroupConfig): string[] { return [...new Set(group.switches)]; }
  private realState(id: string): string | undefined { return entity(this.hass, id)?.state; }
  private operational(id: string): boolean { return isCommandable(entity(this.hass, id)); }
  /** Commande envoyée, en attente de confirmation par Home Assistant. */
  private awaiting(id: string): boolean {
    const wanted = this.expected.get(id);
    return Boolean(wanted && Date.now() < wanted.until && this.realState(id) !== (wanted.on ? "on" : "off"));
  }
  /** Allumé, ou allumé d'après la dernière commande tant que Home Assistant ne l'a pas confirmé. */
  private active(id: string): boolean {
    if (this.awaiting(id) && this.operational(id)) return this.expected.get(id)!.on;
    return this.realState(id) === "on";
  }
  private groupStats(group: SwitchesGroupConfig): GroupStats {
    const ids = this.ids(group);
    const availableIds = ids.filter((id) => this.operational(id));
    return { total: ids.length, active: ids.filter((id) => this.active(id)).length, available: availableIds.length, availableIds };
  }
  private label(id: string): string { return this.config?.entity_labels?.[id] || friendlyName(entity(this.hass, id), id); }

  private expect(ids: string[], on: boolean | undefined): void {
    const next = new Map(this.expected);
    const until = Date.now() + CONFIRM_WINDOW;
    for (const id of ids) {
      if (on === undefined) next.delete(id);
      else next.set(id, { on, until });
    }
    this.expected = next;
    if (on !== undefined) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = setTimeout(() => this.requestUpdate(), CONFIRM_WINDOW + 50);
    }
  }

  /**
   * Allume ou éteint les interrupteurs qui en ont besoin. L'état demandé s'affiche aussitôt et
   * reste affiché jusqu'à la confirmation de Home Assistant (5 s au plus) : pas de clignotement.
   */
  private async power(ids: string[], on: boolean, key = `power:${[...new Set(ids)].sort().join(",")}`): Promise<boolean> {
    const target = [...new Set(ids)].filter((id) => this.operational(id) && this.active(id) !== on);
    if (!this.hass || !target.length || this.isPending(key)) return false;
    const hass = this.hass;
    this.expect(target, on);
    const ok = await this.runCommand(key, () => hass.callService("switch", on ? "turn_on" : "turn_off", {}, { entity_id: target }), {
      errorMessage: on ? "L’allumage a échoué." : "L’extinction a échoué.",
    });
    if (!ok) this.expect(target, undefined);
    return ok;
  }

  private renderGroup(group: SwitchesGroupConfig, index: number): TemplateResult {
    const stats = this.groupStats(group);
    const ids = this.ids(group);
    const availableIds = stats.availableIds;
    const allOn = availableIds.length > 0 && availableIds.every((id) => this.active(id));
    const anyOn = availableIds.some((id) => this.active(id));
    const mode = allOn ? "on" : anyOn ? "mixed" : "off";
    const key = `group:${index}`;
    const busy = this.isPending(key) || ids.some((id) => this.awaiting(id));
    const action = allOn ? "Éteindre" : "Allumer";
    const image = group.background_image?.trim() || this.config?.background_image?.trim();
    const position = group.background_position?.trim() || this.config?.background_position?.trim();
    const safePosition = position && /^[\w\s.%+-]+$/.test(position) ? position : "center";
    const status = stats.available === 0 ? "Indisponible" : stats.total === 1
      ? (stats.active ? "Allumé" : "Éteint") : `${stats.active} sur ${stats.total} allumés`;
    return html`<section class="group-tile ${image ? "has-photo" : ""}">
      ${image ? html`<img class="group-photo" src=${image} alt="" style=${`object-position:${safePosition}`} loading="lazy" />` : nothing}
      <button class="group-open" type="button" aria-haspopup="dialog" aria-label=${`Afficher les interrupteurs du groupe ${group.name}`}
        @click=${() => this.openDialog(`group:${index}`)}>
        <span class="group-top"><span class="tile-icon"><ha-icon .icon=${group.icon || "mdi:power-socket-eu"}></ha-icon></span></span>
        <span class="group-copy"><span class="group-name">${group.name}</span><br/><span class="group-state">${status}</span></span>
      </button>
      <button class=${`group-power ${mode}`} type="button" title=${`${action} le groupe ${group.name}`}
        aria-label=${`${action} tous les interrupteurs du groupe ${group.name}`} aria-pressed=${mode === "mixed" ? "mixed" : allOn ? "true" : "false"}
        aria-busy=${busy ? "true" : "false"} ?disabled=${!availableIds.length || this.isPending(key)} @click=${() => this.power(availableIds, !allOn, key)}>
        <ha-icon icon="mdi:power-off"></ha-icon><span class="group-power-thumb"></span><ha-icon icon="mdi:power-on"></ha-icon>
      </button>
    </section>`;
  }

  private renderSwitch(id: string): TemplateResult {
    const state = entity(this.hass, id);
    const on = this.active(id);
    const label = this.label(id);
    const key = `switch:${id}`;
    const status = !this.operational(id) ? "Indisponible" : this.awaiting(id) || this.isPending(key) ? "Commande en cours…" : on ? "Allumé" : "Éteint";
    return html`<div class="switch-row" ${holdMoreInfo(id)}><span class="tile-icon ${on ? "on" : ""}"><ha-icon .icon=${state?.attributes.icon || "mdi:power-socket-eu"}></ha-icon></span>
      <span class="switch-meta"><strong>${label}</strong><small>${status}</small></span>
      <button class="switch-info" type="button" aria-label=${`Plus d’informations sur ${label}`} title=${`Plus d’informations sur ${label}`}
        @click=${() => this.moreInfo(id)}><ha-icon icon="mdi:information-outline"></ha-icon></button>
      <button class="switch-toggle" type="button" role="switch" aria-checked=${on ? "true" : "false"} aria-label=${`${on ? "Éteindre" : "Allumer"} ${label}`}
        aria-busy=${this.isPending(key) ? "true" : "false"} ?disabled=${!this.operational(id) || this.isPending(key)} @click=${() => this.power([id], !on, key)}></button></div>`;
  }

  private renderGroupDialog(group: SwitchesGroupConfig, index: number): TemplateResult {
    const stats = this.groupStats(group);
    const ids = this.ids(group);
    const onKey = `dialog:${index}:on`;
    const offKey = `dialog:${index}:off`;
    return this.renderDialog(group.name, group.icon || "mdi:power-socket-eu", html`<div class="dialog-body">
      <div class="dialog-overview"><div><span class="eyebrow">État du groupe</span>
        <strong>${stats.active} interrupteur${stats.active === 1 ? "" : "s"} allumé${stats.active === 1 ? "" : "s"} sur ${stats.total}</strong>
        <span class="muted">Appui long sur un interrupteur : fiche Home Assistant.</span></div>
        <div class="dialog-stat"><strong>${stats.available}/${stats.total}</strong><small>disponibles</small></div></div>
      <div class="dialog-section-title">Commande groupée</div>
      <div class="group-bar">
        <button class="action primary" type="button" ?disabled=${!stats.availableIds.some((id) => !this.active(id)) || this.isPending(onKey)}
          aria-busy=${this.isPending(onKey) ? "true" : "false"} @click=${() => this.power(stats.availableIds, true, onKey)}><ha-icon icon="mdi:power-on"></ha-icon>Tout allumer</button>
        <button class="action" type="button" ?disabled=${!stats.availableIds.some((id) => this.active(id)) || this.isPending(offKey)}
          aria-busy=${this.isPending(offKey) ? "true" : "false"} @click=${() => this.power(stats.availableIds, false, offKey)}><ha-icon icon="mdi:power-off"></ha-icon>Tout éteindre</button>
      </div>
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
    const unavailable = ids.filter((id) => !this.operational(id)).length;
    const selectedIndex = this.dialog?.startsWith("group:") ? Number(this.dialog.slice(6)) : -1;
    const selected = Number.isInteger(selectedIndex) ? groups[selectedIndex] : undefined;
    const summary = `${active} allumé${active === 1 ? "" : "s"} sur ${ids.length} · ${groups.length} groupe${groups.length === 1 ? "" : "s"}${unavailable ? ` · ${unavailable} indisponible${unavailable === 1 ? "" : "s"}` : ""}`;
    return html`<div class="switches-root" style=${this.machineStyle("var(--auralis-active)")}><ha-card><div class="switches-shell ${this.machineGridClass()}">
      ${this.config.show_header !== false ? html`<header class="header switches-header"><span class="tile-icon"><ha-icon .icon=${this.config.icon || "mdi:power-socket-eu"}></ha-icon></span>
        <div class="title-wrap"><h2>${this.config.name || "Prises & interrupteurs"}</h2><div class="status-line subtitle"><span class="dot ${unavailable ? "warning" : active ? "healthy" : ""}"></span>${summary}</div></div>
        <span class="switches-count">${active}/${ids.length} actifs</span></header>` : nothing}
      ${this.config.show_group_label !== false ? html`<p class="section-label">Groupes d’interrupteurs</p>` : nothing}
      <div class="groups-grid ${columns === 1 ? "single-column" : ""}" style=${`--group-columns:${columns}`}>
        ${groups.map((group, index) => this.renderGroup(group, index))}</div>
    </div></ha-card>${selected ? this.renderGroupDialog(selected, selectedIndex) : nothing}</div>`;
  }

  public getCardSize(): number { const count = this.groups().length; const columns = Math.min(this.config?.group_columns ?? 2, count || 1); return 2 + Math.ceil(count / Math.min(columns, 2)) * 3; }
  public getGridOptions(): Record<string, number> { return { columns: 6, min_columns: 3 }; }
}
