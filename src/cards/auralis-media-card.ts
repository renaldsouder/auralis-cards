import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { fireMoreInfo } from "../utils/actions";
import { entity, friendlyName, isAvailable } from "../utils/entities";

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
const SAFE_COLOR = /^[#\w(),.%\s-]+$/;
const KINDS: Record<MediaKind, { icon: string; tone: string; label: string }> = {
  speaker: { icon: "mdi:speaker", tone: "#b79cff", label: "Enceinte" },
  tv: { icon: "mdi:television", tone: "#5b9dff", label: "Télévision" },
  receiver: { icon: "mdi:audio-video", tone: "#ffb454", label: "Ampli" },
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

export class AuralisMediaCard extends AuralisBaseCard<MediaCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    chosen: { state: true },
    now: { state: true },
    dragVolume: { state: true },
    failed: { state: true },
  };

  static styles = [AuralisBaseCard.styles, css`
    .media-shell, .media-content { min-height:0; }
    .media-shell { padding:16px; isolation:isolate; }
    .backdrop { position:absolute; z-index:0; inset:-30px; background:var(--art) center / cover no-repeat; filter:blur(34px) saturate(1.5) brightness(.55); opacity:.75; pointer-events:none; transform:scale(1.1); transition:opacity .5s ease; }
    .backdrop.empty { background:radial-gradient(circle at 18% 22%,color-mix(in srgb,var(--tone) 34%,transparent),transparent 46%),radial-gradient(circle at 88% 90%,color-mix(in srgb,var(--tone) 18%,transparent),transparent 50%); filter:none; opacity:1; transform:none; inset:0; }
    .media-content { display:grid; gap:14px; }
    .m-header { display:flex; align-items:center; gap:11px; }
    .m-header .badge { display:grid; width:39px; height:39px; flex:0 0 auto; place-items:center; border:1px solid rgba(255,255,255,.2); border-radius:14px; background:rgba(12,19,27,.72); color:var(--machine-accent); }
    .m-header .badge ha-icon { --mdc-icon-size:22px; }
    .m-header h2 { overflow:hidden; font-size:19px; text-overflow:ellipsis; white-space:nowrap; }
    .m-header .machine-status { margin-top:4px; }
    .players { display:flex; gap:7px; margin:0 -2px; padding:2px; overflow-x:auto; scrollbar-width:none; }
    .players::-webkit-scrollbar { display:none; }
    .player { --t:var(--chip-tone); display:inline-flex; flex:0 0 auto; align-items:center; gap:7px; padding:6px 12px 6px 7px; border:1px solid rgba(195,211,229,.16); border-radius:999px; background:rgba(9,14,20,.62); color:#d6dee8; cursor:pointer; font:inherit; font-size:12px; font-weight:680; backdrop-filter:blur(10px); }
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
    .eyebrow { overflow:hidden; color:color-mix(in srgb,var(--tone) 70%,#c7d0dc); font-size:11px; font-weight:700; letter-spacing:.04em; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
    .title { display:-webkit-box; overflow:hidden; color:#fff; font-size:19px; font-weight:760; letter-spacing:-.02em; line-height:1.2; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow-wrap:anywhere; }
    .m-subtitle { overflow:hidden; color:#b9c5d3; font-size:12.5px; text-overflow:ellipsis; white-space:nowrap; }
    .meta { display:flex; flex-wrap:wrap; gap:5px; margin-top:3px; }
    .m-pill { display:inline-flex; max-width:100%; align-items:center; gap:4px; padding:2px 8px; overflow:hidden; border-radius:999px; background:rgba(255,255,255,.08); color:#d6dee8; font-size:10.5px; font-weight:650; text-overflow:ellipsis; white-space:nowrap; }
    .m-pill ha-icon { --mdc-icon-size:12px; color:var(--tone); }
    .round { display:grid; width:40px; height:40px; flex:0 0 auto; place-items:center; padding:0; border:1px solid rgba(255,255,255,.16); border-radius:50%; background:rgba(9,14,20,.62); color:#e8eef5; cursor:pointer; backdrop-filter:blur(10px); }
    .round:hover:not(:disabled) { border-color:color-mix(in srgb,var(--tone) 70%,transparent); color:#fff; }
    .round:focus-visible { outline:2px solid var(--tone); outline-offset:2px; }
    .round:disabled { cursor:not-allowed; opacity:.4; }
    .round ha-icon { --mdc-icon-size:21px; }
    .round.power.on { border-color:color-mix(in srgb,var(--tone) 60%,transparent); color:var(--tone); }
    .round.main { width:54px; height:54px; border:0; background:var(--tone); color:#10161e; box-shadow:0 8px 26px color-mix(in srgb,var(--tone) 45%,transparent); }
    .round.main ha-icon { --mdc-icon-size:28px; }
    .round.active { color:var(--tone); border-color:color-mix(in srgb,var(--tone) 55%,transparent); }
    .round.failed { border-color:var(--auralis-danger,#ff6b74); color:var(--auralis-danger,#ff6b74); }
    .m-progress { display:grid; gap:5px; }
    .bar { position:relative; height:5px; overflow:hidden; border-radius:999px; background:rgba(255,255,255,.12); }
    .bar span { position:absolute; inset:0 auto 0 0; width:var(--p); border-radius:inherit; background:linear-gradient(90deg,color-mix(in srgb,var(--tone) 55%,#fff),var(--tone)); }
    .times { display:flex; justify-content:space-between; color:#a7b4c2; font-size:10.5px; font-variant-numeric:tabular-nums; }
    .transport { display:flex; align-items:center; justify-content:center; gap:14px; }
    .volume { display:flex; align-items:center; gap:8px; }
    .vol { --fill:0%; flex:1; min-width:0; height:28px; margin:0; background:transparent; cursor:pointer; -webkit-appearance:none; appearance:none; }
    .vol::-webkit-slider-runnable-track { height:8px; border-radius:999px; background:linear-gradient(90deg,var(--tone) var(--fill),rgba(255,255,255,.13) var(--fill)); }
    .vol::-moz-range-track { height:8px; border-radius:999px; background:linear-gradient(90deg,var(--tone) var(--fill),rgba(255,255,255,.13) var(--fill)); }
    .vol::-webkit-slider-thumb { width:20px; height:20px; margin-top:-6px; border:3px solid var(--tone); border-radius:50%; background:#fff; -webkit-appearance:none; appearance:none; box-shadow:0 2px 8px rgba(0,0,0,.4); }
    .vol::-moz-range-thumb { width:14px; height:14px; border:3px solid var(--tone); border-radius:50%; background:#fff; }
    .vol:disabled { cursor:not-allowed; opacity:.45; }
    .vol:focus-visible { outline:2px solid var(--tone); outline-offset:3px; border-radius:999px; }
    .volume .round { width:34px; height:34px; }
    .volume .round ha-icon { --mdc-icon-size:18px; }
    .vol-value { min-width:46px; color:#fff; font-size:14px; font-weight:760; font-variant-numeric:tabular-nums; text-align:end; }
    .vol-value.muted { color:#a7b4c2; text-decoration:line-through; }
    .sources { display:flex; gap:7px; margin:0 -2px; padding:2px; overflow-x:auto; scrollbar-width:none; }
    .sources::-webkit-scrollbar { display:none; }
    .sources.wrap { flex-wrap:wrap; overflow:visible; }
    .src { display:inline-flex; flex:0 0 auto; align-items:center; gap:6px; padding:7px 12px; border:1px solid rgba(195,211,229,.15); border-radius:13px; background:rgba(9,14,20,.58); color:#d6dee8; cursor:pointer; font:inherit; font-size:12px; font-weight:650; backdrop-filter:blur(10px); }
    .src ha-icon { --mdc-icon-size:17px; color:color-mix(in srgb,var(--tone) 75%,#c7d0dc); }
    .src:hover:not(:disabled) { border-color:color-mix(in srgb,var(--tone) 60%,transparent); }
    .src.current { border-color:var(--tone); background:color-mix(in srgb,var(--tone) 26%,rgba(9,14,20,.7)); color:#fff; }
    .src.current ha-icon { color:var(--tone); }
    .src:disabled { cursor:wait; opacity:.6; }
    .off-panel { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border:1px dashed rgba(195,211,229,.2); border-radius:16px; color:#a7b4c2; font-size:12.5px; }
    .wake { display:inline-flex; align-items:center; gap:7px; padding:9px 16px; border:0; border-radius:999px; background:var(--tone); color:#10161e; cursor:pointer; font:inherit; font-size:13px; font-weight:760; }
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
      .transport { gap:10px; }
      .round.power { width:34px; height:34px; }
    }
  `];

  private chosen?: number;
  private now = Date.now();
  private dragVolume?: { id: string; value: number };
  private failed?: string;
  private ticker?: number;
  private dragTimer?: number;
  private failTimer?: number;

  static getStubConfig(hass?: HomeAssistant): Partial<MediaCardConfig> {
    const ids = Object.keys(hass?.states ?? {}).filter((id) => id.startsWith("media_player.")).slice(0, 3);
    return { theme: "carbon", players: (ids.length ? ids : ["media_player.salon"]).map((id) => ({ entity: id })) };
  }

  static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      name: "Titre", icon: "Icône", entity: "Lecteur (un seul)", players: "Lecteurs (entity, name, device_class, sources, max_volume…)",
      show_sources: "Afficher les sources", show_progress: "Afficher la progression", show_header: "Afficher l’en-tête",
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
    const bounded = (value: unknown, min: number, max: number, fallback: number): number => {
      const number = Number(value);
      return value !== undefined && value !== null && value !== "" && Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
    };
    this.config = {
      ...config,
      theme: config.theme || "carbon",
      players: players.map((player) => ({
        ...player,
        volume_step: bounded(player.volume_step, 1, 20, 2),
        max_volume: bounded(player.max_volume, 5, 100, 100),
        volume_scale: player.volume_scale === undefined ? undefined : bounded(player.volume_scale, 1, 1000, 100),
      })),
    };
    if (this.chosen !== undefined && this.chosen >= players.length) this.chosen = undefined;
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
    window.clearTimeout(this.dragTimer);
    window.clearTimeout(this.failTimer);
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
    const color = player.color?.trim() || this.config?.accent_color?.trim();
    const powered = isPowered(state);
    return {
      index,
      player,
      state,
      id: player.entity,
      kind,
      label,
      icon: player.icon || (typeof a.icon === "string" ? a.icon : style.icon),
      tone: color && SAFE_COLOR.test(color) ? color : style.tone,
      available: Boolean(state) && state!.state !== "unavailable",
      powered,
      playing: state?.state === "playing",
      title,
      subtitle,
      artwork: powered ? text(a.entity_picture) : undefined,
      volume: this.dragVolume?.id === player.entity ? this.dragVolume.value : volume,
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
    return views[this.chosen ?? pickPlayer(views)] ?? views[0];
  }

  private async call(view: PlayerView, service: string, data: Record<string, unknown> = {}): Promise<void> {
    if (!this.hass) return;
    try {
      await this.hass.callService("media_player", service, data, { entity_id: view.id });
    } catch (error) {
      this.failed = `${view.id}:${service}`;
      window.clearTimeout(this.failTimer);
      this.failTimer = window.setTimeout(() => { this.failed = undefined; }, 2_500);
      console.warn("Auralis Média : échec de la commande", service, error);
    }
  }

  private togglePower(view: PlayerView): Promise<void> {
    return this.call(view, view.powered ? "turn_off" : "turn_on");
  }

  private playPause(view: PlayerView): Promise<void> {
    if (view.playing) return this.call(view, supports(view.state, FEATURE.PAUSE) ? "media_pause" : "media_stop");
    return this.call(view, supports(view.state, FEATURE.PLAY) ? "media_play" : "media_play_pause");
  }

  /** Volume réglé au pas configuré, sans dépasser le maximum ; à défaut, les commandes − et + de l'appareil. */
  private stepVolume(view: PlayerView, direction: 1 | -1): Promise<void> {
    if (view.volume !== undefined && supports(view.state, FEATURE.VOLUME_SET)) {
      return this.setVolume(view, nextVolume(view.volume, direction * view.step, view.maxVolume));
    }
    if (direction > 0 && view.volume !== undefined && view.volume * 100 >= view.maxVolume) return Promise.resolve();
    return this.call(view, direction > 0 ? "volume_up" : "volume_down");
  }

  private setVolume(view: PlayerView, level: number): Promise<void> {
    const value = Math.min(view.maxVolume / 100, Math.max(0, level));
    this.holdVolume(view.id, value);
    return this.call(view, "volume_set", { volume_level: Math.round(value * 100) / 100 });
  }

  /** Garde la valeur choisie à l'écran le temps que l'appareil confirme. */
  private holdVolume(id: string, value: number): void {
    this.dragVolume = { id, value };
    window.clearTimeout(this.dragTimer);
    this.dragTimer = window.setTimeout(() => { this.dragVolume = undefined; }, 1_500);
  }

  private onVolumeInput(view: PlayerView, event: Event): void {
    this.dragVolume = { id: view.id, value: Number((event.target as HTMLInputElement).value) / 100 };
    window.clearTimeout(this.dragTimer);
  }

  private onVolumeChange(view: PlayerView, event: Event): void {
    void this.setVolume(view, Number((event.target as HTMLInputElement).value) / 100);
  }

  private selectSource(view: PlayerView, source: string): Promise<void> {
    return this.call(view, "select_source", { source });
  }

  private eq(): TemplateResult {
    return html`<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>`;
  }

  private failedClass(view: PlayerView, service: string): string {
    return this.failed === `${view.id}:${service}` ? "failed" : "";
  }

  private renderCover(view: PlayerView): TemplateResult {
    return html`<button class="cover" type="button" aria-label=${`Ouvrir ${view.label}`} @click=${() => this.openDialog("media")}>
      ${view.artwork ? html`<img src=${view.artwork} alt="" decoding="async" />` : html`<ha-icon .icon=${view.icon}></ha-icon>`}
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
      ${dialog ? nothing : html`<button class="round power ${view.powered ? "on" : ""} ${this.failedClass(view, view.powered ? "turn_off" : "turn_on")}" type="button"
        aria-label=${view.powered ? `Éteindre ${view.label}` : `Allumer ${view.label}`} ?disabled=${!view.available || !powerSupported}
        @click=${() => this.togglePower(view)}><ha-icon icon="mdi:power"></ha-icon></button>`}
    </div>`;
  }

  private sourceName(view: PlayerView, source: string): string {
    return normalizeSources(view.player.sources, [source]).find((item) => item.source === source)?.name ?? source;
  }

  private renderProgress(view: PlayerView, seekable: boolean): TemplateResult | typeof nothing {
    if (this.config?.show_progress === false) return nothing;
    const position = mediaPosition(view.state, this.now);
    const duration = Number(view.state?.attributes.media_duration);
    if (position === undefined) return nothing;
    const percent = `${Math.round((position / duration) * 1000) / 10}%`;
    return html`<div class="m-progress" style=${`--p:${percent}`}>
      ${seekable && supports(view.state, FEATURE.SEEK)
        ? html`<input class="vol seek" type="range" min="0" max=${Math.round(duration)} step="1" .value=${String(Math.round(position))}
            aria-label="Position de lecture" @change=${(event: Event) => this.call(view, "media_seek", { seek_position: Number((event.target as HTMLInputElement).value) })} />`
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
      ${full && supports(s, FEATURE.SHUFFLE) && s?.attributes.shuffle !== undefined ? html`<button class="round ${shuffle ? "active" : ""}" type="button" aria-label="Lecture aléatoire" aria-pressed=${shuffle ? "true" : "false"}
        @click=${() => this.call(view, "shuffle_set", { shuffle: !shuffle })}><ha-icon icon=${shuffle ? "mdi:shuffle" : "mdi:shuffle-disabled"}></ha-icon></button>` : nothing}
      ${supports(s, FEATURE.PREVIOUS) ? html`<button class="round ${this.failedClass(view, "media_previous_track")}" type="button" aria-label="Précédent" @click=${() => this.call(view, "media_previous_track")}><ha-icon icon="mdi:skip-previous"></ha-icon></button>` : nothing}
      ${canPlay ? html`<button class="round main ${this.failedClass(view, view.playing ? "media_pause" : "media_play")}" type="button" aria-label=${view.playing ? "Pause" : "Lecture"} @click=${() => this.playPause(view)}><ha-icon icon=${view.playing ? "mdi:pause" : "mdi:play"}></ha-icon></button>` : nothing}
      ${supports(s, FEATURE.NEXT) ? html`<button class="round ${this.failedClass(view, "media_next_track")}" type="button" aria-label="Suivant" @click=${() => this.call(view, "media_next_track")}><ha-icon icon="mdi:skip-next"></ha-icon></button>` : nothing}
      ${full && supports(s, FEATURE.REPEAT) && s?.attributes.repeat !== undefined ? html`<button class="round ${repeat !== "off" ? "active" : ""}" type="button" aria-label="Répétition"
        @click=${() => this.call(view, "repeat_set", { repeat: repeatNext[repeat] ?? "off" })}><ha-icon icon=${repeat === "one" ? "mdi:repeat-once" : repeat === "all" ? "mdi:repeat" : "mdi:repeat-off"}></ha-icon></button>` : nothing}
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
      ${supports(s, FEATURE.VOLUME_MUTE) ? html`<button class="round ${view.muted ? "active" : ""}" type="button" aria-label=${view.muted ? "Rétablir le son" : "Couper le son"} aria-pressed=${view.muted ? "true" : "false"}
        @click=${() => this.call(view, "volume_mute", { is_volume_muted: !view.muted })}><ha-icon icon=${view.muted ? "mdi:volume-off" : level < 0.34 ? "mdi:volume-low" : level < 0.67 ? "mdi:volume-medium" : "mdi:volume-high"}></ha-icon></button>` : nothing}
      ${canStep ? html`<button class="round" type="button" aria-label="Baisser le volume" ?disabled=${level <= 0 && view.volume !== undefined} @click=${() => this.stepVolume(view, -1)}><ha-icon icon="mdi:minus"></ha-icon></button>` : nothing}
      ${view.volume !== undefined ? html`<input class="vol" type="range" min="0" max=${view.maxVolume} step="1" style=${`--fill:${fill}`}
        .value=${String(Math.round(level * 100))} ?disabled=${!canSet} aria-label="Volume"
        @input=${(event: Event) => this.onVolumeInput(view, event)} @change=${(event: Event) => this.onVolumeChange(view, event)} />` : html`<span style="flex:1"></span>`}
      ${canStep ? html`<button class="round" type="button" aria-label="Monter le volume" ?disabled=${view.volume !== undefined && level * 100 >= view.maxVolume} @click=${() => this.stepVolume(view, 1)}><ha-icon icon="mdi:plus"></ha-icon></button>` : nothing}
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
    return html`<div class="sources ${wrap ? "wrap" : ""}" role="group" aria-label="Sources">
      ${sources.map((item) => html`<button class="src ${item.source === view.source ? "current" : ""}" type="button"
        aria-pressed=${item.source === view.source ? "true" : "false"} @click=${() => this.selectSource(view, item.source)}>
        <ha-icon .icon=${item.icon}></ha-icon>${item.name}</button>`)}
    </div>`;
  }

  private renderSoundModes(view: PlayerView): TemplateResult | typeof nothing {
    const list = view.state?.attributes.sound_mode_list;
    if (!supports(view.state, FEATURE.SOUND_MODE) || !Array.isArray(list) || !list.length) return nothing;
    return html`<div class="dialog-section-title">Mode sonore</div>
      <div class="sources wrap" role="group" aria-label="Mode sonore">
        ${list.filter((mode): mode is string => typeof mode === "string").map((mode) => html`<button class="src ${mode === view.soundMode ? "current" : ""}" type="button"
          aria-pressed=${mode === view.soundMode ? "true" : "false"} @click=${() => this.call(view, "select_sound_mode", { sound_mode: mode })}>
          <ha-icon icon="mdi:surround-sound"></ha-icon>${mode}</button>`)}
      </div>`;
  }

  private renderOff(view: PlayerView): TemplateResult {
    const canWake = view.available && supports(view.state, FEATURE.TURN_ON);
    return html`<div class="off-panel">
      <span>${view.available ? `${KINDS[view.kind].label} ${view.state?.state === "standby" ? "en veille" : view.kind === "receiver" ? "éteint" : "éteinte"}.` : "Lecteur indisponible."}</span>
      ${canWake ? html`<button class="wake" type="button" @click=${() => this.call(view, "turn_on")}><ha-icon icon="mdi:power"></ha-icon>Allumer</button>` : nothing}
    </div>`;
  }

  private renderPlayers(views: PlayerView[], current: PlayerView): TemplateResult | typeof nothing {
    if (views.length < 2) return nothing;
    return html`<div class="players" role="tablist" aria-label="Lecteurs">
      ${views.map((view) => html`<button class="player ${view.index === current.index ? "current" : ""} ${view.powered ? "" : "off"}" type="button" role="tab"
        aria-selected=${view.index === current.index ? "true" : "false"} style=${`--chip-tone:${view.tone}`} @click=${() => { this.chosen = view.index; }}>
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
        ${view.powered && supports(view.state, FEATURE.TURN_OFF) ? html`<button class="action danger" type="button" @click=${() => this.call(view, "turn_off")}><ha-icon icon="mdi:power"></ha-icon>Éteindre</button>` : nothing}
        <button class="action" type="button" @click=${() => fireMoreInfo(this, view.id)}><ha-icon icon="mdi:information-outline"></ha-icon>Fiche</button>
      </div>
    </div>`, "m-dialog");
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this.config;
    if (!config) return nothing;
    const views = this.views();
    const current = this.currentView(views);
    if (!current) return nothing;
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
        ${showHeader ? html`<header class="m-header">
          <span class="badge"><ha-icon .icon=${config.icon || "mdi:music-box-multiple-outline"}></ha-icon></span>
          <div class="title-wrap"><h2>${config.name || "Multimédia"}</h2>
            <div class="machine-status"><span class="dot ${playing ? "healthy" : powered ? "warning" : ""}"></span>${summary}</div></div>
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
