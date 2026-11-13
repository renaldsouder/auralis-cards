import { css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { AuralisBaseCard, configuredAccent } from "./auralis-base-card";
import { cardHeaderStyles } from "./auralis-actions-card";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { entity, friendlyName, isAvailable } from "../utils/entities";
import { bounded, safeColor } from "../utils/validate";

export type MediaKind = "speaker" | "tv" | "receiver";

export interface MediaSourceConfig {
  /** Nom de la source tel que Home Assistant le connaît (liste `source_list`). */
  source: string;
  name?: string;
  icon?: string;
}

export interface MediaPlayerConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Nature de l'appareil : déduite de l'entité si absente. */
  device_class?: MediaKind;
  color?: string;
  /** Sources favorites, dans l'ordre d'affichage. Sans cette option, toutes les sources de l'appareil. */
  sources?: Array<string | MediaSourceConfig>;
  /** Pas des boutons − et +, en pourcentage. */
  volume_step?: number;
  /** Volume maximal autorisé par la carte, en pourcentage. */
  max_volume?: number;
  /** Échelle d'affichage du volume (ex. 80 pour reproduire l'afficheur de l'ampli). */
  volume_scale?: number;
}

export interface MediaCardConfig extends BaseCardConfig, Partial<Omit<MediaPlayerConfig, "entity" | "name" | "icon">> {
  /** Raccourci pour un seul lecteur. */
  entity?: string;
  players?: MediaPlayerConfig[];
  show_header?: boolean;
  show_sources?: boolean;
  show_progress?: boolean;
}

/** Bits de `supported_features` des lecteurs multimédias Home Assistant. */
export const FEATURE = {
  PAUSE: 1, SEEK: 2, VOLUME_SET: 4, VOLUME_MUTE: 8, PREVIOUS: 16, NEXT: 32, TURN_ON: 128, TURN_OFF: 256,
  VOLUME_STEP: 1024, SELECT_SOURCE: 2048, STOP: 4096, PLAY: 16384, SHUFFLE: 32768, SOUND_MODE: 65536, REPEAT: 262144,
} as const;

const PLAYER_ID = /^media_player\.[a-z0-9_]+$/;
/** Après une action, le lecteur affiché ne change pas tout seul pendant cette durée. */
export const PIN_WINDOW = 8_000;
/** Valeur d'un curseur gardée à l'écran le temps que l'appareil confirme. */
const SETTLE_DELAY = 1_500;
/** Glissement le plus long pris en compte : au-delà, l'appareil reprend la main. */
const MAX_DRAG = 10_000;
const KINDS: Record<MediaKind, { icon: string; tone: string; label: string; off: string }> = {
  speaker: { icon: "mdi:speaker", tone: "#b79cff", label: "Enceinte", off: "éteinte" },
  tv: { icon: "mdi:television", tone: "#5b9dff", label: "Télévision", off: "éteinte" },
  receiver: { icon: "mdi:audio-video", tone: "#ffb454", label: "Ampli", off: "éteint" },
};
const SOURCE_ICONS: Array<[RegExp, string]> = [
  [/\b(tv|télé|television|télévision|arc)\b/i, "mdi:television"],
  [/bluetooth|\bbt\b/i, "mdi:bluetooth"],
  [/spotify/i, "mdi:spotify"],
  [/airplay|chromecast|\bcast\b|dlna|strm|stream|net(work)?\b|réseau|internet/i, "mdi:cast-audio"],
  [/game|jeu|\bps\d?\b|playstation|xbox|switch/i, "mdi:gamepad-variant-outline"],
  [/blu-?ray|\bbd\b|dvd/i, "mdi:disc-player"],
  [/\bcd\b/i, "mdi:disc"],
  [/\b(fm|am|dab|tuner|radio)\b/i, "mdi:radio"],
  [/usb/i, "mdi:usb"],
  [/\bpc\b|ordinateur|computer/i, "mdi:monitor"],
  [/cbl|sat|box|décodeur/i, "mdi:set-top-box"],
  [/phono|vinyl|platine/i, "mdi:album"],
  [/aux|analog/i, "mdi:audio-input-stereo-minijack"],
];
const STATE_LABELS: Record<string, string> = {
  playing: "Lecture", paused: "En pause", idle: "Inactif", on: "Allumé", off: "Éteint", standby: "En veille",
  buffering: "Chargement…", unavailable: "Indisponible", unknown: "État inconnu",
};
/** Commandes de la carte : libellé des messages d'échec. */
const CONTROL_LABELS: Record<string, string> = {
  power: "Marche/arrêt", play: "Lecture/pause", previous: "Piste précédente", next: "Piste suivante", volume: "Volume",
  mute: "Sourdine", source: "Changement de source", sound_mode: "Mode sonore", seek: "Déplacement dans la lecture",
  shuffle: "Lecture aléatoire", repeat: "Répétition",
};

/** Fonction prise en charge. Sans `supported_features`, tout est proposé et Home Assistant tranchera. */
export function supports(state: HassEntity | undefined, feature: number): boolean {
  const features = state?.attributes.supported_features;
  return typeof features !== "number" || (features & feature) !== 0;
}

export function playerKind(player: MediaPlayerConfig, state?: HassEntity): MediaKind {
  if (player.device_class && player.device_class in KINDS) return player.device_class;
  const deviceClass = state?.attributes.device_class;
  if (deviceClass === "tv" || deviceClass === "speaker" || deviceClass === "receiver") return deviceClass;
  return Array.isArray(state?.attributes.sound_mode_list) ? "receiver" : "speaker";
}

export function isPowered(state?: HassEntity): boolean {
  return isAvailable(state) && !["off", "standby"].includes(state!.state);
}

export function playerStateLabel(state?: HassEntity): string {
  if (!state) return "Introuvable";
  return STATE_LABELS[state.state] ?? state.state;
}

/** Phrase du panneau « éteint », alignée sur le libellé d'état affiché au-dessus. */
export function offLabel(kind: MediaKind, state?: HassEntity): string {
  if (!state) return "Entité introuvable.";
  if (state.state === "unavailable") return "Lecteur indisponible.";
  if (state.state === "unknown") return `${KINDS[kind].label} : état inconnu.`;
  if (state.state === "standby") return `${KINDS[kind].label} en veille.`;
  return `${KINDS[kind].label} ${KINDS[kind].off}.`;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Titre et sous-titre : le morceau en cours, sinon la source et le mode sonore (cas des amplis). */
export function nowPlaying(state: HassEntity | undefined, label: string): { title: string; subtitle: string } {
  const a = state?.attributes ?? {};
  const title = text(a.media_title);
  const source = text(a.source);
  if (title) {
    const subtitle = [text(a.media_artist) ?? text(a.media_series_title), text(a.media_album_name) ?? text(a.app_name)].filter(Boolean).join(" · ");
    return { title, subtitle: subtitle || source || playerStateLabel(state) };
  }
  if (isPowered(state) && source) return { title: source, subtitle: text(a.sound_mode) ?? text(a.app_name) ?? playerStateLabel(state) };
  return { title: label, subtitle: text(a.app_name) && isPowered(state) ? text(a.app_name)! : playerStateLabel(state) };
}

/** Position de lecture en secondes, extrapolée depuis la dernière mise à jour pendant la lecture. */
export function mediaPosition(state: HassEntity | undefined, now: number): number | undefined {
  const a = state?.attributes;
  const duration = Number(a?.media_duration);
  const position = Number(a?.media_position);
  if (!a || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position)) return undefined;
  const updated = typeof a.media_position_updated_at === "string" ? Date.parse(a.media_position_updated_at) : Number.NaN;
  const elapsed = state!.state === "playing" && Number.isFinite(updated) ? Math.max(0, (now - updated) / 1000) : 0;
  return Math.min(duration, position + elapsed);
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Nouveau volume (0 à 1) après un pas, borné au maximum autorisé et arrondi au centième. */
export function nextVolume(current: number, deltaPercent: number, maxPercent = 100): number {
  const value = Math.min(maxPercent, Math.max(0, Math.round(current * 100) + deltaPercent));
  return Math.round(value) / 100;
}

export function volumeLabel(level: number, scale?: number): string {
  if (scale && scale > 0) return String(Math.round(level * scale));
  return `${Math.round(level * 100)} %`;
}

export function sourceIcon(name: string): string {
  return SOURCE_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? "mdi:import";
}

/** Sources affichées : les favorites configurées, sinon la liste de l'appareil. */
export function normalizeSources(configured: MediaPlayerConfig["sources"], available: unknown): MediaSourceConfig[] {
  const list = Array.isArray(available) ? available.filter((item): item is string => typeof item === "string") : [];
  const items: MediaSourceConfig[] = configured?.length
    ? configured.map((item): MediaSourceConfig => (typeof item === "string" ? { source: item } : item)).filter((item) => item && typeof item.source === "string")
    : list.map((source) => ({ source }));
  return items.map((item) => ({ source: item.source, name: item.name?.trim() || item.source, icon: item.icon || sourceIcon(`${item.source} ${item.name ?? ""}`) }));
}

interface PlayerView {
  index: number;
  player: MediaPlayerConfig;
  state?: HassEntity;
  id: string;
  kind: MediaKind;
  label: string;
  icon: string;
  tone: string;
  available: boolean;
  powered: boolean;
  playing: boolean;
  title: string;
  subtitle: string;
  artwork?: string;
  volume?: number;
  muted: boolean;
  source?: string;
  soundMode?: string;
  maxVolume: number;
  step: number;
}

/** Lecteur affiché par défaut : celui qui joue, sinon celui qui est allumé, sinon le premier. */
export function pickPlayer(views: Array<Pick<PlayerView, "playing" | "powered">>): number {
  const playing = views.findIndex((view) => view.playing);
  if (playing >= 0) return playing;
  const powered = views.findIndex((view) => view.powered);
  return powered >= 0 ? powered : 0;
}

/** Le choix manuel d'un lecteur tombe quand ce lecteur s'éteint pendant qu'un autre joue. */
export function releasesChoice(views: Array<Pick<PlayerView, "playing" | "powered">>, chosen?: number): boolean {
  if (chosen === undefined) return false;
  const view = views[chosen];
  if (!view) return true;
  return !view.powered && views.some((other, index) => index !== chosen && other.playing);
}

/**
 * Lecteur affiché :
 * 1. celui choisi à la main (puce), tant qu'il n'est pas éteint pendant qu'un autre joue ;
 * 2. sinon, celui déjà affiché tant que la carte est « épinglée » (fenêtre ouverte, ou action
 *    de l'utilisateur il y a moins de PIN_WINDOW) : l'appareil ne change pas sous le doigt ;
 * 3. sinon, celui qui joue, puis celui qui est allumé, puis le premier.
 */
export function resolvePlayer(
  views: Array<Pick<PlayerView, "playing" | "powered">>,
  options: { chosen?: number; shown?: number; pinned: boolean },
): number {
  if (!views.length) return 0;
  if (options.chosen !== undefined && views[options.chosen] && !releasesChoice(views, options.chosen)) return options.chosen;
  if (options.pinned && options.shown !== undefined && views[options.shown]) return options.shown;
  return pickPlayer(views);
}

/**
 * Valeur d'un curseur (volume, position) gardée à l'écran pendant le glissement puis le temps
 * que l'appareil confirme, pour que la mise à jour de Home Assistant ne ramène pas le curseur.
 * Le relâchement passe par `change`, `pointerup` ou `pointercancel`, avec une durée maximale.
 */
export class HeldValue {
  private current?: { id: string; value: number };
  private timer?: ReturnType<typeof setTimeout>;

  constructor(private readonly onChange: () => void, private readonly settle = SETTLE_DELAY, private readonly maxHold = MAX_DRAG) {}

  get(id: string): number | undefined {
    return this.current?.id === id ? this.current.value : undefined;
  }

  get dragging(): boolean {
    return this.current !== undefined;
  }

  /** Pendant le glissement : la valeur du curseur l'emporte, au plus `maxHold`. */
  drag(id: string, value: number): void {
    this.current = { id, value };
    this.arm(this.maxHold);
    this.onChange();
  }

  /** Valeur envoyée à l'appareil : gardée le temps qu'il confirme. */
  hold(id: string, value: number): void {
    this.current = { id, value };
    this.arm(this.settle);
    this.onChange();
  }

  /** Doigt levé (même sans `change`) : on rend la main après le délai de confirmation. */
  release(): void {
    if (this.current) this.arm(this.settle);
  }

  clear(): void {
    clearTimeout(this.timer);
    if (!this.current) return;
    this.current = undefined;
    this.onChange();
  }

  private arm(delay: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.current = undefined;
      this.onChange();
    }, delay);
  }
}

export class AuralisMediaCard extends AuralisBaseCard<MediaCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    chosen: { state: true },
    now: { state: true },
    failed: { state: true },
  };

  static styles = [AuralisBaseCard.styles, cardHeaderStyles, css`
    .media-shell, .media-content { min-height:0; }
    .media-shell { padding:16px; isolation:isolate; --header-badge-bg:rgba(12,19,27,.72); --header-badge-border:rgba(255,255,255,.2); --header-muted:#c7d0dc; }
    .media-shell .header { margin-bottom:0; }
    .backdrop { position:absolute; z-index:0; inset:-30px; background:var(--art) center / cover no-repeat; filter:blur(34px) saturate(1.5) brightness(.55); opacity:.75; pointer-events:none; transform:scale(1.1); transition:opacity .5s ease; }
    .backdrop.empty { background:radial-gradient(circle at 18% 22%,color-mix(in srgb,var(--tone) 34%,transparent),transparent 46%),radial-gradient(circle at 88% 90%,color-mix(in srgb,var(--tone) 18%,transparent),transparent 50%); filter:none; opacity:1; transform:none; inset:0; }
    .media-content { display:grid; gap:14px; }
    .players { display:flex; gap:7px; margin:0 -2px; padding:2px; overflow-x:auto; scrollbar-width:none; }
    .players::-webkit-scrollbar { display:none; }
    .player { --t:var(--chip-tone); display:inline-flex; flex:0 0 auto; min-height:var(--auralis-target); align-items:center; gap:7px; padding:6px 12px 6px 9px; border:1px solid rgba(195,211,229,.16); border-radius:999px; background:rgba(9,14,20,.62); color:#d6dee8; cursor:pointer; font:inherit; font-size:var(--auralis-text-sm); font-weight:680; backdrop-filter:blur(10px); }
    .player:focus-visible { outline:2px solid var(--t); outline-offset:2px; }
    .player ha-icon { --mdc-icon-size:16px; display:grid; width:24px; height:24px; place-items:center; border-radius:50%; background:color-mix(in srgb,var(--t) 18%,transparent); color:var(--t); }
    .player.current { border-color:color-mix(in srgb,var(--t) 70%,transparent); background:color-mix(in srgb,var(--t) 20%,rgba(9,14,20,.7)); color:#fff; }
    .player.off { opacity:.62; }
    .player .eq { height:11px; }
    .hero { display:flex; align-items:center; gap:14px; min-width:0; }
    .cover { position:relative; display:grid; width:96px; height:96px; flex:0 0 auto; place-items:center; padding:0; overflow:hidden; border:1px solid rgba(255,255,255,.16); border-radius:20px; background:linear-gradient(145deg,color-mix(in srgb,var(--tone) 36%,#141c27),#0b1118); color:var(--tone); cursor:pointer; box-shadow:0 14px 34px rgba(0,0,0,.42); }
    .cover:focus-visible { outline:2px solid var(--tone); outline-offset:2px; }
    .cover img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
    .cover > ha-icon { --mdc-icon-size:44px; filter:drop-shadow(0 0 14px color-mix(in srgb,var(--tone) 60%,transparent)); }
    .cover .eq { position:absolute; right:8px; bottom:8px; padding:4px 5px; border-radius:8px; background:rgba(5,9,14,.7); }
    .eq { display:inline-flex; height:12px; align-items:flex-end; gap:2px; color:var(--tone); }
    .eq i { display:block; width:3px; height:100%; border-radius:2px; background:currentColor; animation:eq 1s ease-in-out infinite; transform-origin:bottom; }
    .eq i:nth-child(2) { animation-delay:-.35s; }
    .eq i:nth-child(3) { animation-delay:-.7s; }
    .now { display:grid; min-width:0; flex:1; gap:4px; }
    /*
     * Les classes du lecteur servent sur la façade (sombre, valeurs de repli) et dans la fenêtre,
     * qui suit le thème : .m-dialog y redéfinit les variables --m-*.
     */
    .m-dialog { --m-strong:var(--auralis-text); --m-soft:var(--auralis-text); --m-dim:var(--auralis-muted); --m-glass:var(--auralis-layer); --m-line:var(--auralis-border); --m-fill:color-mix(in srgb,var(--auralis-text) 10%,transparent); }
    .eyebrow { overflow:hidden; color:color-mix(in oklab,color-mix(in srgb,var(--tone) 70%,var(--m-dim,#c7d0dc)),#000 var(--auralis-shade)); font-size:var(--auralis-text-xs); font-weight:700; letter-spacing:.04em; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
    .title { display:-webkit-box; overflow:hidden; color:var(--m-strong,#fff); font-size:19px; font-weight:760; letter-spacing:-.02em; line-height:1.2; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow-wrap:anywhere; }
    .m-subtitle { overflow:hidden; color:var(--m-dim,#b9c5d3); font-size:var(--auralis-text-sm); text-overflow:ellipsis; white-space:nowrap; }
    .meta { display:flex; flex-wrap:wrap; gap:5px; margin-top:3px; }
    .m-pill { display:inline-flex; max-width:100%; align-items:center; gap:4px; padding:2px 8px; overflow:hidden; border-radius:999px; background:var(--m-fill,rgba(255,255,255,.08)); color:var(--m-soft,#d6dee8); font-size:var(--auralis-text-xs); font-weight:650; text-overflow:ellipsis; white-space:nowrap; }
    .m-pill ha-icon { --mdc-icon-size:12px; color:color-mix(in oklab,var(--tone),#000 var(--auralis-shade)); }
    .round { display:grid; width:var(--auralis-target); height:var(--auralis-target); flex:0 0 auto; place-items:center; padding:0; border:1px solid var(--m-line,rgba(255,255,255,.16)); border-radius:50%; background:var(--m-glass,rgba(9,14,20,.62)); color:var(--m-soft,#e8eef5); cursor:pointer; backdrop-filter:blur(10px); }
    .round:hover:not(:disabled) { border-color:color-mix(in srgb,var(--tone) 70%,transparent); color:var(--m-strong,#fff); }
    .round:focus-visible { outline:2px solid var(--tone); outline-offset:2px; }
    .round:disabled { cursor:not-allowed; opacity:.4; }
    .round ha-icon { --mdc-icon-size:21px; }
    .round.power.on { border-color:color-mix(in srgb,var(--tone) 60%,transparent); color:color-mix(in oklab,var(--tone),#000 var(--auralis-shade)); }
    .round.main { width:54px; height:54px; border:0; background:var(--tone); color:#10161e; box-shadow:0 8px 26px color-mix(in srgb,var(--tone) 45%,transparent); }
    .round.main ha-icon { --mdc-icon-size:28px; }
    .round.active { color:color-mix(in oklab,var(--tone),#000 var(--auralis-shade)); border-color:color-mix(in srgb,var(--tone) 55%,transparent); }
    .round.failed { border-color:var(--auralis-danger); color:var(--auralis-danger-ink); }
    .m-progress { display:grid; gap:5px; }
    .bar { position:relative; height:5px; overflow:hidden; border-radius:999px; background:var(--m-fill,rgba(255,255,255,.12)); }
    .bar span { position:absolute; inset:0 auto 0 0; width:var(--p); border-radius:inherit; background:linear-gradient(90deg,color-mix(in srgb,var(--tone) 55%,#fff),var(--tone)); }
    .times { display:flex; justify-content:space-between; color:var(--m-dim,#a7b4c2); font-size:var(--auralis-text-xs); font-variant-numeric:tabular-nums; }
    .transport { display:flex; align-items:center; justify-content:center; gap:14px; }
    .volume { display:flex; align-items:center; gap:6px; }
    .vol { --fill:0%; flex:1; min-width:0; height:var(--auralis-target); margin:0; background:transparent; cursor:pointer; -webkit-appearance:none; appearance:none; touch-action:pan-y; }
    .vol::-webkit-slider-runnable-track { height:8px; border-radius:999px; background:linear-gradient(90deg,var(--tone) var(--fill),var(--m-fill,rgba(255,255,255,.13)) var(--fill)); }
    .vol::-moz-range-track { height:8px; border-radius:999px; background:linear-gradient(90deg,var(--tone) var(--fill),var(--m-fill,rgba(255,255,255,.13)) var(--fill)); }
    .vol::-webkit-slider-thumb { width:20px; height:20px; margin-top:-6px; border:3px solid var(--tone); border-radius:50%; background:#fff; -webkit-appearance:none; appearance:none; box-shadow:0 2px 8px rgba(0,0,0,.4); }
    .vol::-moz-range-thumb { width:14px; height:14px; border:3px solid var(--tone); border-radius:50%; background:#fff; }
    .vol:disabled { cursor:not-allowed; opacity:.45; }
    .vol:focus-visible { outline:2px solid var(--tone); outline-offset:3px; border-radius:999px; }
    .volume .round ha-icon { --mdc-icon-size:18px; }
    .vol-value { min-width:42px; color:var(--m-strong,#fff); font-size:14px; font-weight:760; font-variant-numeric:tabular-nums; text-align:end; }
    .vol-value.muted { color:var(--m-dim,#a7b4c2); text-decoration:line-through; }
    .sources { display:flex; gap:7px; margin:0 -2px; padding:2px; overflow-x:auto; scrollbar-width:none; }
    .sources::-webkit-scrollbar { display:none; }
    .sources.wrap { flex-wrap:wrap; overflow:visible; }
    .src { display:inline-flex; flex:0 0 auto; min-height:var(--auralis-target); align-items:center; gap:6px; padding:7px 12px; border:1px solid var(--m-line,rgba(195,211,229,.15)); border-radius:13px; background:var(--m-glass,rgba(9,14,20,.58)); color:var(--m-soft,#d6dee8); cursor:pointer; font:inherit; font-size:var(--auralis-text-sm); font-weight:650; backdrop-filter:blur(10px); }
    .src ha-icon { --mdc-icon-size:17px; color:color-mix(in oklab,color-mix(in srgb,var(--tone) 75%,var(--m-dim,#c7d0dc)),#000 var(--auralis-shade)); }
    .src:hover:not(:disabled) { border-color:color-mix(in srgb,var(--tone) 60%,transparent); }
    .src.current { border-color:var(--tone); background:color-mix(in srgb,var(--tone) 26%,var(--m-glass,rgba(9,14,20,.7))); color:var(--m-strong,#fff); }
    .src.current ha-icon { color:color-mix(in oklab,var(--tone),#000 var(--auralis-shade)); }
    /* Changement de source en cours. */
    .src:disabled { cursor:wait; opacity:.6; }
    .off-panel { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border:1px dashed var(--m-line,rgba(195,211,229,.2)); border-radius:16px; color:var(--m-dim,#a7b4c2); font-size:var(--auralis-text-sm); }
    .wake { display:inline-flex; min-height:var(--auralis-target); align-items:center; gap:7px; padding:0 16px; border:0; border-radius:999px; background:var(--tone); color:#10161e; cursor:pointer; font:inherit; font-size:var(--auralis-text-md); font-weight:760; }
    .wake ha-icon { --mdc-icon-size:18px; }
    .wake:disabled { cursor:not-allowed; opacity:.5; }
    .m-dialog .dialog-body { display:grid; gap:16px; }
    .m-dialog .hero .cover { width:132px; height:132px; border-radius:24px; }
    .m-dialog .title { font-size:22px; }
    .m-dialog .seek { --fill:var(--p); }
    .m-dialog .dialog-section-title { margin:0; }
    @keyframes eq { 0%, 100% { transform:scaleY(.3); } 50% { transform:scaleY(1); } }
    @media (prefers-reduced-motion: reduce) { .eq i { animation:none; transform:scaleY(.7); } .backdrop { transition:none; } }
    @container (min-width:520px) { .hero .cover { width:116px; height:116px; } .title { font-size:21px; } }
    @container (max-width:340px) {
      .hero { gap:11px; }
      .cover { width:72px; height:72px; border-radius:16px; }
      .cover > ha-icon { --mdc-icon-size:34px; }
      .title { font-size:16px; }
      .transport { gap:8px; }
      .volume { gap:4px; }
    }
  `];

  private chosen?: number;
  private now = Date.now();
  private failed?: string;
  private ticker?: number;
  private failTimer?: number;
  private pinTimer?: number;
  /** Lecteur dessiné au dernier rendu : gardé tant que la carte est épinglée. */
  private shown?: number;
  private lastInteraction = 0;
  /** Pochettes qui n'ont pas pu être chargées : on affiche l'icône de l'appareil à la place. */
  private brokenArt = new Set<string>();
  private readonly volumeHold = new HeldValue(() => this.requestUpdate());
  private readonly seekHold = new HeldValue(() => this.requestUpdate());

  static getStubConfig(hass?: HomeAssistant): Partial<MediaCardConfig> {
    const ids = Object.keys(hass?.states ?? {}).filter((id) => id.startsWith("media_player.")).slice(0, 3);
    return { theme: "carbon", players: (ids.length ? ids : ["media_player.salon"]).map((id) => ({ entity: id })) };
  }

  static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      name: "Titre", icon: "Icône", entity: "Lecteur (un seul)", players: "Lecteurs (entity, name, device_class, sources, max_volume…)",
      show_sources: "Afficher les sources", show_progress: "Afficher la progression",
      show_header: "Afficher l’en-tête (par défaut avec un titre et plusieurs lecteurs)",
      theme: "Thème", accent_color: "Couleur d’accent", card_background: "Fond de la carte",
    };
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "entity", selector: { entity: { filter: { domain: "media_player" } } } },
        { name: "players", selector: { object: {} } },
        { name: "show_sources", selector: { boolean: {} } },
        { name: "show_progress", selector: { boolean: {} } },
        { name: "show_header", selector: { boolean: {} } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        { name: "accent_color", selector: { text: {} } },
        { name: "card_background", selector: { object: {} } },
      ],
      computeLabel: ({ name }: { name: string }) => labels[name],
    };
  }

  public setConfig(config: MediaCardConfig): void {
    const players: MediaPlayerConfig[] = Array.isArray(config?.players) && config.players.length
      ? config.players
      : config?.entity
        ? [{ entity: config.entity, device_class: config.device_class, color: config.color, sources: config.sources, volume_step: config.volume_step, max_volume: config.max_volume, volume_scale: config.volume_scale }]
        : [];
    const invalid = players.find((player) => !player || typeof player.entity !== "string" || !PLAYER_ID.test(player.entity)
      || (player.sources !== undefined && !Array.isArray(player.sources)));
    if (!players.length || invalid) {
      throw new Error("Configurez un lecteur : entity: media_player.xxx, ou players: - entity: media_player.xxx.");
    }
    this.config = {
      ...config,
      theme: config.theme || "carbon",
      players: players.map((player) => ({
        ...player,
        volume_step: bounded(player.volume_step, 1, 20) ?? 2,
        max_volume: bounded(player.max_volume, 5, 100) ?? 100,
        volume_scale: player.volume_scale === undefined ? undefined : bounded(player.volume_scale, 1, 1000) ?? 100,
      })),
    };
    if (this.chosen !== undefined && this.chosen >= players.length) this.chosen = undefined;
    if (this.shown !== undefined && this.shown >= players.length) this.shown = undefined;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.now = Date.now();
    window.clearInterval(this.ticker);
    // Avance la barre de progression pendant la lecture, sans réveiller la carte le reste du temps.
    this.ticker = window.setInterval(() => {
      const view = this.currentView();
      if (view?.playing && mediaPosition(view.state, Date.now()) !== undefined) this.now = Date.now();
    }, 1_000);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this.ticker);
    window.clearTimeout(this.failTimer);
    window.clearTimeout(this.pinTimer);
    this.volumeHold.clear();
    this.seekHold.clear();
  }

  protected willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    // Lecteur choisi éteint pendant qu'un autre joue : la carte revient au choix automatique.
    if (this.chosen !== undefined && releasesChoice(this.views(), this.chosen)) this.chosen = undefined;
  }

  protected closeDialog(): void {
    super.closeDialog();
    // Le lecteur reste celui de la fenêtre encore quelques secondes.
    this.interact();
  }

  /** Une action de l'utilisateur épingle le lecteur affiché pendant PIN_WINDOW. */
  private interact(): void {
    this.lastInteraction = Date.now();
    window.clearTimeout(this.pinTimer);
    this.pinTimer = window.setTimeout(() => this.requestUpdate(), PIN_WINDOW + 50);
  }

  private pinned(): boolean {
    return this.dialog === "media" || Date.now() - this.lastInteraction < PIN_WINDOW;
  }

  private view(player: MediaPlayerConfig, index: number): PlayerView {
    const state = entity(this.hass, player.entity);
    const kind = playerKind(player, state);
    const style = KINDS[kind];
    const label = player.name?.trim() || (index === 0 && this.config?.entity && this.config.name?.trim()) || friendlyName(state, player.entity);
    const a = state?.attributes ?? {};
    const playing = nowPlaying(state, label);
    // Source affichée sous le nom choisi dans les favorites (« tv » devient « Télé »).
    const rawSource = text(a.source);
    const sourceLabel = rawSource ? normalizeSources(player.sources, [rawSource]).find((item) => item.source === rawSource)?.name ?? rawSource : undefined;
    const title = rawSource && playing.title === rawSource ? sourceLabel! : playing.title;
    const subtitle = rawSource && playing.subtitle === rawSource ? sourceLabel! : playing.subtitle;
    const volume = typeof a.volume_level === "number" ? a.volume_level : undefined;
    const powered = isPowered(state);
    const artwork = powered ? text(a.entity_picture) : undefined;
    return {
      index,
      player,
      state,
      id: player.entity,
      kind,
      label,
      icon: player.icon || (typeof a.icon === "string" ? a.icon : style.icon),
      tone: safeColor(player.color) ?? configuredAccent(this.config) ?? style.tone,
      available: Boolean(state) && state!.state !== "unavailable",
      powered,
      playing: state?.state === "playing",
      title,
      subtitle,
      artwork: artwork && !this.brokenArt.has(artwork) ? artwork : undefined,
      volume: this.volumeHold.get(player.entity) ?? volume,
      muted: a.is_volume_muted === true,
      source: text(a.source),
      soundMode: text(a.sound_mode),
      maxVolume: player.max_volume ?? 100,
      step: player.volume_step ?? 2,
    };
  }

  private views(): PlayerView[] {
    return this.config?.players?.map((player, index) => this.view(player, index)) ?? [];
  }

  private currentView(views = this.views()): PlayerView | undefined {
    if (!views.length) return undefined;
    return views[resolvePlayer(views, { chosen: this.chosen, shown: this.shown, pinned: this.pinned() })] ?? views[0];
  }

  private choose(index: number): void {
    this.chosen = index;
    this.interact();
  }

  /**
   * Commande envoyée au lecteur, avec état « en cours » et message d'échec visibles. Le bouton
   * concerné (`control`) clignote en rouge quelques secondes si l'appareil refuse.
   */
  private async call(view: PlayerView, service: string, data: Record<string, unknown> = {}, control = service): Promise<boolean> {
    const hass = this.hass;
    const key = `${view.id}:${control}`;
    if (!hass || this.isPending(key)) return false;
    this.interact();
    const ok = await this.runCommand(key, () => hass.callService("media_player", service, data, { entity_id: view.id }), {
      errorMessage: `${CONTROL_LABELS[control] ?? "La commande"} : échec sur ${view.label}.`,
    });
    if (!ok) {
      this.failed = key;
      window.clearTimeout(this.failTimer);
      this.failTimer = window.setTimeout(() => { this.failed = undefined; }, 2_500);
    }
    return ok;
  }

  private togglePower(view: PlayerView): Promise<boolean> {
    return this.call(view, view.powered ? "turn_off" : "turn_on", {}, "power");
  }

  private playPause(view: PlayerView): Promise<boolean> {
    if (view.playing) return this.call(view, supports(view.state, FEATURE.PAUSE) ? "media_pause" : "media_stop", {}, "play");
    return this.call(view, supports(view.state, FEATURE.PLAY) ? "media_play" : "media_play_pause", {}, "play");
  }

  /** Volume réglé au pas configuré, sans dépasser le maximum ; à défaut, les commandes − et + de l'appareil. */
  private stepVolume(view: PlayerView, direction: 1 | -1): Promise<boolean> {
    if (view.volume !== undefined && supports(view.state, FEATURE.VOLUME_SET)) {
      return this.setVolume(view, nextVolume(view.volume, direction * view.step, view.maxVolume));
    }
    if (direction > 0 && view.volume !== undefined && view.volume * 100 >= view.maxVolume) return Promise.resolve(false);
    return this.call(view, direction > 0 ? "volume_up" : "volume_down", {}, "volume");
  }

  private setVolume(view: PlayerView, level: number): Promise<boolean> {
    const value = Math.min(view.maxVolume / 100, Math.max(0, level));
    this.volumeHold.hold(view.id, value);
    return this.call(view, "volume_set", { volume_level: Math.round(value * 100) / 100 }, "volume");
  }

  private onVolumeInput(view: PlayerView, event: Event): void {
    this.interact();
    this.volumeHold.drag(view.id, Number((event.target as HTMLInputElement).value) / 100);
  }

  private onVolumeChange(view: PlayerView, event: Event): void {
    void this.setVolume(view, Number((event.target as HTMLInputElement).value) / 100);
  }

  private onSeekInput(view: PlayerView, event: Event): void {
    this.interact();
    this.seekHold.drag(view.id, Number((event.target as HTMLInputElement).value));
  }

  private onSeekChange(view: PlayerView, event: Event): void {
    const position = Number((event.target as HTMLInputElement).value);
    this.seekHold.hold(view.id, position);
    void this.call(view, "media_seek", { seek_position: position }, "seek");
  }

  private selectSource(view: PlayerView, source: string): Promise<boolean> {
    return this.call(view, "select_source", { source }, "source");
  }

  private eq(): TemplateResult {
    return html`<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>`;
  }

  private failedClass(view: PlayerView, control: string): string {
    return this.failed === `${view.id}:${control}` ? "failed" : "";
  }

  private busy(view: PlayerView, control: string): "true" | "false" {
    return this.isPending(`${view.id}:${control}`) ? "true" : "false";
  }

  private artworkFailed(url: string): void {
    if (this.brokenArt.has(url)) return;
    this.brokenArt = new Set(this.brokenArt).add(url);
    this.requestUpdate();
  }

  private renderCover(view: PlayerView): TemplateResult {
    const artwork = view.artwork;
    return html`<button class="cover" type="button" aria-label=${`Ouvrir ${view.label}`} @click=${() => this.openDialog("media")}>
      ${artwork ? html`<img src=${artwork} alt="" decoding="async" @error=${() => this.artworkFailed(artwork)} />` : html`<ha-icon .icon=${view.icon}></ha-icon>`}
      ${view.playing ? this.eq() : nothing}
    </button>`;
  }

  private renderHero(view: PlayerView, dialog = false): TemplateResult {
    const powerSupported = supports(view.state, view.powered ? FEATURE.TURN_OFF : FEATURE.TURN_ON);
    return html`<div class="hero">
      ${this.renderCover(view)}
      <div class="now">
        <span class="eyebrow">${view.title === view.label ? playerStateLabel(view.state) : `${view.label} · ${playerStateLabel(view.state)}`}</span>
        <strong class="title">${view.title}</strong>
        ${view.subtitle !== playerStateLabel(view.state) || view.title !== view.label ? html`<span class="m-subtitle">${view.subtitle}</span>` : nothing}
        ${view.powered && (view.source || view.soundMode) && (!view.source || view.title !== this.sourceName(view, view.source)) ? html`<span class="meta">
          ${view.source ? html`<span class="m-pill"><ha-icon .icon=${sourceIcon(view.source)}></ha-icon>${this.sourceName(view, view.source)}</span>` : nothing}
          ${view.soundMode && view.subtitle !== view.soundMode ? html`<span class="m-pill"><ha-icon icon="mdi:surround-sound"></ha-icon>${view.soundMode}</span>` : nothing}
        </span>` : nothing}
      </div>
      ${dialog ? nothing : html`<button class="round power ${view.powered ? "on" : ""} ${this.failedClass(view, "power")}" type="button"
        aria-label=${view.powered ? `Éteindre ${view.label}` : `Allumer ${view.label}`} aria-busy=${this.busy(view, "power")}
        ?disabled=${!view.available || !powerSupported}
        @click=${() => this.togglePower(view)}><ha-icon icon="mdi:power"></ha-icon></button>`}
    </div>`;
  }

  private sourceName(view: PlayerView, source: string): string {
    return normalizeSources(view.player.sources, [source]).find((item) => item.source === source)?.name ?? source;
  }

  private renderProgress(view: PlayerView, seekable: boolean): TemplateResult | typeof nothing {
    if (this.config?.show_progress === false) return nothing;
    const live = mediaPosition(view.state, this.now);
    const duration = Number(view.state?.attributes.media_duration);
    if (live === undefined) return nothing;
    // Pendant le glissement, le curseur garde la position choisie malgré le défilement de la lecture.
    const position = Math.min(duration, this.seekHold.get(view.id) ?? live);
    const percent = `${Math.round((position / duration) * 1000) / 10}%`;
    return html`<div class="m-progress" style=${`--p:${percent}`}>
      ${seekable && supports(view.state, FEATURE.SEEK)
        ? html`<input class="vol seek" type="range" min="0" max=${Math.round(duration)} step="1" .value=${String(Math.round(position))}
            aria-label="Position de lecture" aria-valuetext=${formatDuration(position)}
            @input=${(event: Event) => this.onSeekInput(view, event)} @change=${(event: Event) => this.onSeekChange(view, event)}
            @pointerup=${() => this.seekHold.release()} @pointercancel=${() => this.seekHold.release()} />`
        : html`<div class="bar"><span></span></div>`}
      <div class="times"><span>${formatDuration(position)}</span><span>−${formatDuration(duration - position)}</span></div>
    </div>`;
  }

  private renderTransport(view: PlayerView, full: boolean): TemplateResult | typeof nothing {
    const s = view.state;
    if (!supports(s, FEATURE.PAUSE) && !supports(s, FEATURE.PREVIOUS) && !supports(s, FEATURE.NEXT)) return nothing;
    const shuffle = s?.attributes.shuffle === true;
    const repeat = typeof s?.attributes.repeat === "string" ? s.attributes.repeat : "off";
    const repeatNext: Record<string, string> = { off: "all", all: "one", one: "off" };
    const canPlay = supports(s, FEATURE.PLAY) || supports(s, FEATURE.PAUSE);
    return html`<div class="transport">
      ${full && supports(s, FEATURE.SHUFFLE) && s?.attributes.shuffle !== undefined ? html`<button class="round ${shuffle ? "active" : ""} ${this.failedClass(view, "shuffle")}" type="button" aria-label="Lecture aléatoire" aria-pressed=${shuffle ? "true" : "false"}
        aria-busy=${this.busy(view, "shuffle")} @click=${() => this.call(view, "shuffle_set", { shuffle: !shuffle }, "shuffle")}><ha-icon icon=${shuffle ? "mdi:shuffle" : "mdi:shuffle-disabled"}></ha-icon></button>` : nothing}
      ${supports(s, FEATURE.PREVIOUS) ? html`<button class="round ${this.failedClass(view, "previous")}" type="button" aria-label="Précédent" aria-busy=${this.busy(view, "previous")}
        @click=${() => this.call(view, "media_previous_track", {}, "previous")}><ha-icon icon="mdi:skip-previous"></ha-icon></button>` : nothing}
      ${canPlay ? html`<button class="round main ${this.failedClass(view, "play")}" type="button" aria-label=${view.playing ? "Pause" : "Lecture"} aria-busy=${this.busy(view, "play")}
        @click=${() => this.playPause(view)}><ha-icon icon=${view.playing ? "mdi:pause" : "mdi:play"}></ha-icon></button>` : nothing}
      ${supports(s, FEATURE.NEXT) ? html`<button class="round ${this.failedClass(view, "next")}" type="button" aria-label="Suivant" aria-busy=${this.busy(view, "next")}
        @click=${() => this.call(view, "media_next_track", {}, "next")}><ha-icon icon="mdi:skip-next"></ha-icon></button>` : nothing}
      ${full && supports(s, FEATURE.REPEAT) && s?.attributes.repeat !== undefined ? html`<button class="round ${repeat !== "off" ? "active" : ""} ${this.failedClass(view, "repeat")}" type="button" aria-label="Répétition"
        aria-busy=${this.busy(view, "repeat")} @click=${() => this.call(view, "repeat_set", { repeat: repeatNext[repeat] ?? "off" }, "repeat")}><ha-icon icon=${repeat === "one" ? "mdi:repeat-once" : repeat === "all" ? "mdi:repeat" : "mdi:repeat-off"}></ha-icon></button>` : nothing}
    </div>`;
  }

  private renderVolume(view: PlayerView): TemplateResult | typeof nothing {
    const s = view.state;
    const canSet = view.volume !== undefined && supports(s, FEATURE.VOLUME_SET);
    const canStep = canSet || supports(s, FEATURE.VOLUME_STEP);
    if (view.volume === undefined && !canStep) return nothing;
    const level = view.volume ?? 0;
    const fill = `${Math.min(100, (level * 100 / view.maxVolume) * 100)}%`;
    return html`<div class="volume">
      ${supports(s, FEATURE.VOLUME_MUTE) ? html`<button class="round ${view.muted ? "active" : ""} ${this.failedClass(view, "mute")}" type="button" aria-label=${view.muted ? "Rétablir le son" : "Couper le son"} aria-pressed=${view.muted ? "true" : "false"}
        @click=${() => this.call(view, "volume_mute", { is_volume_muted: !view.muted }, "mute")}><ha-icon icon=${view.muted ? "mdi:volume-off" : level < 0.34 ? "mdi:volume-low" : level < 0.67 ? "mdi:volume-medium" : "mdi:volume-high"}></ha-icon></button>` : nothing}
      ${canStep ? html`<button class="round ${this.failedClass(view, "volume")}" type="button" aria-label="Baisser le volume" ?disabled=${level <= 0 && view.volume !== undefined} @click=${() => this.stepVolume(view, -1)}><ha-icon icon="mdi:minus"></ha-icon></button>` : nothing}
      ${view.volume !== undefined ? html`<input class="vol" type="range" min="0" max=${view.maxVolume} step="1" style=${`--fill:${fill}`}
        .value=${String(Math.round(level * 100))} ?disabled=${!canSet} aria-label="Volume" aria-valuetext=${volumeLabel(level, view.player.volume_scale)}
        @input=${(event: Event) => this.onVolumeInput(view, event)} @change=${(event: Event) => this.onVolumeChange(view, event)}
        @pointerup=${() => this.volumeHold.release()} @pointercancel=${() => this.volumeHold.release()} />` : html`<span style="flex:1"></span>`}
      ${canStep ? html`<button class="round ${this.failedClass(view, "volume")}" type="button" aria-label="Monter le volume" ?disabled=${view.volume !== undefined && level * 100 >= view.maxVolume} @click=${() => this.stepVolume(view, 1)}><ha-icon icon="mdi:plus"></ha-icon></button>` : nothing}
      ${view.volume !== undefined ? html`<span class="vol-value ${view.muted ? "muted" : ""}">${volumeLabel(level, view.player.volume_scale)}</span>` : nothing}
    </div>`;
  }

  private renderSources(view: PlayerView, wrap: boolean, all = false): TemplateResult | typeof nothing {
    if (!supports(view.state, FEATURE.SELECT_SOURCE)) return nothing;
    const configured = all ? undefined : view.player.sources;
    const sources = normalizeSources(configured, view.state?.attributes.source_list);
    if (all && view.player.sources?.length) {
      // Dans la fenêtre : toutes les sources, avec les noms et icônes des favorites.
      const favorites = new Map(normalizeSources(view.player.sources, []).map((item) => [item.source, item]));
      sources.forEach((item, index) => { sources[index] = favorites.get(item.source) ?? item; });
    }
    if (!sources.length) return nothing;
    const pending = this.isPending(`${view.id}:source`);
    return html`<div class="sources ${wrap ? "wrap" : ""}" role="group" aria-label="Sources" aria-busy=${pending ? "true" : "false"}>
      ${sources.map((item) => html`<button class="src ${item.source === view.source ? "current" : ""}" type="button" ?disabled=${pending}
        aria-pressed=${item.source === view.source ? "true" : "false"} @click=${() => this.selectSource(view, item.source)}>
        <ha-icon .icon=${item.icon}></ha-icon>${item.name}</button>`)}
    </div>`;
  }

  private renderSoundModes(view: PlayerView): TemplateResult | typeof nothing {
    const list = view.state?.attributes.sound_mode_list;
    if (!supports(view.state, FEATURE.SOUND_MODE) || !Array.isArray(list) || !list.length) return nothing;
    const pending = this.isPending(`${view.id}:sound_mode`);
    return html`<div class="dialog-section-title">Mode sonore</div>
      <div class="sources wrap" role="group" aria-label="Mode sonore">
        ${list.filter((mode): mode is string => typeof mode === "string").map((mode) => html`<button class="src ${mode === view.soundMode ? "current" : ""}" type="button" ?disabled=${pending}
          aria-pressed=${mode === view.soundMode ? "true" : "false"} @click=${() => this.call(view, "select_sound_mode", { sound_mode: mode }, "sound_mode")}>
          <ha-icon icon="mdi:surround-sound"></ha-icon>${mode}</button>`)}
      </div>`;
  }

  private renderOff(view: PlayerView): TemplateResult {
    const canWake = view.available && supports(view.state, FEATURE.TURN_ON);
    return html`<div class="off-panel">
      <span>${offLabel(view.kind, view.state)}</span>
      ${canWake ? html`<button class="wake" type="button" ?disabled=${this.isPending(`${view.id}:power`)} aria-busy=${this.busy(view, "power")}
        @click=${() => this.call(view, "turn_on", {}, "power")}><ha-icon icon="mdi:power"></ha-icon>Allumer</button>` : nothing}
    </div>`;
  }

  /** Onglets des lecteurs : flèches gauche/droite, Début et Fin, comme un `tablist` standard. */
  private async onPlayersKey(event: KeyboardEvent, views: PlayerView[], current: PlayerView): Promise<void> {
    const moves: Record<string, number> = { ArrowLeft: current.index - 1, ArrowRight: current.index + 1, Home: 0, End: views.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const index = ((moves[event.key] % views.length) + views.length) % views.length;
    this.choose(index);
    await this.updateComplete;
    this.renderRoot.querySelector<HTMLElement>(`.player[data-index="${index}"]`)?.focus();
  }

  private renderPlayers(views: PlayerView[], current: PlayerView): TemplateResult | typeof nothing {
    if (views.length < 2) return nothing;
    return html`<div class="players" role="tablist" aria-label="Lecteurs" @keydown=${(event: KeyboardEvent) => this.onPlayersKey(event, views, current)}>
      ${views.map((view) => html`<button class="player ${view.index === current.index ? "current" : ""} ${view.powered ? "" : "off"}" type="button" role="tab"
        data-index=${view.index} tabindex=${view.index === current.index ? "0" : "-1"}
        aria-selected=${view.index === current.index ? "true" : "false"} style=${`--chip-tone:${view.tone}`} @click=${() => this.choose(view.index)}>
        <ha-icon .icon=${view.icon}></ha-icon>${view.label}${view.playing ? html`<span style=${`color:${view.tone}`}>${this.eq()}</span>` : nothing}</button>`)}
    </div>`;
  }

  private renderMediaDialog(view: PlayerView): TemplateResult {
    return this.renderDialog(view.label, view.icon, html`<div class="dialog-body" style=${`--tone:${view.tone}`}>
      ${this.renderHero(view, true)}
      ${view.powered ? html`
        ${this.renderProgress(view, true)}
        ${this.renderTransport(view, true)}
        ${this.renderVolume(view)}
        ${supports(view.state, FEATURE.SELECT_SOURCE) && Array.isArray(view.state?.attributes.source_list) ? html`<div class="dialog-section-title">Sources</div>${this.renderSources(view, true, true)}` : nothing}
        ${this.renderSoundModes(view)}` : this.renderOff(view)}
      <div class="actions">
        ${view.powered && supports(view.state, FEATURE.TURN_OFF) ? html`<button class="action danger" type="button" aria-busy=${this.busy(view, "power")}
          @click=${() => this.call(view, "turn_off", {}, "power")}><ha-icon icon="mdi:power"></ha-icon>Éteindre</button>` : nothing}
        <button class="action" type="button" @click=${() => this.moreInfo(view.id)}><ha-icon icon="mdi:information-outline"></ha-icon>Fiche</button>
      </div>
    </div>`, "m-dialog");
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this.config;
    if (!config) return nothing;
    const views = this.views();
    const current = this.currentView(views);
    if (!current) return nothing;
    this.shown = current.index;
    const playing = views.filter((view) => view.playing).length;
    const powered = views.filter((view) => view.powered).length;
    const showHeader = config.show_header ?? (Boolean(config.name) && !config.entity);
    const summary = [
      `${views.length} lecteur${views.length > 1 ? "s" : ""}`,
      playing ? `${playing} en lecture` : powered ? `${powered} allumé${powered > 1 ? "s" : ""}` : "tout est éteint",
    ].join(" · ");
    return html`<ha-card><div class="machine-shell media-shell ${this.machineGridClass()}" style=${`${this.machineStyle(current.tone)};--tone:${current.tone}`}>
      <div class="backdrop ${current.artwork ? "" : "empty"}" style=${current.artwork ? `--art:url("${current.artwork.replaceAll('"', "%22")}")` : ""}></div>
      <div class="machine-content media-content">
        ${showHeader ? html`<header class="header">
          <span class="badge"><ha-icon .icon=${config.icon || "mdi:music-box-multiple-outline"}></ha-icon></span>
          <div class="title-wrap"><h2>${config.name || "Multimédia"}</h2>
            <div class="status-line"><span class="dot ${playing ? "healthy" : powered ? "warning" : ""}"></span>${summary}</div></div>
        </header>` : nothing}
        ${this.renderPlayers(views, current)}
        ${this.renderHero(current)}
        ${current.powered ? html`
          ${this.renderProgress(current, false)}
          ${this.renderTransport(current, false)}
          ${this.renderVolume(current)}
          ${config.show_sources === false ? nothing : this.renderSources(current, false)}` : this.renderOff(current)}
      </div>
    </div></ha-card>
    ${this.dialog === "media" ? this.renderMediaDialog(current) : nothing}`;
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, min_columns: 4 };
  }
}
