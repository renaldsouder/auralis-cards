import { adoptStyles, css, html, nothing, render, type TemplateResult } from "lit";
import { AuralisBaseCard, configuredAccent } from "./auralis-base-card";
import { navbarTarget } from "./auralis-navbar-card";
import { conditionStyle } from "./auralis-weather-card";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { sharedStyles } from "../styles/shared";
import { hasOpenAuralisDialog } from "../utils/dialog-visibility";
import { ACTIVE_STATES, displayState, entity, formatNumber, friendlyName, isAvailable } from "../utils/entities";

export interface ScreensaverEntityConfig {
  entity: string;
  name?: string;
}

export interface ScreensaverCardConfig extends BaseCardConfig {
  type: "custom:auralis-screensaver-card";
  /** Délai sans contact avant la veille, en secondes (15 minimum, 300 par défaut). */
  timeout?: number;
  /** Entité `weather.*` : icône, temps et température. */
  weather_entity?: string;
  /** Capteur de température local, prioritaire sur celle du service météo. */
  temperature_entity?: string;
  /** Jusqu'à 4 valeurs affichées sous l'horloge. */
  entities?: Array<string | ScreensaverEntityConfig>;
  /** Entité mise en avant quand elle est active (détecteur de mouvement, sonnette…). */
  alert_entity?: string;
  show_clock?: boolean;
  show_date?: boolean;
  show_seconds?: boolean;
  /** Opacité du contenu, de 0,2 à 1. */
  dim_brightness?: number;
  /** Contenu plus sombre la nuit, entre `night_start` et `night_end`. */
  night_dim?: boolean;
  night_start?: string;
  night_end?: string;
  /** Opacité du contenu la nuit, de 0,1 à 1. */
  night_brightness?: number;
  /** Vue du tableau de bord ouverte au réveil (chemin interne). */
  navigate_on_wake?: string;
  /** Requête média CSS : la veille ne fonctionne que si elle correspond (ex. `(pointer: coarse)`). */
  media_query?: string;
  /** `input_boolean` (ou autre entité) qui, allumé, empêche la veille. */
  disabled_entity?: string;
}

export const DEFAULT_TIMEOUT = 300;
export const MIN_TIMEOUT = 15;
const MAX_TIMEOUT = 86_400;
/** Durée pendant laquelle le clic qui suit le toucher de réveil est ignoré. */
export const WAKE_GUARD = 400;
/** Décalage maximal du contenu, en pourcentage de l'écran, contre le marquage. */
export const BURN_IN_SHIFT = 4;
const SHIFT_PERIOD = 60_000;
const MOVE_THROTTLE = 1_000;
const MAX_ENTITIES = 4;
const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const ALERT_STATES = new Set([...ACTIVE_STATES, "detected", "triggered", "ringing", "motion", "occupied", "unlocked"]);

/** Délai de veille en secondes, borné (15 s à 24 h). Une valeur absente ou invalide donne 300 s. */
export function screensaverTimeout(value: unknown): number {
  if (value === undefined || value === null || value === "") return DEFAULT_TIMEOUT;
  const seconds = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  if (!Number.isFinite(seconds)) return DEFAULT_TIMEOUT;
  return Math.round(Math.min(MAX_TIMEOUT, Math.max(MIN_TIMEOUT, seconds)));
}

/** Délai lisible : « 45 s », « 5 min », « 1 min 30 s ». */
export function timeoutLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

/** Opacité bornée ; `fallback` si la valeur n'est pas un nombre. */
export function clampOpacity(value: unknown, fallback: number, min = 0.2): number {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? Math.min(1, Math.max(min, number)) : fallback;
}

/** Minutes depuis minuit d'une heure « HH:MM », ou `undefined` si le format est invalide. */
export function parseTimeOfDay(value: string | undefined): number | undefined {
  const match = TIME_PATTERN.exec(value?.trim() ?? "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
}

/** Vrai si `minutes` tombe dans la plage [début, fin[, y compris une plage qui passe minuit. */
export function inTimeWindow(minutes: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

/** Heure et minute dans le fuseau de Home Assistant (celui du navigateur s'il est invalide). */
export function zonedMinutes(time: number, timeZone?: string): number {
  const read = (zone?: string): number => {
    const parts = new Intl.DateTimeFormat("fr-FR", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone: zone }).formatToParts(time);
    const part = (type: string): number => Number(parts.find((item) => item.type === type)?.value ?? 0);
    return (part("hour") % 24) * 60 + part("minute");
  };
  try {
    return read(timeZone);
  } catch {
    return read();
  }
}

function format(time: number, options: Intl.DateTimeFormatOptions, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone }).format(time);
  } catch {
    return new Intl.DateTimeFormat("fr-FR", options).format(time);
  }
}

/** Horloge 24 h : « 21:05 » ou « 21:05:42 ». */
export function formatClock(time: number, timeZone?: string, seconds = false): string {
  return format(time, { hour: "2-digit", minute: "2-digit", second: seconds ? "2-digit" : undefined, hourCycle: "h23" }, timeZone);
}

/** Date en toutes lettres : « vendredi 13 novembre ». */
export function formatLongDate(time: number, timeZone?: string): string {
  return format(time, { weekday: "long", day: "numeric", month: "long" }, timeZone);
}

/** Attente avant le prochain changement d'affichage de l'horloge, alignée sur la minute (ou la seconde). */
export function msUntilNextTick(now: number, seconds = false): number {
  const period = seconds ? 1_000 : 60_000;
  return period - (now % period) || period;
}

/** Opacité du contenu à une heure donnée : plus faible dans la plage de nuit si `night_dim`. */
export function contentOpacity(config: ScreensaverCardConfig, minutes: number): number {
  const day = clampOpacity(config.dim_brightness, 0.85);
  if (config.night_dim === false) return day;
  const start = parseTimeOfDay(config.night_start ?? "22:00");
  const end = parseTimeOfDay(config.night_end ?? "07:00");
  if (start === undefined || end === undefined || !inTimeWindow(minutes, start, end)) return day;
  return Math.min(day, clampOpacity(config.night_brightness, 0.35, 0.1));
}

/** Petit décalage aléatoire du contenu, en % de l'écran, dans [-max, max] sur chaque axe. */
export function burnInOffset(random: () => number = Math.random, max = BURN_IN_SHIFT): { x: number; y: number } {
  const axis = (): number => {
    const value = (Math.min(1, Math.max(0, random())) * 2 - 1) * max;
    return Math.round(value * 10) / 10;
  };
  return { x: axis(), y: axis() };
}

/** Chemin interne de réveil (même règle que la navigation Auralis), ou `undefined` s'il est refusé. */
export function wakePath(value: string | undefined): string | undefined {
  return value?.trim() ? navbarTarget({ label: "", path: value }) : undefined;
}

/** Vrai pendant `WAKE_GUARD` ms après le toucher de réveil : le clic qui suit est ignoré. */
export function swallowsFollowingClick(guardSince: number | undefined, now: number, guard = WAKE_GUARD): boolean {
  return guardSince !== undefined && now >= guardSince && now - guardSince < guard;
}

/** Entités à afficher, avec leur nom éventuel. */
export function screensaverEntities(list: ScreensaverCardConfig["entities"]): ScreensaverEntityConfig[] {
  return (list ?? []).map((item) => (typeof item === "string" ? { entity: item } : item));
}

/** Vrai quand l'entité d'alerte est active (allumée, détectée, ouverte, sonne…). */
export function alertActive(state?: HassEntity): boolean {
  return Boolean(state && ALERT_STATES.has(state.state.toLowerCase()));
}

/**
 * Comptage des cartes sources d'un élément partagé : le premier `acquire` demande sa
 * création, le dernier `release` sa suppression. La carte la plus récemment ajoutée mène.
 */
export class PortalRegistry<T> {
  private readonly owners = new Set<T>();

  /** Ajoute une carte ; vrai si c'est la première (l'élément partagé doit être créé). */
  acquire(owner: T): boolean {
    if (this.owners.has(owner)) return false;
    this.owners.add(owner);
    return this.owners.size === 1;
  }

  /** Retire une carte ; vrai si c'était la dernière (l'élément partagé doit être supprimé). */
  release(owner: T): boolean {
    return this.owners.delete(owner) && this.owners.size === 0;
  }

  has(owner: T): boolean {
    return this.owners.has(owner);
  }

  get size(): number {
    return this.owners.size;
  }

  /** Carte dont la configuration est utilisée : la dernière ajoutée encore présente. */
  get leader(): T | undefined {
    let last: T | undefined;
    for (const owner of this.owners) last = owner;
    return last;
  }
}

const overlayStyles = css`
  :host {
    position: fixed;
    inset: 0;
    z-index: 1100;
    display: block;
    overflow: hidden;
    background: #000;
    color: #f2f5f9;
    font-family: var(--paper-font-body1_-_font-family, "Inter", system-ui, sans-serif);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 600ms ease, visibility 0s linear 600ms;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: none;
    outline: none;
  }
  :host([data-state="visible"]) {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transition: opacity 600ms ease;
  }
  /* Le réveil garde l'écran noir sous le doigt le temps que le geste se termine. */
  :host([data-state="waking"]) {
    opacity: 0;
    visibility: visible;
    pointer-events: auto;
    transition: opacity 250ms ease;
  }
  .stage {
    display: flex;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    align-items: center;
    justify-content: center;
    padding: 4vh 6vw;
  }
  .block {
    display: grid;
    max-width: 100%;
    justify-items: center;
    gap: clamp(14px, 3vh, 32px);
    transform: translate(calc(var(--shift-x, 0) * 1vw), calc(var(--shift-y, 0) * 1vh));
    transition: transform 2s ease;
  }
  .content {
    display: grid;
    justify-items: center;
    gap: clamp(8px, 2vh, 22px);
    opacity: var(--content-opacity, 0.85);
    transition: opacity 2s ease;
    text-align: center;
  }
  .name {
    color: #9aa6b6;
    font-size: clamp(16px, 2.4vw, 26px);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .clock {
    font-size: clamp(88px, 21vw, 280px);
    font-weight: 200;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    line-height: 0.95;
  }
  .clock.with-seconds { font-size: clamp(64px, 15vw, 210px); }
  .date {
    color: #c9d2de;
    font-size: clamp(24px, 4vw, 48px);
    font-weight: 400;
  }
  .date::first-letter { text-transform: uppercase; }
  .weather {
    display: flex;
    align-items: center;
    gap: clamp(10px, 1.6vw, 20px);
    font-size: clamp(24px, 3.6vw, 44px);
  }
  .weather ha-icon { --mdc-icon-size: clamp(40px, 6vw, 72px); }
  .weather strong { font-weight: 600; font-variant-numeric: tabular-nums; }
  .weather span { color: #c9d2de; }
  .values {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: clamp(14px, 2vh, 24px) clamp(24px, 5vw, 64px);
    margin: clamp(6px, 2vh, 20px) 0 0;
  }
  .value { display: grid; gap: 4px; justify-items: center; }
  .value dt {
    color: #8d99aa;
    font-size: clamp(15px, 1.9vw, 22px);
  }
  .value dd {
    margin: 0;
    font-size: clamp(24px, 3.4vw, 40px);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .alert {
    display: flex;
    max-width: 90vw;
    align-items: center;
    gap: 16px;
    box-sizing: border-box;
    padding: clamp(12px, 2vh, 20px) clamp(20px, 3vw, 34px);
    border: 2px solid var(--screensaver-accent, #79d6f2);
    border-radius: 999px;
    background: color-mix(in srgb, var(--screensaver-accent, #79d6f2) 16%, #000);
    color: #fff;
    font-size: clamp(24px, 3.6vw, 44px);
    font-weight: 650;
    animation: alert-pulse 2.4s ease-in-out infinite;
  }
  .alert ha-icon { --mdc-icon-size: clamp(32px, 4.4vw, 54px); color: var(--screensaver-accent, #79d6f2); }
  .alert small { color: #c9d2de; font-size: 0.7em; font-weight: 500; }
  @keyframes alert-pulse {
    50% { box-shadow: 0 0 0 10px color-mix(in srgb, var(--screensaver-accent, #79d6f2) 18%, transparent); }
  }
  @media (prefers-reduced-motion: reduce) {
    :host, :host([data-state]) { transition: none; }
    .block, .content { transition: none; }
    .alert { animation: none; }
  }
`;

/**
 * Veille unique de la page : écoute l'inactivité, affiche l'écran noir posé sur `document.body`
 * et réveille le tableau de bord. Une seule instance existe, partagée par toutes les cartes
 * sources connectées ; la dernière qui quitte la page la détruit.
 */
class ScreensaverController {
  private readonly host: HTMLDivElement;
  private readonly root: ShadowRoot;
  private state: "hidden" | "visible" | "waking" = "hidden";
  private idleTimer?: number;
  private tickTimer?: number;
  private wakeTimer?: number;
  private guardSince?: number;
  private lastMove = 0;
  private lastShift = 0;
  private shift = { x: 0, y: 0 };
  private appliedConfig?: ScreensaverCardConfig;
  private media?: MediaQueryList;

  constructor(private readonly leader: () => AuralisScreensaverCard | undefined) {
    this.host = document.createElement("div");
    this.host.dataset.auralisScreensaver = "";
    this.host.dataset.state = "hidden";
    this.host.setAttribute("role", "dialog");
    this.host.setAttribute("aria-modal", "true");
    this.host.setAttribute("aria-label", "Veille d'écran");
    this.host.setAttribute("aria-hidden", "true");
    this.host.tabIndex = -1;
    this.root = this.host.attachShadow({ mode: "open" });
    adoptStyles(this.root, [overlayStyles]);
    document.body.append(this.host);
    const capture = { capture: true };
    const passive = { capture: true, passive: true };
    window.addEventListener("pointerdown", this.onWakeEvent, capture);
    window.addEventListener("keydown", this.onWakeEvent, capture);
    window.addEventListener("pointerup", this.onGestureEnd, capture);
    window.addEventListener("pointercancel", this.onGestureEnd, capture);
    window.addEventListener("click", this.onClick, capture);
    window.addEventListener("pointermove", this.onMove, passive);
    window.addEventListener("wheel", this.onActivity, passive);
    window.addEventListener("touchstart", this.onActivity, passive);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  destroy(): void {
    const capture = { capture: true };
    window.removeEventListener("pointerdown", this.onWakeEvent, capture);
    window.removeEventListener("keydown", this.onWakeEvent, capture);
    window.removeEventListener("pointerup", this.onGestureEnd, capture);
    window.removeEventListener("pointercancel", this.onGestureEnd, capture);
    window.removeEventListener("click", this.onClick, capture);
    window.removeEventListener("pointermove", this.onMove, capture);
    window.removeEventListener("wheel", this.onActivity, capture);
    window.removeEventListener("touchstart", this.onActivity, capture);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.media?.removeEventListener("change", this.onMediaChange);
    this.media = undefined;
    window.clearTimeout(this.idleTimer);
    window.clearTimeout(this.tickTimer);
    window.clearTimeout(this.wakeTimer);
    render(nothing, this.root);
    this.host.remove();
  }

  /** Nouvelle configuration ou nouvel état d'une entité affichée. */
  refresh(): void {
    const config = this.leader()?.config;
    if (config !== this.appliedConfig) {
      this.appliedConfig = config;
      this.watchMedia(config?.media_query);
      if (this.state === "hidden") this.schedule();
    }
    if (!this.allowed()) {
      if (this.state !== "hidden") this.finishWake();
      window.clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
      return;
    }
    if (this.state === "visible") this.paint();
    else if (this.state === "hidden" && this.idleTimer === undefined) this.schedule();
  }

  private watchMedia(query?: string): void {
    this.media?.removeEventListener("change", this.onMediaChange);
    this.media = query?.trim() && typeof window.matchMedia === "function" ? window.matchMedia(query.trim()) : undefined;
    this.media?.addEventListener("change", this.onMediaChange);
  }

  private readonly onMediaChange = (): void => this.refresh();

  /** La veille peut-elle se déclencher sur cet appareil, maintenant ? */
  private allowed(): boolean {
    const card = this.leader();
    if (!card?.config) return false;
    if (this.media && !this.media.matches) return false;
    const disabled = entity(card.hass, card.config.disabled_entity);
    return !(disabled && disabled.state === "on");
  }

  private schedule(): void {
    window.clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
    if (!this.allowed() || document.visibilityState === "hidden") return;
    const timeout = screensaverTimeout(this.leader()?.config?.timeout) * 1_000;
    this.idleTimer = window.setTimeout(this.onIdle, timeout);
  }

  private readonly onIdle = (): void => {
    this.idleTimer = undefined;
    if (this.state !== "hidden") return;
    // Une fenêtre Auralis ouverte (ou une page masquée) repousse la veille d'un délai complet.
    if (hasOpenAuralisDialog() || document.visibilityState === "hidden" || !this.allowed()) {
      this.schedule();
      return;
    }
    this.show();
  };

  private show(): void {
    this.state = "visible";
    this.shift = burnInOffset();
    this.lastShift = Date.now();
    this.paint();
    this.host.dataset.state = "visible";
    this.host.removeAttribute("aria-hidden");
    this.host.focus({ preventScroll: true });
    this.scheduleTick();
  }

  private scheduleTick(): void {
    window.clearTimeout(this.tickTimer);
    const seconds = this.leader()?.config?.show_seconds === true;
    this.tickTimer = window.setTimeout(this.onTick, msUntilNextTick(Date.now(), seconds) + 20);
  }

  private readonly onTick = (): void => {
    if (this.state !== "visible") return;
    if (Date.now() - this.lastShift >= SHIFT_PERIOD) {
      this.shift = burnInOffset();
      this.lastShift = Date.now();
    }
    this.paint();
    this.scheduleTick();
  };

  /** Premier toucher ou première touche : réveille sans transmettre l'appui au tableau de bord. */
  private readonly onWakeEvent = (event: Event): void => {
    if (this.state === "hidden") {
      this.onActivity();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (this.state === "waking") {
      this.extendGuard();
      return;
    }
    this.state = "waking";
    this.host.dataset.state = "waking";
    this.host.setAttribute("aria-hidden", "true");
    window.clearTimeout(this.tickTimer);
    this.extendGuard();
    const path = wakePath(this.leader()?.config?.navigate_on_wake);
    if (path) navigateTo(path);
  };

  /** Fin du geste de réveil : l'écran noir reste encore `WAKE_GUARD` ms sous le doigt. */
  private readonly onGestureEnd = (event: Event): void => {
    if (this.state !== "waking") return;
    event.stopImmediatePropagation();
    this.extendGuard();
  };

  private extendGuard(): void {
    this.guardSince = Date.now();
    window.clearTimeout(this.wakeTimer);
    this.wakeTimer = window.setTimeout(() => this.finishWake(), WAKE_GUARD);
  }

  private finishWake(): void {
    window.clearTimeout(this.wakeTimer);
    window.clearTimeout(this.tickTimer);
    this.state = "hidden";
    this.host.dataset.state = "hidden";
    this.host.setAttribute("aria-hidden", "true");
    render(nothing, this.root);
    this.schedule();
  }

  /** Le clic synthétisé après le toucher de réveil ne doit pas actionner une tuile. */
  private readonly onClick = (event: MouseEvent): void => {
    if (this.state === "visible" || this.state === "waking" || swallowsFollowingClick(this.guardSince, Date.now())) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  private readonly onMove = (): void => {
    if (this.state !== "hidden") return;
    const now = Date.now();
    if (now - this.lastMove < MOVE_THROTTLE) return;
    this.lastMove = now;
    this.schedule();
  };

  private readonly onActivity = (): void => {
    if (this.state === "hidden") this.schedule();
  };

  private readonly onVisibility = (): void => {
    if (document.visibilityState === "hidden") {
      window.clearTimeout(this.idleTimer);
      window.clearTimeout(this.tickTimer);
      this.idleTimer = undefined;
      return;
    }
    if (this.state === "visible") {
      this.paint();
      this.scheduleTick();
    } else {
      this.schedule();
    }
  };

  private paint(): void {
    const card = this.leader();
    if (!card?.config) return;
    render(screensaverTemplate(card.config, card.hass, Date.now(), this.shift), this.root);
  }
}

function navigateTo(path: string): void {
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current === path) return;
  window.history.pushState(null, "", path);
  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
}

function weatherTemplate(config: ScreensaverCardConfig, hass: HomeAssistant | undefined): TemplateResult | typeof nothing {
  const weather = entity(hass, config.weather_entity);
  const local = entity(hass, config.temperature_entity);
  if (!isAvailable(weather) && !isAvailable(local)) return nothing;
  const night = entity(hass, "sun.sun")?.state === "below_horizon";
  const style = isAvailable(weather) ? conditionStyle(weather!.state, night) : undefined;
  let temperature: string | undefined;
  if (isAvailable(local)) temperature = displayState(hass, config.temperature_entity);
  else {
    const value = Number(weather?.attributes.temperature);
    const unit = typeof weather?.attributes.temperature_unit === "string" ? weather.attributes.temperature_unit : "°C";
    if (Number.isFinite(value)) temperature = `${formatNumber(value, 1)} ${unit}`;
  }
  return html`<div class="weather">
    ${style ? html`<ha-icon .icon=${style.icon} style=${`color:${style.color}`}></ha-icon><span>${style.label}</span>` : nothing}
    ${temperature ? html`<strong>${temperature}</strong>` : nothing}
  </div>`;
}

function alertTemplate(config: ScreensaverCardConfig, hass: HomeAssistant | undefined): TemplateResult | typeof nothing {
  const state = entity(hass, config.alert_entity);
  if (!alertActive(state)) return nothing;
  const icon = typeof state!.attributes.icon === "string" ? state!.attributes.icon : "mdi:bell-ring-outline";
  return html`<div class="alert" role="alert">
    <ha-icon .icon=${icon}></ha-icon>
    <span>${friendlyName(state, config.alert_entity)} <small>· ${displayState(hass, config.alert_entity)}</small></span>
  </div>`;
}

/** Contenu de l'écran de veille. */
function screensaverTemplate(
  config: ScreensaverCardConfig,
  hass: HomeAssistant | undefined,
  now: number,
  shift: { x: number; y: number },
): TemplateResult {
  const timeZone = hass?.config?.time_zone;
  const opacity = contentOpacity(config, zonedMinutes(now, timeZone));
  const accent = configuredAccent(config) ?? "#79d6f2";
  const values = screensaverEntities(config.entities).map((item) => ({
    label: item.name?.trim() || friendlyName(entity(hass, item.entity), item.entity),
    value: displayState(hass, item.entity),
  }));
  return html`<div class="stage">
    <div class="block" style=${`--shift-x:${shift.x};--shift-y:${shift.y};--screensaver-accent:${accent}`}>
      ${alertTemplate(config, hass)}
      <div class="content" style=${`--content-opacity:${opacity}`}>
        ${config.name?.trim() ? html`<div class="name">${config.name.trim()}</div>` : nothing}
        ${config.show_clock !== false
          ? html`<div class="clock ${config.show_seconds ? "with-seconds" : ""}">${formatClock(now, timeZone, config.show_seconds === true)}</div>`
          : nothing}
        ${config.show_date !== false ? html`<div class="date">${formatLongDate(now, timeZone)}</div>` : nothing}
        ${weatherTemplate(config, hass)}
        ${values.length ? html`<dl class="values">${values.map((item) => html`<div class="value"><dt>${item.label}</dt><dd>${item.value}</dd></div>`)}</dl>` : nothing}
      </div>
    </div>
  </div>`;
}

const registry = new PortalRegistry<AuralisScreensaverCard>();
let controller: ScreensaverController | undefined;

function attachSource(card: AuralisScreensaverCard): void {
  registry.acquire(card);
  controller ??= new ScreensaverController(() => registry.leader);
  controller.refresh();
}

function detachSource(card: AuralisScreensaverCard): void {
  if (!registry.has(card)) return;
  if (registry.release(card)) {
    controller?.destroy();
    controller = undefined;
  } else {
    controller?.refresh();
  }
}

export class AuralisScreensaverCard extends AuralisBaseCard<ScreensaverCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    preview: { attribute: false },
    editMode: { attribute: false },
  };

  static styles = [
    sharedStyles,
    css`
      :host(:not([data-edit-mode])) {
        position: absolute;
        width: 0;
        height: 0;
        overflow: hidden;
        pointer-events: none;
      }
      .placeholder {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        color: var(--auralis-text);
        background: var(--auralis-card-background, var(--auralis-card));
      }
      .placeholder ha-icon {
        --mdc-icon-size: 24px;
        color: var(--auralis-card-accent, var(--auralis-info));
      }
      .placeholder strong { display: block; font-size: var(--auralis-text-lg); }
      .placeholder small { color: var(--auralis-muted); font-size: var(--auralis-text-sm); }
    `,
  ];

  public preview = false;
  public editMode = false;

  private get editing(): boolean {
    return this.preview || this.editMode;
  }

  public setConfig(config: ScreensaverCardConfig): void {
    if (!config || typeof config !== "object") throw new Error("Configuration invalide.");
    if (config.weather_entity && !/^weather\.[a-z0-9_]+$/.test(config.weather_entity)) {
      throw new Error("weather_entity doit être une entité weather.*.");
    }
    if (config.entities !== undefined) {
      if (!Array.isArray(config.entities)) throw new Error("entities doit être une liste d'entités.");
      if (config.entities.length > MAX_ENTITIES) throw new Error(`entities accepte au plus ${MAX_ENTITIES} entités.`);
      if (screensaverEntities(config.entities).some((item) => !item || typeof item.entity !== "string" || !item.entity.includes("."))) {
        throw new Error("Chaque élément de entities doit être un identifiant d'entité ou { entity, name }.");
      }
    }
    for (const key of ["night_start", "night_end"] as const) {
      if (config[key] !== undefined && parseTimeOfDay(String(config[key])) === undefined) {
        throw new Error(`${key} doit être une heure au format HH:MM.`);
      }
    }
    if (config.navigate_on_wake !== undefined && config.navigate_on_wake !== "" && !wakePath(config.navigate_on_wake)) {
      throw new Error("navigate_on_wake doit être un chemin interne du tableau de bord, par exemple /lovelace/accueil.");
    }
    if (config.media_query !== undefined && typeof config.media_query !== "string") {
      throw new Error("media_query doit être une requête média CSS, par exemple (pointer: coarse).");
    }
    this.config = {
      theme: "auto",
      ...config,
      timeout: screensaverTimeout(config.timeout),
      dim_brightness: clampOpacity(config.dim_brightness, 0.85),
      night_brightness: clampOpacity(config.night_brightness, 0.35, 0.1),
    };
  }

  public static getStubConfig(hass?: HomeAssistant): Partial<ScreensaverCardConfig> {
    const weather = Object.keys(hass?.states ?? {}).find((id) => id.startsWith("weather."));
    return {
      type: "custom:auralis-screensaver-card",
      timeout: DEFAULT_TIMEOUT,
      ...(weather ? { weather_entity: weather } : {}),
      show_clock: true,
      show_date: true,
      night_dim: true,
    };
  }

  public static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      timeout: "Délai avant la veille (secondes)",
      weather_entity: "Entité météo",
      temperature_entity: "Capteur de température local",
      entities: "Valeurs affichées (4 au plus)",
      alert_entity: "Entité mise en avant quand elle est active",
      show_clock: "Afficher l'horloge",
      show_date: "Afficher la date",
      show_seconds: "Afficher les secondes",
      dim_brightness: "Luminosité du contenu",
      night_dim: "Assombrir la nuit",
      night_start: "Début de la nuit (HH:MM)",
      night_end: "Fin de la nuit (HH:MM)",
      night_brightness: "Luminosité la nuit",
      navigate_on_wake: "Vue ouverte au réveil",
      media_query: "Uniquement sur les écrans (requête média)",
      disabled_entity: "Désactiver quand cette entité est allumée",
      name: "Titre au-dessus de l'horloge",
      theme: "Thème de l'aperçu",
      accent_color: "Couleur d'accent",
    };
    return {
      schema: [
        { name: "timeout", selector: { number: { min: MIN_TIMEOUT, max: MAX_TIMEOUT, step: 15, mode: "box", unit_of_measurement: "s" } } },
        { name: "weather_entity", selector: { entity: { domain: "weather" } } },
        { name: "temperature_entity", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
        { name: "entities", selector: { entity: { multiple: true } } },
        { name: "alert_entity", selector: { entity: {} } },
        { name: "show_clock", selector: { boolean: {} } },
        { name: "show_date", selector: { boolean: {} } },
        { name: "show_seconds", selector: { boolean: {} } },
        { name: "dim_brightness", selector: { number: { min: 0.2, max: 1, step: 0.05, mode: "slider" } } },
        { name: "night_dim", selector: { boolean: {} } },
        { name: "night_start", selector: { text: {} } },
        { name: "night_end", selector: { text: {} } },
        { name: "night_brightness", selector: { number: { min: 0.1, max: 1, step: 0.05, mode: "slider" } } },
        { name: "navigate_on_wake", selector: { text: {} } },
        { name: "media_query", selector: { text: {} } },
        { name: "disabled_entity", selector: { entity: { domain: ["input_boolean", "switch", "binary_sensor"] } } },
        { name: "name", selector: { text: {} } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        { name: "accent_color", selector: { text: {} } },
      ],
      computeLabel: (schema: { name: string }) => labels[schema.name] ?? schema.name,
    };
  }

  /** `sun.sun` choisit l'icône de nuit de la météo. */
  protected extraWatchedEntities(): string[] {
    return this.config?.weather_entity ? ["sun.sun"] : [];
  }

  /**
   * Une carte qui a déjà quitté la page peut encore terminer une mise à jour en attente :
   * elle ne doit pas recréer l'écran de veille. En mode édition, la veille est coupée.
   */
  private syncSource(): void {
    if (this.isConnected && this.config && !this.editing) attachSource(this);
    else detachSource(this);
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.config) this.syncSource();
  }

  public disconnectedCallback(): void {
    detachSource(this);
    super.disconnectedCallback();
  }

  protected willUpdate(): void {
    this.toggleAttribute("data-edit-mode", this.editing);
  }

  protected updated(): void {
    super.updated();
    this.syncSource();
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.config || !this.editing) return nothing;
    return html`<ha-card class="placeholder">
      <ha-icon icon="mdi:sleep"></ha-icon>
      <div>
        <strong>Veille d'écran · après ${timeoutLabel(screensaverTimeout(this.config.timeout))}</strong>
        <small>Invisible sur le tableau de bord ; s'affiche après un moment sans contact.</small>
      </div>
    </ha-card>`;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, number> {
    return this.editing ? { rows: 1, min_rows: 1, columns: 6, min_columns: 3 } : { columns: 1, min_columns: 1 };
  }
}
