import { css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import {
  coverPopupHost,
  coverPopupStyles,
  holdMoreInfo,
  renderCoverGroupBar,
  renderCoverRows,
  runCoverCommand,
  withDragValue,
  type CoverPopupHost,
} from "./auralis-covers-card";
import { brightnessTargets, isLight, lightTargets, supportsBrightness } from "./auralis-lights-card";
import { SetpointBuffer, setpointLimits, stepSetpoint } from "./auralis-thermostat-card";
import type { RoomBackgroundMode, RoomCardConfig, RoomOverlayPosition, RoomSceneConfig, RoomSideControlConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import defaultSalonImage from "../assets/salon-default.jpg?inline";
import {
  coverPosition,
  displayState,
  domainOf,
  entity,
  friendlyName,
  hexToRgb,
  isActive,
  isAvailable,
  isCommandable,
  lightBrightness,
  lightRgbColor,
  lightSupportsColor,
  numericState,
  rgbToHex,
  summarizeRange,
} from "../utils/entities";
import { activateEntity } from "../utils/actions";
import { resolveAreaEntities, suggestArea, type AreaResolution, type HomeAssistantWithRegistries, type ResolvedArea } from "../utils/areas";

/** Au-delà de 10 jours (rétention par défaut de l'enregistreur), les courbes passent aux statistiques long terme. */
export const HISTORY_GRAPH_MAX_HOURS = 240;

/**
 * Carte Home Assistant d'une courbe de la fenêtre climat : `history-graph` jusqu'à 10 jours,
 * `statistics-graph` (moyenne, minimum, maximum) au-delà, puisque l'historique détaillé
 * n'est plus conservé et qu'un `history-graph` sur plusieurs mois resterait vide.
 */
export function climateGraphConfig(entityId: string, label: string, hours: number): Record<string, unknown> {
  const normalized = Math.max(1, Math.round(hours));
  if (normalized <= HISTORY_GRAPH_MAX_HOURS) {
    return { type: "history-graph", title: label, hours_to_show: normalized, show_names: false, entities: [{ entity: entityId, name: label }] };
  }
  const days = Math.ceil(normalized / 24);
  return {
    type: "statistics-graph",
    title: label,
    days_to_show: days,
    period: days > 31 ? "day" : "hour",
    stat_types: ["mean", "min", "max"],
    chart_type: "line",
    entities: [{ entity: entityId, name: label }],
  };
}

/** État d'un lecteur multimédia, en minuscules (« en pause » seulement s'il l'est vraiment). */
export function mediaStatusLabel(state?: HassEntity): string {
  if (!state || state.state === "unavailable") return "indisponible";
  const labels: Record<string, string> = {
    playing: "lecture en cours", paused: "en pause", idle: "inactif", off: "éteint",
    standby: "en veille", buffering: "chargement…", on: "allumé",
  };
  return labels[state.state] ?? "état inconnu";
}

/** `area_exclude` accepte une liste ou un seul motif. */
function areaExclusions(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value] : [];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

const configured = (value: string | undefined): string | undefined => value?.trim() ? value : undefined;
const configuredList = (value: string[] | undefined): string[] | undefined => value?.length ? value : undefined;

/**
 * Complète une configuration avec les entités d'une zone : seules les options absentes (ou
 * vides) sont remplies, la configuration explicite l'emporte toujours. Une télévision de la
 * zone devient une commande de droite, à côté du lecteur, si `right_controls` n'est pas défini.
 */
export function withAreaEntities(config: RoomCardConfig, area: ResolvedArea): RoomCardConfig {
  const media = configured(config.media_player_entity) ?? area.media;
  const tvControls: RoomSideControlConfig[] | undefined = area.tv
    ? [...(media ? [{ type: "media" as const, entity: media }] : []), { type: "tv", entity: area.tv }]
    : undefined;
  return {
    ...config,
    name: configured(config.name) ?? area.name,
    lights: configuredList(config.lights) ?? area.lights,
    covers: configuredList(config.covers) ?? area.covers,
    temperature_entity: configured(config.temperature_entity) ?? area.temperature,
    humidity_entity: configured(config.humidity_entity) ?? area.humidity,
    climate_entity: configured(config.climate_entity) ?? area.climate,
    media_player_entity: media,
    right_controls: config.right_controls ?? tvControls,
  };
}

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

/** Service marche/arrêt adapté aux entités : `light`, `switch` ou `homeassistant` si elles sont mélangées. */
function powerDomain(ids: string[]): string {
  const domains = new Set(ids.map(domainOf));
  return domains.size === 1 && (domains.has("light") || domains.has("switch")) ? [...domains][0] : "homeassistant";
}

export class AuralisRoomCard extends AuralisBaseCard<RoomCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    dragValues: { state: true },
  };

  static styles = [
    AuralisBaseCard.styles,
    coverPopupStyles,
    css`
      /* Jetons de la carte Pièce : clairs pour halo et aurora, sombres pour carbon et mono. */
      :host {
        --room-surface: #f7f8fa;
        --room-layer: #eceff3;
        --room-layer-strong: #e7ebef;
        --room-text: #18212b;
        --room-muted: #5f6a76;
        --room-line: rgba(58, 69, 83, 0.12);
        --room-hover: rgba(21, 31, 42, 0.045);
        --room-accent: #79d6f2;
      }

      :host([data-theme="carbon"]),
      :host([data-theme="mono"]) {
        --room-surface: #0d151d;
        --room-layer: #17222e;
        --room-layer-strong: #131e28;
        --room-text: #f4f8fc;
        --room-muted: #91a3b7;
        --room-line: rgba(185, 205, 226, 0.14);
        --room-hover: rgba(255, 255, 255, 0.045);
      }

      /* accent_color s'applique à toute la carte et à ses fenêtres, pas seulement à la photo. */
      :host([data-accent]) {
        --room-accent: var(--auralis-card-accent);
      }

      .cinema-shell {
        --room-card-surface: var(--room-card-background, var(--room-surface));
        container-type: inline-size;
        padding: 16px;
        overflow: hidden;
        border-radius: inherit;
        background: var(--room-card-surface);
        color: var(--room-text);
      }

      .cinema-shell.show-grid {
        background:
          linear-gradient(90deg, color-mix(in srgb, var(--room-text) 3%, transparent) 1px, transparent 1px) 0 0 / 32px 32px,
          radial-gradient(circle at 88% 10%, color-mix(in srgb, var(--room-accent) 9%, transparent), transparent 32%),
          var(--room-card-surface);
      }

      .cinema-shell.background-gradient {
        --room-card-surface: var(
          --room-card-background,
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--room-accent) 10%, var(--room-surface)),
            var(--room-surface) 56%,
            color-mix(in srgb, var(--room-text) 5%, var(--room-surface))
          )
        );
      }

      /* En-tête : pastille d'icône, titre, ligne d'état et pastilles de climat. */
      .cinema-header {
        gap: 10px;
        margin-bottom: 12px;
      }

      .room-avatar {
        display: grid;
        width: 40px;
        height: 40px;
        flex: 0 0 auto;
        place-items: center;
        border-radius: 14px;
        background: color-mix(in srgb, var(--room-accent) 18%, transparent);
        color: color-mix(in oklab, color-mix(in srgb, var(--room-accent) 75%, var(--room-text)), #000 var(--auralis-shade));
      }

      .room-avatar ha-icon {
        --mdc-icon-size: 21px;
        color: inherit;
      }

      .cinema-title h2 {
        overflow: hidden;
        color: var(--room-text);
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .room-title-button {
        max-width: 100%;
        padding: 0;
        overflow: hidden;
        border: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font: inherit;
        letter-spacing: inherit;
        text-align: left;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cinema-title .status-line {
        min-width: 0;
        margin-top: 3px;
        color: var(--room-muted);
        font-size: var(--auralis-text-xs);
      }

      .cinema-title .status-line span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .climate-pills {
        display: flex;
        flex: 0 0 auto;
        gap: 7px;
      }

      .climate-pill {
        display: flex;
        min-width: 68px;
        min-height: var(--auralis-target);
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 0 11px;
        border: 0;
        border-radius: 14px;
        background: var(--room-layer);
        color: var(--room-text);
        cursor: pointer;
        font-size: 14px;
        font-weight: 760;
      }

      .climate-pill ha-icon {
        --mdc-icon-size: 17px;
        color: color-mix(in srgb, var(--room-text) 68%, var(--room-muted));
      }

      .cinema-body {
        display: grid;
        grid-template-columns: 54px minmax(0, 1fr) 54px;
        align-items: stretch;
        gap: 6px;
      }

      .cinema-body.no-left {
        grid-template-columns: minmax(0, 1fr) 54px;
      }

      .cinema-body.no-right {
        grid-template-columns: 54px minmax(0, 1fr);
      }

      .cinema-body.no-left.no-right {
        grid-template-columns: minmax(0, 1fr);
      }

      /* Colonnes latérales de commandes. */
      .side-control-column {
        display: flex;
        min-width: 0;
        min-height: 180px;
        flex-direction: column;
        justify-content: center;
        gap: 6px;
      }

      .side-control-column.dual .side-control {
        flex: 1 1 0;
      }

      .side-control {
        display: flex;
        width: 100%;
        min-height: 70px;
        min-width: 0;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 4px;
        padding: 6px 2px;
        border: 0;
        border-radius: 16px;
        background: transparent;
        color: var(--room-text);
        cursor: pointer;
        text-align: center;
      }

      .side-control:hover {
        background: var(--room-hover);
      }

      .side-control[disabled] {
        cursor: default;
        opacity: 0.42;
      }

      .side-control ha-icon {
        --mdc-icon-size: 19px;
        color: color-mix(in srgb, var(--room-text) 68%, var(--room-muted));
      }

      .side-control.active ha-icon {
        color: color-mix(in oklab, var(--room-accent), #000 var(--auralis-shade));
        filter: drop-shadow(0 0 7px color-mix(in srgb, var(--room-accent) 55%, transparent));
      }

      .side-control strong {
        width: 100%;
        overflow: hidden;
        font-size: 13px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .side-control small {
        width: 100%;
        overflow: hidden;
        color: var(--room-muted);
        font-size: var(--auralis-text-xs);
        line-height: 1.25;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Photo de la pièce et éléments posés dessus (toujours sur fond sombre). */
      .room-photo {
        position: relative;
        min-height: 180px;
        overflow: hidden;
        border: 1px solid var(--room-line);
        border-radius: 20px;
        background-image:
          linear-gradient(180deg, rgba(5, 9, 14, 0.05), rgba(5, 9, 14, 0.32)),
          var(--room-image, linear-gradient(135deg, #3a2b23, #172432 62%, #0d141c));
        background-position: var(--room-image-position, center);
        background-size: cover;
        box-shadow: inset 0 -45px 70px rgba(0, 0, 0, 0.24);
      }

      .room-photo::before {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 24% 35%, rgba(255, 171, 73, 0.24), transparent 30%),
          linear-gradient(115deg, transparent 45%, rgba(38, 116, 156, 0.16));
        content: "";
        pointer-events: none;
      }

      .scene-chip {
        display: flex;
        min-height: var(--auralis-target);
        align-items: center;
        gap: 7px;
        padding: 0 14px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        background: rgba(13, 18, 25, 0.72);
        color: white;
        cursor: pointer;
        font-size: var(--auralis-text-sm);
        font-weight: 680;
        backdrop-filter: blur(10px);
        pointer-events: auto;
      }

      .scene-chip ha-icon {
        --mdc-icon-size: 17px;
      }

      .photo-overlay-slot {
        position: absolute;
        z-index: 2;
        display: flex;
        max-width: calc(100% - 24px);
        flex-direction: column;
        gap: 7px;
        pointer-events: none;
      }

      .photo-overlay-slot.top-left {
        top: 12px;
        left: 12px;
        align-items: flex-start;
      }

      .photo-overlay-slot.top-right {
        top: 12px;
        right: 12px;
        align-items: flex-end;
      }

      .photo-overlay-slot.bottom-left {
        bottom: 12px;
        left: 12px;
        align-items: flex-start;
      }

      .photo-overlay-slot.bottom-right {
        right: 12px;
        bottom: 12px;
        align-items: flex-end;
      }

      @container (max-width: 420px) {
        .room-photo.split-bottom-controls .photo-overlay-slot.bottom-right {
          top: 8px;
          bottom: auto;
        }
      }

      .thermostat-control {
        display: grid;
        min-width: 150px;
        padding: 5px 7px;
        border: 1px solid var(--thermostat-border, rgba(255, 255, 255, 0.16));
        border-radius: 15px;
        background: var(--thermostat-background, rgba(13, 18, 25, 0.76));
        backdrop-filter: blur(10px);
        pointer-events: auto;
      }

      .thermostat-control.no-border {
        border-color: transparent;
      }

      .thermostat-control.no-background {
        background: transparent;
        backdrop-filter: none;
      }

      .thermostat-label {
        overflow: hidden;
        margin: 2px 2px 0;
        color: var(--thermostat-label, rgba(255, 255, 255, 0.72));
        font-size: var(--auralis-text-xs);
        font-weight: 650;
        letter-spacing: 0.02em;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .thermostat-row {
        display: grid;
        grid-template-columns: var(--auralis-target) minmax(58px, 1fr) var(--auralis-target);
        align-items: center;
      }

      .thermostat-step,
      .thermostat-value {
        min-height: var(--auralis-target);
        padding: 0;
        border: 0;
        background: transparent;
        cursor: pointer;
      }

      .thermostat-step {
        color: var(--thermostat-button, #ffd166);
        font-size: 24px;
        font-weight: 520;
        line-height: 1;
      }

      .thermostat-value {
        color: var(--thermostat-value, #ffffff);
        font-size: 23px;
        font-weight: 720;
        letter-spacing: -0.04em;
      }

      .thermostat-value[aria-busy="true"] {
        opacity: 0.82;
      }

      .thermostat-step[disabled],
      .thermostat-value[disabled] {
        cursor: default;
        opacity: 0.55;
      }

      /* Dock des volets, sous la photo. */
      .cover-dock {
        display: grid;
        grid-column: 2;
        grid-template-columns: repeat(3, minmax(64px, 1fr));
        width: min(250px, 82%);
        min-height: 48px;
        margin: 8px auto 0;
        overflow: hidden;
        border: 1px solid var(--room-line);
        border-radius: 16px 16px 0 0;
        background: var(--room-layer);
      }

      .cinema-body.no-left .cover-dock {
        grid-column: 1;
      }

      .cinema-body.no-left.no-right .cover-dock {
        grid-column: 1 / -1;
      }

      .cover-command {
        display: grid;
        min-height: var(--auralis-target);
        place-content: center;
        gap: 3px;
        border: 0;
        background: transparent;
        color: var(--room-text);
        cursor: pointer;
        font-size: var(--auralis-text-xs);
      }

      .cover-command:hover {
        background: var(--room-hover);
      }

      .cover-command[disabled] {
        cursor: default;
        opacity: 0.45;
      }

      .cover-command ha-icon {
        --mdc-icon-size: 16px;
        justify-self: center;
        color: color-mix(in oklab, color-mix(in srgb, var(--room-accent) 62%, var(--room-text)), #000 var(--auralis-shade));
      }

      .cover-command.center {
        border-right: 1px solid var(--room-line);
        border-left: 1px solid var(--room-line);
      }

      @container (max-width: 500px) {
        .climate-pill {
          flex: 0 1 auto;
          min-width: 61px;
          padding: 0 8px;
        }

        .side-control {
          min-height: 0;
        }
      }

      @container (max-width: 320px) {
        .cinema-header {
          flex-wrap: wrap;
        }

        .climate-pills {
          width: 100%;
          order: 3;
        }

        .climate-pill {
          flex: 1;
        }

        .cinema-body,
        .cinema-body.no-left,
        .cinema-body.no-right {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .room-photo {
          grid-column: 1 / -1;
          grid-row: 1;
          min-height: 170px;
        }

        .side-control {
          min-height: 56px;
          flex-direction: row;
          border: 1px solid var(--room-line);
          background: var(--room-layer-strong);
        }

        .side-control-column {
          grid-row: 2;
          min-height: 56px;
          flex-direction: row;
        }

        .side-control-column.left {
          grid-column: 1;
        }

        .side-control-column.right {
          grid-column: 2;
        }

        .side-control-column .side-control {
          flex: 1 1 0;
        }

        .thermostat-control {
          min-width: 140px;
          padding: 4px 5px;
        }

        .photo-overlay-slot {
          max-width: calc(100% - 16px);
        }

        .photo-overlay-slot.top-left {
          top: 8px;
          left: 8px;
        }

        .photo-overlay-slot.top-right {
          top: 8px;
          right: 8px;
        }

        .photo-overlay-slot.bottom-left {
          bottom: 8px;
          left: 8px;
        }

        .photo-overlay-slot.bottom-right {
          right: 8px;
          bottom: 8px;
        }

        .thermostat-label {
          display: none;
        }

        .thermostat-value {
          font-size: 20px;
        }

        .cover-dock,
        .cinema-body.no-left .cover-dock {
          grid-column: 1 / -1;
          grid-row: 3;
          width: 100%;
          margin-top: 0;
          border-radius: 15px;
        }
      }

      /* Fenêtres : ambiance, lumières, climat. */
      .ambiance-dialog {
        width: min(430px, calc(100vw - 24px));
        max-height: min(620px, calc(100vh - 32px));
        border-radius: 25px;
      }

      .ambiance-options {
        display: grid;
        gap: 8px;
      }

      .ambiance-option {
        display: grid;
        width: 100%;
        min-height: 62px;
        grid-template-columns: 42px minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border: 1px solid var(--auralis-border);
        border-radius: 17px;
        background: var(--auralis-layer);
        color: var(--auralis-text);
        cursor: pointer;
        text-align: left;
      }

      .ambiance-option:hover {
        border-color: color-mix(in srgb, var(--room-accent) 45%, var(--auralis-border));
        background: color-mix(in srgb, var(--room-accent) 8%, var(--auralis-layer));
      }

      .ambiance-option[disabled] {
        cursor: default;
        opacity: 0.6;
      }

      .ambiance-option .tile-icon {
        width: 42px;
        height: 42px;
      }

      .ambiance-option-copy {
        display: grid;
        min-width: 0;
        gap: 3px;
      }

      .ambiance-option-copy strong,
      .ambiance-option-copy small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ambiance-option-copy small {
        color: var(--auralis-muted);
        font-size: var(--auralis-text-xs);
      }

      .ambiance-option > ha-icon {
        --mdc-icon-size: 18px;
        color: var(--auralis-muted);
      }

      .history-graphs {
        display: grid;
        gap: 14px;
        margin-top: 14px;
      }

      hui-card.history-graph {
        display: block;
        min-width: 0;
        --ha-card-background: var(--auralis-layer);
        --ha-card-border-color: var(--auralis-border);
        --ha-card-border-radius: 18px;
        --ha-card-box-shadow: none;
      }

      .light-master-bar {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 12px;
      }

      .light-master-bar.single {
        grid-template-columns: 1fr;
      }

      .light-master-button,
      .global-color-control {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        min-height: var(--auralis-target);
        padding: 9px 12px;
        border: 1px solid var(--auralis-border);
        border-radius: 14px;
        background: var(--auralis-layer);
        color: var(--auralis-text);
        cursor: pointer;
      }

      .light-master-button ha-icon {
        --mdc-icon-size: 20px;
      }

      .light-master-button.all-on {
        border-color: color-mix(in srgb, var(--auralis-active) 48%, var(--auralis-border));
        background: color-mix(in srgb, var(--auralis-active) 16%, var(--auralis-layer));
      }

      .light-master-button.all-off {
        border-color: color-mix(in srgb, var(--auralis-danger) 42%, var(--auralis-border));
        color: color-mix(in oklab, color-mix(in srgb, var(--auralis-danger) 78%, var(--auralis-text)), #000 var(--auralis-shade));
      }

      .light-master-button[disabled] {
        cursor: default;
        opacity: 0.55;
      }

      .global-color-control {
        justify-content: flex-start;
      }

      .global-color-control span {
        display: grid;
        min-width: 0;
      }

      .global-color-control small {
        overflow: hidden;
        color: var(--auralis-muted);
        font-size: var(--auralis-text-xs);
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .brightness-tile {
        display: block;
        margin-bottom: 14px;
      }

      .brightness-tile .row-between span {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .brightness-tile .row-between ha-icon {
        color: var(--auralis-active-ink);
      }

      .color-picker {
        width: var(--auralis-target);
        height: var(--auralis-target);
        flex: 0 0 auto;
        padding: 3px;
        border: 1px solid var(--auralis-border);
        border-radius: 12px;
        background: var(--auralis-layer);
        cursor: pointer;
      }

      .color-picker::-webkit-color-swatch-wrapper {
        padding: 0;
      }

      .color-picker::-webkit-color-swatch {
        border: 0;
        border-radius: 8px;
      }

      .color-picker::-moz-color-swatch {
        border: 0;
        border-radius: 8px;
      }

      .color-picker[disabled] {
        cursor: default;
        opacity: 0.45;
      }

      .light-row {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }

      .light-row .state {
        color: var(--auralis-muted);
        font-size: var(--auralis-text-sm);
        white-space: nowrap;
      }

      .light-setting-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        margin-top: 5px;
      }

      .light-status-icon {
        transition: color 160ms ease, background 160ms ease, box-shadow 160ms ease;
      }

      .light-status-icon.on {
        background: color-mix(in srgb, var(--light-status-color, #ffd166) 24%, var(--auralis-layer));
        color: color-mix(in oklab, var(--light-status-color, #ffd166), #000 var(--auralis-shade));
        box-shadow: 0 0 18px color-mix(in srgb, var(--light-status-color, #ffd166) 34%, transparent);
      }

      /* Piste de 5 px dessinée au centre d'une zone tactile de 44 px. */
      .light-slider {
        --range-value: 0%;
        height: var(--auralis-target);
        margin: 0;
        appearance: none;
        outline: none;
        background: linear-gradient(
            to right,
            var(--auralis-active) 0 var(--range-value),
            color-mix(in srgb, var(--auralis-muted) 18%, transparent) var(--range-value) 100%
          )
          center / 100% 5px no-repeat;
        cursor: pointer;
      }

      .light-slider:focus-visible {
        outline: 2px solid var(--auralis-active);
        outline-offset: 2px;
      }

      .light-slider::-webkit-slider-thumb {
        width: 22px;
        height: 22px;
        appearance: none;
        border: 1px solid var(--auralis-border);
        border-radius: 50%;
        background: white;
        box-shadow: 0 2px 7px rgba(0, 0, 0, 0.16);
        cursor: pointer;
      }

      .light-slider::-moz-range-thumb {
        width: 22px;
        height: 22px;
        border: 1px solid var(--auralis-border);
        border-radius: 50%;
        background: white;
        box-shadow: 0 2px 7px rgba(0, 0, 0, 0.16);
        cursor: pointer;
      }

      .light-slider[disabled] {
        cursor: default;
        opacity: 0.45;
      }

      /* Interrupteur de 52 × 44 px, piste dessinée au centre. */
      .device-toggle {
        position: relative;
        width: 52px;
        height: var(--auralis-target);
        flex: 0 0 auto;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: pointer;
      }

      .device-toggle::before {
        position: absolute;
        top: 9px;
        left: 4px;
        width: 44px;
        height: 26px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--auralis-muted) 30%, transparent);
        content: "";
        transition: background 160ms ease;
      }

      .device-toggle::after {
        position: absolute;
        top: 12px;
        left: 7px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: white;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
        content: "";
        transition: transform 160ms ease;
      }

      .device-toggle[aria-checked="true"]::before {
        background: var(--auralis-active);
      }

      .device-toggle[aria-checked="true"]::after {
        transform: translateX(18px);
      }

      .device-toggle[disabled] {
        cursor: default;
        opacity: 0.45;
      }

      .quick-tile {
        color: inherit;
        text-align: left;
      }

      .quick-tile .quick-label {
        margin-top: 10px;
        font-weight: 680;
      }

      /* Zone introuvable ou sans appareil utilisable. */
      .area-message {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 18px;
        color: var(--auralis-muted);
      }

      .area-message ha-icon { flex: 0 0 auto; color: var(--auralis-active); }
      .area-message p { margin: 0; line-height: 1.4; }
    `,
  ];

  /** Valeurs suivies pendant le glissement d'un curseur (intensité, position, volume), par clé. */
  public dragValues: ReadonlyMap<string, number> = new Map();

  private readonly historyGraphConfigs = new Map<string, Record<string, unknown>>();
  private selectedMediaEntity?: string;
  private selectedMediaKind: "media" | "tv" = "media";
  private selectedMediaTitle?: string;
  private selectedMediaIcon?: string;
  private readonly setpoints = new SetpointBuffer({
    state: (id) => entity(this.hass, id),
    send: (id, values, seq) => {
      const hass = this.hass;
      if (!hass) return Promise.resolve(false);
      return this.runCommand(`setpoint:${id}:${seq}`, () => hass.callService("climate", "set_temperature", values, { entity_id: id }), {
        errorMessage: "La consigne n’a pas pu être modifiée.",
      });
    },
    changed: () => this.requestUpdate(),
  });

  public setConfig(config: RoomCardConfig): void {
    const area = typeof config.area === "string" ? config.area.trim() : "";
    if (area) {
      // Les entités de la zone ne sont connues qu'avec `hass` : la vérification se fait au rendu.
      this.config = { ...config, area, theme: config.theme || "carbon" };
      return;
    }
    const lights = config.lights || [];
    const covers = config.covers || [];
    if (!lights.length && !covers.length && !config.temperature_entity && !config.humidity_entity) {
      throw new Error("Configurez au moins une lumière, un volet ou un capteur, ou une zone (area).");
    }
    this.config = { ...config, theme: config.theme || "carbon", lights, covers };
  }

  private merged?: { config: RoomCardConfig; resolution: ResolvedArea; room: RoomCardConfig };
  private watchedArea?: { base: Set<string>; resolution: ResolvedArea; ids: Set<string> };
  private resolvedFor?: { hass?: HomeAssistant; config: RoomCardConfig; resolution: AreaResolution };

  /** Entités de la zone `area`, mémorisées tant que les registres de Home Assistant ne changent pas. */
  private areaResolution(): AreaResolution | undefined {
    const config = this.config;
    if (!config?.area) return undefined;
    // Lue à chaque accès à la configuration : un seul calcul par objet `hass`.
    const cached = this.resolvedFor;
    if (cached && cached.hass === this.hass && cached.config === config) return cached.resolution;
    const resolution = resolveAreaEntities(this.hass, config.area, areaExclusions(config.area_exclude), {
      includeSwitches: config.area_include_switches === true,
    });
    this.resolvedFor = { hass: this.hass, config, resolution };
    return resolution;
  }

  /** Configuration effective : celle de la carte, complétée par les entités de la zone `area`. */
  private get room(): RoomCardConfig | undefined {
    const config = this.config;
    const resolution = this.areaResolution();
    if (!config || resolution?.status !== "ok") return config;
    if (this.merged?.config !== config || this.merged.resolution !== resolution) {
      this.merged = { config, resolution, room: withAreaEntities(config, resolution) };
    }
    return this.merged.room;
  }

  /** Les entités reprises de la zone ne figurent pas dans la configuration : elles sont suivies ici. */
  protected extraWatchedEntities(): string[] {
    const resolution = this.areaResolution();
    return resolution?.status === "ok" ? resolution.entities : [];
  }

  /** Entités de la configuration plus celles de la zone, recalculées quand la zone change. */
  protected watchedEntityIds(): Set<string> {
    const base = super.watchedEntityIds();
    const resolution = this.areaResolution();
    if (resolution?.status !== "ok") return base;
    if (this.watchedArea?.base !== base || this.watchedArea.resolution !== resolution) {
      this.watchedArea = { base, resolution, ids: new Set([...base, ...resolution.entities]) };
    }
    return this.watchedArea.ids;
  }

  /** Une zone dépend aussi des registres : une entité déplacée de pièce redessine la carte. */
  protected shouldUpdate(changed: PropertyValues): boolean {
    if (this.config?.area && changed.has("hass")) {
      const previous = changed.get("hass") as HomeAssistantWithRegistries | undefined;
      const next = this.hass as HomeAssistantWithRegistries | undefined;
      if (previous && next && (previous.entities !== next.entities || previous.devices !== next.devices || previous.areas !== next.areas)) {
        return true;
      }
    }
    return super.shouldUpdate(changed);
  }

  /** Message affiché à la place de la carte quand la zone est introuvable ou vide. */
  private areaProblem(): string | undefined {
    const resolution = this.areaResolution();
    if (!resolution) return undefined;
    if (resolution.status === "unavailable") return "Les zones de Home Assistant ne sont pas disponibles (Home Assistant 2023.x ou plus récent requis).";
    if (resolution.status === "not-found") return `Zone « ${resolution.area} » introuvable.`;
    const room = this.room;
    // Un thermostat, un lecteur ou une télévision suffisent : la carte les affiche sans lumière ni volet.
    const usable = room?.lights?.length || room?.covers?.length || room?.temperature_entity || room?.humidity_entity
      || room?.climate_entity || room?.media_player_entity || room?.right_controls?.length;
    return usable ? undefined : `La zone « ${resolution.name} » ne contient ni lumière, ni volet, ni capteur, ni thermostat, ni lecteur.`;
  }

  /**
   * Configuration proposée par le sélecteur de cartes : une zone de la maison qui contient des
   * lumières ou des volets, sinon de vraies entités (lumières, volets, capteurs de température
   * et d'humidité), pour une carte valide dès l'ajout.
   */
  static getStubConfig(hass?: HomeAssistant): Partial<RoomCardConfig> {
    const area = suggestArea(hass);
    if (area) return { area };
    const states = Object.values(hass?.states ?? {});
    const ids = (domain: string, count: number) => states.map((state) => state.entity_id).filter((id) => id.startsWith(`${domain}.`)).slice(0, count);
    const sensor = (deviceClass: string) => states.find((state) => state.entity_id.startsWith("sensor.") && state.attributes.device_class === deviceClass)?.entity_id;
    const lights = ids("light", 3);
    const covers = ids("cover", 2);
    const temperature = sensor("temperature");
    const humidity = sensor("humidity");
    return {
      name: "Salon",
      theme: "carbon",
      ...(lights.length ? { lights } : {}),
      ...(covers.length ? { covers } : {}),
      ...(temperature ? { temperature_entity: temperature } : {}),
      ...(humidity ? { humidity_entity: humidity } : {}),
      ...(!lights.length && !covers.length && !temperature && !humidity ? { temperature_entity: "sensor.temperature_salon" } : {}),
    };
  }

  static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      name: "Nom de la pièce", subtitle: "Sous-titre (vide = état des appareils)", icon: "Icône", show_header: "Afficher l’en-tête",
      theme: "Thème", lights: "Lumières", covers: "Volets", left_controls: "Commandes de gauche", right_controls: "Commandes de droite",
      card_background: "Fond de la carte", show_grid: "Afficher la trame", thermostat: "Pavé thermostat", ambiance: "Bouton ambiance",
      scenes: "Ambiances (entity, label, icon)", entity_labels: "Noms personnalisés", cover_labels: "Noms des volets",
      popup_titles: "Titres des fenêtres", climate_popup: "Fenêtre climat", temperature_entity: "Capteur de température",
      humidity_entity: "Capteur d’humidité", climate_entity: "Thermostat", media_player_entity: "Lecteur multimédia",
      scene_entity: "Ambiance (ancienne option)", background_image: "Photo de la pièce", background_position: "Cadrage de la photo",
      accent_color: "Couleur d’accent", area: "Zone (remplit les options laissées vides)",
      area_exclude: "Entités de la zone à ignorer (identifiants ou motifs light.veilleuse_*)",
      area_include_switches: "Reprendre aussi les interrupteurs de la zone comme lumières",
    };
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "subtitle", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "show_header", selector: { boolean: {} } },
        { name: "area", selector: { area: {} } },
        { name: "area_exclude", selector: { text: { multiple: true } } },
        { name: "area_include_switches", selector: { boolean: {} } },
        {
          name: "theme",
          selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"], mode: "dropdown" } },
        },
        { name: "lights", selector: { entity: { multiple: true, filter: { domain: ["light", "switch"] } } } },
        { name: "covers", selector: { entity: { multiple: true, filter: { domain: "cover" } } } },
        { name: "left_controls", selector: { object: {} } },
        { name: "right_controls", selector: { object: {} } },
        { name: "card_background", selector: { object: {} } },
        { name: "show_grid", selector: { boolean: {} } },
        { name: "thermostat", selector: { object: {} } },
        { name: "ambiance", selector: { object: {} } },
        { name: "scenes", selector: { object: {} } },
        { name: "entity_labels", selector: { object: {} } },
        { name: "cover_labels", selector: { object: {} } },
        { name: "popup_titles", selector: { object: {} } },
        { name: "climate_popup", selector: { object: {} } },
        { name: "temperature_entity", selector: { entity: {} } },
        { name: "humidity_entity", selector: { entity: {} } },
        { name: "climate_entity", selector: { entity: { filter: { domain: "climate" } } } },
        { name: "media_player_entity", selector: { entity: { filter: { domain: "media_player" } } } },
        { name: "scene_entity", selector: { entity: { filter: { domain: "scene" } } } },
        { name: "background_image", selector: { text: {} } },
        { name: "background_position", selector: { text: {} } },
        { name: "accent_color", selector: { text: {} } },
      ],
      computeLabel: ({ name }: { name: string }) => labels[name],
    };
  }

  public getCardSize(): number {
    return 7;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, min_columns: 6 };
  }

  public disconnectedCallback(): void {
    this.setpoints.dispose();
    super.disconnectedCallback();
  }

  private roomName(): string {
    return this.room?.name?.trim() || "Pièce";
  }

  private entityLabel(id: string | undefined, fallback: string): string {
    if (!id) return fallback;
    const configuredLabel = this.room?.entity_labels?.[id] ?? this.room?.cover_labels?.[id];
    return typeof configuredLabel === "string" && configuredLabel.trim()
      ? configuredLabel.trim()
      : friendlyName(entity(this.hass, id), fallback);
  }

  private popupTitle(key: "details" | "lights" | "covers" | "climate" | "media" | "tv" | "ambiance", fallback: string): string {
    const configuredTitle = this.room?.popup_titles?.[key];
    return typeof configuredTitle === "string" && configuredTitle.trim() ? configuredTitle.trim() : fallback;
  }

  private historyGraphConfig(entityId: string, label: string, hours: number): Record<string, unknown> {
    const key = `${entityId}|${label}|${Math.round(hours)}`;
    const cached = this.historyGraphConfigs.get(key);
    if (cached) return cached;
    const graphConfig = climateGraphConfig(entityId, label, hours);
    this.historyGraphConfigs.set(key, graphConfig);
    return graphConfig;
  }

  private setDrag(key: string, value: number | undefined): void {
    this.dragValues = withDragValue(this.dragValues, key, value);
  }

  /** Adaptateur pour la fenêtre des volets partagée avec la carte Volets. */
  private get coverHost(): CoverPopupHost {
    return coverPopupHost(this, {
      label: (id) => this.entityLabel(id, id),
      command: (key, action, errorMessage) => this.runCommand(key, action, { errorMessage }),
      pending: (key) => this.isPending(key),
      moreInfo: (id) => this.moreInfo(id),
    });
  }

  private sideControls(side: "left" | "right"): RoomSideControlConfig[] {
    const configured = side === "left" ? this.room?.left_controls : this.room?.right_controls;
    if (configured !== undefined) {
      return configured.filter((control) => control && typeof control.type === "string").slice(0, 2);
    }
    if (side === "left" && this.room?.lights?.length) return [{ type: "lights" }];
    if (side === "right" && this.room?.media_player_entity) {
      return [{ type: "media", entity: this.room.media_player_entity }];
    }
    return [];
  }

  private safeCssColor(value: string | undefined, fallback: string): string {
    const color = value?.trim();
    return color && !/[;{}]/.test(color) ? color : fallback;
  }

  private roomCardBackground(): { mode: RoomBackgroundMode; showGrid: boolean; style: string } {
    const configuredMode = this.room?.card_background?.mode;
    const mode: RoomBackgroundMode = configuredMode === "solid" || configuredMode === "gradient"
      ? configuredMode
      : "grid";
    const configuredBackground = mode === "gradient"
      ? this.room?.card_background?.gradient
      : this.room?.card_background?.color;
    const background = configuredBackground?.trim();
    const safeBackground = background && !/[;{}]/.test(background) ? background : undefined;
    return {
      mode,
      showGrid: this.room?.show_grid ?? mode === "grid",
      style: safeBackground ? `--room-card-background:${safeBackground}` : "",
    };
  }

  private overlayPosition(value: string | undefined, fallback: RoomOverlayPosition): RoomOverlayPosition {
    return value === "top-left" || value === "top-right" || value === "bottom-left" || value === "bottom-right"
      ? value
      : fallback;
  }

  private sceneModes(): RoomSceneConfig[] {
    if (this.room?.scenes !== undefined) {
      return this.room.scenes.filter((scene) => scene && typeof scene.entity === "string" && scene.entity.trim());
    }
    return this.room?.scene_entity
      ? [{ entity: this.room.scene_entity, label: "Mode soirée", icon: "mdi:creation-outline", position: "bottom-right" }]
      : [];
  }

  private ambiancePosition(modes: RoomSceneConfig[]): RoomOverlayPosition {
    return this.overlayPosition(this.room?.ambiance?.position || modes[0]?.position, "bottom-right");
  }

  private openMediaControl(control?: RoomSideControlConfig): void {
    const kind = control?.type === "tv" ? "tv" : "media";
    const fallbackEntity = kind === "media" ? this.room?.media_player_entity : undefined;
    const entityId = control?.entity || fallbackEntity;
    if (!entityId) return;
    this.selectedMediaEntity = entityId;
    this.selectedMediaKind = kind;
    this.selectedMediaTitle = control?.popup_title || control?.label;
    this.selectedMediaIcon = control?.icon;
    this.openDialog("media");
  }

  private handleSideControl(control: RoomSideControlConfig): void {
    if (control.type === "lights") return this.openDialog("lights");
    if (control.type === "covers") return this.openDialog("covers");
    if (control.type === "climate") return this.openDialog("climate");
    if (control.type === "media" || control.type === "tv") return this.openMediaControl(control);
    const hass = this.hass;
    const entityId = control.entity;
    if (!entityId || !hass) return;
    if (control.action === "more-info") {
      this.moreInfo(entityId);
      return;
    }
    if (control.type === "scene" || control.action === "activate") {
      void this.runCommand(`side:${entityId}`, () => activateEntity(hass, entityId), { errorMessage: "L’activation a échoué." });
      return;
    }
    void this.runCommand(`side:${entityId}`, () => hass.callService("homeassistant", "toggle", {}, { entity_id: entityId }), {
      errorMessage: "La commande a échoué.",
    });
  }

  private renderSideControl(control: RoomSideControlConfig): TemplateResult {
    const lights = this.room?.lights || [];
    const covers = this.room?.covers || [];
    const entityId = control.entity
      || (control.type === "media" ? this.room?.media_player_entity : undefined)
      || (control.type === "climate" ? this.room?.climate_entity : undefined)
      || (control.type === "scene" ? this.room?.scene_entity || this.sceneModes()[0]?.entity : undefined);
    const state = entity(this.hass, entityId);
    let icon = control.icon || state?.attributes.icon || "mdi:circle-outline";
    let label = control.label || (entityId ? this.entityLabel(entityId, entityId) : "Commande");
    let value = entityId ? (isCommandable(state) ? displayState(this.hass, entityId) : "Indisponible") : "—";
    let disabled = entityId ? !isCommandable(state) : false;
    let active = isActive(state);

    if (control.type === "lights") {
      const activeCount = lights.filter((id) => isActive(entity(this.hass, id))).length;
      icon = control.icon || (activeCount ? "mdi:lightbulb-group" : "mdi:lightbulb-group-outline");
      label = control.label || "Lumières";
      value = `${activeCount}/${lights.length}`;
      disabled = !lights.length;
      active = activeCount > 0;
    } else if (control.type === "covers") {
      const openCount = covers.filter((id) => isActive(entity(this.hass, id))).length;
      icon = control.icon || "mdi:blinds-horizontal";
      label = control.label || "Volets";
      value = `${openCount}/${covers.length}`;
      disabled = !covers.length;
      active = openCount > 0;
    } else if (control.type === "climate") {
      icon = control.icon || "mdi:thermostat";
      label = control.label || "Climat";
      value = displayState(this.hass, this.room?.temperature_entity);
      disabled = !this.room?.temperature_entity && !this.room?.humidity_entity && !this.room?.climate_entity;
    } else if (control.type === "media") {
      icon = control.icon || "mdi:music-note";
      label = control.label || "Musique";
      value = state?.state === "playing" && typeof state.attributes.media_title === "string"
        ? state.attributes.media_title
        : capitalize(mediaStatusLabel(state));
      // La fenêtre reste accessible : elle affiche l'état et le bouton Détails.
      disabled = !entityId;
    } else if (control.type === "tv") {
      active = isAvailable(state) && state?.state !== "off" && state?.state !== "standby";
      icon = control.icon || (active ? "mdi:television" : "mdi:television-off");
      label = control.label || "TV";
      value = !isCommandable(state) ? "Indisponible" : active ? "Allumée" : "Éteinte";
      disabled = !entityId;
    } else if (control.type === "scene") {
      icon = control.icon || "mdi:creation-outline";
      label = control.label || "Ambiance";
      value = "Activer";
      disabled = !entityId || !isCommandable(state);
    }
    const busy = Boolean(entityId) && this.isPending(`side:${entityId}`);

    return html`
      <button class="side-control ${active ? "active" : ""}" type="button" ?disabled=${disabled || busy} aria-busy=${busy ? "true" : "false"} title=${label}
        @click=${() => this.handleSideControl({ ...control, entity: entityId })}>
        <ha-icon .icon=${icon}></ha-icon>
        <strong>${value}</strong>
        <small>${label}</small>
      </button>
    `;
  }

  private renderSideColumn(side: "left" | "right", controls: RoomSideControlConfig[]): TemplateResult | typeof nothing {
    if (!controls.length) return nothing;
    return html`<div class="side-control-column ${side} ${controls.length > 1 ? "dual" : "single"}">${controls.map((control) => this.renderSideControl(control))}</div>`;
  }

  private thermostatEntityId(): string | undefined {
    return this.room?.thermostat?.entity || this.room?.climate_entity;
  }

  /** Consigne affichée : la saisie locale en attente, sinon celle du thermostat, jamais la température mesurée. */
  private thermostatTarget(): number | undefined {
    const entityId = this.thermostatEntityId();
    return entityId ? this.setpoints.values(entityId).temperature : undefined;
  }

  /** Une pression change la consigne affichée ; une seule commande part après la dernière pression. */
  private adjustThermostat(direction: -1 | 1): boolean {
    const entityId = this.thermostatEntityId();
    const state = entity(this.hass, entityId);
    if (!this.hass || !entityId || !isCommandable(state)) return false;
    return this.setpoints.adjust(entityId, "temperature", direction, setpointLimits(state, this.room?.thermostat?.step));
  }

  private renderThermostatControl(): TemplateResult | typeof nothing {
    const thermostat = this.room?.thermostat;
    const entityId = this.thermostatEntityId();
    if (thermostat?.show === false || !entityId) return nothing;
    const state = entity(this.hass, entityId);
    const target = this.thermostatTarget();
    const limits = setpointLimits(state, thermostat?.step);
    const commandable = isCommandable(state);
    const canStep = (direction: -1 | 1) => commandable && stepSetpoint(target, direction, limits) !== undefined;
    const pending = this.setpoints.pending(entityId);
    const label = thermostat?.label === undefined ? this.entityLabel(entityId, "Thermostat") : thermostat.label.trim();
    const showBorder = thermostat?.show_border !== false;
    const showBackground = thermostat?.show_background !== false;
    const borderColor = this.safeCssColor(thermostat?.border_color, "rgba(255,255,255,.16)");
    const backgroundColor = this.safeCssColor(thermostat?.background_color, "rgba(13,18,25,.76)");
    const style = [
      `--thermostat-label:${this.safeCssColor(thermostat?.label_color, "rgba(255,255,255,.72)")}`,
      `--thermostat-value:${this.safeCssColor(thermostat?.value_color, "#ffffff")}`,
      `--thermostat-button:${this.safeCssColor(thermostat?.button_color, "#ffd166")}`,
      `--thermostat-background:${backgroundColor}`,
      `--thermostat-border:${borderColor}`,
      `border:${showBorder ? `1px solid ${borderColor}` : "none"}`,
      `background:${showBackground ? backgroundColor : "transparent"}`,
      `backdrop-filter:${showBackground ? "blur(10px)" : "none"}`,
      `-webkit-backdrop-filter:${showBackground ? "blur(10px)" : "none"}`,
      `box-shadow:none`,
    ].join(";");
    const value = target === undefined
      ? "—"
      : `${target.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}°`;
    return html`
      <div class="thermostat-control ${showBorder ? "" : "no-border"} ${showBackground ? "" : "no-background"}" style=${style}>
        ${label ? html`<span class="thermostat-label">${label}</span>` : nothing}
        <div class="thermostat-row">
          <button class="thermostat-step" type="button" aria-label=${`Baisser la consigne de ${label || "la pièce"}`} ?disabled=${!canStep(-1)} @click=${() => this.adjustThermostat(-1)}>−</button>
          <button class="thermostat-value" type="button" aria-label=${`Consigne ${value}, ouvrir la température et l'humidité`} aria-busy=${pending ? "true" : "false"}
            @click=${() => this.openDialog("climate")}>${value}</button>
          <button class="thermostat-step" type="button" aria-label=${`Augmenter la consigne de ${label || "la pièce"}`} ?disabled=${!canStep(1)} @click=${() => this.adjustThermostat(1)}>+</button>
        </div>
      </div>
    `;
  }

  private renderAmbianceButton(modes: RoomSceneConfig[]): TemplateResult | typeof nothing {
    if (!modes.length) return nothing;
    const label = this.room?.ambiance?.label?.trim() || "Ambiance";
    const icon = this.room?.ambiance?.icon?.trim() || "mdi:creation-outline";
    return html`
      <button class="scene-chip" type="button" title=${label} aria-haspopup="dialog" @click=${() => this.openDialog("ambiance")}>
        <ha-icon .icon=${icon}></ha-icon>${label}
      </button>
    `;
  }

  private renderOverlaySlot(position: RoomOverlayPosition, modes: RoomSceneConfig[]): TemplateResult | typeof nothing {
    const thermostatPosition = this.overlayPosition(this.room?.thermostat?.position, "bottom-left");
    const showThermostat = this.room?.thermostat?.show !== false
      && Boolean(this.thermostatEntityId())
      && thermostatPosition === position;
    const showAmbiance = modes.length > 0 && this.ambiancePosition(modes) === position;
    if (!showThermostat && !showAmbiance) return nothing;
    return html`
      <div class="photo-overlay-slot ${position}">
        ${showThermostat ? this.renderThermostatControl() : nothing}
        ${showAmbiance ? this.renderAmbianceButton(modes) : nothing}
      </div>
    `;
  }

  /** Pastilles de climat : seulement les mesures configurées. */
  private renderClimatePills(): TemplateResult | typeof nothing {
    const temperatureId = this.room?.temperature_entity;
    const humidityId = this.room?.humidity_entity;
    if (!temperatureId && !humidityId) return nothing;
    const temperatureState = entity(this.hass, temperatureId);
    const humidityState = entity(this.hass, humidityId);
    const temperature = isAvailable(temperatureState) ? numericState(temperatureState, Number.NaN) : Number.NaN;
    const humidity = isAvailable(humidityState) ? numericState(humidityState, Number.NaN) : Number.NaN;
    const temperatureLabel = Number.isFinite(temperature) ? `${temperature.toLocaleString("fr-FR")}°` : "—";
    const humidityLabel = Number.isFinite(humidity) ? `${Math.round(humidity)}%` : "—";
    return html`
      <div class="climate-pills">
        ${temperatureId ? html`<button class="climate-pill" type="button" aria-label=${`Température ${temperatureLabel}, ouvrir la température et l'humidité`}
          @click=${() => this.openDialog("climate")}><ha-icon icon="mdi:thermometer"></ha-icon>${temperatureLabel}</button>` : nothing}
        ${humidityId ? html`<button class="climate-pill" type="button" aria-label=${`Humidité ${humidityLabel}, ouvrir la température et l'humidité`}
          @click=${() => this.openDialog("climate")}><ha-icon icon="mdi:water-percent"></ha-icon>${humidityLabel}</button>` : nothing}
      </div>
    `;
  }

  /** Dock des volets : affiché seulement quand des volets sont configurés. */
  private renderCoverDock(): TemplateResult | typeof nothing {
    const covers = this.room?.covers || [];
    if (!covers.length) return nothing;
    const commandable = covers.filter((id) => isCommandable(entity(this.hass, id)));
    const positions = covers.map((id) => coverPosition(entity(this.hass, id)));
    const busy = (command: string) => this.isPending(`dock:${command}`);
    const range = summarizeRange(positions);
    return html`
      <div class="cover-dock" role="group" aria-label=${`Volets de ${this.roomName()}`}>
        <button class="cover-command" type="button" ?disabled=${!commandable.length || busy("open")} aria-busy=${busy("open") ? "true" : "false"}
          aria-label=${`Ouvrir les volets de ${this.roomName()}`} @click=${() => runCoverCommand(this.coverHost, "dock:open", commandable, "open")}><ha-icon icon="mdi:chevron-double-up"></ha-icon>Ouvrir</button>
        <button class="cover-command center" type="button" aria-haspopup="dialog" aria-label=${`Volets, position ${range}, ouvrir le détail`}
          @click=${() => this.openDialog("covers")}><ha-icon icon="mdi:blinds-horizontal"></ha-icon>${commandable.length ? range : "Indisponible"}</button>
        <button class="cover-command" type="button" ?disabled=${!commandable.length || busy("close")} aria-busy=${busy("close") ? "true" : "false"}
          aria-label=${`Fermer les volets de ${this.roomName()}`} @click=${() => runCoverCommand(this.coverHost, "dock:close", commandable, "close")}><ha-icon icon="mdi:chevron-double-down"></ha-icon>Fermer</button>
      </div>
    `;
  }

  protected render(): TemplateResult {
    if (!this.room || !this.hass) return html``;
    const problem = this.areaProblem();
    if (problem) {
      return html`<ha-card><div class="area-message" role="status"><ha-icon icon="mdi:home-alert-outline"></ha-icon><p>${problem}</p></div></ha-card>`;
    }
    const lights = this.room.lights || [];
    const covers = this.room.covers || [];
    const unavailable = [...lights, ...covers].filter((id) => !isCommandable(entity(this.hass, id))).length;
    const leftControls = this.sideControls("left");
    const rightControls = this.sideControls("right");
    const sceneModes = this.sceneModes();
    const splitBottomControls = this.room.thermostat?.show !== false
      && Boolean(this.thermostatEntityId())
      && this.overlayPosition(this.room.thermostat?.position, "bottom-left") === "bottom-left"
      && sceneModes.length > 0
      && this.ambiancePosition(sceneModes) === "bottom-right";
    const cardBackground = this.roomCardBackground();
    const defaultSubtitle = unavailable
      ? `${unavailable} appareil${unavailable > 1 ? "s" : ""} indisponible${unavailable > 1 ? "s" : ""}`
      : "Aucun appareil en alerte";
    const subtitle = this.room.subtitle === undefined ? defaultSubtitle : this.room.subtitle.trim();
    const image = (this.room.background_image?.trim() || defaultSalonImage)
      .replaceAll("\\", "\\\\")
      .replaceAll('"', '\\"');
    const configuredPosition = this.room.background_position?.trim();
    const position = configuredPosition && /^[\w\s.%+-]+$/.test(configuredPosition) ? configuredPosition : "center";
    const configuredAccent = this.room.accent_color?.trim();
    const accent = configuredAccent && !/[;{}]/.test(configuredAccent) ? configuredAccent : "#79d6f2";
    const roomImageStyle = `--room-image:url("${image}");--room-image-position:${position};--room-accent:${accent}`;
    const name = this.roomName();
    const bodyClass = [leftControls.length ? "" : "no-left", rightControls.length ? "" : "no-right"].filter(Boolean).join(" ");

    return html`
      <ha-card>
        <div class="cinema-shell background-${cardBackground.mode} ${cardBackground.showGrid ? "show-grid" : ""}" style=${cardBackground.style}>
          ${this.room.show_header !== false ? html`<header class="header cinema-header">
            <span class="room-avatar"><ha-icon .icon=${this.room.icon || "mdi:sofa-outline"}></ha-icon></span>
            <div class="title-wrap cinema-title">
              <h2><button class="room-title-button" type="button" aria-haspopup="dialog" aria-label=${`Ouvrir les détails de ${name}`}
                @click=${() => this.openDialog("details")}>${name}</button></h2>
              ${subtitle ? html`<div class="status-line subtitle"><span class="dot ${unavailable ? "warning" : "healthy"}"></span><span>${subtitle}</span></div>` : nothing}
            </div>
            ${this.renderClimatePills()}
          </header>` : nothing}
          <div class="cinema-body ${bodyClass}">
            ${this.renderSideColumn("left", leftControls)}
            <div class="room-photo ${splitBottomControls ? "split-bottom-controls" : ""}" style=${roomImageStyle}>
              ${this.renderOverlaySlot("top-left", sceneModes)}
              ${this.renderOverlaySlot("top-right", sceneModes)}
              ${this.renderOverlaySlot("bottom-left", sceneModes)}
              ${this.renderOverlaySlot("bottom-right", sceneModes)}
            </div>
            ${this.renderSideColumn("right", rightControls)}
            ${this.renderCoverDock()}
          </div>
        </div>
      </ha-card>
      ${this.dialog === "lights" ? this.renderLightsDialog() : nothing}
      ${this.dialog === "covers" ? this.renderCoversDialog() : nothing}
      ${this.dialog === "climate" ? this.renderClimateDialog() : nothing}
      ${this.dialog === "media" ? this.renderMediaDialog() : nothing}
      ${this.dialog === "ambiance" ? this.renderAmbianceDialog() : nothing}
      ${this.dialog === "details" ? this.renderDetailsDialog() : nothing}
    `;
  }

  /** Allume tout si tout est éteint, sinon éteint tout ; lampes et interrupteurs (switch.*) acceptés. */
  private toggleAllLights = async (): Promise<boolean> => {
    const hass = this.hass;
    const ids = (this.room?.lights || []).filter((id) => isCommandable(entity(hass, id)));
    if (!hass || !ids.length) return false;
    const anyOn = ids.some((id) => isActive(entity(hass, id)));
    return this.runCommand("lights:all", () => hass.callService(powerDomain(ids), anyOn ? "turn_off" : "turn_on", {}, { entity_id: ids }), {
      errorMessage: anyOn ? "L’extinction a échoué." : "L’allumage a échoué.",
    });
  };

  private toggleLight(id: string, on: boolean): Promise<boolean> {
    const hass = this.hass;
    if (!hass) return Promise.resolve(false);
    return this.runCommand(`light:${id}`, () => hass.callService(powerDomain([id]), on ? "turn_on" : "turn_off", {}, { entity_id: id }), {
      errorMessage: on ? "L’allumage a échoué." : "L’extinction a échoué.",
    });
  }

  /** Intensité générale : un seul appel, vers les lampes allumées (ou toutes les lampes réglables si aucune ne l'est). */
  private setGlobalBrightness(value: number): Promise<boolean> {
    const hass = this.hass;
    const targets = brightnessTargets(hass, this.room?.lights || []);
    if (!hass || !targets.length) return Promise.resolve(false);
    return this.runCommand("lights:brightness", () => hass.callService("light", "turn_on", { brightness_pct: Math.round(value) }, { entity_id: targets }), {
      errorMessage: "L’intensité n’a pas pu être modifiée.",
    });
  }

  private setLightsColor(ids: string[], color: string, key: string): Promise<boolean> {
    const hass = this.hass;
    const rgb = hexToRgb(color);
    if (!hass || !ids.length || !rgb) return Promise.resolve(false);
    return this.runCommand(key, () => hass.callService("light", "turn_on", { rgb_color: rgb }, { entity_id: ids }), {
      errorMessage: "La couleur n’a pas pu être modifiée.",
    });
  }

  private setLightBrightness(id: string, value: number): Promise<boolean> {
    const hass = this.hass;
    if (!hass) return Promise.resolve(false);
    return this.runCommand(`brightness:${id}`, () => hass.callService("light", "turn_on", { brightness_pct: Math.round(value) }, { entity_id: id }), {
      errorMessage: "L’intensité n’a pas pu être modifiée.",
    });
  }

  /** Curseur dont le remplissage et la valeur suivent le doigt ; l'envoi part au relâchement. */
  private renderLightSlider(key: string, value: number, label: string, disabled: boolean, send: (value: number) => Promise<boolean>): TemplateResult {
    const shown = this.dragValues.get(key) ?? value;
    return html`<input class="range light-slider" style=${`--range-value:${shown}%`} type="range" min="1" max="100" .value=${String(Math.max(shown, 1))}
      aria-label=${label} ?disabled=${disabled} aria-busy=${this.isPending(key) ? "true" : "false"}
      @input=${(event: Event) => this.setDrag(key, Number((event.target as HTMLInputElement).value))}
      @change=${(event: Event) => {
        const next = Number((event.target as HTMLInputElement).value);
        this.setDrag(key, next);
        void send(next).finally(() => this.setDrag(key, undefined));
      }} />`;
  }

  private renderLightsDialog(): TemplateResult {
    const ids = this.room?.lights || [];
    const states = ids.map((id) => entity(this.hass, id));
    const activeCount = states.filter(isActive).length;
    const activeBrightness = ids.filter((id) => isLight(id) && isActive(entity(this.hass, id))).map((id) => lightBrightness(entity(this.hass, id)));
    const average = activeBrightness.length
      ? Math.round(activeBrightness.reduce((sum, value) => sum + value, 0) / activeBrightness.length)
      : 0;
    const commandable = ids.filter((id) => isCommandable(entity(this.hass, id)));
    const colorIds = commandable.filter((id) => isLight(id) && lightSupportsColor(entity(this.hass, id)));
    const dimmable = commandable.filter((id) => supportsBrightness(id, entity(this.hass, id)));
    const colorTargets = lightTargets(this.hass, ids, (_id, state) => lightSupportsColor(state));
    const referenceColorState = colorIds
      .map((id) => entity(this.hass, id))
      .find((state) => isActive(state) && lightRgbColor(state))
      ?? entity(this.hass, colorIds[0]);
    const groupColor = rgbToHex(lightRgbColor(referenceColorState));
    const globalKey = "lights:brightness";
    const shownAverage = this.dragValues.get(globalKey) ?? average;

    return this.renderDialog(
      this.popupTitle("lights", "Lumières"),
      "mdi:lightbulb-group-outline",
      html`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">Éclairage de la pièce</span><strong>${activeCount} lumière${activeCount > 1 ? "s" : ""} allumée${activeCount > 1 ? "s" : ""} sur ${ids.length}</strong><span class="muted">Appui long sur une lumière : fiche Home Assistant</span></div>
            ${dimmable.length ? html`<div class="dialog-stat"><strong>${average}%</strong><small>moyenne</small></div>` : nothing}
          </div>
          <div class="dialog-section-title">Commande générale</div>
          <div class="light-master-bar ${colorIds.length ? "" : "single"}">
            <button class="light-master-button ${activeCount ? "all-off" : "all-on"}" type="button" ?disabled=${!commandable.length || this.isPending("lights:all")}
              aria-busy=${this.isPending("lights:all") ? "true" : "false"} @click=${this.toggleAllLights}>
              <ha-icon icon=${activeCount ? "mdi:lightbulb-group-off-outline" : "mdi:lightbulb-group-outline"}></ha-icon>
              <strong>${activeCount ? "Tout éteindre" : "Tout allumer"}</strong>
            </button>
            ${colorIds.length
              ? html`
                  <label class="global-color-control">
                    <input class="color-picker" type="color" .value=${groupColor} aria-label="Couleur générale"
                      @change=${(event: Event) => this.setLightsColor(colorTargets, (event.target as HTMLInputElement).value, "lights:color")} />
                    <span><strong>Couleur générale</strong><small>${colorIds.length} éclairage${colorIds.length > 1 ? "s" : ""} compatible${colorIds.length > 1 ? "s" : ""}</small></span>
                  </label>
                `
              : nothing}
          </div>
          ${dimmable.length ? html`<label class="tile brightness-tile">
            <div class="row-between"><span><ha-icon icon="mdi:white-balance-sunny"></ha-icon><strong>Luminosité générale</strong></span><strong>${shownAverage} %</strong></div>
            ${this.renderLightSlider(globalKey, average, "Luminosité générale", false, (value) => this.setGlobalBrightness(value))}
          </label>` : nothing}
          <div class="dialog-section-title">Lumières</div>
          <div class="list">
            ${ids.map((id) => this.renderLightRow(id))}
          </div>
        </div>
      `,
    );
  }

  private renderLightRow(id: string): TemplateResult {
    const state = entity(this.hass, id);
    const label = this.entityLabel(id, id);
    const active = isActive(state);
    const commandable = isCommandable(state);
    const dimmable = supportsBrightness(id, state);
    const supportsColor = isLight(id) && lightSupportsColor(state);
    const color = rgbToHex(lightRgbColor(state));
    const key = `brightness:${id}`;
    const brightness = this.dragValues.get(key) ?? lightBrightness(state);
    const status = !commandable ? "Indisponible" : dimmable ? `${brightness} %` : active ? "Allumée" : "Éteinte";
    const busy = this.isPending(`light:${id}`);
    return html`
      <div class="list-row light-row" ${holdMoreInfo(id)}>
        <span class="tile-icon light-status-icon ${active ? "on" : ""}" style=${`--light-status-color:${color}`}><ha-icon .icon=${active ? "mdi:lightbulb-on" : "mdi:lightbulb-outline"}></ha-icon></span>
        <div class="meta">
          <div class="row-between"><span class="name">${label}</span><span class="state">${status}</span></div>
          ${dimmable || supportsColor ? html`<div class="light-setting-row">
            ${dimmable ? this.renderLightSlider(key, lightBrightness(state), `Luminosité de ${label}`, !commandable, (value) => this.setLightBrightness(id, value)) : html`<span></span>`}
            ${supportsColor
              ? html`<input class="color-picker" type="color" .value=${color} title=${`Couleur de ${label}`} aria-label=${`Couleur de ${label}`} ?disabled=${!commandable}
                  @change=${(event: Event) => this.setLightsColor([id], (event.target as HTMLInputElement).value, `color:${id}`)} />`
              : nothing}
          </div>` : nothing}
        </div>
        <button class="device-toggle" type="button" role="switch" aria-checked=${active ? "true" : "false"} aria-label=${active ? `Éteindre ${label}` : `Allumer ${label}`}
          ?disabled=${!commandable || busy} aria-busy=${busy ? "true" : "false"} @click=${() => this.toggleLight(id, !active)}></button>
      </div>
    `;
  }

  /** Active une ambiance ; la fenêtre ne se ferme que si l'activation a réussi. */
  private async activateSceneMode(mode: RoomSceneConfig): Promise<boolean> {
    const hass = this.hass;
    if (!hass) return false;
    const ok = await this.runCommand(`scene:${mode.entity}`, () => activateEntity(hass, mode.entity), {
      errorMessage: "L’ambiance n’a pas pu être activée.",
    });
    if (ok) this.closeDialog();
    return ok;
  }

  private renderAmbianceDialog(): TemplateResult {
    const modes = this.sceneModes();
    const title = this.popupTitle("ambiance", "Ambiance");
    const icon = this.room?.ambiance?.icon?.trim() || "mdi:creation-outline";
    return this.renderDialog(
      title,
      icon,
      html`
        <div class="dialog-body">
          <div class="dialog-section-title">Choisir un mode</div>
          <div class="ambiance-options">
            ${modes.map((mode) => {
              const state = entity(this.hass, mode.entity);
              const label = mode.label?.trim() || this.entityLabel(mode.entity, "Ambiance");
              const modeIcon = mode.icon?.trim() || state?.attributes.icon || "mdi:creation-outline";
              const busy = this.isPending(`scene:${mode.entity}`);
              const commandable = isCommandable(state);
              return html`
                <button class="ambiance-option" type="button" ?disabled=${busy || !commandable} aria-busy=${busy ? "true" : "false"} @click=${() => this.activateSceneMode(mode)}>
                  <span class="tile-icon"><ha-icon .icon=${modeIcon}></ha-icon></span>
                  <span class="ambiance-option-copy">
                    <strong>${label}</strong>
                    <small>${!commandable ? "Indisponible" : busy ? "Activation…" : "Activer cette ambiance"}</small>
                  </span>
                  <ha-icon icon="mdi:chevron-right"></ha-icon>
                </button>
              `;
            })}
          </div>
        </div>
      `,
      "ambiance-dialog",
    );
  }

  private renderCoversDialog(): TemplateResult {
    const ids = this.room?.covers || [];
    const states = ids.map((id) => entity(this.hass, id));
    const openCount = states.filter((state) => state?.state === "open" || state?.state === "opening").length;
    const movingCount = states.filter((state) => state?.state === "opening" || state?.state === "closing").length;
    const availableCount = states.filter((state) => isCommandable(state)).length;
    return this.renderDialog(
      this.popupTitle("covers", "Volets"),
      "mdi:blinds-horizontal",
      html`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">Ouvertures de la pièce</span><strong>${openCount} volet${openCount === 1 ? "" : "s"} ouvert${openCount === 1 ? "" : "s"} sur ${ids.length}</strong><span class="muted">${movingCount ? `${movingCount} en mouvement` : "Appui long sur un volet : fiche Home Assistant"}</span></div>
            <div class="dialog-stat"><strong>${availableCount}/${ids.length}</strong><small>disponibles</small></div>
          </div>
          ${renderCoverGroupBar(this.coverHost, ids, "covers")}
          ${renderCoverRows(this.coverHost, ids, "Aucun volet configuré dans cette carte.")}
        </div>
      `,
    );
  }

  private renderDetailsDialog(): TemplateResult {
    const lights = this.room?.lights || [];
    const covers = this.room?.covers || [];
    const all = [...lights, ...covers];
    const activeLights = lights.filter((id) => isActive(entity(this.hass, id))).length;
    const temperature = displayState(this.hass, this.room?.temperature_entity);
    const humidity = displayState(this.hass, this.room?.humidity_entity);
    const hasClimate = Boolean(this.room?.temperature_entity || this.room?.humidity_entity || this.room?.climate_entity);
    const media = this.room?.media_player_entity;
    const name = this.roomName();
    return this.renderDialog(
      this.popupTitle("details", name),
      this.room?.icon || "mdi:sofa-outline",
      html`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">Vue d'ensemble</span><strong>${name}</strong><span class="muted">Climat, éclairage, ouvrants et multimédia</span></div>
            ${hasClimate ? html`<div class="dialog-stat"><strong>${temperature}</strong><small>${humidity} humidité</small></div>` : nothing}
          </div>
          <div class="dialog-section-title">Accès rapides</div>
          <div class="grid two" style="margin-bottom:18px;">
            ${lights.length ? html`<button class="tile clickable quick-tile" type="button" @click=${() => this.openDialog("lights")}><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:lightbulb-group-outline"></ha-icon></span><strong>${activeLights}/${lights.length}</strong></div><div class="quick-label">${this.popupTitle("lights", "Lumières")}</div><div class="muted">Régler l'intensité</div></button>` : nothing}
            ${covers.length ? html`<button class="tile clickable quick-tile" type="button" @click=${() => this.openDialog("covers")}><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:blinds-horizontal"></ha-icon></span><ha-icon icon="mdi:chevron-right"></ha-icon></div><div class="quick-label">${this.popupTitle("covers", "Volets")}</div><div class="muted">Position, ouvrir ou fermer</div></button>` : nothing}
            ${hasClimate ? html`<button class="tile clickable quick-tile" type="button" @click=${() => this.openDialog("climate")}><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:thermometer"></ha-icon></span><strong>${temperature}</strong></div><div class="quick-label">${this.popupTitle("climate", "Température et humidité")}</div><div class="muted">${humidity} d'humidité</div></button>` : nothing}
            ${media ? html`<button class="tile clickable quick-tile" type="button" @click=${() => this.openMediaControl({ type: "media", entity: media })}><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:music-note"></ha-icon></span><ha-icon icon="mdi:chevron-right"></ha-icon></div><div class="quick-label">${this.popupTitle("media", "Multimédia")}</div><div class="muted">${capitalize(mediaStatusLabel(entity(this.hass, media)))}</div></button>` : nothing}
          </div>
          ${all.length ? html`<div class="dialog-section-title">Tous les appareils</div>
          <div class="grid two">
            ${all.map((id) => {
              const state = entity(this.hass, id);
              const label = this.entityLabel(id, id);
              return html`
                <button class="tile clickable quick-tile" type="button" @click=${() => this.moreInfo(id)}>
                  <div class="tile-head"><span class="tile-icon"><ha-icon .icon=${state?.attributes.icon || "mdi:circle-outline"}></ha-icon></span><ha-icon icon="mdi:chevron-right"></ha-icon></div>
                  <div class="quick-label">${label}</div>
                  <div class="muted">${isCommandable(state) ? displayState(this.hass, id) : "Indisponible"}</div>
                </button>
              `;
            })}
          </div>` : nothing}
        </div>
      `,
    );
  }

  private renderClimateDialog(): TemplateResult {
    const temperature = displayState(this.hass, this.room?.temperature_entity);
    const humidity = displayState(this.hass, this.room?.humidity_entity);
    const thermostatId = this.thermostatEntityId();
    const climate = displayState(this.hass, thermostatId, "Confort");
    const defaultEntities = [this.room?.temperature_entity, this.room?.humidity_entity].filter(
      (id): id is string => Boolean(id),
    );
    const configuredEntities = this.room?.climate_popup?.graph_entities;
    const graphEntities = [...new Set(configuredEntities === undefined ? defaultEntities : configuredEntities.filter(Boolean))];
    const periodUnit = this.room?.climate_popup?.graph_period_unit || "hours";
    const legacyHours = this.room?.climate_popup?.graph_hours;
    const configuredPeriod = Number(this.room?.climate_popup?.graph_period ?? legacyHours ?? 24);
    const maximumPeriod = periodUnit === "months" ? 60 : periodUnit === "days" ? 1_825 : 43_800;
    const graphPeriod = Number.isFinite(configuredPeriod)
      ? Math.min(maximumPeriod, Math.max(1, Math.round(configuredPeriod)))
      : 24;
    const periodMultiplier = periodUnit === "months" ? 30 * 24 : periodUnit === "days" ? 24 : 1;
    const graphHours = graphPeriod * periodMultiplier;
    const periodLabel = `${graphPeriod.toLocaleString("fr-FR")} ${periodUnit === "months" ? `mois` : periodUnit === "days" ? `jour${graphPeriod > 1 ? "s" : ""}` : `heure${graphPeriod > 1 ? "s" : ""}`}`;
    const showOverview = this.room?.climate_popup?.show_overview !== false;
    const showCurrentValues = this.room?.climate_popup?.show_current_values === true;
    const showThermostat = Boolean(thermostatId) && this.room?.climate_popup?.show_thermostat !== false;
    return this.renderDialog(
      this.popupTitle("climate", "Température et humidité"),
      "mdi:thermometer",
      html`
        <div class="dialog-body">
          ${showOverview
            ? html`<div class="dialog-overview"><div><span class="eyebrow">Confort de la pièce</span><strong>${temperature} · ${humidity}</strong><span class="muted">${graphHours > HISTORY_GRAPH_MAX_HOURS ? "Statistiques" : "Historique"} sur ${periodLabel}</span></div><div class="dialog-stat"><strong>${thermostatId ? climate : graphEntities.length}</strong><small>${thermostatId ? "mode" : `graphe${graphEntities.length > 1 ? "s" : ""}`}</small></div></div>`
            : nothing}
          ${showCurrentValues && graphEntities.length
            ? html`
                <div class="dialog-section-title">Valeurs actuelles</div>
                <div class="grid two">
                  ${graphEntities.map((id) => {
                    const isTemperature = id === this.room?.temperature_entity;
                    const isHumidity = id === this.room?.humidity_entity;
                    const label = this.entityLabel(id, isTemperature ? "Température" : isHumidity ? "Humidité" : id);
                    const icon = entity(this.hass, id)?.attributes.icon || (isTemperature ? "mdi:thermometer" : isHumidity ? "mdi:water-percent" : "mdi:chart-line");
                    return html`<div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon .icon=${icon}></ha-icon></span><strong>${displayState(this.hass, id)}</strong></div><div style="margin-top:10px;">${label}</div></div>`;
                  })}
                </div>
              `
            : nothing}
          ${graphEntities.length
            ? html`
                <div class="history-graphs">
                  ${graphEntities.map((id) => {
                    const fallback = id === this.room?.temperature_entity ? "Température" : id === this.room?.humidity_entity ? "Humidité" : id;
                    const label = this.entityLabel(id, fallback);
                    return html`<hui-card class="history-graph" .hass=${this.hass} .config=${this.historyGraphConfig(id, label, graphHours)}></hui-card>`;
                  })}
                </div>
              `
            : nothing}
          ${showThermostat
            ? html`<div class="dialog-section"><div class="dialog-section-title">Réglages</div><button class="action primary" type="button" style="width:100%;" @click=${() => this.moreInfo(thermostatId)}><ha-icon icon="mdi:tune-variant"></ha-icon>Ouvrir ${this.entityLabel(thermostatId, "le thermostat Home Assistant")}</button></div>`
            : nothing}
        </div>
      `,
    );
  }

  private mediaCommand(id: string | undefined, service: string, data: Record<string, unknown> = {}, errorMessage = "La commande multimédia a échoué."): Promise<boolean> {
    const hass = this.hass;
    if (!hass || !id) return Promise.resolve(false);
    return this.runCommand(`media:${id}:${service}`, () => hass.callService("media_player", service, data, { entity_id: id }), { errorMessage });
  }

  private renderMediaDialog(): TemplateResult {
    const id = this.selectedMediaEntity || this.room?.media_player_entity;
    const kind = this.selectedMediaKind;
    const media = entity(this.hass, id);
    const playerLabel = this.entityLabel(id, kind === "tv" ? "Télévision" : "Lecteur multimédia");
    const title = typeof media?.attributes.media_title === "string" ? media.attributes.media_title : playerLabel;
    const artist = typeof media?.attributes.media_artist === "string" ? media.attributes.media_artist : this.roomName();
    const rawVolume = media?.attributes.volume_level;
    const volume = typeof rawVolume === "number" ? Math.round(rawVolume * 100) : 0;
    const volumeKey = `volume:${id}`;
    const shownVolume = this.dragValues.get(volumeKey) ?? volume;
    const playing = media?.state === "playing";
    const commandable = isCommandable(media);
    const powered = isAvailable(media) && media?.state !== "off" && media?.state !== "standby";
    const busy = (service: string) => this.isPending(`media:${id}:${service}`);
    const status = mediaStatusLabel(media);
    const dialogTitle = this.selectedMediaTitle?.trim()
      || this.popupTitle(kind === "tv" ? "tv" : "media", kind === "tv" ? "Télévision" : "Multimédia");
    const dialogIcon = this.selectedMediaIcon || (kind === "tv" ? "mdi:television" : "mdi:music-note");
    const tvStatus = !commandable ? "indisponible" : powered ? "allumée" : "éteinte";
    return this.renderDialog(
      dialogTitle,
      dialogIcon,
      html`
        <div class="dialog-body">
          <div class="dialog-overview"><div><span class="eyebrow">${playerLabel}</span><strong>${title}</strong><span class="muted">${kind === "tv" ? tvStatus : `${artist} · ${status}`}</span></div><div class="dialog-stat"><strong>${shownVolume}%</strong><small>volume</small></div></div>
          <div class="dialog-section-title">${kind === "tv" ? "Commandes TV" : "Lecture"}</div>
          ${kind === "tv"
            ? html`
                <div class="actions" style="grid-template-columns:repeat(3,1fr);margin-top:0;">
                  <button class="action ${powered ? "danger" : "primary"}" type="button" ?disabled=${!commandable || busy(powered ? "turn_off" : "turn_on")}
                    @click=${() => this.mediaCommand(id, powered ? "turn_off" : "turn_on")}><ha-icon icon="mdi:power"></ha-icon>${powered ? "Éteindre" : "Allumer"}</button>
                  <button class="action" type="button" ?disabled=${!commandable || !powered || busy("media_play_pause")}
                    @click=${() => this.mediaCommand(id, "media_play_pause")}><ha-icon icon=${playing ? "mdi:pause" : "mdi:play"}></ha-icon>${playing ? "Pause" : "Lecture"}</button>
                  <button class="action" type="button" @click=${() => this.moreInfo(id)}><ha-icon icon="mdi:tune-variant"></ha-icon>Détails</button>
                </div>
              `
            : html`
                <div class="actions" style="grid-template-columns:repeat(3,1fr);margin-top:0;">
                  <button class="action" type="button" ?disabled=${!commandable || !powered || busy("media_previous_track")}
                    @click=${() => this.mediaCommand(id, "media_previous_track")}><ha-icon icon="mdi:skip-previous"></ha-icon>Précédent</button>
                  <button class="action primary" type="button" ?disabled=${!commandable || !powered || busy("media_play_pause")}
                    @click=${() => this.mediaCommand(id, "media_play_pause")}><ha-icon icon=${playing ? "mdi:pause" : "mdi:play"}></ha-icon>${playing ? "Pause" : "Lecture"}</button>
                  <button class="action" type="button" ?disabled=${!commandable || !powered || busy("media_next_track")}
                    @click=${() => this.mediaCommand(id, "media_next_track")}><ha-icon icon="mdi:skip-next"></ha-icon>Suivant</button>
                </div>
              `}
          <label class="tile" style="display:block;margin-top:14px;"><div class="row-between"><span style="display:flex;align-items:center;gap:8px;"><ha-icon icon="mdi:volume-high"></ha-icon><strong>Volume</strong></span><strong>${shownVolume}%</strong></div>
            <input class="range light-slider" style=${`--range-value:${shownVolume}%`} type="range" min="0" max="100" .value=${String(shownVolume)} aria-label=${`Volume de ${playerLabel}`}
              ?disabled=${!commandable || !powered}
              @input=${(event: Event) => this.setDrag(volumeKey, Number((event.target as HTMLInputElement).value))}
              @change=${(event: Event) => {
                const value = Number((event.target as HTMLInputElement).value);
                this.setDrag(volumeKey, value);
                void this.mediaCommand(id, "volume_set", { volume_level: value / 100 }, "Le volume n’a pas pu être modifié.")
                  .finally(() => this.setDrag(volumeKey, undefined));
              }} /></label>
          ${kind === "media" ? html`<button class="action" type="button" style="width:100%;margin-top:12px;" @click=${() => this.moreInfo(id)}><ha-icon icon="mdi:tune-variant"></ha-icon>Détails</button>` : nothing}
        </div>
      `,
    );
  }
}
