import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard, configuredAccent, configuredBackground, type ConfirmState } from "./auralis-base-card";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { domainOf, entity, friendlyName, isAvailable } from "../utils/entities";
import { relativeTime } from "../utils/format";
import { isInternalPath, navigate } from "../utils/navigation";
import { optionalMatch, safeColor } from "../utils/validate";
import { BOOLEAN, ENTITY, ICON, listSelector, TEXT, YAML, type FormListField } from "../utils/form";

export { relativeTime } from "../utils/format";

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

/** Champs d'une action dans l'éditeur visuel (`data` et `target` restent en YAML). */
export const ACTION_ITEM_FIELDS: Record<string, FormListField> = {
  name: { label: "Nom", selector: TEXT },
  entity: { label: "Entité visée", selector: ENTITY },
  icon: { label: "Icône", selector: ICON },
  color: { label: "Couleur (#RRGGBB)", selector: TEXT },
  state_entity: { label: "Entité dont l’état est affiché", selector: ENTITY },
  service: { label: "Service (domaine.service)", selector: TEXT },
  data: { label: "Données du service (YAML)", selector: YAML },
  target: { label: "Cible du service (YAML)", selector: YAML },
  navigation_path: { label: "Vue à ouvrir (/chemin)", selector: TEXT },
  confirm: { label: "Demander confirmation (question personnalisée en YAML)", selector: BOOLEAN },
  danger: { label: "Bouton de confirmation rouge", selector: BOOLEAN },
};

export type ResolvedAction =
  | { kind: "service"; domain: string; service: string; data: Record<string, unknown>; target?: Record<string, unknown> }
  | { kind: "navigate"; path: string }
  | { kind: "more-info"; entity: string };

export type RunStatus = "pending" | "done" | "error";

const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/;
const SERVICE_ID = /^[a-z_]+\.[a-z0-9_]+$/;
const FEEDBACK_DELAY = 2_500;
const HOLD_DELAY = 550;
const DEFAULT_TONE = "#79d6f2";

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
/** États « allumés » d'une action, partagés avec les commandes de la carte Caméras. */
export const ON_STATES: ReadonlySet<string> = new Set(["on", "open", "opening", "unlocked", "playing", "home", "active", "running"]);

/** Entrée d'action valide : une cible (entité, service ou vue) et des options bien formées. */
export function isValidActionItem(item: ActionItemConfig | null | undefined): boolean {
  return Boolean(item) && typeof item === "object"
    && Boolean(item!.entity || item!.service || item!.navigation_path)
    && optionalMatch(item!.entity, ENTITY_ID) && optionalMatch(item!.state_entity, ENTITY_ID) && optionalMatch(item!.service, SERVICE_ID)
    && (item!.navigation_path === undefined || item!.navigation_path === "" || isInternalPath(item!.navigation_path))
    && (item!.data === undefined || (typeof item!.data === "object" && item!.data !== null && !Array.isArray(item!.data)))
    && (item!.target === undefined || (typeof item!.target === "object" && item!.target !== null && !Array.isArray(item!.target)));
}

/** Entrée nettoyée : couleur acceptée seulement si elle est sûre à injecter dans un style. */
export function normalizeActionItem(item: ActionItemConfig): ActionItemConfig {
  return { ...item, color: safeColor(item.color) };
}

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

/** Nom affiché d'une action : le sien, celui de l'entité, ou une description de ce qu'elle fait. */
export function actionLabel(item: ActionItemConfig, hass?: HomeAssistant): string {
  if (item.name?.trim()) return item.name.trim();
  if (item.entity) return friendlyName(entity(hass, item.entity), item.entity);
  return item.navigation_path ? "Ouvrir" : item.service ?? "Action";
}

/** Icône d'une action : la sienne, celle de l'entité, puis celle du domaine. */
export function actionIcon(item: ActionItemConfig, hass?: HomeAssistant): string {
  const state = entity(hass, item.state_entity || item.entity);
  const own = entity(hass, item.entity)?.attributes.icon;
  return item.icon || (typeof own === "string" ? own : undefined) || (typeof state?.attributes.icon === "string" ? state.attributes.icon : undefined)
    || (item.navigation_path && !item.entity ? "mdi:arrow-right-circle-outline" : DOMAIN_ICONS[domainOf(item.entity ?? item.service)] ?? "mdi:gesture-tap");
}

/** Couleur d'une action : la sienne, sinon `accent` (accent_color de la carte), sinon celle du domaine. */
export function actionTone(item: ActionItemConfig, accent?: string): string {
  return item.color ?? accent ?? (item.navigation_path && !item.entity ? DEFAULT_TONE : DOMAIN_COLORS[domainOf(item.entity ?? item.service)] ?? DEFAULT_TONE);
}

/** Entité de l'action absente de Home Assistant, ou indisponible : l'appui est refusé. */
export function actionUnavailable(item: ActionItemConfig, hass?: HomeAssistant): boolean {
  const own = entity(hass, item.entity);
  return Boolean(item.entity) && (!own || own.state === "unavailable");
}

/**
 * Confirmation d'une action : question personnalisée ou « Lancer « … » ? ». Le bouton n'est
 * rouge qu'avec `danger: true` ; sinon il reste neutre.
 */
export function actionConfirmation(item: ActionItemConfig, label: string, action: () => Promise<unknown> | void): ConfirmState {
  return {
    title: label,
    message: typeof item.confirm === "string" && item.confirm.trim() ? item.confirm.trim() : `Lancer « ${label} » ?`,
    confirmLabel: "Confirmer",
    danger: item.danger === true,
    action,
  };
}

/** Ce dont le lanceur d'actions a besoin de la carte qui l'utilise. */
export interface ActionHost {
  hass?: HomeAssistant;
  moreInfo(entityId: string): void;
  navigate(path: string): unknown;
  isPending(key: string): boolean;
  runCommand(key: string, action: () => Promise<unknown>, options: { errorMessage?: string }): Promise<boolean>;
}

/**
 * Lanceur commun aux cartes Actions et Caméras : appelle le service (avec état « en cours »
 * et message d'erreur visible), ouvre la vue ou la fiche. Retourne le résultat d'un service.
 */
export async function runActionItem(host: ActionHost, key: string, item: ActionItemConfig, label: string): Promise<"done" | "error" | undefined> {
  const hass = host.hass;
  if (!hass || host.isPending(key)) return undefined;
  const action = resolveAction(item, entity(hass, item.entity));
  if (!action) return undefined;
  if (action.kind === "more-info") {
    host.moreInfo(action.entity);
    return undefined;
  }
  if (action.kind === "navigate") {
    await host.navigate(action.path);
    return undefined;
  }
  const ok = await host.runCommand(key, () => hass.callService(action.domain, action.service, action.data, action.target), {
    errorMessage: `« ${label} » a échoué.`,
  });
  return ok ? "done" : "error";
}

/** Retour « Fait » / « Échec » affiché quelques secondes sur un bouton d'action. */
export class StatusFlash {
  private status = new Map<string, "done" | "error">();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly onChange: (status: ReadonlyMap<string, "done" | "error">) => void, private readonly duration = FEEDBACK_DELAY) {}

  get(key: string): "done" | "error" | undefined {
    return this.status.get(key);
  }

  set(key: string, status: "done" | "error" | undefined): void {
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
    if (status) {
      this.status.set(key, status);
      this.timers.set(key, setTimeout(() => this.set(key, undefined), this.duration));
    } else {
      this.status.delete(key);
    }
    this.onChange(new Map(this.status));
  }

  clear(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    if (!this.status.size) return;
    this.status.clear();
    this.onChange(new Map());
  }
}

/** Appui long : ouvre la fiche de l'entité ; le clic qui termine l'appui est ignoré. */
export class LongPress {
  private timer?: ReturnType<typeof setTimeout>;
  private fired = false;

  constructor(private readonly delay = HOLD_DELAY) {}

  start(onHold: () => void): void {
    this.fired = false;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.fired = true;
      onHold();
    }, this.delay);
  }

  cancel(): void {
    clearTimeout(this.timer);
  }

  /** Vrai une seule fois si le clic qui arrive termine un appui long. */
  consumeClick(): boolean {
    const fired = this.fired;
    this.fired = false;
    return fired;
  }
}

/**
 * En-tête commun des cartes Actions, Caméras et Multimédia, posé sur les classes partagées
 * `.header`, `.title-wrap`, `h2` et `.status-line`. Les cartes sombres (image, vidéo, pochette)
 * redéfinissent `--header-badge-bg`, `--header-badge-border` et `--header-muted`.
 */
export const cardHeaderStyles = css`
  .header { gap:11px; margin-bottom:14px; }
  .header .badge { display:grid; width:40px; height:40px; flex:0 0 auto; place-items:center; border:1px solid var(--header-badge-border, var(--auralis-border)); border-radius:14px; background:var(--header-badge-bg, var(--auralis-layer)); color:color-mix(in oklab,var(--machine-accent, var(--auralis-info)),#000 var(--auralis-shade)); }
  .header .badge ha-icon { --mdc-icon-size:22px; color:inherit; }
  .header h2 { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .header .status-line { margin-top:4px; color:var(--header-muted, var(--auralis-muted)); font-size:var(--auralis-text-xs); }
`;

export class AuralisActionsCard extends AuralisBaseCard<ActionsCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    status: { state: true },
    now: { state: true },
  };

  static styles = [AuralisBaseCard.styles, cardHeaderStyles, css`
    .machine-shell.act-shell { min-height:0; padding:16px; background:var(--act-background, var(--auralis-card)); color:var(--auralis-text); }
    .act-shell:not(.has-image)::before { display:none; }
    .act-shell.compact { padding:12px; }
    .act-content { min-height:0; }
    .act-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; }
    .act-grid.fixed { grid-template-columns:repeat(var(--act-columns),minmax(0,1fr)); }
    .act { --tone:var(--item-tone,var(--auralis-info)); position:relative; display:flex; min-width:0; min-height:74px; align-items:center; gap:11px; padding:12px; overflow:hidden; border:1px solid color-mix(in srgb,var(--tone) 26%,var(--auralis-border)); border-radius:18px; background:linear-gradient(150deg,color-mix(in srgb,var(--tone) 10%,transparent),transparent 65%),color-mix(in srgb,var(--auralis-layer) calc(var(--machine-glass-alpha,.84) * 100%),transparent); color:var(--auralis-text); cursor:pointer; text-align:start; backdrop-filter:blur(12px); touch-action:manipulation; user-select:none; -webkit-user-select:none; transition:border-color .15s ease, background .2s ease, transform .1s ease; }
    .act:hover { border-color:color-mix(in srgb,var(--tone) 70%,transparent); }
    .act:active { transform:scale(.98); }
    .act:focus-visible { outline:2px solid var(--tone); outline-offset:2px; }
    .act.on { border-color:color-mix(in srgb,var(--tone) 70%,transparent); background:linear-gradient(150deg,color-mix(in srgb,var(--tone) 30%,transparent),color-mix(in srgb,var(--tone) 8%,transparent) 70%),color-mix(in srgb,var(--auralis-layer) calc(var(--machine-glass-alpha,.84) * 100%),transparent); }
    .act.done { --tone:var(--auralis-healthy); }
    .act.error { --tone:var(--auralis-danger); }
    .act[aria-disabled="true"] { cursor:not-allowed; opacity:.5; }
    .act[aria-disabled="true"]:active { transform:none; }
    .act-icon { position:relative; display:grid; width:42px; height:42px; flex:0 0 auto; place-items:center; border-radius:14px; background:color-mix(in srgb,var(--tone) 18%,var(--auralis-layer)); color:color-mix(in oklab,var(--tone),#000 var(--auralis-shade)); }
    .act.on .act-icon { background:var(--tone); color:var(--act-on-ink,#111820); box-shadow:0 0 18px color-mix(in srgb,var(--tone) 55%,transparent); }
    .act-icon ha-icon { --mdc-icon-size:23px; }
    .act-icon .spinner { position:absolute; inset:3px; border:2px solid color-mix(in srgb,var(--tone) 25%,transparent); border-top-color:var(--tone); border-radius:12px; animation:spin .8s linear infinite; }
    .act-text { display:grid; min-width:0; gap:3px; }
    .act-name { display:-webkit-box; overflow:hidden; font-size:var(--auralis-text-md); font-weight:720; line-height:1.25; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow-wrap:anywhere; }
    .act-caption { overflow:hidden; color:var(--auralis-muted); font-size:var(--auralis-text-xs); text-overflow:ellipsis; white-space:nowrap; }
    .act.on .act-caption, .act.done .act-caption, .act.error .act-caption { color:color-mix(in oklab,var(--tone),#000 var(--auralis-shade)); }
    .act-flag { margin-inline-end:4px; color:color-mix(in oklab,color-mix(in srgb,var(--tone) 70%,var(--auralis-muted)),#000 var(--auralis-shade)); vertical-align:-2px; --mdc-icon-size:13px; }
    .act-row .act-name { display:block; white-space:nowrap; }
    .act-row { display:flex; flex-wrap:wrap; gap:8px; }
    .act-row .act { min-height:var(--auralis-target); gap:8px; padding:6px 14px 6px 6px; border-radius:999px; }
    .act-row .act-icon { width:32px; height:32px; border-radius:50%; }
    .act-row .act-icon .spinner { border-radius:50%; }
    .act-row .act-icon ha-icon { --mdc-icon-size:18px; }
    .act-row .act-name { font-size:var(--auralis-text-sm); }
    @keyframes spin { to { transform:rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .act-icon .spinner { animation-duration:2.4s; } .act { transition:none; } }
    @container (max-width:360px) {
      .act-grid, .act-grid.fixed { grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
      .act-grid .act { min-height:0; flex-direction:column; align-items:flex-start; gap:9px; padding:11px; }
      .act-grid .act-icon { width:36px; height:36px; border-radius:12px; }
    }
    @container (max-width:200px) { .act-grid, .act-grid.fixed { grid-template-columns:1fr; } }
  `];

  /** Retours « Fait » / « Échec », par indice d'action. */
  private status: ReadonlyMap<string, "done" | "error"> = new Map();
  private now = Date.now();
  private clock?: number;
  private readonly flash = new StatusFlash((status) => { this.status = status; });
  private readonly hold = new LongPress();

  static getStubConfig(hass?: HomeAssistant): Partial<ActionsCardConfig> {
    const ids = Object.keys(hass?.states ?? {}).filter((id) => /^(script|scene|button)\./.test(id)).slice(0, 4);
    return { theme: "carbon", actions: (ids.length ? ids : ["script.mon_script"]).map((id) => ({ entity: id })) };
  }

  static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      name: "Titre", icon: "Icône", theme: "Thème", actions: "Actions",
      layout: "Présentation", columns: "Colonnes (vide = automatique)", show_header: "Afficher l’en-tête (par défaut si un titre est saisi)",
      accent_color: "Couleur d’accent (couleur des tuiles sans color)", card_background: "Fond de la carte",
    };
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "actions", required: true, selector: listSelector(ACTION_ITEM_FIELDS, { label: "name", description: "entity" }) },
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
    if (!actions.length || actions.some((item) => !isValidActionItem(item))) {
      throw new Error("Configurez au moins une action avec entity (ex. script.reveil), service (domaine.service) ou navigation_path (/chemin).");
    }
    const columns = Number(config.columns);
    this.config = {
      ...config,
      theme: config.theme || "carbon",
      layout: config.layout === "compact" ? "compact" : "tiles",
      columns: config.columns !== undefined && Number.isFinite(columns) ? Math.round(Math.min(6, Math.max(1, columns))) : undefined,
      actions: actions.map(normalizeActionItem),
    };
    // Les retours et l'appui long en cours visaient l'ancienne liste.
    this.flash.clear();
    this.hold.cancel();
    this.confirmState = null;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.now = Date.now();
    window.clearInterval(this.clock);
    this.clock = window.setInterval(() => { this.now = Date.now(); }, 30_000);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this.clock);
    this.hold.cancel();
    this.flash.clear();
  }

  /** Accès de la carte pour le lanceur d'actions commun. */
  private actionHost(): ActionHost {
    return {
      hass: this.hass,
      moreInfo: (id) => this.moreInfo(id),
      navigate: (path) => navigate(path),
      isPending: (key) => this.isPending(key),
      runCommand: (key, action, options) => this.runCommand(key, action, options),
    };
  }

  private press(index: number): void {
    if (this.hold.consumeClick()) return;
    const item = this.config?.actions[index];
    if (!item || actionUnavailable(item, this.hass) || this.isPending(`action:${index}`)) return;
    if (item.confirm) {
      this.askConfirmation(actionConfirmation(item, actionLabel(item, this.hass), () => this.run(index)));
      return;
    }
    void this.run(index);
  }

  private async run(index: number): Promise<void> {
    const item = this.config?.actions[index];
    if (!item) return;
    const result = await runActionItem(this.actionHost(), `action:${index}`, item, actionLabel(item, this.hass));
    if (result) this.flash.set(String(index), result);
  }

  private startHold(item: ActionItemConfig): void {
    const id = item.state_entity || item.entity;
    if (!id) return;
    this.hold.start(() => this.moreInfo(id));
  }

  private caption(item: ActionItemConfig, status?: RunStatus): string {
    if (status === "pending") return "En cours…";
    if (status === "done") return "Fait";
    if (status === "error") return "Échec";
    if (item.entity && !entity(this.hass, item.entity)) return "Entité introuvable";
    const state = entity(this.hass, item.state_entity || item.entity);
    if (state) return stateCaption(state, this.now, this.hass);
    if (item.navigation_path) return "Ouvrir la vue";
    return "Appuyer pour lancer";
  }

  private renderAction(item: ActionItemConfig, index: number): TemplateResult {
    const status: RunStatus | undefined = this.isPending(`action:${index}`) ? "pending" : this.status.get(String(index));
    const shown = entity(this.hass, item.state_entity || item.entity);
    const unavailable = actionUnavailable(item, this.hass);
    const on = isOn(shown) && !status;
    const label = actionLabel(item, this.hass);
    const caption = this.caption(item, status);
    const icon = status === "done" ? "mdi:check" : status === "error" ? "mdi:alert-outline" : actionIcon(item, this.hass);
    // Une tuile indisponible reste sensible à l'appui long et au clic droit (fiche de l'entité).
    return html`<button type="button" class="act ${on ? "on" : ""} ${status === "done" || status === "error" ? status : ""}"
      style=${`--item-tone:${actionTone(item, configuredAccent(this.config))}`} aria-disabled=${unavailable ? "true" : "false"}
      aria-busy=${status === "pending" ? "true" : "false"}
      aria-label=${`${label}${caption ? `, ${caption}` : ""}${item.confirm ? ", demande une confirmation" : ""}`}
      title=${this.config?.layout === "compact" && caption ? `${label} · ${caption}` : label}
      @click=${() => this.press(index)}
      @pointerdown=${() => this.startHold(item)} @pointerup=${() => this.hold.cancel()} @pointerleave=${() => this.hold.cancel()} @pointercancel=${() => this.hold.cancel()}
      @contextmenu=${(event: Event) => {
        const id = item.state_entity || item.entity;
        if (!id) return;
        event.preventDefault();
        this.hold.cancel();
        this.moreInfo(id);
      }}>
      <span class="act-icon"><ha-icon .icon=${icon}></ha-icon>${status === "pending" ? html`<span class="spinner"></span>` : nothing}</span>
      <span class="act-text"><span class="act-name">${label}</span>
        ${this.config?.layout === "compact" ? nothing : html`<span class="act-caption">${item.confirm && !status
          ? html`<ha-icon class="act-flag" icon="mdi:shield-check-outline" title="Demande une confirmation"></ha-icon>` : nothing}${caption}</span>`}</span>
    </button>`;
  }

  /** Fond de la carte : celui configuré, l'image de fond, sinon la couleur du thème Auralis. */
  private shellStyle(): string {
    const config = this.config!;
    const background = configuredBackground(config);
    const custom = background ? background : config.background_image ? "var(--machine-base-background)" : undefined;
    return `${this.machineStyle(DEFAULT_TONE)}${custom ? `;--act-background:${custom}` : ""}`;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this.config;
    if (!config) return nothing;
    const compact = config.layout === "compact";
    const showHeader = config.show_header ?? Boolean(config.name);
    const running = config.actions.filter((_, index) => this.isPending(`action:${index}`)).length;
    const active = config.actions.filter((item) => isOn(entity(this.hass, item.state_entity || item.entity))).length;
    const summary = running ? `${running} en cours` : active ? `${active} actif${active > 1 ? "s" : ""} sur ${config.actions.length}` : `${config.actions.length} action${config.actions.length > 1 ? "s" : ""}`;
    return html`<ha-card><div class="machine-shell act-shell ${compact ? "compact" : ""} ${config.background_image ? "has-image" : ""} ${this.machineGridClass()}" style=${this.shellStyle()}>
      <div class="machine-content act-content">
        ${showHeader ? html`<header class="header">
          <span class="badge"><ha-icon .icon=${config.icon || "mdi:gesture-tap-button"}></ha-icon></span>
          <div class="title-wrap"><h2>${config.name || "Actions"}</h2>
            <div class="status-line"><span class="dot ${running ? "warning" : "healthy"}"></span>${summary}</div></div>
        </header>` : nothing}
        <div class=${compact ? "act-row" : `act-grid ${config.columns ? "fixed" : ""}`} style=${config.columns && !compact ? `--act-columns:${config.columns}` : ""}>
          ${config.actions.map((item, index) => this.renderAction(item, index))}
        </div>
      </div>
    </div></ha-card>
    ${this.renderStandaloneConfirmation()}`;
  }

  public getCardSize(): number {
    const count = this.config?.actions.length ?? 1;
    return this.config?.layout === "compact" ? 1 : 1 + Math.ceil(count / 2);
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, min_columns: 3 };
  }
}
