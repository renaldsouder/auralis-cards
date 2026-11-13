import { css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import { sharedStyles } from "../styles/shared";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { formatNumber } from "../utils/entities";
import { severity } from "../utils/severity";
import { hassChangeMatters } from "../utils/watch";

export interface BatteriesCardConfig extends BaseCardConfig {
  type: "custom:auralis-batteries-card";
  /** Pourcentage à partir duquel une pile est faible (20 par défaut). */
  low_threshold?: number;
  /** Pourcentage à partir duquel une pile est critique (10 par défaut). */
  critical_threshold?: number;
  /** Entités ou motifs (`sensor.*_pile`) ajoutés à la découverte automatique. */
  include?: string[] | string;
  /** Entités ou motifs retirés de la carte (`sensor.*_voltage`). */
  exclude?: string[] | string;
  /** Liste aussi les piles en bon état dans la fenêtre « Voir tout ». */
  show_ok?: boolean;
  /** Signale les appareils indisponibles (activé par défaut). */
  show_unavailable?: boolean;
  /** Compte aussi les entités à l'état `unknown` comme indisponibles. */
  include_unknown?: boolean;
  /** Domaines surveillés pour les appareils indisponibles. */
  unavailable_domains?: string[] | string;
  /** Nombre de lignes sur la carte, le reste est dans « Voir tout ». */
  max_items?: number;
  /** Signale aussi une pile à l'état texte « medium » / « moyen ». */
  warn_on_medium?: boolean;
}

/** Entrée du registre des entités exposée par le frontend Home Assistant (`hass.entities`). */
interface RegistryEntity {
  device_id?: string | null;
  hidden?: boolean;
  hidden_by?: string | null;
  disabled_by?: string | null;
}

/** Entrée du registre des appareils (`hass.devices`). */
interface RegistryDevice {
  name?: string | null;
  name_by_user?: string | null;
}

/** `hass` tel que le fournit le frontend, avec les registres absents du type commun. */
export type BatteriesHass = HomeAssistant & {
  entities?: Record<string, RegistryEntity | undefined>;
  devices?: Record<string, RegistryDevice | undefined>;
};

/** Niveau retenu pour une pile. */
export type BatteryLevel = "critical" | "low" | "ok";
/** Niveau lu dans un état texte (`low`, `medium`…). */
export type TextLevel = "critical" | "low" | "medium" | "ok";

export interface BatteryItem {
  entityId: string;
  name: string;
  level: BatteryLevel;
  source: "percent" | "text" | "binary";
  /** Pourcentage, pour les capteurs numériques. */
  percent?: number;
  /** Niveau lu dans le texte ou le capteur binaire. */
  textLevel?: TextLevel;
  /** Valeur affichée : « 9 % », « Faible »… */
  label: string;
  /** Valeur de tri, approximative pour les états texte. */
  sortValue: number;
}

export interface UnavailableItem {
  /** `device:<id>` ou `prefix:<début de l'identifiant>`. */
  key: string;
  name: string;
  /** Entité ouverte par un appui sur la ligne. */
  entityId: string;
  entityIds: string[];
  entityNames: string[];
  state: "unavailable" | "unknown";
  /** Début de l'indisponibilité (ms), le plus ancien du groupe. */
  since?: number;
}

export interface BatteryReport {
  critical: BatteryItem[];
  low: BatteryItem[];
  /** Toutes les piles lues, de la plus faible à la plus chargée. */
  batteries: BatteryItem[];
  unavailable: UnavailableItem[];
}

export interface DiscoveryOptions {
  low: number;
  critical: number;
  warnOnMedium: boolean;
  showUnavailable: boolean;
  includeUnknown: boolean;
  domains: ReadonlySet<string>;
  include: (entityId: string) => boolean;
  exclude: (entityId: string) => boolean;
}

export const DEFAULT_UNAVAILABLE_DOMAINS = [
  "sensor", "binary_sensor", "light", "switch", "cover", "climate", "lock", "camera", "media_player", "valve",
];
export const DEFAULT_LOW_THRESHOLD = 20;
export const DEFAULT_CRITICAL_THRESHOLD = 10;
export const DEFAULT_MAX_ITEMS = 6;
const DEFAULT_NAME = "Batteries et alertes";
const DEFAULT_ICON = "mdi:battery-alert-variant-outline";
const MINUTE = 60_000;
const NBSP = " ";

const NUMBER = /^\s*-?\d+(?:[.,]\d+)?\s*%?\s*$/;
const PERCENT_ID = /_(battery|batterie)$/;
const STATE_ID = /_battery_state$/;
const ENTITY_PATTERN = /^[a-z0-9_*]+\.[a-z0-9_*]+$/;

const TEXT_STATES: Record<string, { level: TextLevel; label: string }> = {
  critical: { level: "critical", label: "Critique" },
  critique: { level: "critical", label: "Critique" },
  empty: { level: "critical", label: "Vide" },
  vide: { level: "critical", label: "Vide" },
  low: { level: "low", label: "Faible" },
  faible: { level: "low", label: "Faible" },
  medium: { level: "medium", label: "Moyen" },
  moyen: { level: "medium", label: "Moyen" },
  moyenne: { level: "medium", label: "Moyen" },
  high: { level: "ok", label: "Élevé" },
  full: { level: "ok", label: "Pleine" },
  ok: { level: "ok", label: "OK" },
  normal: { level: "ok", label: "OK" },
  good: { level: "ok", label: "OK" },
};

/** Valeur de tri d'un niveau texte, pour le ranger parmi les pourcentages. */
const TEXT_SORT: Record<TextLevel, number> = { critical: 2, low: 15, medium: 50, ok: 90 };
const LEVEL_RANK: Record<BatteryLevel, number> = { critical: 0, low: 1, ok: 2 };

/** Pourcentage d'un état (« 9 », « 9.5 », « 98,5 »), ou `undefined` pour un texte. */
export function parseBatteryNumber(state: string | undefined): number | undefined {
  if (typeof state !== "string" || !NUMBER.test(state)) return undefined;
  const value = Number.parseFloat(state.replace(",", "."));
  return Number.isFinite(value) ? value : undefined;
}

/** Niveau d'un pourcentage : critique sous `critical`, faible sous `low`, sinon bon. Bornes incluses. */
export function classifyPercent(value: number, low: number, critical: number): BatteryLevel {
  const level = severity(value, { warning: low, critical }, "below");
  return level === "critical" ? "critical" : level === "warning" ? "low" : "ok";
}

/** Niveau d'un état texte (`low`, `faible`, `medium`…), ou `undefined` s'il n'est pas reconnu. */
export function classifyText(state: string | undefined): { level: TextLevel; label: string } | undefined {
  return state ? TEXT_STATES[state.trim().toLowerCase()] : undefined;
}

/** Niveau retenu pour un niveau texte : « moyen » n'est signalé qu'avec `warn_on_medium`. */
export function textToLevel(level: TextLevel, warnOnMedium: boolean): BatteryLevel {
  if (level === "medium") return warnOnMedium ? "low" : "ok";
  return level;
}

/** Transforme une liste d'identifiants ou de motifs avec `*` en un test. */
export function globMatcher(patterns: readonly string[]): (entityId: string) => boolean {
  const exact = new Set<string>();
  const globs: RegExp[] = [];
  for (const raw of patterns) {
    const pattern = raw.trim().toLowerCase();
    if (!pattern) continue;
    if (!pattern.includes("*")) {
      exact.add(pattern);
      continue;
    }
    const source = pattern.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    globs.push(new RegExp(`^${source}$`));
  }
  if (!exact.size && !globs.length) return () => false;
  return (entityId) => exact.has(entityId) || globs.some((glob) => glob.test(entityId));
}

/** Liste d'options : tableau, ou texte séparé par des virgules, espaces ou retours à la ligne. */
export function optionList(value: unknown, option: string): string[] {
  if (value === undefined || value === null || value === "") return [];
  const items = typeof value === "string" ? value.split(/[\s,;]+/) : value;
  if (!Array.isArray(items) || items.some((item) => typeof item !== "string")) {
    throw new Error(`${option} doit être une liste d'entités ou de motifs (ex. sensor.*_battery).`);
  }
  return items.map((item) => item.trim()).filter(Boolean);
}

/** Options de découverte tirées de la configuration (déjà normalisée ou non). */
export function discoveryOptions(config: Partial<BatteriesCardConfig> = {}): DiscoveryOptions {
  const low = finiteOr(config.low_threshold, DEFAULT_LOW_THRESHOLD);
  const domains = optionList(config.unavailable_domains, "unavailable_domains");
  return {
    low,
    critical: Math.min(low, finiteOr(config.critical_threshold, DEFAULT_CRITICAL_THRESHOLD)),
    warnOnMedium: config.warn_on_medium === true,
    showUnavailable: config.show_unavailable !== false,
    includeUnknown: config.include_unknown === true,
    domains: new Set(domains.length ? domains : DEFAULT_UNAVAILABLE_DOMAINS),
    include: globMatcher(optionList(config.include, "include")),
    exclude: globMatcher(optionList(config.exclude, "exclude")),
  };
}

function finiteOr(value: unknown, fallback: number): number {
  const number = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  return value !== undefined && value !== null && value !== "" && Number.isFinite(number) ? number : fallback;
}

const domainOf = (entityId: string): string => entityId.slice(0, entityId.indexOf("."));

/** Vrai pour une entité de pile : classe `battery`, ou identifiant `*_battery` en %, ou `*_battery_state`. */
export function isBatteryEntity(entityId: string, state: HassEntity | undefined): boolean {
  if (!state) return false;
  const domain = domainOf(entityId);
  const deviceClass = state.attributes?.device_class;
  if (domain === "binary_sensor") return deviceClass === "battery";
  if (domain !== "sensor") return false;
  if (deviceClass === "battery" || STATE_ID.test(entityId)) return true;
  return PERCENT_ID.test(entityId) && state.attributes?.unit_of_measurement === "%";
}

/** Entité masquée ou désactivée dans le registre, quand celui-ci est disponible. */
function hiddenInRegistry(hass: BatteriesHass, entityId: string): boolean {
  const entry = hass.entities?.[entityId];
  return Boolean(entry && (entry.hidden === true || entry.hidden_by || entry.disabled_by));
}

/** Retire « Batterie » / « Battery » d'un nom (« Capteur salon Batterie » → « Capteur salon »). */
export function cleanBatteryName(name: string): string {
  const cleaned = name
    .replace(/[\s_:·-]*(battery|batterie)(\s+(level|state|niveau|état|etat))?\s*$/i, "")
    .replace(/^(niveau\s+de\s+)?(battery|batterie)\s+(de\s+la\s+|du\s+|de\s+l['’]|des\s+|de\s+)?/i, "")
    .trim();
  return cleaned || name.trim();
}

const entityName = (entityId: string, state?: HassEntity): string =>
  (typeof state?.attributes?.friendly_name === "string" && state.attributes.friendly_name.trim()) || entityId;

const formatPercent = (value: number): string => `${formatNumber(Math.round(value))}${NBSP}%`;

/**
 * Lecture d'une pile : pourcentage, état texte ou capteur binaire. `undefined` pour un état
 * indisponible ou un texte non reconnu.
 */
export function readBattery(entityId: string, state: HassEntity | undefined, options: Pick<DiscoveryOptions, "low" | "critical" | "warnOnMedium">): BatteryItem | undefined {
  if (!state || state.state === "unavailable" || state.state === "unknown") return undefined;
  const name = cleanBatteryName(entityName(entityId, state));
  if (domainOf(entityId) === "binary_sensor") {
    if (state.state !== "on" && state.state !== "off") return undefined;
    const textLevel: TextLevel = state.state === "on" ? "low" : "ok";
    return { entityId, name, level: textLevel, source: "binary", textLevel, label: textLevel === "low" ? "Faible" : "OK", sortValue: TEXT_SORT[textLevel] };
  }
  const percent = parseBatteryNumber(state.state);
  if (percent !== undefined) {
    return { entityId, name, level: classifyPercent(percent, options.low, options.critical), source: "percent", percent, label: formatPercent(percent), sortValue: percent };
  }
  const text = classifyText(state.state);
  if (!text) return undefined;
  return { entityId, name, level: textToLevel(text.level, options.warnOnMedium), source: "text", textLevel: text.level, label: text.label, sortValue: TEXT_SORT[text.level] };
}

/**
 * Entités qui intéressent la carte : piles, entités des domaines surveillés et entités
 * ajoutées par `include`, moins `exclude` et les entités masquées. Parcours unique de `hass.states`.
 */
export function batteryCandidates(hass: BatteriesHass, options: DiscoveryOptions): Set<string> {
  const ids = new Set<string>();
  for (const entityId in hass.states) {
    if (options.exclude(entityId)) continue;
    if (options.include(entityId)) {
      ids.add(entityId);
      continue;
    }
    if (hiddenInRegistry(hass, entityId)) continue;
    if ((options.showUnavailable && options.domains.has(domainOf(entityId))) || isBatteryEntity(entityId, hass.states[entityId])) ids.add(entityId);
  }
  return ids;
}

/** Groupe d'une entité indisponible : son appareil dans le registre, sinon le début de son identifiant. */
export function unavailableGroup(hass: BatteriesHass, entityId: string): { key: string; deviceName?: string } {
  const deviceId = hass.entities?.[entityId]?.device_id;
  if (deviceId) {
    const device = hass.devices?.[deviceId];
    const deviceName = (device?.name_by_user || device?.name || "").trim();
    return { key: `device:${deviceId}`, deviceName: deviceName || undefined };
  }
  const objectId = entityId.slice(entityId.indexOf(".") + 1);
  const cut = objectId.lastIndexOf("_");
  return { key: `prefix:${cut > 0 ? objectId.slice(0, cut) : objectId}` };
}

/** Mots communs au début de plusieurs noms (« Capt temp 02 Température », « Capt temp 02 Humidité » → « Capt temp 02 »). */
export function commonNamePrefix(names: readonly string[]): string {
  if (!names.length) return "";
  const words = names.map((name) => name.trim().split(/\s+/));
  const common: string[] = [];
  for (let index = 0; index < words[0].length; index += 1) {
    const word = words[0][index];
    if (!words.every((list) => list[index]?.toLowerCase() === word.toLowerCase())) break;
    common.push(word);
  }
  return common.join(" ").replace(/[\s:·-]+$/, "");
}

const humanize = (key: string): string => {
  const text = key.replace(/^(device|prefix):/, "").replace(/_/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : key;
};

function timeOf(value: string | undefined): number | undefined {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? time : undefined;
}

const byName = (a: { name: string }, b: { name: string }): number => a.name.localeCompare(b.name, "fr");

/** Piles critiques puis faibles, de la plus faible à la plus chargée. */
export function compareBatteries(a: BatteryItem, b: BatteryItem): number {
  return LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || a.sortValue - b.sortValue || byName(a, b);
}

/** Indisponibles depuis le plus longtemps en premier, date inconnue à la fin. */
export function compareUnavailable(a: UnavailableItem, b: UnavailableItem): number {
  const since = (a.since ?? Number.POSITIVE_INFINITY) - (b.since ?? Number.POSITIVE_INFINITY);
  return (Number.isNaN(since) ? 0 : since) || byName(a, b);
}

/**
 * Inventaire des piles et des appareils indisponibles. Un seul parcours des entités
 * (toutes celles de `hass.states`, ou la liste `ids` déjà filtrée).
 */
export function discoverBatteries(hass: BatteriesHass, options: DiscoveryOptions, ids: Iterable<string> = Object.keys(hass.states)): BatteryReport {
  const batteries: BatteryItem[] = [];
  const groups = new Map<string, { deviceName?: string; entries: Array<{ id: string; name: string; state: "unavailable" | "unknown"; since?: number }> }>();
  for (const entityId of ids) {
    const state = hass.states[entityId];
    if (!state || options.exclude(entityId)) continue;
    const included = options.include(entityId);
    if (!included && hiddenInRegistry(hass, entityId)) continue;
    const problem = state.state === "unavailable" || (options.includeUnknown && state.state === "unknown");
    if (problem) {
      if (!options.showUnavailable || (!included && !options.domains.has(domainOf(entityId)))) continue;
      const { key, deviceName } = unavailableGroup(hass, entityId);
      const group = groups.get(key) ?? { deviceName, entries: [] };
      group.entries.push({ id: entityId, name: entityName(entityId, state), state: state.state as "unavailable" | "unknown", since: timeOf(state.last_changed ?? state.last_updated) });
      groups.set(key, group);
      continue;
    }
    // Un capteur binaire ajouté par `include` n'est lu comme une pile que si son identifiant le dit.
    const battery = isBatteryEntity(entityId, state)
      || (included && (domainOf(entityId) !== "binary_sensor" || entityId.includes("batt")));
    if (!battery) continue;
    const item = readBattery(entityId, state, options);
    if (item) batteries.push(item);
  }

  const unavailable: UnavailableItem[] = [];
  for (const [key, group] of groups) {
    const entries = group.entries.sort((a, b) => a.id.localeCompare(b.id));
    const names = entries.map((entry) => entry.name);
    const name = group.deviceName
      || (entries.length === 1 ? cleanBatteryName(names[0]) : commonNamePrefix(names) || humanize(key));
    const times = entries.map((entry) => entry.since).filter((time): time is number => time !== undefined);
    unavailable.push({
      key,
      name,
      entityId: entries[0].id,
      entityIds: entries.map((entry) => entry.id),
      entityNames: names,
      state: entries.some((entry) => entry.state === "unavailable") ? "unavailable" : "unknown",
      since: times.length ? Math.min(...times) : undefined,
    });
  }

  batteries.sort((a, b) => a.sortValue - b.sortValue || byName(a, b));
  return {
    critical: batteries.filter((item) => item.level === "critical").sort(compareBatteries),
    low: batteries.filter((item) => item.level === "low").sort(compareBatteries),
    batteries,
    unavailable: unavailable.sort(compareUnavailable),
  };
}

/** Lignes de la carte, dans l'ordre : critiques, faibles, indisponibles. */
export function problemItems(report: BatteryReport): Array<BatteryItem | UnavailableItem> {
  return [...report.critical, ...report.low, ...report.unavailable];
}

const plural = (count: number, word: string): string => `${count} ${word}${count > 1 ? "s" : ""}`;

/** Résumé de l'en-tête et couleur de la pastille. */
export function summarizeReport(report: Pick<BatteryReport, "critical" | "low" | "unavailable">): { tone: "healthy" | "warning" | "danger"; text: string } {
  const parts: string[] = [];
  const critical = report.critical.length;
  const low = report.low.length;
  const unavailable = report.unavailable.length;
  if (critical) parts.push(`${plural(critical, "pile")} ${critical > 1 ? "critiques" : "critique"}`);
  if (low) parts.push(`${plural(low, "pile")} ${low > 1 ? "faibles" : "faible"}`);
  if (unavailable) parts.push(`${plural(unavailable, "appareil")} ${unavailable > 1 ? "indisponibles" : "indisponible"}`);
  if (!parts.length) return { tone: "healthy", text: "Tout va bien" };
  return { tone: critical || unavailable ? "danger" : "warning", text: parts.join(" · ") };
}

/** Durée écoulée en français : « depuis 12 min », « depuis 3 h », « depuis 2 j ». */
export function formatSince(since: number | undefined, now: number): string | undefined {
  if (since === undefined || !Number.isFinite(since) || !Number.isFinite(now)) return undefined;
  const minutes = Math.floor(Math.max(0, now - since) / MINUTE);
  if (minutes < 1) return "depuis moins d'une minute";
  if (minutes < 60) return `depuis ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `depuis ${hours} h`;
  return `depuis ${Math.floor(hours / 24)} j`;
}

/** Icône d'une pile : jauge par dizaine pour un pourcentage, niveau pour un état texte. */
export function batteryIcon(item: Pick<BatteryItem, "percent" | "textLevel">): string {
  if (item.percent !== undefined) {
    const step = Math.round(Math.min(100, Math.max(0, item.percent)) / 10) * 10;
    if (step <= 0) return "mdi:battery-alert";
    return step >= 100 ? "mdi:battery" : `mdi:battery-${step}`;
  }
  switch (item.textLevel) {
    case "critical": return "mdi:battery-alert";
    case "low": return "mdi:battery-low";
    case "medium": return "mdi:battery-medium";
    case "ok": return "mdi:battery-high";
    default: return "mdi:battery-unknown";
  }
}

const isBattery = (item: BatteryItem | UnavailableItem): item is BatteryItem => "level" in item;

/** Empreinte de ce qu'affiche la carte : elle ne se redessine que si elle change. */
export function reportSignature(report: BatteryReport, showOk: boolean): string {
  const battery = (item: BatteryItem): string => `${item.entityId}=${item.level}:${item.label}:${item.name}`;
  return [
    ...(showOk ? report.batteries : [...report.critical, ...report.low]).map(battery),
    ...report.unavailable.map((item) => `${item.key}=${item.state}:${item.since ?? ""}:${item.entityIds.join(",")}:${item.name}`),
  ].join("|");
}

interface ReportMemo {
  states: HomeAssistant["states"];
  entities?: unknown;
  devices?: unknown;
  ids: Set<string>;
  report: BatteryReport;
  signature: string;
}

interface RowView {
  key: string;
  entityId: string;
  icon: string;
  name: string;
  value: string;
  detail?: string;
  className: string;
  ariaLabel: string;
  alertDot: boolean;
}

const LEVEL_WORD: Record<BatteryLevel, string> = { critical: "pile critique", low: "pile faible", ok: "pile en bon état" };

function rowView(item: BatteryItem | UnavailableItem, now: number, detailed: boolean): RowView {
  if (isBattery(item)) {
    return {
      key: item.entityId,
      entityId: item.entityId,
      icon: batteryIcon(item),
      name: item.name,
      value: item.label,
      className: item.level === "critical" ? "sev-critical" : item.level === "low" ? "sev-warning" : "ok",
      ariaLabel: `${item.name} : ${item.label}, ${LEVEL_WORD[item.level]}. Ouvrir la fiche.`,
      alertDot: false,
    };
  }
  const since = formatSince(item.since, now);
  const count = item.entityIds.length;
  const value = item.state === "unknown" ? "État inconnu" : "Indisponible";
  const names = item.entityNames.slice(0, 3).join(", ") + (count > 3 ? "…" : "");
  const detail = [since, count > 1 ? (detailed ? names : plural(count, "entité")) : ""].filter(Boolean).join(" · ");
  return {
    key: item.key,
    entityId: item.entityId,
    icon: "mdi:lan-disconnect",
    name: item.name,
    value,
    detail: detail || undefined,
    className: "unavailable",
    ariaLabel: `${item.name} : ${value.toLowerCase()}${since ? ` ${since}` : ""}${count > 1 ? `, ${plural(count, "entité")}` : ""}. Ouvrir la fiche.`,
    alertDot: true,
  };
}

export class AuralisBatteriesCard extends AuralisBaseCard<BatteriesCardConfig> {
  static styles = [
    sharedStyles,
    css`
      :host {
        --batteries-accent: var(--auralis-card-accent, var(--auralis-info));
      }

      ha-card {
        background: var(--auralis-card-background, var(--auralis-bg));
      }

      .row,
      .more,
      .all-good {
        box-sizing: border-box;
      }

      .shell {
        container-type: inline-size;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
      }

      .header {
        margin-bottom: 0;
      }

      .header .tile-icon {
        background: color-mix(in srgb, var(--batteries-accent) 14%, transparent);
        color: color-mix(in oklab, var(--batteries-accent), #000 var(--auralis-shade));
      }

      .header .tile-icon ha-icon {
        --mdc-icon-size: 22px;
        color: inherit;
      }

      .header h2 {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Le résumé passe à la ligne plutôt que d'être coupé sur une carte étroite. */
      .status-line {
        align-items: flex-start;
      }

      .status-line .dot {
        margin-top: 4px;
      }

      .status-line .subtitle {
        min-width: 0;
        font-size: var(--auralis-text-md);
        line-height: 1.35;
      }

      .rows {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 8px;
      }

      .row {
        --row-color: var(--auralis-muted);
        display: grid;
        width: 100%;
        min-height: var(--auralis-target);
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        padding: 7px 12px 7px 8px;
        border: 1px solid var(--auralis-border);
        border-radius: var(--auralis-radius-md);
        background: var(--auralis-layer);
        color: var(--auralis-text);
        cursor: pointer;
        text-align: start;
      }

      .row:hover {
        filter: brightness(0.97);
      }

      .row.sev-critical {
        --row-color: var(--auralis-danger-ink);
        border-color: color-mix(in srgb, var(--auralis-danger) 32%, var(--auralis-border));
      }

      .row.sev-warning {
        --row-color: var(--auralis-active-ink);
      }

      .row.ok {
        --row-color: var(--auralis-healthy-ink);
      }

      .row-icon {
        position: relative;
        display: grid;
        width: 34px;
        height: 34px;
        place-items: center;
        border-radius: 11px;
        background: color-mix(in srgb, var(--row-color) 14%, transparent);
        color: var(--row-color);
      }

      .row-icon ha-icon {
        --mdc-icon-size: 20px;
      }

      .row-icon .alert-dot {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: var(--auralis-danger);
        box-shadow: 0 0 0 2px var(--auralis-layer);
      }

      .row-meta {
        display: grid;
        min-width: 0;
        gap: 2px;
      }

      .row-name,
      .row-detail {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .row-name {
        font-size: var(--auralis-text-md);
        font-weight: 680;
      }

      .row-detail {
        color: var(--auralis-muted);
        font-size: var(--auralis-text-xs);
      }

      .row-value {
        color: var(--row-color);
        font-size: var(--auralis-text-md);
        font-weight: 740;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .row.unavailable .row-value {
        color: var(--auralis-muted);
      }

      .all-good {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        border: 1px solid color-mix(in srgb, var(--auralis-healthy) 28%, var(--auralis-border));
        border-radius: var(--auralis-radius-md);
        background: color-mix(in srgb, var(--auralis-healthy) 8%, var(--auralis-layer));
        color: var(--auralis-text);
        font-size: var(--auralis-text-md);
        line-height: 1.4;
      }

      .all-good ha-icon {
        --mdc-icon-size: 26px;
        flex: 0 0 auto;
        color: var(--auralis-healthy-ink);
      }

      .more {
        width: 100%;
        min-height: var(--auralis-target);
        font-size: var(--auralis-text-md);
      }

      .more ha-icon {
        --mdc-icon-size: 18px;
      }

      .dialog .dialog-section:first-child {
        margin-top: 0;
      }

      details.dialog-section > summary {
        display: flex;
        min-height: var(--auralis-target);
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin: 0 2px;
        cursor: pointer;
        list-style: none;
      }

      details.dialog-section > summary::-webkit-details-marker {
        display: none;
      }

      details.dialog-section > summary ha-icon {
        --mdc-icon-size: 18px;
        color: var(--auralis-muted);
        transition: transform 160ms ease;
      }

      details[open].dialog-section > summary ha-icon {
        transform: rotate(180deg);
      }

      details.dialog-section > summary .dialog-section-title {
        margin: 0;
      }

      @container (max-width: 260px) {
        .row {
          grid-template-columns: auto minmax(0, 1fr);
        }

        .row-value {
          grid-column: 2;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        details.dialog-section > summary ha-icon {
          transition: none;
        }
      }
    `,
  ];

  private discovery: DiscoveryOptions = discoveryOptions();
  private candidates?: { config?: BatteriesCardConfig; count: number; last?: string; entities?: unknown; ids: Set<string> };
  private memo?: ReportMemo;
  private renderedSignature?: string;
  private clock?: number;

  public setConfig(config: BatteriesCardConfig): void {
    if (!config || typeof config !== "object") throw new Error("Configuration invalide.");
    const number = (value: unknown, option: string, min: number, max: number): number | undefined => {
      if (value === undefined || value === null || value === "") return undefined;
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) throw new Error(`${option} doit être un nombre entre ${min} et ${max}.`);
      return Math.min(max, Math.max(min, parsed));
    };
    const low = number(config.low_threshold, "low_threshold", 0, 100) ?? DEFAULT_LOW_THRESHOLD;
    const critical = Math.min(low, number(config.critical_threshold, "critical_threshold", 0, 100) ?? DEFAULT_CRITICAL_THRESHOLD);
    const domains = optionList(config.unavailable_domains, "unavailable_domains");
    const normalized: BatteriesCardConfig = {
      ...config,
      name: config.name || DEFAULT_NAME,
      icon: config.icon || DEFAULT_ICON,
      theme: config.theme || "auto",
      low_threshold: low,
      critical_threshold: critical,
      include: optionList(config.include, "include"),
      exclude: optionList(config.exclude, "exclude"),
      unavailable_domains: domains.length ? domains : [...DEFAULT_UNAVAILABLE_DOMAINS],
      max_items: Math.round(number(config.max_items, "max_items", 1, 50) ?? DEFAULT_MAX_ITEMS),
      show_ok: config.show_ok === true,
      show_unavailable: config.show_unavailable !== false,
      include_unknown: config.include_unknown === true,
      warn_on_medium: config.warn_on_medium === true,
    };
    const invalid = [...normalized.include as string[], ...normalized.exclude as string[]].find((pattern) => !ENTITY_PATTERN.test(pattern.toLowerCase()));
    if (invalid) throw new Error(`« ${invalid} » n'est ni une entité ni un motif (ex. sensor.*_battery).`);
    this.discovery = discoveryOptions(normalized);
    this.config = normalized;
    this.candidates = undefined;
    this.memo = undefined;
  }

  public static getStubConfig(): Partial<BatteriesCardConfig> {
    return { name: DEFAULT_NAME, low_threshold: DEFAULT_LOW_THRESHOLD, critical_threshold: DEFAULT_CRITICAL_THRESHOLD };
  }

  public static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      name: "Titre",
      icon: "Icône",
      low_threshold: "Pile faible sous (%)",
      critical_threshold: "Pile critique sous (%)",
      warn_on_medium: "Signaler les piles « moyennes »",
      show_unavailable: "Signaler les appareils indisponibles",
      include_unknown: "Compter les états inconnus comme indisponibles",
      show_ok: "Lister aussi les piles en bon état (Voir tout)",
      max_items: "Lignes affichées sur la carte",
      include: "Entités ou motifs à ajouter (ex. sensor.*_pile)",
      exclude: "Entités ou motifs à ignorer (ex. sensor.*_voltage)",
      unavailable_domains: "Domaines surveillés pour l'indisponibilité",
      theme: "Thème",
      accent_color: "Couleur d’accent",
      card_background: "Fond de la carte",
    };
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "low_threshold", selector: { number: { min: 0, max: 100, step: 1, mode: "slider", unit_of_measurement: "%" } } },
        { name: "critical_threshold", selector: { number: { min: 0, max: 100, step: 1, mode: "slider", unit_of_measurement: "%" } } },
        { name: "warn_on_medium", selector: { boolean: {} } },
        { name: "show_unavailable", selector: { boolean: {} } },
        { name: "include_unknown", selector: { boolean: {} } },
        { name: "show_ok", selector: { boolean: {} } },
        { name: "max_items", selector: { number: { min: 1, max: 50, step: 1, mode: "box" } } },
        { name: "include", selector: { text: { multiple: true } } },
        { name: "exclude", selector: { text: { multiple: true } } },
        { name: "unavailable_domains", selector: { select: { multiple: true, custom_value: true, options: DEFAULT_UNAVAILABLE_DOMAINS } } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        { name: "accent_color", selector: { text: {} } },
        { name: "card_background", selector: { object: {} } },
      ],
      computeLabel: ({ name }: { name: string }) => labels[name] ?? name,
    };
  }

  public getGridOptions(): Record<string, number | string> {
    return { columns: 6, min_columns: 4, rows: "auto" };
  }

  public getCardSize(): number {
    const report = this.report();
    const rows = report ? Math.min(problemItems(report).length, this.config?.max_items ?? DEFAULT_MAX_ITEMS) : 0;
    return 2 + Math.max(1, rows);
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // Les durées « depuis 12 min » avancent même sans changement d'état.
    this.clock = window.setInterval(() => {
      if (this.memo?.report.unavailable.length) this.requestUpdate();
    }, MINUTE);
  }

  public disconnectedCallback(): void {
    window.clearInterval(this.clock);
    super.disconnectedCallback();
  }

  /**
   * Piles et entités des domaines surveillés. Recalculé seulement quand la liste des entités
   * change (nombre, dernière entité ajoutée, registre), pas à chaque nouvel objet `hass`.
   */
  protected watchedEntityIds(): Set<string> {
    const hass = this.hass as BatteriesHass | undefined;
    if (!hass || !this.config) return new Set();
    const keys = Object.keys(hass.states);
    const count = keys.length;
    const last = keys[count - 1];
    const cached = this.candidates;
    if (cached && cached.config === this.config && cached.count === count && cached.last === last && cached.entities === hass.entities) {
      return cached.ids;
    }
    const ids = batteryCandidates(hass, this.discovery);
    this.candidates = { config: this.config, count, last, entities: hass.entities, ids };
    return ids;
  }

  /**
   * Toutes les entités de capteurs changent souvent : la carte ne se redessine que si ce
   * qu'elle affiche change (niveau, libellé, nouvelle panne), ou si le registre ou un réglage
   * global change.
   */
  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!changed.has("hass") || changed.size > 1) return true;
    const previous = changed.get("hass") as BatteriesHass | undefined;
    const next = this.hass as BatteriesHass | undefined;
    if (!previous || !next) return true;
    if (previous.entities !== next.entities || previous.devices !== next.devices) return true;
    if (!super.shouldUpdate(changed)) return false;
    if (hassChangeMatters(previous, next, [])) return true;
    return this.memoized()?.signature !== this.renderedSignature;
  }

  /** Inventaire calculé une fois par objet `hass.states`. */
  private memoized(): ReportMemo | undefined {
    const hass = this.hass as BatteriesHass | undefined;
    if (!hass || !this.config) return undefined;
    const ids = this.watchedEntityIds();
    const memo = this.memo;
    if (memo && memo.states === hass.states && memo.entities === hass.entities && memo.devices === hass.devices && memo.ids === ids) return memo;
    const report = discoverBatteries(hass, this.discovery, ids);
    this.memo = { states: hass.states, entities: hass.entities, devices: hass.devices, ids, report, signature: reportSignature(report, this.config.show_ok === true) };
    return this.memo;
  }

  private report(): BatteryReport | undefined {
    return this.memoized()?.report;
  }

  private renderRow(item: BatteryItem | UnavailableItem, now: number, detailed = false): TemplateResult {
    const row = rowView(item, now, detailed);
    return html`<button class="row ${row.className}" type="button" aria-label=${row.ariaLabel} @click=${() => this.moreInfo(row.entityId)}>
      <span class="row-icon" aria-hidden="true"><ha-icon .icon=${row.icon}></ha-icon>${row.alertDot ? html`<span class="alert-dot"></span>` : nothing}</span>
      <span class="row-meta">
        <span class="row-name">${row.name}</span>
        ${row.detail ? html`<span class="row-detail">${row.detail}</span>` : nothing}
      </span>
      <span class="row-value">${row.value}</span>
    </button>`;
  }

  private renderSection(title: string, items: Array<BatteryItem | UnavailableItem>, now: number): TemplateResult | typeof nothing {
    if (!items.length) return nothing;
    return html`<section class="dialog-section">
      <h3 class="dialog-section-title">${title} (${items.length})</h3>
      <div class="rows">${items.map((item) => this.renderRow(item, now, true))}</div>
    </section>`;
  }

  private renderAllDialog(report: BatteryReport, now: number): TemplateResult {
    const config = this.config!;
    const problems = problemItems(report).length;
    return this.renderDialog(config.name || DEFAULT_NAME, config.icon || DEFAULT_ICON, html`<div class="dialog-body">
      ${this.renderSection("Piles critiques", report.critical, now)}
      ${this.renderSection("Piles faibles", report.low, now)}
      ${this.renderSection("Appareils indisponibles", report.unavailable, now)}
      ${problems ? nothing : html`<div class="all-good"><ha-icon icon="mdi:check-circle-outline"></ha-icon>
        <span>Toutes les piles sont chargées et tous les appareils répondent.</span></div>`}
      ${config.show_ok && report.batteries.length ? html`<details class="dialog-section">
        <summary><span class="dialog-section-title">Toutes les piles (${report.batteries.length})</span><ha-icon icon="mdi:chevron-down"></ha-icon></summary>
        <div class="rows">${report.batteries.map((item) => this.renderRow(item, now, true))}</div>
      </details>` : nothing}
    </div>`);
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.config) return nothing;
    const memo = this.memoized();
    this.renderedSignature = memo?.signature;
    const report = memo?.report ?? { critical: [], low: [], batteries: [], unavailable: [] };
    const now = Date.now();
    const problems = problemItems(report);
    const visible = problems.slice(0, this.config.max_items ?? DEFAULT_MAX_ITEMS);
    const hidden = problems.length - visible.length;
    const summary = summarizeReport(report);
    const showAll = hidden > 0 || (this.config.show_ok === true && report.batteries.length > 0);
    return html`<ha-card><div class="shell">
      <header class="header">
        <span class="tile-icon" aria-hidden="true"><ha-icon .icon=${this.config.icon || DEFAULT_ICON}></ha-icon></span>
        <div class="title-wrap">
          <h2>${this.config.name || DEFAULT_NAME}</h2>
          <div class="status-line"><span class="dot ${summary.tone}"></span><span class="subtitle">${summary.text}</span></div>
        </div>
      </header>
      ${visible.length
        ? html`<div class="rows">${visible.map((item) => this.renderRow(item, now))}</div>`
        : html`<div class="all-good" role="status"><ha-icon icon="mdi:check-circle-outline"></ha-icon>
          <span>Toutes les piles sont chargées et tous les appareils répondent.</span></div>`}
      ${showAll ? html`<button class="action more" type="button" aria-haspopup="dialog" @click=${() => this.openDialog("all")}>
        ${hidden > 0 ? `Voir tout (${problems.length})` : `Toutes les piles (${report.batteries.length})`}
        <ha-icon icon="mdi:arrow-right"></ha-icon></button>` : nothing}
    </div></ha-card>
    ${this.dialog === "all" ? this.renderAllDialog(report, now) : nothing}`;
  }
}
