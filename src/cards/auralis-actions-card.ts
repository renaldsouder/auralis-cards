import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { fireMoreInfo } from "../utils/actions";
import { domainOf, entity, friendlyName, isAvailable } from "../utils/entities";

export interface ActionItemConfig {
  name?: string;
  icon?: string;
  color?: string;
  /** Entité visée par l'action par défaut, et dont l'état est affiché. */
  entity?: string;
  /** Entité dont l'état est affiché à la place de celui de `entity` (ex. binary_sensor de présence réseau). */
  state_entity?: string;
  /** Service à appeler, au format domaine.service : remplace l'action par défaut de l'entité. */
  service?: string;
  data?: Record<string, unknown>;
  target?: Record<string, unknown>;
  /** Ouvre une vue du tableau de bord au lieu d'appeler un service. */
  navigation_path?: string;
  /** `true` ou le texte de la question à poser avant d'agir. */
  confirm?: boolean | string;
  /** Bouton de confirmation rouge, pour les actions qui coupent quelque chose. */
  danger?: boolean;
}

export interface ActionsCardConfig extends BaseCardConfig {
  actions: ActionItemConfig[];
  layout?: "tiles" | "compact";
  columns?: number;
  show_header?: boolean;
}

export type ResolvedAction =
  | { kind: "service"; domain: string; service: string; data: Record<string, unknown>; target?: Record<string, unknown> }
  | { kind: "navigate"; path: string }
  | { kind: "more-info"; entity: string };

type RunStatus = "pending" | "done" | "error";

const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/;
const SERVICE_ID = /^[a-z_]+\.[a-z0-9_]+$/;
const SAFE_COLOR = /^[#\w(),.%\s-]+$/;
const FEEDBACK_DELAY = 2_500;
const HOLD_DELAY = 550;

const DOMAIN_COLORS: Record<string, string> = {
  button: "#ff8a5b", input_button: "#ff8a5b", script: "#b79cff", scene: "#ffb454", automation: "#5bb8ff",
  switch: "#ffc45f", light: "#ffc45f", input_boolean: "#4fd1a1", fan: "#6fe0c8", cover: "#4fd1a1",
  lock: "#ff6b74", media_player: "#5b9dff", siren: "#ff6b74",
};
const DOMAIN_ICONS: Record<string, string> = {
  button: "mdi:gesture-tap-button", input_button: "mdi:gesture-tap-button", script: "mdi:script-text-play-outline",
  scene: "mdi:palette-outline", automation: "mdi:robot-outline", switch: "mdi:toggle-switch-outline",
  light: "mdi:lightbulb-outline", input_boolean: "mdi:toggle-switch-outline", fan: "mdi:fan", cover: "mdi:window-shutter",
  lock: "mdi:lock-outline", media_player: "mdi:play-circle-outline", siren: "mdi:alarm-light-outline",
};
const TOGGLE_DOMAINS = new Set(["switch", "light", "input_boolean", "fan", "cover", "media_player", "siren", "humidifier"]);
const ON_STATES = new Set(["on", "open", "opening", "unlocked", "playing", "home", "active", "running"]);

/** Action exécutée par un appui : service explicite, navigation, action par défaut du domaine, ou fiche de l'entité. */
export function resolveAction(item: ActionItemConfig, state?: HassEntity): ResolvedAction | undefined {
  const defaultTarget = item.target ?? (item.entity ? { entity_id: item.entity } : undefined);
  if (item.service) {
    const [domain, service] = item.service.split(".");
    return { kind: "service", domain, service, data: item.data ?? {}, target: defaultTarget };
  }
  if (item.navigation_path) return { kind: "navigate", path: item.navigation_path };
  if (!item.entity) return undefined;
  const domain = domainOf(item.entity);
  const call = (service: string, serviceDomain = domain): ResolvedAction =>
    ({ kind: "service", domain: serviceDomain, service, data: item.data ?? {}, target: defaultTarget });
  if (domain === "button" || domain === "input_button") return call("press");
  if (domain === "script" || domain === "scene") return call("turn_on");
  if (domain === "automation") return call("trigger");
  if (domain === "lock") return call(state?.state === "locked" ? "unlock" : "lock");
  if (TOGGLE_DOMAINS.has(domain)) return call("toggle");
  return { kind: "more-info", entity: item.entity };
}

/** Durée écoulée en français court : « à l’instant », « il y a 5 min », « hier »… */
export function relativeTime(time: number, now: number): string {
  const seconds = Math.round((time - now) / 1000);
  if (!Number.isFinite(seconds)) return "";
  if (Math.abs(seconds) < 45) return "à l’instant";
  const format = new Intl.RelativeTimeFormat("fr", { numeric: "auto", style: "short" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [["minute", 60], ["hour", 3_600], ["day", 86_400], ["month", 2_592_000], ["year", 31_536_000]];
  const limits = [3_600, 86_400, 2_592_000, 31_536_000, Number.POSITIVE_INFINITY];
  const index = limits.findIndex((limit) => Math.abs(seconds) < limit);
  const [unit, size] = units[index];
  return format.format(Math.round(seconds / size), unit);
}

function timestamp(value: unknown): number | undefined {
  const time = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? time : undefined;
}

/** Libellé d'état d'une tuile selon le domaine de l'entité. */
export function stateCaption(state: HassEntity | undefined, now: number, hass?: HomeAssistant): string {
  if (!state) return "";
  if (!isAvailable(state) && !["button", "input_button", "scene"].includes(domainOf(state.entity_id))) return "Indisponible";
  const domain = domainOf(state.entity_id);
  if (domain === "button" || domain === "input_button" || domain === "scene") {
    if (state.state === "unavailable") return "Indisponible";
    const last = timestamp(state.state);
    const verb = domain === "scene" ? "Activée" : "Utilisé";
    return last === undefined ? "Jamais utilisé" : `${verb} ${relativeTime(last, now)}`;
  }
  if (domain === "script") {
    if (state.state === "on") return "En cours";
    const last = timestamp(state.attributes.last_triggered);
    return last === undefined ? "Prêt" : `Lancé ${relativeTime(last, now)}`;
  }
  if (domain === "automation") {
    if (state.state === "off") return "Désactivée";
    const last = timestamp(state.attributes.last_triggered);
    return last === undefined ? "Active" : `Déclenchée ${relativeTime(last, now)}`;
  }
  const labels: Record<string, string> = {
    on: "Allumé", off: "Éteint", open: "Ouvert", closed: "Fermé", opening: "Ouverture…", closing: "Fermeture…",
    locked: "Verrouillé", unlocked: "Déverrouillé", playing: "Lecture", paused: "En pause", idle: "Inactif", home: "Présent", not_home: "Absent",
  };
  if (labels[state.state]) return labels[state.state];
  return hass?.formatEntityState ? hass.formatEntityState(state) : state.state;
}

/** Tuile allumée : appareil actif ou script en cours. Une automatisation activée n'est pas mise en avant. */
export function isOn(state?: HassEntity): boolean {
  if (!state || domainOf(state.entity_id) === "automation") return false;
  return ON_STATES.has(state.state);
}

export class AuralisActionsCard extends AuralisBaseCard<ActionsCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    status: { state: true },
    confirming: { state: true },
    now: { state: true },
  };

  static styles = [AuralisBaseCard.styles, css`
    .act-shell, .act-content { min-height:0; }
    .act-shell { padding:16px; }
    .act-shell.compact { padding:12px; }
    .act-header { display:flex; align-items:center; gap:11px; margin-bottom:14px; }
    .act-header .badge { display:grid; width:39px; height:39px; flex:0 0 auto; place-items:center; border:1px solid rgba(255,255,255,.2); border-radius:14px; background:rgba(12,19,27,.72); color:var(--machine-accent); }
    .act-header .badge ha-icon { --mdc-icon-size:22px; }
    .act-header h2 { overflow:hidden; font-size:19px; text-overflow:ellipsis; white-space:nowrap; }
    .act-header .machine-status { margin-top:4px; }
    .act-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; }
    .act-grid.fixed { grid-template-columns:repeat(var(--act-columns),minmax(0,1fr)); }
    .act { --tone:var(--item-tone,#79d6f2); position:relative; display:flex; min-width:0; min-height:74px; align-items:center; gap:11px; padding:12px; overflow:hidden; border:1px solid color-mix(in srgb,var(--tone) 26%,rgba(195,211,229,.14)); border-radius:18px; background:linear-gradient(150deg,color-mix(in srgb,var(--tone) 10%,transparent),transparent 65%),rgba(9,14,20,var(--machine-glass-alpha,.84)); color:#f4f8fc; cursor:pointer; text-align:start; backdrop-filter:blur(12px); touch-action:manipulation; user-select:none; -webkit-user-select:none; transition:border-color .15s ease, background .2s ease, transform .1s ease; }
    .act:hover { border-color:color-mix(in srgb,var(--tone) 70%,transparent); }
    .act:active { transform:scale(.98); }
    .act:focus-visible { outline:2px solid var(--tone); outline-offset:2px; }
    .act.on { border-color:color-mix(in srgb,var(--tone) 70%,transparent); background:linear-gradient(150deg,color-mix(in srgb,var(--tone) 30%,transparent),color-mix(in srgb,var(--tone) 8%,transparent) 70%),rgba(9,14,20,var(--machine-glass-alpha,.84)); }
    .act.done { --tone:#5bd69b; }
    .act.error { --tone:#ff6b74; }
    .act:disabled { cursor:not-allowed; opacity:.5; }
    .act-icon { position:relative; display:grid; width:42px; height:42px; flex:0 0 auto; place-items:center; border-radius:14px; background:color-mix(in srgb,var(--tone) 18%,rgba(12,19,27,.8)); color:var(--tone); }
    .act.on .act-icon { background:var(--tone); color:#111820; box-shadow:0 0 18px color-mix(in srgb,var(--tone) 55%,transparent); }
    .act-icon ha-icon { --mdc-icon-size:23px; }
    .act-icon .spinner { position:absolute; inset:3px; border:2px solid color-mix(in srgb,var(--tone) 25%,transparent); border-top-color:var(--tone); border-radius:12px; animation:spin .8s linear infinite; }
    .act-text { display:grid; min-width:0; gap:3px; }
    .act-name { display:-webkit-box; overflow:hidden; font-size:13.5px; font-weight:720; line-height:1.25; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow-wrap:anywhere; }
    .act-caption { overflow:hidden; color:#a7b4c2; font-size:11px; text-overflow:ellipsis; white-space:nowrap; }
    .act.on .act-caption, .act.done .act-caption, .act.error .act-caption { color:var(--tone); }
    .act-flag { margin-inline-end:4px; color:color-mix(in srgb,var(--tone) 70%,#a7b4c2); vertical-align:-2px; --mdc-icon-size:13px; }
    .act-row .act-name { display:block; white-space:nowrap; }
    .act-row { display:flex; flex-wrap:wrap; gap:8px; }
    .act-row .act { min-height:0; gap:8px; padding:6px 14px 6px 6px; border-radius:999px; }
    .act-row .act-icon { width:32px; height:32px; border-radius:50%; }
    .act-row .act-icon .spinner { border-radius:50%; }
    .act-row .act-icon ha-icon { --mdc-icon-size:18px; }
    .act-row .act-name { font-size:12.5px; }
    .confirm-text { margin:0; color:var(--auralis-text); font-size:14px; line-height:1.5; }
    .confirm-actions { grid-template-columns:1fr 1fr; margin-top:18px; }
    @keyframes spin { to { transform:rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .act-icon .spinner { animation-duration:2.4s; } .act { transition:none; } }
    @container (max-width:360px) {
      .act-grid, .act-grid.fixed { grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
      .act-grid .act { min-height:0; flex-direction:column; align-items:flex-start; gap:9px; padding:11px; }
      .act-grid .act-icon { width:36px; height:36px; border-radius:12px; }
    }
    @container (max-width:200px) { .act-grid, .act-grid.fixed { grid-template-columns:1fr; } }
  `];

  private status = new Map<number, RunStatus>();
  private confirming?: number;
  private now = Date.now();
  private timers = new Map<number, number>();
  private clock?: number;
  private holdTimer?: number;
  private held = false;

  static getStubConfig(hass?: HomeAssistant): Partial<ActionsCardConfig> {
    const ids = Object.keys(hass?.states ?? {}).filter((id) => /^(script|scene|button)\./.test(id)).slice(0, 4);
    return { theme: "carbon", actions: (ids.length ? ids : ["script.mon_script"]).map((id) => ({ entity: id })) };
  }

  static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      name: "Titre", icon: "Icône", theme: "Thème", actions: "Actions (entity, name, icon, color, confirm, service, data…)",
      layout: "Présentation", columns: "Colonnes (vide = automatique)", show_header: "Afficher l’en-tête",
      accent_color: "Couleur d’accent", card_background: "Fond de la carte",
    };
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "actions", required: true, selector: { object: {} } },
        { name: "layout", selector: { select: { options: [{ value: "tiles", label: "Tuiles" }, { value: "compact", label: "Pastilles" }] } } },
        { name: "columns", selector: { number: { min: 1, max: 6, step: 1, mode: "box" } } },
        { name: "show_header", selector: { boolean: {} } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        { name: "accent_color", selector: { text: {} } },
        { name: "card_background", selector: { object: {} } },
      ],
      computeLabel: ({ name }: { name: string }) => labels[name],
    };
  }

  public setConfig(config: ActionsCardConfig): void {
    const actions = Array.isArray(config?.actions) ? config.actions : [];
    const optional = (value: unknown, pattern: RegExp): boolean => value === undefined || value === null || value === "" || (typeof value === "string" && pattern.test(value));
    const invalid = actions.find((item) => !item || typeof item !== "object"
      || !(item.entity || item.service || item.navigation_path)
      || !optional(item.entity, ENTITY_ID) || !optional(item.state_entity, ENTITY_ID) || !optional(item.service, SERVICE_ID)
      || !optional(item.navigation_path, /^\/[^\s]*$/)
      || (item.data !== undefined && (typeof item.data !== "object" || Array.isArray(item.data)))
      || (item.target !== undefined && (typeof item.target !== "object" || Array.isArray(item.target))));
    if (!actions.length || invalid) {
      throw new Error("Configurez au moins une action avec entity (ex. script.reveil), service (domaine.service) ou navigation_path (/chemin).");
    }
    const columns = Number(config.columns);
    this.config = {
      ...config,
      theme: config.theme || "carbon",
      layout: config.layout === "compact" ? "compact" : "tiles",
      columns: config.columns !== undefined && Number.isFinite(columns) ? Math.round(Math.min(6, Math.max(1, columns))) : undefined,
      actions: actions.map((item) => ({ ...item, color: typeof item.color === "string" && SAFE_COLOR.test(item.color.trim()) ? item.color.trim() : undefined })),
    };
    this.status = new Map();
    this.confirming = undefined;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.now = Date.now();
    this.clock = window.setInterval(() => { this.now = Date.now(); }, 30_000);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this.clock);
    window.clearTimeout(this.holdTimer);
    for (const timer of this.timers.values()) window.clearTimeout(timer);
    this.timers.clear();
  }

  protected closeDialog(): void {
    super.closeDialog();
    this.confirming = undefined;
  }

  private label(item: ActionItemConfig): string {
    if (item.name?.trim()) return item.name.trim();
    if (item.entity) return friendlyName(entity(this.hass, item.entity), item.entity);
    return item.navigation_path ? "Ouvrir" : item.service ?? "Action";
  }

  private tone(item: ActionItemConfig): string {
    return item.color ?? (item.navigation_path && !item.entity ? "#79d6f2" : DOMAIN_COLORS[domainOf(item.entity ?? item.service)] ?? "#79d6f2");
  }

  private icon(item: ActionItemConfig): string {
    const state = entity(this.hass, item.state_entity || item.entity);
    const own = entity(this.hass, item.entity)?.attributes.icon;
    return item.icon || (typeof own === "string" ? own : undefined) || (typeof state?.attributes.icon === "string" ? state.attributes.icon : undefined)
      || (item.navigation_path && !item.entity ? "mdi:arrow-right-circle-outline" : DOMAIN_ICONS[domainOf(item.entity ?? item.service)] ?? "mdi:gesture-tap");
  }

  private setStatus(index: number, status: RunStatus | undefined): void {
    const next = new Map(this.status);
    if (status) next.set(index, status);
    else next.delete(index);
    this.status = next;
    window.clearTimeout(this.timers.get(index));
    this.timers.delete(index);
    if (status === "done" || status === "error") {
      this.timers.set(index, window.setTimeout(() => this.setStatus(index, undefined), FEEDBACK_DELAY));
    }
  }

  private press(index: number): void {
    if (this.held) {
      this.held = false;
      return;
    }
    const item = this.config?.actions[index];
    if (!item || this.status.get(index) === "pending") return;
    if (item.confirm) {
      this.confirming = index;
      this.openDialog("confirm");
      return;
    }
    void this.run(index);
  }

  private async run(index: number): Promise<void> {
    const item = this.config?.actions[index];
    if (!item || !this.hass) return;
    const action = resolveAction(item, entity(this.hass, item.entity));
    if (!action) return;
    if (action.kind === "more-info") {
      fireMoreInfo(this, action.entity);
      return;
    }
    if (action.kind === "navigate") {
      window.history.pushState(null, "", action.path);
      window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
      return;
    }
    this.setStatus(index, "pending");
    try {
      await this.hass.callService(action.domain, action.service, action.data, action.target);
      this.setStatus(index, "done");
    } catch (error) {
      this.setStatus(index, "error");
      console.warn("Auralis Actions : échec de l’action", action, error);
    }
  }

  private async confirm(): Promise<void> {
    const index = this.confirming;
    this.closeDialog();
    if (index !== undefined) await this.run(index);
  }

  private startHold(index: number): void {
    this.held = false;
    window.clearTimeout(this.holdTimer);
    const target = this.config?.actions[index];
    const id = target?.state_entity || target?.entity;
    if (!id) return;
    this.holdTimer = window.setTimeout(() => {
      this.held = true;
      fireMoreInfo(this, id);
    }, HOLD_DELAY);
  }

  private cancelHold(): void {
    window.clearTimeout(this.holdTimer);
  }

  private caption(item: ActionItemConfig, status?: RunStatus): string {
    if (status === "pending") return "En cours…";
    if (status === "done") return "Fait";
    if (status === "error") return "Échec";
    const state = entity(this.hass, item.state_entity || item.entity);
    if (state) return stateCaption(state, this.now, this.hass);
    if (item.navigation_path) return "Ouvrir la vue";
    return "Appuyer pour lancer";
  }

  private renderAction(item: ActionItemConfig, index: number): TemplateResult {
    const status = this.status.get(index);
    const own = entity(this.hass, item.entity);
    const shown = entity(this.hass, item.state_entity || item.entity);
    const unavailable = Boolean(item.entity) && (!own || own.state === "unavailable");
    const on = isOn(shown) && !status;
    const label = this.label(item);
    const caption = this.caption(item, status);
    const icon = status === "done" ? "mdi:check" : status === "error" ? "mdi:alert-outline" : this.icon(item);
    return html`<button type="button" class="act ${on ? "on" : ""} ${status === "done" || status === "error" ? status : ""}"
      style=${`--item-tone:${this.tone(item)}`} ?disabled=${unavailable} aria-busy=${status === "pending" ? "true" : "false"}
      aria-label=${`${label}${caption ? `, ${caption}` : ""}${item.confirm ? ", demande une confirmation" : ""}`}
      title=${this.config?.layout === "compact" && caption ? `${label} · ${caption}` : label}
      @click=${() => this.press(index)}
      @pointerdown=${() => this.startHold(index)} @pointerup=${this.cancelHold} @pointerleave=${this.cancelHold} @pointercancel=${this.cancelHold}
      @contextmenu=${(event: Event) => {
        const id = item.state_entity || item.entity;
        if (!id) return;
        event.preventDefault();
        this.cancelHold();
        fireMoreInfo(this, id);
      }}>
      <span class="act-icon"><ha-icon .icon=${icon}></ha-icon>${status === "pending" ? html`<span class="spinner"></span>` : nothing}</span>
      <span class="act-text"><span class="act-name">${label}</span>
        ${this.config?.layout === "compact" ? nothing : html`<span class="act-caption">${item.confirm && !status
          ? html`<ha-icon class="act-flag" icon="mdi:shield-check-outline" title="Demande une confirmation"></ha-icon>` : nothing}${caption}</span>`}</span>
    </button>`;
  }

  private renderConfirm(item: ActionItemConfig): TemplateResult {
    const label = this.label(item);
    const message = typeof item.confirm === "string" && item.confirm.trim() ? item.confirm.trim() : `Lancer « ${label} » ?`;
    return this.renderDialog(label, this.icon(item), html`<div class="dialog-body">
      <p class="confirm-text">${message}</p>
      <div class="actions confirm-actions">
        <button class="action" type="button" @click=${() => this.closeDialog()}>Annuler</button>
        <button class="action ${item.danger ? "danger" : "primary"}" type="button" @click=${() => this.confirm()}>Confirmer</button>
      </div>
    </div>`);
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this.config;
    if (!config) return nothing;
    const compact = config.layout === "compact";
    const showHeader = config.show_header ?? Boolean(config.name);
    const running = [...this.status.values()].filter((status) => status === "pending").length;
    const active = config.actions.filter((item) => isOn(entity(this.hass, item.state_entity || item.entity))).length;
    const summary = running ? `${running} en cours` : active ? `${active} actif${active > 1 ? "s" : ""} sur ${config.actions.length}` : `${config.actions.length} action${config.actions.length > 1 ? "s" : ""}`;
    const confirming = this.dialog === "confirm" && this.confirming !== undefined ? config.actions[this.confirming] : undefined;
    return html`<ha-card><div class="machine-shell act-shell ${compact ? "compact" : ""} ${this.machineGridClass()}" style=${this.machineStyle("#79d6f2")}>
      <div class="machine-content act-content">
        ${showHeader ? html`<header class="act-header">
          <span class="badge"><ha-icon .icon=${config.icon || "mdi:gesture-tap-button"}></ha-icon></span>
          <div class="title-wrap"><h2>${config.name || "Actions"}</h2>
            <div class="machine-status"><span class="dot ${running ? "warning" : "healthy"}"></span>${summary}</div></div>
        </header>` : nothing}
        <div class=${compact ? "act-row" : `act-grid ${config.columns ? "fixed" : ""}`} style=${config.columns && !compact ? `--act-columns:${config.columns}` : ""}>
          ${config.actions.map((item, index) => this.renderAction(item, index))}
        </div>
      </div>
    </div></ha-card>
    ${confirming ? this.renderConfirm(confirming) : nothing}`;
  }

  public getCardSize(): number {
    const count = this.config?.actions.length ?? 1;
    return this.config?.layout === "compact" ? 1 : 1 + Math.ceil(count / 2);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, min_columns: 3 };
  }
}
