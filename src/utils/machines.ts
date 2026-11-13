import { css, html, nothing, type TemplateResult } from "lit";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { activateEntity, deactivateEntity } from "./actions";
import { clamp, domainOf, entity, isActive, isAvailable, isCommandable, numericState } from "./entities";
import { alertLevel, severity, severityClass, type AlertLevel, type AlertMetric, type Severity } from "./severity";
import { BOOLEAN, COMMAND, ENTITY, ICON, numberSelector, SENSOR, TEMPERATURE, TEXT, type FormListField } from "./form";

/*
 * Couche commune des cartes « machines et mesures » : UNRAID, Proxmox, PC, Énergie et Frigo.
 * Fonctions pures (états, pourcentages, commandes, filtres) et petits gabarits partagés.
 */

// ---------------------------------------------------------------------------------------------
// Disponibilité et ligne d'état
// ---------------------------------------------------------------------------------------------

export type MachineAvailability = "online" | "offline" | "unavailable";

const OFFLINE_STATES = new Set(["off", "offline", "disconnected", "not_home", "stopped"]);

/**
 * État d'une machine d'après son entité de statut. Avec `sensorIsOnline`, un capteur qui publie
 * une valeur quelconque (charge CPU, nom d'utilisateur…) signifie que la machine répond.
 */
export function machineAvailability(state?: HassEntity, sensorIsOnline = false): MachineAvailability {
  if (!state || !isAvailable(state)) return "unavailable";
  if (isActive(state)) return "online";
  if (!sensorIsOnline || OFFLINE_STATES.has(state.state.toLowerCase())) return "offline";
  return state.entity_id.startsWith("sensor.") ? "online" : "offline";
}

/** Libellé commun : « En ligne », « Hors ligne » ou « Indisponible », suivi d'un détail facultatif. */
export function machineStatusLabel(availability: MachineAvailability, detail?: string): string {
  const label = availability === "online" ? "En ligne" : availability === "offline" ? "Hors ligne" : "Indisponible";
  return detail ? `${label} · ${detail}` : label;
}

/** Classe du point d'état : vert en ligne, rouge hors ligne, gris (sans classe) indisponible. */
export function machineStatusDot(availability: MachineAvailability): "healthy" | "danger" | "" {
  return availability === "online" ? "healthy" : availability === "offline" ? "danger" : "";
}

// ---------------------------------------------------------------------------------------------
// Mesures
// ---------------------------------------------------------------------------------------------

/**
 * Pourcentage lu sur un capteur, borné entre 0 et 100. Un capteur exprimé dans une autre unité
 * (RAM en Gio, disque en To…) n'est pas un pourcentage : il est ignoré plutôt qu'affiché à tort.
 */
export function machinePercentage(state?: HassEntity): number | undefined {
  if (!state || !isAvailable(state)) return undefined;
  const unit = state.attributes.unit_of_measurement;
  if (typeof unit === "string" && unit.trim() && unit.trim() !== "%") return undefined;
  const value = numericState(state, Number.NaN);
  return Number.isFinite(value) ? clamp(value) : undefined;
}

export function percentageLabel(value: number | undefined): string {
  return value === undefined ? "—" : `${Math.round(value)}%`;
}

/** Valeur numérique d'un capteur disponible, quelle que soit son unité. */
export function machineNumber(state?: HassEntity): number | undefined {
  if (!state || !isAvailable(state)) return undefined;
  const value = numericState(state, Number.NaN);
  return Number.isFinite(value) ? value : undefined;
}

/** Seuils de la batterie d'un onduleur ou d'un portable : alerte quand elle descend. */
export const BATTERY_LEVEL: Required<AlertLevel> = { warning: 30, critical: 15 };

const SEVERITY_RANK: Record<Severity, number> = { normal: 0, warning: 1, critical: 2 };

/** Niveau le plus grave d'une liste. */
export function worstSeverity(...levels: Severity[]): Severity {
  return levels.reduce<Severity>((worst, level) => (SEVERITY_RANK[level] > SEVERITY_RANK[worst] ? level : worst), "normal");
}

/** Niveau d'une mesure selon les seuils `alert_levels` de la carte. */
export function metricSeverity(
  value: number | undefined,
  levels: Partial<Record<AlertMetric, AlertLevel>> | undefined,
  metric: AlertMetric,
): Severity {
  return severity(value, alertLevel(levels, metric));
}

// ---------------------------------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------------------------------

/**
 * Vrai quand une commande peut être envoyée à l'entité. Un bouton jamais pressé est `unknown` :
 * il reste utilisable. Seules une entité absente ou `unavailable` désactivent la commande.
 */
export function commandAvailable(hass: HomeAssistant | undefined, entityId?: string): boolean {
  return Boolean(entityId && isCommandable(entity(hass, entityId)));
}

export interface ConfirmationText {
  title: string;
  message: string;
  confirmLabel: string;
}

/** Confirmation d'un redémarrage ou d'un arrêt de la machine elle-même. */
export function hostConfirmation(
  action: "restart" | "shutdown",
  subject: string,
  message: string,
  shutdownVerb = "Éteindre",
): ConfirmationText {
  const verb = action === "restart" ? "Redémarrer" : shutdownVerb;
  return { title: `${verb} ${subject} ?`, message, confirmLabel: verb };
}

// ---------------------------------------------------------------------------------------------
// Charges de travail : conteneurs Docker, VM et LXC
// ---------------------------------------------------------------------------------------------

export type WorkloadKind = "vm" | "container";
export type WorkloadAction = "start" | "stop" | "restart" | "pause" | "resume";
export type WorkloadState = "active" | "paused" | "stopped" | "unavailable";
export type WorkloadFilter = "all" | WorkloadState;

export interface WorkloadItem {
  name: string;
  entity: string;
  icon?: string;
  group?: string;
  node?: string;
  cpu_entity?: string;
  start_entity?: string;
  stop_entity?: string;
  restart_entity?: string;
  pause_entity?: string;
  resume_entity?: string;
  console_url?: string;
  ip_entity?: string;
  vcpus?: number;
  memory?: string;
  storage?: string;
}

/** État d'une charge : un état inconnu ou indisponible n'est jamais compté comme « arrêté ». */
export function workloadState(state?: HassEntity): WorkloadState {
  if (!state || !isAvailable(state)) return "unavailable";
  const value = state.state.toLowerCase();
  if (value === "paused" || value === "suspended") return "paused";
  return isActive(state) ? "active" : "stopped";
}

/** Entité qui exécute une commande ; un `switch` sert de repli pour démarrer et arrêter. */
export function workloadActionEntity(item: WorkloadItem, action: WorkloadAction): string | undefined {
  const isSwitch = domainOf(item.entity) === "switch";
  if (action === "start") return item.start_entity || (isSwitch ? item.entity : undefined);
  if (action === "stop") return item.stop_entity || (isSwitch ? item.entity : undefined);
  if (action === "restart") return item.restart_entity;
  if (action === "pause") return item.pause_entity;
  return item.resume_entity;
}

/** Envoie la commande ; un `switch` sans `stop_entity` est éteint au lieu d'être rallumé. */
export async function sendWorkloadCommand(hass: HomeAssistant, item: WorkloadItem, action: WorkloadAction): Promise<void> {
  const entityId = workloadActionEntity(item, action);
  if (!entityId) return;
  if (action === "stop" && !item.stop_entity && entityId === item.entity) {
    await deactivateEntity(hass, entityId);
    return;
  }
  await activateEntity(hass, entityId);
}

/** Commande groupée déclenchée par la barre de sélection, selon l'état de la charge. */
export function bulkAction(state: WorkloadState): "start" | "stop" | undefined {
  if (state === "stopped") return "start";
  if (state === "active" || state === "paused") return "stop";
  return undefined;
}

/** Une charge peut être sélectionnée quand la commande groupée de son état est utilisable. */
export function workloadSelectable(hass: HomeAssistant | undefined, item: WorkloadItem, state: WorkloadState): boolean {
  const action = bulkAction(state);
  return Boolean(action && commandAvailable(hass, workloadActionEntity(item, action)));
}

export function workloadCounts<T>(items: T[], stateOf: (item: T) => WorkloadState): Record<WorkloadState, number> {
  const counts: Record<WorkloadState, number> = { active: 0, paused: 0, stopped: 0, unavailable: 0 };
  for (const item of items) counts[stateOf(item)] += 1;
  return counts;
}

/** Recherche (nom, groupe, nœud) et filtre d'état de la fenêtre des charges. */
export function filterWorkloads<T extends WorkloadItem>(
  items: T[],
  query: string,
  filter: WorkloadFilter,
  stateOf: (item: T) => WorkloadState,
): T[] {
  const needle = query.trim().toLocaleLowerCase("fr");
  return items.filter((item) => {
    const matchesQuery = !needle || [item.name, item.group, item.node]
      .some((value) => value?.toLocaleLowerCase("fr").includes(needle));
    return matchesQuery && (filter === "all" || stateOf(item) === filter);
  });
}

export function groupWorkloads<T>(items: T[], groupOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groupOf(item);
    groups.set(group, [...(groups.get(group) || []), item]);
  }
  return groups;
}

/**
 * Retire de la sélection les charges dont l'état a changé depuis qu'elles ont été cochées
 * (démarrées, arrêtées ou devenues indisponibles). Retourne `undefined` si rien ne change.
 */
export function pruneSelection(
  selected: ReadonlyMap<string, WorkloadState>,
  currentState: (entityId: string) => WorkloadState | undefined,
): Map<string, WorkloadState> | undefined {
  const next = new Map([...selected].filter(([id, state]) => currentState(id) === state));
  return next.size === selected.size ? undefined : next;
}

/** Textes de confirmation d'un arrêt ou d'un redémarrage de conteneur ou de VM. */
export function workloadConfirmation(name: string, action: "stop" | "restart", kind: WorkloadKind): ConfirmationText {
  const restart = action === "restart";
  const label = restart ? "Redémarrer" : kind === "vm" ? "Éteindre" : "Arrêter";
  return {
    title: `${label} ${name} ?`,
    message: restart
      ? "Le service sera brièvement indisponible pendant son redémarrage."
      : kind === "vm"
        ? "La machine virtuelle et ses services deviendront indisponibles."
        : "Le conteneur et le service qu’il fournit deviendront indisponibles.",
    confirmLabel: label,
  };
}

/** Confirmation de l'arrêt groupé des charges sélectionnées. */
export function bulkStopConfirmation(count: number, kind: WorkloadKind): ConfirmationText {
  const plural = count > 1;
  const noun = kind === "vm"
    ? `${count} machine${plural ? "s" : ""} virtuelle${plural ? "s" : ""}`
    : `${count} élément${plural ? "s" : ""}`;
  return {
    title: `Arrêter ${noun} ?`,
    message: "Les services fournis par la sélection deviendront indisponibles.",
    confirmLabel: "Arrêter",
  };
}

export const WORKLOAD_STATE_LABELS: Record<WorkloadState, string> = {
  active: "Actif",
  paused: "Suspendu",
  stopped: "Arrêté",
  unavailable: "Indisponible",
};

const WORKLOAD_DOTS: Record<WorkloadState, string> = {
  active: "healthy",
  paused: "warning",
  stopped: "danger",
  unavailable: "",
};

// ---------------------------------------------------------------------------------------------
// Gabarits partagés
// ---------------------------------------------------------------------------------------------

export interface MetricTileOptions {
  label: string;
  value: string;
  icon: string;
  level?: Severity;
  /** Ouvre la fiche de l'entité ; la tuile devient alors un bouton. */
  open?: () => void;
  /** `label-first` : libellé en haut, valeur dessous (valeurs longues de la carte UNRAID). */
  layout?: "value-first" | "label-first";
}

/** Tuile de mesure des fenêtres de détail, colorée selon son niveau d'alerte. */
export function metricTile(options: MetricTileOptions): TemplateResult {
  const { label, value, icon, level = "normal", open, layout = "value-first" } = options;
  const content = layout === "label-first"
    ? html`<div class="tile-head"><span class="tile-icon"><ha-icon .icon=${icon}></ha-icon></span></div>
      <div class="metric-label strong">${label}</div><div class="metric-value muted">${value}</div>`
    : html`<div class="tile-head"><span class="tile-icon"><ha-icon .icon=${icon}></ha-icon></span><strong class="metric-value">${value}</strong></div>
      <div class="metric-label">${label}</div>`;
  const classes = `tile metric-tile ${layout} ${severityClass(level)}`;
  return open
    ? html`<button type="button" class=${`${classes} clickable`} aria-label=${`${label} : ${value}`} @click=${open}>${content}</button>`
    : html`<div class=${classes}>${content}</div>`;
}

export interface StorageBarOptions {
  label: string;
  value: number | undefined;
  level?: Severity;
  open?: () => void;
  className?: string;
}

/** Barre de stockage du panneau des machines, avec son niveau d'alerte et un rôle `meter`. */
export function storageBar(options: StorageBarOptions): TemplateResult {
  const { label, value, level = "normal", open, className = "" } = options;
  const classes = `machine-bar ${className} ${severityClass(level)}`.trim();
  const content = html`<span title=${label}>${label}</span>
    ${meterTrack(label, value, "track")}
    <strong>${percentageLabel(value)}</strong>`;
  return open
    ? html`<button type="button" class=${`${classes} machine-bar-button`} aria-label=${`${label} : ${percentageLabel(value)}`} @click=${open}>${content}</button>`
    : html`<div class=${classes}>${content}</div>`;
}

/** Jauge horizontale accessible, utilisée par les barres et les lignes de disques. */
export function meterTrack(label: string, value: number | undefined, className = "progress", level: Severity = "normal"): TemplateResult {
  return html`<div class=${`${className} ${severityClass(level)}`.trim()} role="meter" aria-label=${label}
    aria-valuemin="0" aria-valuemax="100" aria-valuenow=${value ?? nothing}
    aria-valuetext=${value === undefined ? "Indisponible" : percentageLabel(value)}>
    <span style=${`width:${value ?? 0}%`}></span>
  </div>`;
}

export interface WorkloadRowOptions {
  item: WorkloadItem;
  hass: HomeAssistant | undefined;
  kind: WorkloadKind;
  state: WorkloadState;
  selected: boolean;
  /** Détail ajouté à la ligne d'état (nœud Proxmox…). */
  detail?: string;
  /** Commande « Pause » proposée pour une charge active. */
  allowPause: boolean;
  isPending: (action: WorkloadAction) => boolean;
  onToggle: () => void;
  onAction: (action: WorkloadAction) => void;
  displayValue: (entityId: string) => string;
}

/** Ligne d'une charge : sélection, icône d'état, ressources et commandes. */
export function workloadRow(options: WorkloadRowOptions): TemplateResult {
  const { item, hass, kind, state, selected, detail, displayValue } = options;
  const selectable = workloadSelectable(hass, item, state);
  const main = html`<div class="service-main">
    <span class="service-icon ${state}"><ha-icon .icon=${item.icon || (kind === "vm" ? "mdi:monitor" : "mdi:cube-outline")}></ha-icon></span>
    <div class="meta">
      <div class="name">${item.name}</div>
      <div class="state"><span class="dot ${WORKLOAD_DOTS[state]}"></span>${[
        state === "paused" && kind === "vm" ? "Suspendue" : WORKLOAD_STATE_LABELS[state],
        detail,
        item.cpu_entity ? `CPU ${displayValue(item.cpu_entity)}` : undefined,
      ].filter(Boolean).join(" · ")}</div>
      ${item.vcpus || item.memory || item.storage || item.ip_entity ? html`<div class="resource-tags">
        ${item.vcpus ? html`<span>${item.vcpus} vCPU</span>` : nothing}
        ${item.memory ? html`<span>${item.memory}</span>` : nothing}
        ${item.storage ? html`<span>${item.storage}</span>` : nothing}
        ${item.ip_entity ? html`<span>${displayValue(item.ip_entity)}</span>` : nothing}
      </div>` : nothing}
    </div>
  </div>`;
  // Toute la zone icône + nom sert de cible pour cocher la ligne.
  return html`<div class="list-row workload-row ${selectable ? "selectable" : ""}">
    ${selectable
      ? html`<label class="workload-select"><span class="selection"><input type="checkbox"
          aria-label=${`Sélectionner ${item.name}`} .checked=${selected} @change=${options.onToggle} /></span>${main}</label>`
      : html`<span class="selection" aria-hidden="true"></span>${main}`}
    ${workloadActions(options)}
  </div>`;
}

function workloadActions(options: WorkloadRowOptions): TemplateResult {
  const { item, hass, kind, state, allowPause, isPending, onAction } = options;
  const busy = (["start", "stop", "restart", "pause", "resume"] as const).some(isPending);
  const button = (action: WorkloadAction, label: string, icon: string, style = ""): TemplateResult | typeof nothing => {
    const entityId = workloadActionEntity(item, action);
    if (!entityId) return nothing;
    const pending = isPending(action);
    return html`<button type="button" class=${`action ${style}`.trim()} aria-busy=${pending ? "true" : "false"}
      ?disabled=${busy || !commandAvailable(hass, entityId)} @click=${() => onAction(action)}>
      <ha-icon .icon=${pending ? "mdi:timer-sand" : icon}></ha-icon>${pending ? "…" : label}</button>`;
  };
  const stopLabel = kind === "vm" ? "Éteindre" : "Arrêter";
  return html`<div class="workload-actions">
    ${state === "stopped" ? button("start", "Démarrer", "mdi:play", "primary") : nothing}
    ${state === "paused" ? button("resume", "Reprendre", "mdi:play", "primary") : nothing}
    ${state === "active" && allowPause ? button("pause", "Pause", "mdi:pause") : nothing}
    ${state === "active" ? button("restart", "Redémarrer", "mdi:restart") : nothing}
    ${state === "active" || state === "paused" ? button("stop", stopLabel, "mdi:stop-circle-outline", "danger") : nothing}
    ${item.console_url
      ? html`<button type="button" class="action" ?disabled=${state !== "active"}
          title=${state === "active" ? "Ouvrir la console" : "Console disponible quand la machine fonctionne"}
          @click=${() => window.open(item.console_url, "_blank", "noopener,noreferrer")}><ha-icon icon="mdi:console"></ha-icon>Console</button>`
      : nothing}
  </div>`;
}

export interface WorkloadToolbarOptions {
  query: string;
  placeholder: string;
  filter: WorkloadFilter;
  counts: Record<WorkloadState, number>;
  total: number;
  pausedLabel: string;
  showPaused: boolean;
  onQuery: (query: string) => void;
  onFilter: (filter: WorkloadFilter) => void;
}

/** Recherche et filtres de la fenêtre des charges. */
export function workloadToolbar(options: WorkloadToolbarOptions): TemplateResult {
  const { counts, filter } = options;
  const chip = (value: WorkloadFilter, label: string) => html`<button type="button" class=${filter === value ? "active" : ""}
    aria-pressed=${filter === value ? "true" : "false"} @click=${() => options.onFilter(value)}>${label}</button>`;
  return html`
    <input class="search" type="search" aria-label=${options.placeholder} placeholder=${options.placeholder} .value=${options.query}
      @input=${(event: Event) => options.onQuery((event.target as HTMLInputElement).value)} />
    <div class="filters" role="group" aria-label="Filtrer par état">
      ${chip("all", `Tous · ${options.total}`)}
      ${chip("active", `Actifs · ${counts.active}`)}
      ${chip("stopped", `Arrêtés · ${counts.stopped}`)}
      ${options.showPaused ? chip("paused", `${options.pausedLabel} · ${counts.paused}`) : nothing}
      ${counts.unavailable ? chip("unavailable", `Indisponibles · ${counts.unavailable}`) : nothing}
    </div>`;
}

export interface SelectionBarOptions {
  startCount: number;
  stopCount: number;
  pending: boolean;
  onClear: () => void;
  onStart: () => void;
  onStop: () => void;
}

/** Barre collante des commandes groupées. */
export function selectionBar(options: SelectionBarOptions): TemplateResult {
  const total = options.startCount + options.stopCount;
  return html`<div class="sticky-actions">
    <strong>${total} sélectionné${total > 1 ? "s" : ""}</strong>
    <div class="selection-actions">
      <button type="button" class="action" ?disabled=${!total || options.pending} @click=${options.onClear}>Annuler</button>
      <button type="button" class="action danger" aria-busy=${options.pending ? "true" : "false"} ?disabled=${!options.stopCount || options.pending}
        @click=${options.onStop}><ha-icon icon="mdi:stop-circle-outline"></ha-icon>Arrêter (${options.stopCount})</button>
      <button type="button" class="action primary" aria-busy=${options.pending ? "true" : "false"} ?disabled=${!options.startCount || options.pending}
        @click=${options.onStart}><ha-icon icon="mdi:play"></ha-icon>Démarrer (${options.startCount})</button>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------------------------
// Éditeur visuel
// ---------------------------------------------------------------------------------------------

/** Libellés français des champs communs des éditeurs visuels. */
export const COMMON_FORM_LABELS: Record<string, string> = {
  name: "Titre",
  icon: "Icône",
  theme: "Thème",
  status_entity: "Entité d’état (en ligne / hors ligne)",
  background_image: "Image de fond",
  background_position: "Position de l’image",
  image_opacity: "Opacité de l’image (%)",
  image_brightness: "Luminosité de l’image (%)",
  glass_opacity: "Opacité des panneaux",
  accent_color: "Couleur d’accent",
  card_background: "Fond de la carte",
  show_grid: "Afficher la grille",
  cpu_entity: "Charge CPU (%)",
  memory_entity: "Mémoire utilisée (%)",
  uptime_entity: "Durée de fonctionnement",
  version_entity: "Version",
  network_down_entity: "Débit entrant",
  network_up_entity: "Débit sortant",
  restart_entity: "Commande de redémarrage",
  shutdown_entity: "Commande d’arrêt",
  wake_entity: "Commande de réveil (Wake-on-LAN, script…)",
};

/** `computeLabel` d'un éditeur : libellés propres à la carte, puis libellés communs, puis la clé. */
export function formLabels(own: Record<string, string>): (schema: { name?: string }) => string | undefined {
  return ({ name }) => (name ? own[name] ?? COMMON_FORM_LABELS[name] ?? name : undefined);
}

/**
 * Champs d'un conteneur Docker, d'une VM ou d'un conteneur Proxmox dans l'éditeur visuel.
 * `vm` ajoute la pause, la console et les ressources ; `node` le nœud Proxmox.
 */
export function workloadFormFields(options: { vm?: boolean; node?: boolean } = {}): Record<string, FormListField> {
  return {
    name: { label: "Nom", required: true, selector: TEXT },
    entity: { label: "Entité d’état (interrupteur ou capteur)", required: true, selector: ENTITY },
    icon: { label: "Icône", selector: ICON },
    group: { label: "Groupe", selector: TEXT },
    ...(options.node ? { node: { label: "Nœud", selector: TEXT } } : {}),
    cpu_entity: { label: "Charge CPU (%)", selector: SENSOR },
    start_entity: { label: "Commande de démarrage", selector: COMMAND },
    stop_entity: { label: "Commande d’arrêt", selector: COMMAND },
    restart_entity: { label: "Commande de redémarrage", selector: COMMAND },
    ...(options.vm ? {
      pause_entity: { label: "Commande de pause", selector: COMMAND },
      resume_entity: { label: "Commande de reprise", selector: COMMAND },
      ip_entity: { label: "Adresse IP", selector: ENTITY },
      console_url: { label: "Adresse de la console", selector: TEXT },
      vcpus: { label: "Processeurs virtuels", selector: numberSelector(1, 256) },
      memory: { label: "Mémoire (texte, ex. 8 Go)", selector: TEXT },
      storage: { label: "Stockage (texte, ex. 64 Go)", selector: TEXT },
    } : {}),
  };
}

/** Champs d'un disque ou d'un espace de stockage (Unraid, Proxmox) dans l'éditeur visuel. */
export function storageFormFields(extra: Record<string, FormListField> = {}): Record<string, FormListField> {
  return {
    name: { label: "Nom", required: true, selector: TEXT },
    usage_entity: { label: "Occupation (%)", selector: SENSOR },
    capacity_entity: { label: "Capacité (texte affiché)", selector: SENSOR },
    temperature_entity: { label: "Température", selector: TEMPERATURE },
    status_entity: { label: "État", selector: ENTITY },
    show_on_card: { label: "Afficher sur la carte", selector: BOOLEAN },
    ...extra,
  };
}

// ---------------------------------------------------------------------------------------------
// Styles communs
// ---------------------------------------------------------------------------------------------

/** Styles partagés par les cartes machines : point d'état, tuiles, barres, fenêtre des charges. */
export const machineStyles = css`
  /* Le halo du point d'état suit sa couleur ; gris quand l'état est indisponible. */
  .machine-status .dot {
    --dot-color: var(--auralis-muted);
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--dot-color) 16%, transparent);
  }
  .machine-status .dot.healthy { --dot-color: var(--auralis-healthy); }
  .machine-status .dot.danger { --dot-color: var(--auralis-danger); }
  .machine-status .dot.warning { --dot-color: var(--auralis-active); }

  .machine-wake { min-height: var(--auralis-target); }

  .metric-tile { display: block; width: 100%; color: inherit; font: inherit; text-align: left; }
  .metric-tile .metric-label { margin-top: 10px; }
  .metric-tile .metric-label.strong { font-weight: 680; }
  .metric-tile.sev-warning .metric-value,
  .metric-tile.sev-critical .metric-value { color: var(--sev-color); font-weight: 720; }
  button.metric-tile:hover { border-color: color-mix(in srgb, var(--auralis-info) 40%, var(--auralis-border)); }

  .machine-bar-button {
    width: 100%;
    padding: 6px 0;
    margin: -6px 0;
    border: 0;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .progress.sev-warning > span,
  .progress.sev-critical > span { background: var(--sev-color); }
  .sev-text.sev-warning, .sev-text.sev-critical { color: var(--sev-color); }

  .search {
    width: 100%;
    box-sizing: border-box;
    min-height: var(--auralis-target);
    padding: 12px 14px;
    margin-bottom: 10px;
    border: 1px solid var(--auralis-border);
    border-radius: 14px;
    background: var(--auralis-layer);
    color: var(--auralis-text);
  }
  .search:focus-visible,
  .search:focus {
    outline: 2px solid var(--machine-accent, var(--auralis-info));
    outline-offset: 1px;
    border-color: transparent;
  }

  .filters {
    display: flex;
    overflow-x: auto;
    gap: 7px;
    padding-bottom: 10px;
  }
  .filters button {
    flex: 0 0 auto;
    min-height: var(--auralis-target);
    padding: 8px 14px;
    border: 1px solid var(--auralis-border);
    border-radius: 999px;
    background: var(--auralis-layer);
    color: var(--auralis-muted);
    cursor: pointer;
  }
  .filters button.active {
    border-color: color-mix(in srgb, var(--auralis-healthy) 42%, transparent);
    background: color-mix(in srgb, var(--auralis-healthy) 12%, var(--auralis-layer));
    color: var(--auralis-healthy);
  }

  .section-label {
    margin: 16px 2px 8px;
    color: var(--auralis-muted);
    font-size: var(--auralis-text-sm);
    font-weight: 720;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .workload-row .workload-select { display: contents; cursor: pointer; }
  .workload-row .selection {
    display: grid;
    width: var(--auralis-target);
    height: var(--auralis-target);
    margin: -10px -6px -10px -10px;
    place-items: center;
    grid-column: 1;
  }
  .workload-row .state { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  .workload-row .state .dot { display: inline-block; }

  .service-main {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 10px;
  }
  .service-icon {
    display: grid;
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 12px;
    background: var(--auralis-accent-soft);
    color: var(--auralis-info);
  }
  .service-icon.active {
    background: color-mix(in srgb, var(--auralis-healthy) 18%, var(--auralis-layer));
    color: var(--auralis-healthy);
    box-shadow: 0 0 18px color-mix(in srgb, var(--auralis-healthy) 22%, transparent);
  }
  .service-icon.paused {
    background: color-mix(in srgb, var(--auralis-active) 16%, var(--auralis-layer));
    color: var(--auralis-active);
  }
  .service-icon.stopped,
  .service-icon.unavailable { background: var(--auralis-layer); color: var(--auralis-muted); }
  .service-icon.unavailable { opacity: 0.5; }

  .resource-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 5px;
  }
  .resource-tags span {
    padding: 3px 7px;
    border-radius: 999px;
    background: var(--auralis-card);
    color: var(--auralis-muted);
    font-size: var(--auralis-text-xs);
  }

  .workload-actions {
    display: flex;
    max-width: 260px;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
  }
  .workload-actions .action {
    min-height: var(--auralis-target);
    padding: 6px 10px;
    font-size: var(--auralis-text-xs);
  }
  .workload-actions .action ha-icon { --mdc-icon-size: 16px; }

  .selection-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }

  @media (max-width: 560px) {
    .workload-actions {
      grid-column: 2;
      max-width: none;
      justify-content: flex-start;
    }
  }
`;
