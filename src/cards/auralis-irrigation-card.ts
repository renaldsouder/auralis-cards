import { css, html, nothing, unsafeCSS, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import { forecastTypes, parseForecast, type ForecastEntry, type ForecastType } from "./auralis-weather-card";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { domainOf, entity, formatNumber, friendlyName, isCommandable } from "../utils/entities";
import { severity, type Severity } from "../utils/severity";

/** Une zone d'arrosage : une vanne et ses entités associées. */
export interface IrrigationZoneConfig {
  /** Vanne commandée : `switch.*` ou `valve.*`. Obligatoire. */
  valve_entity: string;
  name?: string;
  icon?: string;
  /** Minuterie de l'appareil (`number.*` ou `input_number.*`) : la vanne se ferme seule à son terme. */
  countdown_entity?: string;
  battery_entity?: string;
  error_entity?: string;
  /** Active ou suspend l'arrosage automatique : `automation.*`, `input_boolean.*` ou `schedule.*`. */
  schedule_entity?: string;
  /** Horaires affichés, au format HH:MM (la carte ne lit pas les déclencheurs des automatisations). */
  schedule?: string | string[];
  /** Durées proposées, en minutes. */
  durations?: Array<number | string>;
  /** Durée maximale d'un arrosage manuel, en minutes. */
  max_duration?: number;
  /** Script qui gère lui-même un arrosage minuté ; reçoit `duration` (minutes) dans ses variables. */
  script_entity?: string;
}

export interface IrrigationCardConfig extends BaseCardConfig, Partial<Omit<IrrigationZoneConfig, "name" | "icon">> {
  type: "custom:auralis-irrigation-card";
  /** Nom de la zone unique décrite au premier niveau (`name` est le titre de la carte). */
  zone_name?: string;
  zone_icon?: string;
  zones?: IrrigationZoneConfig[];
  /** Entité météo pour signaler la pluie prévue. */
  weather_entity?: string;
  /** Cumul de pluie (mm sur 24 h) à partir duquel l'information est affichée. */
  rain_threshold?: number;
}

/** Zone normalisée par `normalizeZones`. */
export interface IrrigationZone {
  valve_entity: string;
  name?: string;
  icon: string;
  countdown_entity?: string;
  battery_entity?: string;
  error_entity?: string;
  schedule_entity?: string;
  schedule: string[];
  durations: number[];
  max_duration: number;
  script_entity?: string;
}

/** Manière de lancer un arrosage minuté, de la plus sûre à l'absence de minuterie. */
export type TimedRunStrategy = "script" | "countdown" | "manual";

export interface NextWatering {
  /** Heure locale HH:MM. */
  time: string;
  tomorrow: boolean;
  /** Délai approximatif avant cet arrosage. */
  inMs: number;
  /** « ce soir à 23:00 », « demain à 07:00 »… */
  label: string;
}

export interface BatteryInfo {
  level?: number;
  severity: Severity;
  low: boolean;
  label: string;
}

export interface CountdownSetting {
  /** Valeur à écrire dans l'entité, dans son unité. */
  value: number;
  /** Durée réellement programmée, en minutes. */
  minutes: number;
  /** Vrai si la durée demandée a été arrondie ou bornée par l'appareil. */
  adjusted: boolean;
}

export interface ZoneView {
  index: number;
  zone: IrrigationZone;
  label: string;
  icon: string;
  available: boolean;
  open: boolean;
  status: string;
  /** Le statut affiche une durée écoulée : à rafraîchir pendant l'arrosage. */
  usesElapsed: boolean;
  next?: NextWatering;
  paused: boolean;
  pausable: boolean;
  scheduleReady: boolean;
  battery?: BatteryInfo;
  error?: string;
  strategy: TimedRunStrategy;
  timedReady: boolean;
}

export interface CardSummary {
  text: string;
  tone: "" | "healthy" | "warning" | "danger" | "water";
}

export const DEFAULT_DURATIONS = [5, 10, 20];
export const DEFAULT_MAX_DURATION = 60;
export const DEFAULT_RAIN_THRESHOLD = 2;
export const DEFAULT_ZONE_ICON = "mdi:sprinkler-variant";
export const BATTERY_LEVELS = { warning: 30, critical: 15 };

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const ELAPSED_REFRESH = 30_000;
const RETRY_BASE = 15_000;
const RETRY_MAX = 15 * MINUTE;
const WATER_ACCENT = "#2b9af3";

const VALVE_ID = /^(switch|valve)\.[a-z0-9_]+$/;
const COUNTDOWN_ID = /^(number|input_number)\.[a-z0-9_]+$/;
const SCHEDULE_ID = /^(automation|schedule|input_boolean)\.[a-z0-9_]+$/;
const SCRIPT_ID = /^script\.[a-z0-9_]+$/;
const WEATHER_ID = /^weather\.[a-z0-9_]+$/;
const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/;
const TIME = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

const ERROR_OK = new Set(["", "none", "ok", "unknown", "unavailable", "normal", "no_error", "no error", "aucune", "aucun"]);
const BATTERY_LOW = new Set(["low", "faible", "weak", "warning"]);
const BATTERY_CRITICAL = new Set(["critical", "critique", "empty", "vide", "very_low"]);
const BATTERY_MEDIUM = new Set(["medium", "middle", "moyen", "moyenne"]);
const BATTERY_GOOD = new Set(["high", "full", "normal", "ok", "good", "haute", "pleine", "bon"]);

const finite = (value: unknown): number | undefined => {
  const number = typeof value === "string" && value.trim() ? Number(value.replace(",", ".")) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : undefined;
};
const pad = (value: number): string => String(value).padStart(2, "0");
const roundTo = (value: number, digits = 6): number => Math.round(value * 10 ** digits) / 10 ** digits;

/* ---------- Configuration ---------- */

/** Minutes depuis minuit d'un horaire « HH:MM » (ou « HH:MM:SS »). */
export function parseTime(value: unknown): number | undefined {
  const match = typeof value === "string" ? TIME.exec(value.trim()) : null;
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : undefined;
}

export function formatTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
}

function optionalId(value: unknown, pattern: RegExp, message: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !pattern.test(value.trim())) throw new Error(message);
  return value.trim();
}

function normalizeZone(raw: IrrigationZoneConfig, position: number): IrrigationZone {
  const where = `Zone ${position}`;
  if (!raw || typeof raw !== "object" || typeof raw.valve_entity !== "string" || !VALVE_ID.test(raw.valve_entity.trim())) {
    throw new Error(`${where} : indiquez la vanne valve_entity (switch.* ou valve.*).`);
  }
  const maxValue = finite(raw.max_duration);
  const max_duration = maxValue !== undefined && maxValue > 0 ? Math.min(1440, maxValue) : DEFAULT_MAX_DURATION;
  const rawTimes = raw.schedule === undefined || raw.schedule === null || raw.schedule === ""
    ? [] : Array.isArray(raw.schedule) ? raw.schedule : [raw.schedule];
  const times = rawTimes.map((time) => {
    const minutes = parseTime(time);
    if (minutes === undefined) throw new Error(`${where} : horaire invalide « ${String(time)} », utilisez le format HH:MM.`);
    return minutes;
  });
  const rawDurations = Array.isArray(raw.durations) ? raw.durations : raw.durations === undefined ? DEFAULT_DURATIONS : [raw.durations];
  const durations = [...new Set(rawDurations
    .map((value) => finite(value))
    .filter((value): value is number => value !== undefined && value > 0 && value <= max_duration)
    .map((value) => roundTo(value, 2)))]
    .sort((a, b) => a - b);
  return {
    valve_entity: raw.valve_entity.trim(),
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : undefined,
    icon: typeof raw.icon === "string" && raw.icon.trim() ? raw.icon.trim() : DEFAULT_ZONE_ICON,
    countdown_entity: optionalId(raw.countdown_entity, COUNTDOWN_ID, `${where} : countdown_entity doit être une entité number.* ou input_number.*.`),
    battery_entity: optionalId(raw.battery_entity, ENTITY_ID, `${where} : battery_entity n’est pas un identifiant d’entité.`),
    error_entity: optionalId(raw.error_entity, ENTITY_ID, `${where} : error_entity n’est pas un identifiant d’entité.`),
    schedule_entity: optionalId(raw.schedule_entity, SCHEDULE_ID, `${where} : schedule_entity doit être une entité automation.*, schedule.* ou input_boolean.*.`),
    script_entity: optionalId(raw.script_entity, SCRIPT_ID, `${where} : script_entity doit être un script (script.*).`),
    schedule: [...new Set(times)].sort((a, b) => a - b).map(formatTime),
    durations: durations.length ? durations : [Math.min(max_duration, DEFAULT_DURATIONS[0])],
    max_duration,
  };
}

/**
 * Zones de la carte : la zone décrite au premier niveau (`valve_entity`…) en premier,
 * puis celles de `zones`. Lève une erreur lisible si aucune vanne n'est configurée.
 */
export function normalizeZones(config: Partial<IrrigationCardConfig>): IrrigationZone[] {
  if (config.zones !== undefined && config.zones !== null && !Array.isArray(config.zones)) {
    throw new Error("zones doit être une liste de zones.");
  }
  const zones: IrrigationZone[] = [];
  const hasTopLevel = config.valve_entity !== undefined && config.valve_entity !== null && config.valve_entity !== "";
  if (hasTopLevel) {
    zones.push(normalizeZone({
      valve_entity: config.valve_entity as string,
      name: config.zone_name,
      icon: config.zone_icon,
      countdown_entity: config.countdown_entity,
      battery_entity: config.battery_entity,
      error_entity: config.error_entity,
      schedule_entity: config.schedule_entity,
      schedule: config.schedule,
      durations: config.durations,
      max_duration: config.max_duration,
      script_entity: config.script_entity,
    }, 1));
  }
  (config.zones ?? []).forEach((zone) => zones.push(normalizeZone(zone, zones.length + 1)));
  if (!zones.length) throw new Error("Configurez une vanne : valve_entity (switch.* ou valve.*) ou une liste zones.");
  return zones;
}

/* ---------- Heures ---------- */

const clockFormatters = new Map<string, Intl.DateTimeFormat>();

function clockFormatter(timeZone?: string): Intl.DateTimeFormat {
  const key = timeZone ?? "";
  let formatter = clockFormatters.get(key);
  if (!formatter) {
    const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" };
    try {
      formatter = new Intl.DateTimeFormat("en-GB", { ...options, timeZone: timeZone || undefined });
    } catch {
      formatter = new Intl.DateTimeFormat("en-GB", options);
    }
    clockFormatters.set(key, formatter);
  }
  return formatter;
}

/** Heure locale (fuseau de Home Assistant) : minutes depuis minuit et secondes. */
export function localClock(now: number, timeZone?: string): { minutes: number; seconds: number } {
  const parts: Record<string, string> = {};
  for (const part of clockFormatter(timeZone).formatToParts(now)) parts[part.type] = part.value;
  return { minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute), seconds: Number(parts.second) || 0 };
}

function dayLabel(minutes: number, tomorrow: boolean): string {
  const time = formatTime(minutes);
  if (tomorrow) return `demain à ${time}`;
  return minutes >= 18 * 60 ? `ce soir à ${time}` : `aujourd’hui à ${time}`;
}

/** Prochain horaire après maintenant, aujourd'hui ou demain, dans le fuseau donné. */
export function nextWatering(times: string[], now: number, timeZone?: string): NextWatering | undefined {
  const sorted = times.map(parseTime).filter((value): value is number => value !== undefined).sort((a, b) => a - b);
  if (!sorted.length) return undefined;
  const clock = localClock(now, timeZone);
  const today = sorted.find((minutes) => minutes > clock.minutes);
  const tomorrow = today === undefined;
  const target = today ?? sorted[0];
  const inMs = ((tomorrow ? 1440 : 0) + target - clock.minutes) * MINUTE - clock.seconds * 1000;
  return { time: formatTime(target), tomorrow, inMs, label: dayLabel(target, tomorrow) };
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

function dayKey(time: number, timeZone?: string): number {
  const key = timeZone ?? "";
  let formatter = dayFormatters.get(key);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timeZone || undefined });
    } catch {
      formatter = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
    }
    dayFormatters.set(key, formatter);
  }
  return Date.parse(`${formatter.format(time)}T00:00:00Z`);
}

/** Prochain début d'une entité `schedule.*` (attribut `next_event`). */
export function nextEventWatering(nextEvent: unknown, now: number, timeZone?: string): NextWatering | undefined {
  const time = typeof nextEvent === "string" ? Date.parse(nextEvent) : Number.NaN;
  if (!Number.isFinite(time) || time <= now) return undefined;
  const days = Math.round((dayKey(time, timeZone) - dayKey(now, timeZone)) / DAY);
  if (days > 1) {
    let date: string;
    try {
      date = new Intl.DateTimeFormat("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone }).format(time);
    } catch {
      date = new Intl.DateTimeFormat("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit" }).format(time);
    }
    return { time: formatTime(localClock(time, timeZone).minutes), tomorrow: false, inMs: time - now, label: date.replace(" ", " à ") };
  }
  const minutes = localClock(time, timeZone).minutes;
  return { time: formatTime(minutes), tomorrow: days === 1, inMs: time - now, label: dayLabel(minutes, days === 1) };
}

/** Délai jusqu'au prochain minuit local, pour que « demain » devienne « aujourd'hui ». */
export function msUntilMidnight(now: number, timeZone?: string): number {
  const clock = localClock(now, timeZone);
  return (1440 - clock.minutes) * MINUTE - clock.seconds * 1000;
}

/* ---------- Durées ---------- */

/** Secondes par unité d'une minuterie : secondes, minutes (par défaut) ou heures. */
export function unitSeconds(unit: unknown): number {
  const value = typeof unit === "string" ? unit.trim().toLowerCase() : "";
  if (/^(s|sec|secs|second|seconds|seconde|secondes)$/.test(value)) return 1;
  if (/^(h|hr|hrs|hour|hours|heure|heures)$/.test(value)) return 3600;
  return 60;
}

/**
 * Valeur à écrire dans la minuterie de l'appareil pour une durée en minutes :
 * convertie dans son unité, arrondie à son pas et bornée par son minimum et son maximum.
 */
export function countdownSetting(minutes: number, attributes: Record<string, unknown> = {}): CountdownSetting {
  const factor = unitSeconds(attributes.unit_of_measurement);
  const rawStep = finite(attributes.step);
  // Sans pas annoncé : unité entière en secondes et en minutes, centième d'heure sinon.
  const step = rawStep !== undefined && rawStep > 0 ? rawStep : factor === 3600 ? 0.01 : 1;
  const min = finite(attributes.min);
  const max = finite(attributes.max);
  const base = min ?? 0;
  const wanted = (minutes * 60) / factor;
  let value = base + Math.round((wanted - base) / step) * step;
  if (max !== undefined && value > max) value = base + Math.floor((max - base) / step) * step;
  if (min !== undefined && value < min) value = min;
  // Une minuterie à zéro n'arrête rien : au moins un pas.
  if (value <= 0) value = Math.max(step, min ?? 0);
  value = roundTo(value);
  const programmed = roundTo((value * factor) / 60);
  return { value, minutes: programmed, adjusted: Math.abs(programmed - minutes) > 1e-6 };
}

/** Durée lisible : « 45 s », « 10 min », « 1 h 30 ». */
export function formatDuration(seconds: number, rounding: "ceil" | "floor" | "round" = "round"): string {
  const total = Math.max(0, seconds);
  if (total < 60) return `${Math.round(total)} s`;
  const minutes = Math[rounding](roundTo(total / 60, 3));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${pad(rest)}` : `${hours} h`;
}

/** Stratégie d'arrosage minuté d'une zone : script, minuterie de l'appareil, ou aucune. */
export function timedRunStrategy(zone: Pick<IrrigationZone, "script_entity" | "countdown_entity">): TimedRunStrategy {
  if (zone.script_entity) return "script";
  if (zone.countdown_entity) return "countdown";
  return "manual";
}

/* ---------- Pile, erreurs, pluie ---------- */

/** Pile en pourcentage, en texte (« low », « faible »…) ou capteur binaire de batterie faible. */
export function batteryInfo(state?: string, domain?: string): BatteryInfo | undefined {
  const value = state?.trim() ?? "";
  const lower = value.toLowerCase();
  if (!value || lower === "unknown" || lower === "unavailable") return undefined;
  if (domain === "binary_sensor") {
    return lower === "on"
      ? { severity: "warning", low: true, label: "Pile faible" }
      : { severity: "normal", low: false, label: "Pile OK" };
  }
  const level = finite(value.replace(/\s*%$/, ""));
  if (level !== undefined) {
    const tone = severity(level, BATTERY_LEVELS, "below");
    const percent = `${formatNumber(level)} %`;
    return {
      level,
      severity: tone,
      low: tone !== "normal",
      label: tone === "normal" ? percent : `Pile faible · ${percent}`,
    };
  }
  if (BATTERY_CRITICAL.has(lower)) return { severity: "critical", low: true, label: "Pile presque vide" };
  if (BATTERY_LOW.has(lower)) return { severity: "warning", low: true, label: "Pile faible" };
  if (BATTERY_MEDIUM.has(lower)) return { severity: "normal", low: false, label: "Pile moyenne" };
  if (BATTERY_GOOD.has(lower)) return { severity: "normal", low: false, label: "Pile OK" };
  return { severity: "normal", low: false, label: `Pile : ${value}` };
}

/** Texte d'erreur à afficher, ou rien quand l'appareil ne signale aucun défaut. */
export function errorText(state?: string, domain?: string): string | undefined {
  const value = state?.trim() ?? "";
  if (domain === "binary_sensor") return value === "on" ? "Anomalie signalée" : undefined;
  if (ERROR_OK.has(value.toLowerCase())) return undefined;
  return value.replace(/_/g, " ");
}

/**
 * Cumul de pluie prévu entre maintenant et `now + horizon`. Chaque prévision couvre
 * l'intervalle jusqu'à la suivante (ou `slot` pour la dernière) ; une prévision à cheval
 * compte au prorata. `undefined` si aucune prévision n'indique de précipitations.
 */
export function rainForecast(entries: ForecastEntry[], now: number, slot = HOUR, horizon = DAY): number | undefined {
  const end = now + horizon;
  let total = 0;
  let known = false;
  entries.forEach((entry, index) => {
    const next = entries[index + 1];
    const duration = next && next.time > entry.time ? next.time - entry.time : slot;
    const start = entry.time;
    const stop = start + duration;
    const overlap = Math.min(stop, end) - Math.max(start, now);
    if (overlap <= 0 || entry.precipitation === undefined) return;
    known = true;
    total += entry.precipitation * (overlap / duration);
  });
  return known ? roundTo(total, 1) : undefined;
}

/** Délai avant une nouvelle tentative d'abonnement aux prévisions : 15 s, 30 s, 1 min… jusqu'à 15 min. */
export function retryDelay(attempt: number): number {
  return Math.min(RETRY_MAX, RETRY_BASE * 2 ** Math.max(0, attempt));
}

/* ---------- État d'une zone ---------- */

export function valveIsOpen(state?: HassEntity): boolean {
  return state?.state === "on" || state?.state === "open" || state?.state === "opening";
}

/** Programmation qu'on peut suspendre depuis la carte (une entité `schedule.*` ne se suspend pas). */
export function schedulePausable(entityId?: string): boolean {
  return /^(automation|input_boolean)\./.test(entityId ?? "");
}

function elapsedLabel(ms: number): string {
  return ms < MINUTE ? "depuis moins d’une minute" : `depuis ${formatDuration(ms / 1000, "floor")}`;
}

/** Tout ce que la carte affiche pour une zone, à partir de l'état de Home Assistant. */
export function zoneView(hass: HomeAssistant | undefined, zone: IrrigationZone, index: number, now: number): ZoneView {
  const valve = entity(hass, zone.valve_entity);
  const available = isCommandable(valve);
  const open = valveIsOpen(valve);
  const timeZone = hass?.config?.time_zone;
  let status = "Fermé";
  let usesElapsed = false;
  if (!available) status = "Indisponible";
  else if (open) {
    const countdown = entity(hass, zone.countdown_entity);
    const remaining = countdown && isCommandable(countdown) ? finite(countdown.state) : undefined;
    const changed = valve?.last_changed ? Date.parse(valve.last_changed) : Number.NaN;
    if (remaining !== undefined && remaining > 0) {
      status = `Arrosage en cours · reste ${formatDuration(remaining * unitSeconds(countdown?.attributes.unit_of_measurement), "ceil")}`;
    } else if (Number.isFinite(changed)) {
      status = `Arrosage en cours · ${elapsedLabel(Math.max(0, now - changed))}`;
      usesElapsed = true;
    } else status = "Arrosage en cours";
  } else if (valve?.state === "closing") status = "Fermeture…";
  else if (valve?.state === "unknown") status = "État inconnu";

  const scheduleState = entity(hass, zone.schedule_entity);
  const pausable = schedulePausable(zone.schedule_entity);
  const paused = pausable && scheduleState?.state === "off";
  let next: NextWatering | undefined;
  if (!paused) {
    next = nextWatering(zone.schedule, now, timeZone);
    if (!next && domainOf(zone.schedule_entity) === "schedule" && scheduleState?.state === "off") {
      next = nextEventWatering(scheduleState.attributes.next_event, now, timeZone);
    }
  }

  const strategy = timedRunStrategy(zone);
  const helper = strategy === "script" ? zone.script_entity : strategy === "countdown" ? zone.countdown_entity : undefined;
  const battery = entity(hass, zone.battery_entity);
  const error = entity(hass, zone.error_entity);
  return {
    index,
    zone,
    label: zone.name || friendlyName(valve, zone.valve_entity),
    icon: zone.icon,
    available,
    open,
    status,
    usesElapsed,
    next,
    paused,
    pausable: pausable && Boolean(scheduleState),
    scheduleReady: isCommandable(scheduleState),
    battery: batteryInfo(battery?.state, domainOf(zone.battery_entity)),
    error: errorText(error?.state, domainOf(zone.error_entity)),
    strategy,
    timedReady: available && (helper === undefined || isCommandable(entity(hass, helper))),
  };
}

/** Ligne d'état de la carte : zones en cours, erreurs, piles faibles. */
export function cardSummary(views: ZoneView[]): CardSummary {
  const running = views.filter((view) => view.open).length;
  const unavailable = views.filter((view) => !view.available).length;
  const errors = views.filter((view) => view.error).length;
  const critical = views.some((view) => view.battery?.severity === "critical");
  const low = views.filter((view) => view.battery?.low).length;
  const parts: string[] = [];
  if (running) parts.push(`${running} zone${running > 1 ? "s" : ""} en cours`);
  else if (unavailable === views.length) parts.push("Indisponible");
  else parts.push("Tout est fermé");
  if (unavailable && unavailable < views.length) parts.push(`${unavailable} indisponible${unavailable > 1 ? "s" : ""}`);
  if (errors) parts.push(errors > 1 ? `${errors} erreurs` : "Erreur signalée");
  if (low) parts.push(critical ? "Pile presque vide" : low > 1 ? `${low} piles faibles` : "Pile faible");
  const tone: CardSummary["tone"] = errors || critical ? "danger"
    : low ? "warning"
      : running ? "water"
        : unavailable === views.length ? "" : "healthy";
  return { text: parts.join(" · "), tone };
}

/** Configuration proposée par l'éditeur : une vanne d'arrosage trouvée dans la maison. */
export function stubConfig(hass?: HomeAssistant): Partial<IrrigationCardConfig> {
  const ids = Object.keys(hass?.states ?? {}).filter((id) => VALVE_ID.test(id));
  const valve = ids.find((id) => /arros|irrig|valve/.test(id))
    ?? ids.find((id) => id.startsWith("valve."))
    ?? "switch.arrosage";
  const object = valve.split(".")[1];
  const has = (id: string): string | undefined => (hass?.states[id] ? id : undefined);
  const config: Partial<IrrigationCardConfig> = { type: "custom:auralis-irrigation-card", valve_entity: valve };
  const countdown = has(`number.${object}_countdown`);
  const battery = has(`sensor.${object}_battery`) ?? has(`sensor.${object}_battery_state`);
  const error = has(`sensor.${object}_error_status`);
  if (countdown) config.countdown_entity = countdown;
  if (battery) config.battery_entity = battery;
  if (error) config.error_entity = error;
  return config;
}

/* ---------- Carte ---------- */

type Unsubscribe = () => unknown;

interface ForecastState {
  type: ForecastType;
  entries: ForecastEntry[];
}

export class AuralisIrrigationCard extends AuralisBaseCard<IrrigationCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    now: { state: true },
    forecast: { state: true },
    selected: { state: true },
  };

  static styles = [AuralisBaseCard.styles, css`
    :host {
      --water: var(--auralis-card-accent, ${unsafeCSS(WATER_ACCENT)});
      --water-text: color-mix(in srgb, var(--water) 70%, var(--auralis-text));
      container-type: inline-size;
    }
    :host([data-background]) ha-card, :host([data-background]) .shell { background: var(--auralis-card-background); }
    .header { margin-bottom: 14px; }
    .header .tile-icon { width: 42px; height: 42px; flex: 0 0 auto; background: color-mix(in srgb, var(--water) 16%, var(--auralis-layer)); color: var(--water); }
    .header .tile-icon ha-icon { --mdc-icon-size: 24px; color: inherit; }
    .header h2 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .status-line { color: var(--auralis-muted); font-size: var(--auralis-text-sm); }
    .status-line .dot { box-shadow: 0 0 0 4px color-mix(in srgb, var(--dot-color) 16%, transparent); }
    .dot.water { --dot-color: var(--water); }
    .hint { display: flex; align-items: center; gap: 8px; padding: 9px 12px; margin-bottom: 12px; border: 1px solid color-mix(in srgb, var(--water) 32%, transparent); border-radius: var(--auralis-radius-md); background: color-mix(in srgb, var(--water) 9%, var(--auralis-layer)); color: var(--water-text); font-size: var(--auralis-text-md); font-weight: 650; }
    .hint ha-icon { --mdc-icon-size: 18px; flex: 0 0 auto; color: var(--water); }
    .zones { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
    .zone { display: grid; gap: 10px; transition: border-color 200ms ease, background 200ms ease; }
    .zone.running { border-color: color-mix(in srgb, var(--water) 55%, transparent); background: linear-gradient(160deg, color-mix(in srgb, var(--water) 14%, var(--auralis-layer)), var(--auralis-layer) 72%); }
    .zone.unavailable { opacity: 0.7; }
    .zone-top { display: flex; align-items: center; gap: 8px; }
    .zone-head { display: flex; min-width: 0; min-height: var(--auralis-target); flex: 1; align-items: center; gap: 11px; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; text-align: start; }
    .zone-head .tile-icon { flex: 0 0 auto; background: color-mix(in srgb, var(--water) 14%, var(--auralis-card)); color: var(--water); }
    .zone.running .zone-head .tile-icon { background: var(--water); color: #fff; animation: water-pulse 2.4s ease-in-out infinite; }
    .zone-copy { display: grid; min-width: 0; gap: 3px; }
    .zone-copy strong, .zone-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .zone-copy strong { font-size: var(--auralis-text-lg); font-weight: 720; }
    .zone-copy small { color: var(--auralis-muted); font-size: var(--auralis-text-sm); }
    .zone.running .zone-copy small { color: var(--water-text); font-weight: 650; }
    .battery { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 4px; padding: 4px 9px; border-radius: 999px; background: color-mix(in srgb, var(--auralis-muted) 12%, transparent); color: var(--auralis-muted); font-size: var(--auralis-text-xs); font-weight: 700; white-space: nowrap; }
    .battery ha-icon { --mdc-icon-size: 15px; }
    .battery.sev-warning, .battery.sev-critical { background: color-mix(in srgb, var(--sev-color) 15%, transparent); color: var(--sev-color); }
    .flow { height: 4px; border-radius: 999px; background: linear-gradient(90deg, transparent, var(--water), transparent) 0 0 / 50% 100% repeat-x, color-mix(in srgb, var(--water) 18%, transparent); animation: water-flow 1.6s linear infinite; }
    .lines { display: grid; gap: 6px; }
    .line { display: flex; min-height: 28px; align-items: center; gap: 8px; color: var(--auralis-muted); font-size: var(--auralis-text-md); }
    .line > ha-icon { --mdc-icon-size: 17px; flex: 0 0 auto; }
    .line > span { min-width: 0; flex: 1; }
    .line.error { color: var(--auralis-danger); font-weight: 650; }
    .line.paused { color: var(--auralis-active); font-weight: 650; }
    .line .small-action { flex: 0 0 auto; min-height: var(--auralis-target); padding: 0 12px; font-size: var(--auralis-text-sm); }
    .durations { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { min-width: var(--auralis-target); min-height: var(--auralis-target); flex: 1 1 0; padding: 0 10px; border: 1px solid var(--auralis-border); border-radius: 999px; background: var(--auralis-card); color: var(--auralis-text); cursor: pointer; font-size: var(--auralis-text-md); font-weight: 650; white-space: nowrap; }
    .chip[aria-checked="true"] { border-color: color-mix(in srgb, var(--water) 60%, transparent); background: color-mix(in srgb, var(--water) 16%, var(--auralis-card)); color: var(--water-text); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--water) 40%, transparent); }
    .chip:disabled { cursor: not-allowed; opacity: 0.45; }
    .controls { display: grid; gap: 8px; }
    .controls .action { width: 100%; min-height: var(--auralis-target); }
    .action.water { border-color: color-mix(in srgb, var(--water) 50%, transparent); background: color-mix(in srgb, var(--water) 14%, var(--auralis-layer)); color: var(--water-text); }
    .action ha-icon { --mdc-icon-size: 19px; }
    .note { color: var(--auralis-muted); font-size: var(--auralis-text-xs); line-height: 1.4; }
    @keyframes water-flow { to { background-position: 200% 0, 0 0; } }
    @keyframes water-pulse {
      0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--water) 45%, transparent); }
      50% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--water) 0%, transparent); }
    }
    @media (prefers-reduced-motion: reduce) {
      .flow, .zone.running .zone-head .tile-icon { animation: none; }
      .zone { transition: none; }
    }
    @container (max-width: 300px) {
      .shell { padding: 14px; }
      .zones { grid-template-columns: minmax(0, 1fr); }
      .battery span { display: none; }
    }
  `];

  protected now = Date.now();
  protected forecast?: ForecastState;
  /** Durée choisie par zone, en minutes. */
  protected selected: Record<number, number> = {};
  private zones: IrrigationZone[] = [];
  private clockTimer?: number;
  private clockDue?: number;
  private clockDelay?: number;
  private forecastKey?: string;
  private forecastSubscription?: Promise<Unsubscribe | undefined>;
  private forecastRetry?: number;
  private forecastAttempts = 0;

  public setConfig(config: IrrigationCardConfig): void {
    if (!config || typeof config !== "object") throw new Error("Configuration invalide.");
    const zones = normalizeZones(config);
    const weather = optionalId(config.weather_entity, WEATHER_ID, "weather_entity doit être une entité météo (weather.*).");
    const threshold = finite(config.rain_threshold);
    this.zones = zones;
    this.selected = {};
    this.config = {
      ...config,
      theme: config.theme || "auto",
      weather_entity: weather,
      rain_threshold: threshold !== undefined && threshold >= 0 ? threshold : DEFAULT_RAIN_THRESHOLD,
    };
  }

  public static getStubConfig(hass?: HomeAssistant): Partial<IrrigationCardConfig> {
    return stubConfig(hass);
  }

  public static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      name: "Titre",
      icon: "Icône de la carte",
      valve_entity: "Vanne (switch ou valve)",
      zone_name: "Nom de la zone",
      countdown_entity: "Minuterie de l’appareil (number)",
      script_entity: "Script d’arrosage minuté",
      battery_entity: "Pile",
      error_entity: "Erreur de l’appareil",
      schedule_entity: "Programmation (automatisation, planning ou interrupteur)",
      schedule: "Horaires affichés (HH:MM)",
      durations: "Durées proposées (minutes)",
      max_duration: "Durée maximale (minutes)",
      weather_entity: "Météo (pluie prévue)",
      rain_threshold: "Seuil de pluie (mm sur 24 h)",
      theme: "Thème",
      accent_color: "Couleur d’accent",
      zones: "Autres zones (YAML)",
    };
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "valve_entity", selector: { entity: { filter: { domain: ["switch", "valve"] } } } },
        { name: "zone_name", selector: { text: {} } },
        { name: "countdown_entity", selector: { entity: { filter: { domain: ["number", "input_number"] } } } },
        { name: "script_entity", selector: { entity: { filter: { domain: "script" } } } },
        { name: "battery_entity", selector: { entity: { filter: { domain: ["sensor", "binary_sensor"] } } } },
        { name: "error_entity", selector: { entity: {} } },
        { name: "schedule_entity", selector: { entity: { filter: { domain: ["automation", "schedule", "input_boolean"] } } } },
        { name: "schedule", selector: { text: { multiple: true } } },
        { name: "durations", selector: { object: {} } },
        { name: "max_duration", selector: { number: { min: 1, max: 240, step: 1, mode: "box" } } },
        { name: "weather_entity", selector: { entity: { filter: { domain: "weather" } } } },
        { name: "rain_threshold", selector: { number: { min: 0, max: 50, step: 0.5, mode: "box" } } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"], mode: "dropdown" } } },
        { name: "accent_color", selector: { text: {} } },
        { name: "zones", selector: { object: {} } },
      ],
      computeLabel: ({ name }: { name: string }) => labels[name] ?? name,
    };
  }

  public getGridOptions(): Record<string, number | string> {
    return { columns: 6, min_columns: 4, rows: "auto" };
  }

  public getCardSize(): number {
    return 1 + this.zones.length * 3;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // Après un retour sur la vue : réabonnement et horloge relancés au prochain rendu.
    this.requestUpdate();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopClock();
    this.stopForecast();
  }

  protected updated(): void {
    super.updated();
    this.syncForecast();
    this.syncClock();
  }

  /* ----- Horloge : durée écoulée et prochain arrosage ----- */

  private syncClock(): void {
    const delay = this.clockDelay;
    if (delay === undefined || !this.isConnected) {
      this.stopClock();
      return;
    }
    const due = Date.now() + delay;
    if (this.clockTimer !== undefined && this.clockDue !== undefined && this.clockDue <= due) return;
    window.clearTimeout(this.clockTimer);
    this.clockDue = due;
    this.clockTimer = window.setTimeout(() => {
      this.clockTimer = undefined;
      this.clockDue = undefined;
      this.now = Date.now();
    }, Math.max(1000, delay));
  }

  private stopClock(): void {
    window.clearTimeout(this.clockTimer);
    this.clockTimer = undefined;
    this.clockDue = undefined;
  }

  /** Prochain rafraîchissement utile : 30 s pendant un arrosage sans minuterie, sinon l'heure du prochain changement de libellé. */
  private nextClockDelay(views: ZoneView[], now: number): number | undefined {
    const delays: number[] = [];
    if (views.some((view) => view.usesElapsed)) delays.push(ELAPSED_REFRESH);
    const scheduled = views.filter((view) => view.next);
    for (const view of scheduled) delays.push(view.next!.inMs + 1000);
    if (scheduled.length) delays.push(msUntilMidnight(now, this.hass?.config?.time_zone) + 1000);
    return delays.length ? Math.max(1000, Math.min(...delays)) : undefined;
  }

  /* ----- Prévisions de pluie ----- */

  private syncForecast(): void {
    const id = this.config?.weather_entity;
    const connection = this.hass?.connection;
    const state = entity(this.hass, id);
    if (!id) {
      if (this.forecastKey) this.stopForecast();
      return;
    }
    if (!connection || !state || !this.isConnected) return;
    const supported = forecastTypes(state.attributes.supported_features);
    const type: ForecastType | undefined = supported.includes("hourly") ? "hourly" : supported.includes("daily") ? "daily" : undefined;
    const key = `${id}/${type ?? "attribut"}`;
    if (key === this.forecastKey) return;
    this.stopForecast();
    this.forecastKey = key;
    this.forecast = undefined;
    if (type) this.subscribeForecast(key, id, type);
  }

  private subscribeForecast(key: string, entityId: string, type: ForecastType): void {
    const connection = this.hass?.connection;
    if (!connection || this.forecastKey !== key) return;
    this.forecastSubscription = connection.subscribeMessage<{ forecast?: unknown }>((message) => {
      if (this.forecastKey !== key) return;
      this.forecastAttempts = 0;
      this.forecast = { type, entries: parseForecast(message?.forecast) };
    }, { type: "weather/subscribe_forecast", forecast_type: type, entity_id: entityId })
      .catch((error: unknown) => {
        console.warn("Auralis : prévisions météo indisponibles", entityId, error);
        if (this.forecastKey === key) this.retryForecast(key, entityId, type);
        return undefined;
      });
  }

  private retryForecast(key: string, entityId: string, type: ForecastType): void {
    window.clearTimeout(this.forecastRetry);
    const delay = retryDelay(this.forecastAttempts);
    this.forecastAttempts += 1;
    this.forecastRetry = window.setTimeout(() => {
      this.forecastRetry = undefined;
      if (this.isConnected) this.subscribeForecast(key, entityId, type);
    }, delay);
  }

  private stopForecast(): void {
    window.clearTimeout(this.forecastRetry);
    this.forecastRetry = undefined;
    const subscription = this.forecastSubscription;
    this.forecastSubscription = undefined;
    void subscription?.then((unsubscribe) => unsubscribe?.()).catch(() => undefined);
    this.forecastKey = undefined;
    this.forecastAttempts = 0;
  }

  /** Pluie prévue sur 24 h : abonnement, ou ancien attribut `forecast` des intégrations qui n'ont pas migré. */
  private rainAmount(now: number): number | undefined {
    if (this.forecast) {
      return rainForecast(this.forecast.entries, now, this.forecast.type === "hourly" ? HOUR : DAY);
    }
    const state = entity(this.hass, this.config?.weather_entity);
    if (!state || forecastTypes(state.attributes.supported_features).length) return undefined;
    const legacy = parseForecast(state.attributes.forecast);
    const hourly = legacy.length > 1 && legacy[1].time - legacy[0].time <= 3 * HOUR;
    return rainForecast(legacy, now, hourly ? HOUR : DAY);
  }

  /* ----- Commandes ----- */

  private async setValve(hass: HomeAssistant, entityId: string, open: boolean): Promise<void> {
    if (domainOf(entityId) === "valve") {
      await hass.callService("valve", open ? "open_valve" : "close_valve", {}, { entity_id: entityId });
    } else {
      await hass.callService("switch", open ? "turn_on" : "turn_off", {}, { entity_id: entityId });
    }
  }

  private selectedDuration(view: ZoneView): number {
    const chosen = this.selected[view.index];
    return chosen !== undefined && view.zone.durations.includes(chosen) ? chosen : view.zone.durations[0];
  }

  /** Arrosage minuté : le script ou l'appareil ferme la vanne, jamais le navigateur. */
  private async startTimed(view: ZoneView): Promise<void> {
    const hass = this.hass;
    if (!hass || !view.timedReady) return;
    const zone = view.zone;
    const minutes = Math.min(zone.max_duration, this.selectedDuration(view));
    if (view.strategy === "script" && zone.script_entity) {
      const script = zone.script_entity;
      await this.runCommand(`zone:${view.index}`, () => hass.callService("script", "turn_on", { variables: { duration: minutes } }, { entity_id: script }), {
        errorMessage: "Impossible de lancer l’arrosage.",
      });
      return;
    }
    if (view.strategy === "countdown" && zone.countdown_entity) {
      const countdownId = zone.countdown_entity;
      const setting = countdownSetting(minutes, entity(hass, countdownId)?.attributes);
      await this.runCommand(`zone:${view.index}`, async () => {
        await hass.callService(domainOf(countdownId), "set_value", { value: setting.value }, { entity_id: countdownId });
        await this.setValve(hass, zone.valve_entity, true);
      }, {
        errorMessage: "Impossible de lancer l’arrosage.",
        successMessage: setting.adjusted ? `Durée ajustée à ${formatDuration(setting.minutes * 60)} par l’appareil.` : undefined,
      });
    }
  }

  /** Ouverture sans minuterie (aucun script ni minuterie d'appareil configuré). */
  private async openManual(view: ZoneView): Promise<void> {
    const hass = this.hass;
    if (!hass || !view.available) return;
    await this.runCommand(`zone:${view.index}`, () => this.setValve(hass, view.zone.valve_entity, true), {
      errorMessage: "Impossible d’ouvrir la vanne.",
    });
  }

  private async stop(view: ZoneView): Promise<void> {
    const hass = this.hass;
    if (!hass || !view.available) return;
    const script = view.zone.script_entity;
    await this.runCommand(`zone:${view.index}`, async () => {
      await this.setValve(hass, view.zone.valve_entity, false);
      // Le script en attente de sa fin d'arrosage n'a plus rien à faire.
      if (script && entity(hass, script)?.state === "on") {
        await hass.callService("script", "turn_off", {}, { entity_id: script });
      }
    }, { errorMessage: "Impossible d’arrêter l’arrosage." });
  }

  private setSchedule(view: ZoneView, enabled: boolean): Promise<boolean> {
    const hass = this.hass;
    const id = view.zone.schedule_entity;
    if (!hass || !id || !schedulePausable(id)) return Promise.resolve(false);
    return this.runCommand(`schedule:${view.index}`, () => hass.callService(domainOf(id), enabled ? "turn_on" : "turn_off", {}, { entity_id: id }), {
      errorMessage: "Impossible de modifier la programmation.",
    });
  }

  private askPause(view: ZoneView): void {
    this.askConfirmation({
      title: "Mettre la programmation en pause ?",
      message: "La programmation automatique ne s’exécutera plus jusqu’à sa reprise.",
      confirmLabel: "Mettre en pause",
      danger: false,
      action: () => this.setSchedule(view, false),
    });
  }

  /* ----- Rendu ----- */

  private renderBattery(view: ZoneView): TemplateResult | typeof nothing {
    const battery = view.battery;
    if (!battery) return nothing;
    const icon = battery.low ? "mdi:battery-alert-variant-outline" : "mdi:battery-outline";
    const label = battery.low ? battery.label : battery.level !== undefined ? `Pile ${battery.label}` : battery.label;
    return html`<span class="battery ${battery.severity === "normal" ? "" : `sev-${battery.severity}`}" title=${label} aria-label=${label}>
      <ha-icon .icon=${icon}></ha-icon><span>${battery.label}</span></span>`;
  }

  private renderSchedule(view: ZoneView): TemplateResult | typeof nothing {
    const pending = this.isPending(`schedule:${view.index}`);
    const disabled = !view.scheduleReady || pending;
    if (view.paused) {
      return html`<div class="line paused"><ha-icon icon="mdi:calendar-remove-outline"></ha-icon><span>Programmation en pause</span>
        <button class="action small-action" type="button" ?disabled=${disabled} aria-busy=${pending ? "true" : "false"}
          aria-label=${`Reprendre la programmation de ${view.label}`} @click=${() => this.setSchedule(view, true)}>
          <ha-icon icon="mdi:play"></ha-icon>Reprendre</button></div>`;
    }
    if (!view.next && !view.pausable) return nothing;
    return html`<div class="line"><ha-icon icon="mdi:calendar-clock"></ha-icon>
      <span>${view.next ? `Prochain arrosage : ${view.next.label}` : "Programmation active"}</span>
      ${view.pausable ? html`<button class="action small-action" type="button" ?disabled=${disabled} aria-busy=${pending ? "true" : "false"}
        aria-label=${`Mettre en pause la programmation de ${view.label}`} @click=${() => this.askPause(view)}>
        <ha-icon icon="mdi:pause"></ha-icon>Pause</button>` : nothing}</div>`;
  }

  private renderControls(view: ZoneView): TemplateResult {
    const pending = this.isPending(`zone:${view.index}`);
    const busy = pending ? "true" : "false";
    if (view.open) {
      const label = view.strategy === "manual" ? "Fermer la vanne" : "Arrêter l’arrosage";
      return html`<div class="controls"><button class="action danger" type="button" ?disabled=${!view.available || pending} aria-busy=${busy}
        aria-label=${`${label} : ${view.label}`} @click=${() => this.stop(view)}>
        <ha-icon icon="mdi:stop-circle-outline"></ha-icon>${label}</button></div>`;
    }
    if (view.strategy === "manual") {
      return html`<div class="controls"><button class="action water" type="button" ?disabled=${!view.available || pending} aria-busy=${busy}
        aria-label=${`Ouvrir la vanne : ${view.label}`} @click=${() => this.openManual(view)}>
        <ha-icon icon="mdi:water-outline"></ha-icon>Ouvrir la vanne</button>
        <p class="note">Sans minuterie configurée, la vanne reste ouverte jusqu’à sa fermeture.</p></div>`;
    }
    const chosen = this.selectedDuration(view);
    const disabled = !view.timedReady || pending;
    return html`<div class="controls">
      <div class="durations" role="radiogroup" aria-label=${`Durée d’arrosage : ${view.label}`}>
        ${view.zone.durations.map((minutes) => html`<button class="chip" type="button" role="radio" aria-checked=${minutes === chosen ? "true" : "false"}
          ?disabled=${disabled} @click=${() => (this.selected = { ...this.selected, [view.index]: minutes })}>${formatDuration(minutes * 60)}</button>`)}
      </div>
      <button class="action water" type="button" ?disabled=${disabled} aria-busy=${busy}
        aria-label=${`Arroser ${view.label} pendant ${formatDuration(chosen * 60)}`} @click=${() => this.startTimed(view)}>
        <ha-icon icon="mdi:water"></ha-icon>Arroser ${formatDuration(chosen * 60)}</button>
      ${view.available && !view.timedReady ? html`<p class="note">${view.strategy === "script" ? "Script d’arrosage indisponible." : "Minuterie de l’appareil indisponible."}</p>` : nothing}
    </div>`;
  }

  private renderZone(view: ZoneView): TemplateResult {
    const classes = ["tile", "zone", view.open ? "running" : "", view.available ? "" : "unavailable"].filter(Boolean).join(" ");
    return html`<section class=${classes} aria-label=${view.label}>
      <div class="zone-top">
        <button class="zone-head" type="button" aria-label=${`${view.label}, ${view.status}. Afficher la fiche de la vanne`}
          @click=${() => this.moreInfo(view.zone.valve_entity)}>
          <span class="tile-icon"><ha-icon .icon=${view.icon}></ha-icon></span>
          <span class="zone-copy"><strong>${view.label}</strong><small>${view.status}</small></span>
        </button>
        ${this.renderBattery(view)}
      </div>
      ${view.open ? html`<div class="flow" aria-hidden="true"></div>` : nothing}
      <div class="lines">
        ${view.error ? html`<div class="line error" role="alert"><ha-icon icon="mdi:alert-circle-outline"></ha-icon><span>Erreur : ${view.error}</span></div>` : nothing}
        ${this.renderSchedule(view)}
      </div>
      ${this.renderControls(view)}
    </section>`;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.config) return nothing;
    const now = Date.now();
    const views = this.zones.map((zone, index) => zoneView(this.hass, zone, index, now));
    this.clockDelay = this.nextClockDelay(views, now);
    const summary = cardSummary(views);
    const rain = this.config.weather_entity ? this.rainAmount(now) : undefined;
    const showRain = rain !== undefined && rain > 0 && rain >= (this.config.rain_threshold ?? DEFAULT_RAIN_THRESHOLD);
    return html`<ha-card><div class="shell">
      <header class="header">
        <span class="tile-icon"><ha-icon .icon=${this.config.icon || "mdi:sprinkler"}></ha-icon></span>
        <div class="title-wrap">
          <h2>${this.config.name || "Arrosage"}</h2>
          <div class="status-line" role="status"><span class="dot ${summary.tone}"></span><span>${summary.text}</span></div>
        </div>
      </header>
      ${showRain ? html`<div class="hint" role="note"><ha-icon icon="mdi:weather-pouring"></ha-icon>
        <span>Pluie prévue : ${formatNumber(rain!, rain! < 10 ? 1 : 0)} mm dans les 24 h</span></div>` : nothing}
      <div class="zones">${views.map((view) => this.renderZone(view))}</div>
    </div></ha-card>${this.renderStandaloneConfirmation()}`;
  }
}
