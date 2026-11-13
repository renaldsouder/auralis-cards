import { css, html, nothing, type TemplateResult } from "lit";
import { Directive, directive, PartType, type ElementPart, type PartInfo } from "lit/directive.js";
import defaultGroupImages from "../assets/volets-groups.jpg?inline";
import { AuralisBaseCard } from "./auralis-base-card";
import type { CoversCardConfig, CoversGroupConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { coverCommand, fireMoreInfo, setCoverPosition } from "../utils/actions";
import { canStopCover, coverPosition, displayState, entity, friendlyName, isCommandable } from "../utils/entities";

/* -------------------------------------------------------------------------------------------
 * Outils partagés par les cartes « maison » (Volets, Pièce, Lumières, Prises).
 * Ils vivent ici faute de pouvoir modifier utils/ : à déplacer dans utils/ le moment venu.
 * ----------------------------------------------------------------------------------------- */

/** Durée d'appui avant d'ouvrir la fiche Home Assistant d'une ligne. */
export const HOLD_DELAY = 500;
/** Déplacement du doigt au-delà duquel l'appui long est abandonné (défilement, curseur). */
const HOLD_TOLERANCE = 10;

/**
 * Appui long (500 ms) ou clic droit sur une ligne : ouvre la fiche Home Assistant de l'entité.
 * Le clic qui suit un appui long est ignoré, pour ne pas basculer l'appareil en même temps.
 * Les curseurs et sélecteurs de couleur de la ligne ne déclenchent pas l'appui long.
 */
class MoreInfoHoldDirective extends Directive {
  private element?: HTMLElement;
  private entityId = "";
  private timer?: number;
  private origin?: { x: number; y: number };
  private held = false;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ELEMENT) throw new Error("holdMoreInfo s'utilise sur un élément.");
  }

  render(_entityId: string | undefined): typeof nothing {
    return nothing;
  }

  update(part: ElementPart, [entityId]: [string | undefined]): typeof nothing {
    this.entityId = entityId ?? "";
    const element = part.element as HTMLElement;
    if (this.element !== element) {
      this.element = element;
      element.addEventListener("pointerdown", this.down);
      element.addEventListener("pointermove", this.move);
      element.addEventListener("pointerup", this.cancel);
      element.addEventListener("pointerleave", this.cancel);
      element.addEventListener("pointercancel", this.cancel);
      element.addEventListener("contextmenu", this.menu);
      element.addEventListener("click", this.click, true);
    }
    return nothing;
  }

  private open(): void {
    if (this.element && this.entityId) fireMoreInfo(this.element, this.entityId);
  }

  private readonly down = (event: PointerEvent): void => {
    if (event.button !== 0 || !this.entityId) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest?.("input, select, textarea")) return;
    this.held = false;
    this.origin = { x: event.clientX, y: event.clientY };
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.held = true;
      this.timer = undefined;
      this.open();
    }, HOLD_DELAY);
  };

  private readonly move = (event: PointerEvent): void => {
    if (!this.origin) return;
    if (Math.hypot(event.clientX - this.origin.x, event.clientY - this.origin.y) > HOLD_TOLERANCE) this.cancel();
  };

  private readonly cancel = (): void => {
    window.clearTimeout(this.timer);
    this.timer = undefined;
    this.origin = undefined;
  };

  private readonly menu = (event: Event): void => {
    if (!this.entityId) return;
    event.preventDefault();
    const alreadyOpened = this.held;
    this.cancel();
    if (!alreadyOpened) {
      this.held = true;
      this.open();
    }
  };

  private readonly click = (event: Event): void => {
    if (!this.held) return;
    this.held = false;
    event.preventDefault();
    event.stopPropagation();
  };
}

/** `<div ${holdMoreInfo(id)}>` : appui long ou clic droit sur la ligne → fiche de l'entité. */
export const holdMoreInfo = directive(MoreInfoHoldDirective);

/** Le volet accepte une position (fonction SET_POSITION = 4). */
export function coverSupportsPosition(state?: HassEntity): boolean {
  const features = state?.attributes.supported_features;
  return typeof features === "number" && (features & 4) !== 0;
}

/**
 * Volet complètement ouvert : d'après sa position quand elle est connue (un volet ouvert à 5 %
 * est « open » pour Home Assistant), sinon d'après son état.
 */
export function coverFullyOpen(state?: HassEntity): boolean {
  if (!state || state.state === "unavailable") return false;
  const position = coverPosition(state);
  return position !== undefined ? position >= 99 : state.state === "open";
}

export function coverStateLabel(hass: HomeAssistant | undefined, id: string): string {
  const state = entity(hass, id);
  if (!isCommandable(state)) return "Indisponible";
  const position = coverPosition(state);
  const suffix = position !== undefined && state?.state !== "closed" ? ` · ${position} %` : "";
  if (state?.state === "open") return position !== undefined && position < 99 ? `Ouvert à ${position} %` : "Ouvert";
  if (state?.state === "opening") return `Ouverture en cours${suffix}`;
  if (state?.state === "closing") return `Fermeture en cours${suffix}`;
  if (state?.state === "closed") return "Fermé";
  if (state?.state === "unknown") return position !== undefined ? `Position ${position} %` : "État inconnu";
  return displayState(hass, id);
}

/** Ce dont la fenêtre des volets a besoin de la carte qui l'affiche (Volets ou Pièce). */
export interface CoverPopupHost {
  hass?: HomeAssistant;
  label(id: string): string;
  /** Commande passée par `runCommand` : état « en cours » et message d'échec visible. */
  command(key: string, action: () => Promise<unknown>, errorMessage: string): Promise<boolean>;
  pending(key: string): boolean;
  moreInfo(id: string): void;
  /** Position suivie pendant le glissement du curseur, avant l'envoi. */
  dragValue(key: string): number | undefined;
  setDragValue(key: string, value: number | undefined): void;
}

/** Carte qui affiche la fenêtre des volets : `hass` et les positions suivies pendant le glissement. */
export interface DragValuesCard {
  hass?: HomeAssistant;
  dragValues: ReadonlyMap<string, number>;
}

/** Construit l'adaptateur de la fenêtre des volets pour une carte. */
export function coverPopupHost(card: DragValuesCard, options: Omit<CoverPopupHost, "hass" | "dragValue" | "setDragValue">): CoverPopupHost {
  return {
    get hass() { return card.hass; },
    ...options,
    dragValue: (key) => card.dragValues.get(key),
    setDragValue: (key, value) => { card.dragValues = withDragValue(card.dragValues, key, value); },
  };
}

/** Copie des positions suivies, avec `key` posée ou retirée (`undefined`). */
export function withDragValue(values: ReadonlyMap<string, number>, key: string, value: number | undefined): ReadonlyMap<string, number> {
  const next = new Map(values);
  if (value === undefined) next.delete(key);
  else next.set(key, value);
  return next;
}

/** Commande d'un ou plusieurs volets ; Stop ne vise que les volets qui l'acceptent. */
export function runCoverCommand(host: CoverPopupHost, key: string, ids: string[], command: "open" | "close" | "stop"): Promise<boolean> {
  const hass = host.hass;
  const messages = { open: "L’ouverture a échoué.", close: "La fermeture a échoué.", stop: "L’arrêt a échoué." };
  if (!hass || !ids.length) return Promise.resolve(false);
  return host.command(key, () => coverCommand(hass, ids, command), messages[command]);
}

/** Barre « Commande groupée » : ouvrir, stopper, fermer tous les volets disponibles. */
export function renderCoverGroupBar(host: CoverPopupHost, ids: string[], keyPrefix: string): TemplateResult {
  const commandable = ids.filter((id) => isCommandable(entity(host.hass, id)));
  const stopIds = commandable.filter((id) => canStopCover(entity(host.hass, id)));
  const busy = (command: string) => host.pending(`${keyPrefix}:${command}`);
  return html`
    <div class="dialog-section-title">Commande groupée</div>
    <div class="group-bar">
      <button class="action" type="button" ?disabled=${!commandable.length || busy("open")} aria-busy=${busy("open") ? "true" : "false"}
        @click=${() => runCoverCommand(host, `${keyPrefix}:open`, commandable, "open")}><ha-icon icon="mdi:arrow-up"></ha-icon>Ouvrir</button>
      <button class="action" type="button" ?disabled=${!stopIds.length || busy("stop")} aria-busy=${busy("stop") ? "true" : "false"}
        title=${stopIds.length ? "Arrêter les volets compatibles" : "Aucun volet ne prend en charge l'arrêt"}
        @click=${() => runCoverCommand(host, `${keyPrefix}:stop`, stopIds, "stop")}><ha-icon icon="mdi:stop"></ha-icon>Stop</button>
      <button class="action" type="button" ?disabled=${!commandable.length || busy("close")} aria-busy=${busy("close") ? "true" : "false"}
        @click=${() => runCoverCommand(host, `${keyPrefix}:close`, commandable, "close")}><ha-icon icon="mdi:arrow-down"></ha-icon>Fermer</button>
    </div>
    ${commandable.length && !stopIds.length ? html`<p class="muted">Ces volets ne prennent pas en charge la commande Stop.</p>` : nothing}
  `;
}

function renderCoverRow(host: CoverPopupHost, id: string): TemplateResult {
  const state = entity(host.hass, id);
  const label = host.label(id);
  const commandable = isCommandable(state);
  const position = coverPosition(state);
  const positionKey = `cover:position:${id}`;
  const shown = host.dragValue(positionKey) ?? position ?? 0;
  const busy = (command: string) => host.pending(`cover:${command}:${id}`);
  const send = (event: Event) => {
    const hass = host.hass;
    const value = Number((event.target as HTMLInputElement).value);
    if (!hass) return;
    host.setDragValue(positionKey, value);
    void host.command(positionKey, () => setCoverPosition(hass, id, value), "La position n’a pas pu être modifiée.")
      .finally(() => host.setDragValue(positionKey, undefined));
  };
  return html`
    <div class="list-row cover-device-row" ${holdMoreInfo(id)}>
      <span class="tile-icon"><ha-icon .icon=${state?.attributes.icon || "mdi:blinds-horizontal"}></ha-icon></span>
      <div class="meta">
        <span class="name">${label}</span>
        <span class="state ${commandable ? "" : "unavailable"}">${coverStateLabel(host.hass, id)}</span>
      </div>
      <button class="icon-button cover-info" type="button" aria-label=${`Plus d’informations sur ${label}`} title=${`Plus d’informations sur ${label}`}
        @click=${() => host.moreInfo(id)}><ha-icon icon="mdi:information-outline"></ha-icon></button>
      ${coverSupportsPosition(state) ? html`<label class="cover-position">
        <ha-icon icon="mdi:arrow-expand-vertical"></ha-icon>
        <input class="range cover-slider" type="range" min="0" max="100" step="1" .value=${String(shown)} style=${`--range-value:${shown}%`}
          aria-label=${`Position de ${label}`} ?disabled=${!commandable} aria-busy=${host.pending(positionKey) ? "true" : "false"}
          @input=${(event: Event) => host.setDragValue(positionKey, Number((event.target as HTMLInputElement).value))}
          @change=${send} />
        <output>${shown} %</output>
      </label>` : nothing}
      <div class="cover-device-actions">
        <button class="action" type="button" ?disabled=${!commandable || busy("open")} aria-label=${`Ouvrir ${label}`}
          @click=${() => runCoverCommand(host, `cover:open:${id}`, [id], "open")}><ha-icon icon="mdi:arrow-up"></ha-icon>Ouvrir</button>
        <button class="action" type="button" ?disabled=${!canStopCover(state) || busy("stop")} aria-label=${`Arrêter ${label}`}
          title=${commandable ? (canStopCover(state) ? "Arrêter" : "Arrêt non pris en charge par ce volet") : "Volet indisponible"}
          @click=${() => runCoverCommand(host, `cover:stop:${id}`, [id], "stop")}><ha-icon icon="mdi:stop"></ha-icon>Stop</button>
        <button class="action" type="button" ?disabled=${!commandable || busy("close")} aria-label=${`Fermer ${label}`}
          @click=${() => runCoverCommand(host, `cover:close:${id}`, [id], "close")}><ha-icon icon="mdi:arrow-down"></ha-icon>Fermer</button>
      </div>
    </div>
  `;
}

/** Liste des volets d'une fenêtre : état, position réglable, fiche Home Assistant et commandes. */
export function renderCoverRows(host: CoverPopupHost, ids: string[], emptyLabel: string): TemplateResult {
  return html`
    <div class="dialog-section-title">Volets</div>
    <div class="list">
      ${ids.length ? ids.map((id) => renderCoverRow(host, id)) : html`<div class="list-row">${emptyLabel}</div>`}
    </div>
  `;
}

/** Styles de la fenêtre des volets, partagés avec la carte Pièce. */
export const coverPopupStyles = css`
  .group-bar,
  .cover-device-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .group-bar {
    margin-bottom: 14px;
  }

  .cover-device-row {
    grid-template-columns: auto minmax(0, 1fr) auto;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }

  .cover-device-row .state {
    display: block;
    margin-top: 3px;
    color: var(--auralis-muted);
    font-size: var(--auralis-text-sm);
  }

  .cover-position,
  .cover-device-actions {
    grid-column: 1 / -1;
  }

  .cover-position {
    display: flex;
    min-height: var(--auralis-target);
    align-items: center;
    gap: 10px;
  }

  .cover-position ha-icon {
    --mdc-icon-size: 18px;
    color: var(--auralis-muted);
  }

  .cover-position input {
    min-width: 0;
    flex: 1;
    min-height: var(--auralis-target);
    cursor: pointer;
  }

  .cover-position output {
    min-width: 44px;
    color: var(--auralis-muted);
    font-size: var(--auralis-text-sm);
    text-align: right;
  }

  .cover-device-actions .action {
    min-height: var(--auralis-target);
    padding: 8px 10px;
  }
`;

/* ----------------------------------------------------------------------------------------- */

interface GroupStats {
  total: number;
  open: number;
  fullyOpen: number;
  closed: number;
  opening: number;
  closing: number;
  available: number;
  moving: number;
  availableIds: string[];
}

export class AuralisCoversCard extends AuralisBaseCard<CoversCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    dragValues: { state: true },
  };

  static styles = [
    AuralisBaseCard.styles,
    coverPopupStyles,
    css`
      :host {
        --covers-accent: #79d6f2;
        --covers-icon: #83cafa;
        --covers-icon-background: rgba(20, 52, 74, 0.91);
        --covers-state-border: rgba(121, 214, 242, 0.38);
        --covers-state-text: #b6edfb;
        --covers-control-icon: #9cdef6;
      }

      /* accent_color, posé sur l'hôte par applyHostPalette(). */
      :host([data-accent]) {
        --covers-accent: var(--auralis-card-accent);
        --covers-icon: var(--auralis-card-accent);
        --covers-icon-background: color-mix(in srgb, var(--auralis-card-accent) 24%, rgba(9, 20, 30, 0.92));
        --covers-state-border: color-mix(in srgb, var(--auralis-card-accent) 38%, transparent);
        --covers-state-text: color-mix(in srgb, var(--auralis-card-accent) 45%, #fff);
        --covers-control-icon: color-mix(in srgb, var(--auralis-card-accent) 72%, #fff);
      }

      :host([data-accent]) .dialog-backdrop {
        --auralis-active: var(--auralis-card-accent);
      }

      /* Fond et texte suivent le thème ; seules les tuiles photo gardent un voile sombre. */
      :host([data-background]) ha-card,
      :host([data-background]) .covers-shell {
        background: var(--auralis-card-background);
      }

      .covers-shell {
        min-width: 0;
        padding: 16px;
        background: var(--auralis-card);
        color: var(--auralis-text);
        container-type: inline-size;
      }

      .covers-header .tile-icon {
        flex: 0 0 auto;
        width: var(--auralis-target);
        height: var(--auralis-target);
        background: color-mix(in srgb, var(--covers-accent) 18%, var(--auralis-layer));
        color: var(--covers-accent);
      }

      .covers-header .tile-icon ha-icon {
        --mdc-icon-size: 24px;
        color: inherit;
      }

      .groups-grid {
        display: grid;
        grid-template-columns: repeat(var(--group-columns, 2), minmax(0, 1fr));
        gap: 11px;
      }

      .group-tile {
        position: relative;
        display: flex;
        min-width: 0;
        min-height: 184px;
        overflow: hidden;
        flex-direction: column;
        align-items: stretch;
        justify-content: space-between;
        padding: 0;
        isolation: isolate;
        border: 1px solid rgba(169, 190, 214, 0.22);
        border-radius: 18px;
        background: #172430;
        color: white;
        text-align: left;
      }

      .group-tile:hover,
      .group-tile:focus-within {
        border-color: var(--covers-accent);
      }

      .group-open:focus-visible,
      .group-control:focus-visible {
        outline: 2px solid var(--covers-accent);
        outline-offset: -2px;
      }

      .group-open {
        display: flex;
        flex: 1;
        min-height: 126px;
        flex-direction: column;
        align-items: stretch;
        justify-content: space-between;
        padding: 14px;
        border: 0;
        background: transparent;
        color: inherit;
        text-align: left;
        cursor: pointer;
      }

      .group-tile::after {
        position: absolute;
        z-index: -1;
        inset: 0;
        background: linear-gradient(180deg, rgba(4, 10, 17, 0.39), rgba(4, 10, 17, 0.1) 36%, rgba(4, 10, 17, 0.88));
        content: "";
        pointer-events: none;
      }

      .group-photo {
        position: absolute;
        z-index: -2;
        width: 100%;
        height: 100%;
        max-width: none;
        inset: 0;
        object-fit: cover;
        pointer-events: none;
      }

      .group-photo.mosaic {
        width: 200%;
        height: 200%;
        object-fit: fill;
      }

      .group-photo.quadrant-1,
      .group-photo.quadrant-3 {
        left: -100%;
      }

      .group-photo.quadrant-2,
      .group-photo.quadrant-3 {
        top: -100%;
      }

      .group-topline,
      .group-bottomline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 9px;
      }

      .group-topline {
        justify-content: flex-start;
      }

      .group-topline .tile-icon {
        width: 38px;
        height: 38px;
        flex: 0 0 auto;
        background: var(--covers-icon-background);
        color: var(--covers-icon);
      }

      .group-arrow {
        flex: 0 0 auto;
        --mdc-icon-size: 22px;
        color: white;
        filter: drop-shadow(0 1px 2px #000);
      }

      .group-name {
        font-size: var(--auralis-title-size);
        font-weight: 780;
        line-height: 1.1;
        text-shadow: 0 2px 5px rgba(0, 0, 0, 0.8);
      }

      .group-state {
        display: inline-flex;
        align-items: center;
        padding: 5px 8px;
        border: 1px solid var(--covers-state-border);
        border-radius: 9px;
        background: rgba(8, 30, 43, 0.82);
        color: var(--covers-state-text);
        font-size: var(--auralis-text-xs);
        font-weight: 750;
      }

      .group-state.moving {
        border-color: rgba(255, 204, 113, 0.48);
        background: rgba(54, 37, 13, 0.82);
        color: #ffdc9f;
      }

      .group-state.unavailable {
        border-color: rgba(185, 195, 207, 0.32);
        background: rgba(26, 32, 39, 0.82);
        color: #c1cbd5;
      }

      .group-controls {
        position: relative;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
        padding: 0 10px 10px;
      }

      .group-control {
        display: flex;
        min-width: 0;
        min-height: var(--auralis-target);
        align-items: center;
        justify-content: center;
        padding: 6px;
        border: 1px solid rgba(192, 216, 235, 0.28);
        border-radius: 10px;
        background: rgba(9, 20, 30, 0.88);
        color: #f4f8fc;
        font: inherit;
        cursor: pointer;
      }

      .group-control ha-icon {
        --mdc-icon-size: 21px;
        color: var(--covers-control-icon);
      }

      .group-control:hover:not(:disabled) {
        background: rgba(24, 55, 75, 0.96);
      }

      .group-control:disabled {
        opacity: 0.45;
        cursor: default;
      }

      @container (max-width: 400px) {
        .group-name {
          font-size: 18px;
        }
      }

      @container (max-width: 720px) {
        .groups-grid:not(.single-column) {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      /* Même seuil que la carte Prises : une colonne sous 360 px. */
      @container (max-width: 360px) {
        .groups-grid:not(.single-column),
        .groups-grid.single-column {
          grid-template-columns: 1fr;
        }

        .group-tile {
          min-height: 180px;
        }
      }
    `,
  ];

  /** Positions suivies pendant le glissement d'un curseur, par clé. */
  public dragValues: ReadonlyMap<string, number> = new Map();

  public setConfig(config: CoversCardConfig): void {
    if (!Array.isArray(config.groups) || config.groups.length === 0) {
      throw new Error("Configurez au moins un groupe de volets.");
    }
    for (const [name, value] of [["group_columns", config.group_columns], ["columns", config.columns]] as const) {
      if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > 4)) {
        throw new Error(`${name} doit être un nombre entier entre 1 et 4.`);
      }
    }
    for (const group of config.groups) {
      if (!group || typeof group.name !== "string" || !group.name.trim() || !Array.isArray(group.covers)) {
        throw new Error("Chaque groupe doit avoir un nom et une liste de volets.");
      }
      if (!group.covers.every((id) => typeof id === "string" && id.startsWith("cover."))) {
        throw new Error("Les groupes acceptent uniquement des entités cover.");
      }
    }
    // `columns` est un alias de `group_columns`, comme sur la carte Prises.
    this.config = { ...config, theme: config.theme || "carbon", group_columns: config.group_columns ?? config.columns };
  }

  static getStubConfig(hass?: HomeAssistant): Partial<CoversCardConfig> {
    const covers = Object.keys(hass?.states ?? {}).filter((id) => id.startsWith("cover.")).slice(0, 4);
    return {
      name: "Volets",
      theme: "carbon",
      groups: covers.length
        ? [{ name: "Maison", covers }]
        : [{ name: "Salon", covers: [] }, { name: "Chambres", covers: [] }],
    };
  }

  static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      name: "Titre", icon: "Icône", show_header: "Afficher l’en-tête", theme: "Thème",
      group_columns: "Colonnes de groupes", groups: "Groupes (name, covers, icon, background_image, background_position)",
      entity_labels: "Noms personnalisés", background_image: "Image de fond des groupes", accent_color: "Couleur d’accent",
      card_background: "Fond de la carte",
    };
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "show_header", selector: { boolean: {} } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"], mode: "dropdown" } } },
        { name: "group_columns", selector: { number: { min: 1, max: 4, step: 1, mode: "box" } } },
        { name: "groups", selector: { object: {} } },
        { name: "entity_labels", selector: { object: {} } },
        { name: "background_image", selector: { text: {} } },
        { name: "accent_color", selector: { text: {} } },
        { name: "card_background", selector: { object: {} } },
      ],
      computeLabel: ({ name }: { name: string }) => labels[name],
    };
  }

  /** Adaptateur pour la fenêtre des volets partagée avec la carte Pièce. */
  private get coverHost(): CoverPopupHost {
    return coverPopupHost(this, {
      label: (id) => this.config?.entity_labels?.[id] || friendlyName(entity(this.hass, id), id),
      command: (key, action, errorMessage) => this.runCommand(key, action, { errorMessage }),
      pending: (key) => this.isPending(key),
      moreInfo: (id) => this.moreInfo(id),
    });
  }

  private groupStats(group: CoversGroupConfig): GroupStats {
    const ids = [...new Set(group.covers)];
    const states = ids.map((id) => entity(this.hass, id));
    return {
      total: ids.length,
      open: states.filter((state) => state?.state === "open" || state?.state === "opening").length,
      fullyOpen: states.filter((state) => coverFullyOpen(state)).length,
      closed: states.filter((state) => state?.state === "closed").length,
      opening: states.filter((state) => state?.state === "opening").length,
      closing: states.filter((state) => state?.state === "closing").length,
      available: states.filter((state) => isCommandable(state)).length,
      moving: states.filter((state) => state?.state === "opening" || state?.state === "closing").length,
      availableIds: ids.filter((id) => isCommandable(entity(this.hass, id))),
    };
  }

  private groupStatus(stats: GroupStats): { label: string; tone: string } {
    if (!stats.available) return { label: "Indisponible", tone: "unavailable" };
    if (stats.opening && stats.closing) return { label: "En mouvement", tone: "moving" };
    if (stats.opening) return { label: "Ouverture en cours", tone: "moving" };
    if (stats.closing) return { label: "Fermeture en cours", tone: "moving" };
    if (stats.fullyOpen === stats.total) return { label: stats.total === 1 ? "Ouvert" : "Tous ouverts", tone: "" };
    if (stats.closed === stats.total) return { label: stats.total === 1 ? "Fermé" : "Tous fermés", tone: "" };
    return { label: `${stats.open}/${stats.total} ouverts`, tone: "" };
  }

  private columns(): number {
    return this.config?.group_columns ?? Math.min(2, this.config?.groups.length ?? 1);
  }

  private renderGroup(group: CoversGroupConfig, index: number): TemplateResult {
    const stats = this.groupStats(group);
    const stopIds = stats.availableIds.filter((id) => canStopCover(entity(this.hass, id)));
    const status = this.groupStatus(stats);
    const customImage = group.background_image?.trim() || this.config?.background_image?.trim();
    const imagePosition = group.background_position?.trim();
    const safePosition = imagePosition && /^[\w\s.%+-]+$/.test(imagePosition) ? imagePosition : "center";
    const imageClass = customImage ? "group-photo" : `group-photo mosaic quadrant-${index % 4}`;
    const name = group.name.trim();
    const key = `group:${index}`;
    const busy = (command: string) => this.isPending(`${key}:${command}`);
    return html`
      <div class="group-tile">
        <img class=${imageClass} src=${customImage || defaultGroupImages} alt="" style=${customImage ? `object-position:${safePosition}` : ""} loading="lazy" />
        <button class="group-open" type="button" aria-haspopup="dialog" aria-label=${`Afficher les volets du groupe ${name}`} @click=${() => this.openDialog(`group:${index}`)}>
          <span class="group-topline">
            <span class="tile-icon"><ha-icon .icon=${group.icon || "mdi:blinds-horizontal"}></ha-icon></span>
            <span class="group-name">${name}</span>
          </span>
          <span class="group-bottomline">
            <span class=${`group-state ${status.tone}`}>${status.label}</span>
            <ha-icon class="group-arrow" icon="mdi:chevron-right"></ha-icon>
          </span>
        </button>
        <div class="group-controls" role="group" aria-label=${`Commandes du groupe ${name}`}>
          <button class="group-control" type="button" title="Monter" aria-label=${`Monter les volets du groupe ${name}`} ?disabled=${!stats.available || busy("open")} aria-busy=${busy("open") ? "true" : "false"} @click=${() => runCoverCommand(this.coverHost, `${key}:open`, stats.availableIds, "open")}><ha-icon icon="mdi:arrow-up"></ha-icon></button>
          <button class="group-control" type="button" title=${stopIds.length ? "Stop" : "Aucun volet ne prend en charge l'arrêt"} aria-label=${`Arrêter les volets du groupe ${name}`} ?disabled=${!stopIds.length || busy("stop")} aria-busy=${busy("stop") ? "true" : "false"} @click=${() => runCoverCommand(this.coverHost, `${key}:stop`, stopIds, "stop")}><ha-icon icon="mdi:stop"></ha-icon></button>
          <button class="group-control" type="button" title="Descendre" aria-label=${`Descendre les volets du groupe ${name}`} ?disabled=${!stats.available || busy("close")} aria-busy=${busy("close") ? "true" : "false"} @click=${() => runCoverCommand(this.coverHost, `${key}:close`, stats.availableIds, "close")}><ha-icon icon="mdi:arrow-down"></ha-icon></button>
        </div>
      </div>
    `;
  }

  private renderHeader(): TemplateResult | typeof nothing {
    const config = this.config!;
    if (!(config.show_header ?? Boolean(config.name))) return nothing;
    const ids = [...new Set(config.groups.flatMap((group) => group.covers))];
    const states = ids.map((id) => entity(this.hass, id));
    const open = states.filter((state) => state?.state === "open" || state?.state === "opening").length;
    const unavailable = states.filter((state) => !isCommandable(state)).length;
    const moving = states.filter((state) => state?.state === "opening" || state?.state === "closing").length;
    const status = unavailable
      ? `${unavailable} volet${unavailable > 1 ? "s" : ""} indisponible${unavailable > 1 ? "s" : ""}`
      : moving ? `${moving} en mouvement` : `${open} ouvert${open > 1 ? "s" : ""} sur ${ids.length}`;
    return html`<header class="header covers-header">
      <span class="tile-icon"><ha-icon .icon=${config.icon || "mdi:blinds-horizontal"}></ha-icon></span>
      <div class="title-wrap"><h2>${config.name || "Volets"}</h2>
        <div class="status-line subtitle"><span class="dot ${unavailable ? "warning" : moving ? "warning" : "healthy"}"></span>${status}</div></div>
    </header>`;
  }

  protected render(): TemplateResult {
    if (!this.config || !this.hass) return html``;
    const groups = this.config.groups;
    const columns = this.columns();
    const selectedIndex = this.dialog?.startsWith("group:") ? Number(this.dialog.slice(6)) : -1;
    const selectedGroup = Number.isInteger(selectedIndex) ? groups[selectedIndex] : undefined;

    return html`
      <ha-card>
        <div class="covers-shell">
          ${this.renderHeader()}
          <div class=${columns === 1 ? "groups-grid single-column" : "groups-grid"} style=${`--group-columns:${columns}`}>
            ${groups.map((group, index) => this.renderGroup(group, index))}
          </div>
        </div>
      </ha-card>
      ${selectedGroup ? this.renderGroupDialog(selectedGroup, selectedIndex) : nothing}
    `;
  }

  private renderGroupDialog(group: CoversGroupConfig, index: number): TemplateResult {
    const ids = [...new Set(group.covers)];
    const stats = this.groupStats(group);
    return this.renderDialog(
      group.name.trim(),
      group.icon || "mdi:blinds-horizontal",
      html`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div>
              <span class="eyebrow">Ouvertures de la pièce</span>
              <strong>${stats.open} volet${stats.open === 1 ? "" : "s"} ouvert${stats.open === 1 ? "" : "s"} sur ${stats.total}</strong>
              <span class="muted">${stats.moving ? `${stats.moving} en mouvement` : "Appui long sur un volet : fiche Home Assistant"}</span>
            </div>
            <div class="dialog-stat"><strong>${stats.available}/${stats.total}</strong><small>disponibles</small></div>
          </div>
          ${renderCoverGroupBar(this.coverHost, ids, `dialog:${index}`)}
          ${renderCoverRows(this.coverHost, ids, "Aucun volet configuré dans ce groupe.")}
        </div>
      `,
    );
  }

  public getCardSize(): number {
    const count = this.config?.groups.length ?? 4;
    const columns = this.columns();
    return (this.config?.show_header ?? Boolean(this.config?.name) ? 3 : 2) + Math.ceil(count / Math.min(columns, 2)) * 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, min_columns: 3 };
  }
}
