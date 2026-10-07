import { css, html, nothing, type TemplateResult } from "lit";
import defaultGroupImages from "../assets/volets-groups.jpg?inline";
import { AuralisBaseCard } from "./auralis-base-card";
import type { CoversCardConfig, CoversGroupConfig } from "../types/config";
import type { HassEntity } from "../types/home-assistant";
import { coverCommand } from "../utils/actions";
import { displayState, entity, friendlyName, isAvailable } from "../utils/entities";

interface GroupStats {
  total: number;
  open: number;
  closed: number;
  opening: number;
  closing: number;
  available: number;
  moving: number;
  availableIds: string[];
}

export class AuralisCoversCard extends AuralisBaseCard<CoversCardConfig> {
  static styles = [
    AuralisBaseCard.styles,
    css`
      ha-card {
        background: #09111a;
      }

      .covers-shell {
        min-width: 0;
        padding: 16px;
        background: linear-gradient(145deg, #09111a 0%, #0d1822 58%, #081018 100%);
        color: #f4f8fc;
        container-type: inline-size;
      }

      .covers-header {
        display: flex;
        align-items: center;
        gap: 11px;
        margin-bottom: 18px;
      }

      .covers-header .tile-icon {
        width: 40px;
        height: 40px;
        flex: 0 0 auto;
        background: rgba(121, 214, 242, 0.16);
        color: #79d6f2;
      }

      .covers-header .title-wrap h2 {
        font-size: 21px;
      }

      .covers-header .title-wrap p {
        margin-top: 3px;
        color: #93a2b5;
        font-size: 11px;
      }

      .covers-total {
        flex: 0 0 auto;
        padding: 12px 14px;
        border-radius: 16px;
        background: #172430;
        font-size: 13px;
        font-weight: 750;
        white-space: nowrap;
      }

      .section-label {
        margin: 0 1px 11px;
        color: #93a2b5;
        font-size: 10px;
        font-weight: 760;
        letter-spacing: 0.11em;
        text-transform: uppercase;
      }

      .groups-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 11px;
      }

      .group-tile {
        position: relative;
        display: flex;
        min-width: 0;
        min-height: 234px;
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
        border-color: #79d6f2;
      }

      .group-open:focus-visible,
      .group-control:focus-visible {
        outline: 2px solid #79d6f2;
        outline-offset: -2px;
      }

      .group-open {
        display: flex;
        flex: 1;
        min-height: 154px;
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

      .group-head {
        display: flex;
        align-items: start;
        justify-content: space-between;
      }

      .group-head .tile-icon {
        width: 38px;
        height: 38px;
        background: rgba(20, 52, 74, 0.91);
        color: #83cafa;
      }

      .group-arrow {
        color: white;
        filter: drop-shadow(0 1px 2px #000);
      }

      .group-name {
        display: block;
        font-size: 20px;
        font-weight: 780;
        line-height: 1.1;
        text-shadow: 0 2px 5px rgba(0, 0, 0, 0.8);
      }

      .group-subtitle {
        display: block;
        margin-top: 5px;
        font-size: 12px;
        font-weight: 650;
        text-shadow: 0 2px 5px rgba(0, 0, 0, 0.8);
      }

      .group-state {
        display: inline-flex;
        align-items: center;
        margin-top: 9px;
        padding: 5px 8px;
        border: 1px solid rgba(121, 214, 242, 0.38);
        border-radius: 9px;
        background: rgba(8, 30, 43, 0.82);
        color: #b6edfb;
        font-size: 11px;
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
        min-height: 48px;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 5px 2px;
        border: 1px solid rgba(192, 216, 235, 0.28);
        border-radius: 10px;
        background: rgba(9, 20, 30, 0.88);
        color: #f4f8fc;
        font: inherit;
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
      }

      .group-control ha-icon {
        --mdc-icon-size: 18px;
        color: #9cdef6;
      }

      .group-control:hover:not(:disabled) {
        background: rgba(24, 55, 75, 0.96);
      }

      .group-control:disabled {
        opacity: 0.45;
        cursor: default;
      }

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
        grid-template-columns: auto minmax(0, 1fr);
      }

      .cover-device-actions {
        grid-column: 1 / -1;
      }

      .cover-device-actions .action {
        min-height: 40px;
        padding: 8px 10px;
      }

      @container (max-width: 400px) {
        .group-name {
          font-size: 18px;
        }

        .group-subtitle {
          font-size: 11px;
        }
      }

      @container (max-width: 310px) {
        .groups-grid {
          grid-template-columns: 1fr;
        }

        .group-tile {
          min-height: 222px;
        }
      }

      @container (max-width: 330px) {
        .covers-header {
          flex-wrap: wrap;
        }

        .covers-total {
          margin-left: 51px;
        }
      }
    `,
  ];

  public setConfig(config: CoversCardConfig): void {
    if (!Array.isArray(config.groups) || config.groups.length === 0) {
      throw new Error("Configurez au moins un groupe de volets.");
    }
    for (const group of config.groups) {
      if (!group || typeof group.name !== "string" || !group.name.trim() || !Array.isArray(group.covers)) {
        throw new Error("Chaque groupe doit avoir un nom et une liste de volets.");
      }
      if (!group.covers.every((id) => typeof id === "string" && id.startsWith("cover."))) {
        throw new Error("Les groupes acceptent uniquement des entités cover.");
      }
    }
    this.config = { ...config, theme: config.theme || "carbon" };
  }

  static getStubConfig(): Partial<CoversCardConfig> {
    return {
      name: "Volets",
      theme: "carbon",
      groups: [
        { name: "Salon", covers: [] },
        { name: "Bureau", covers: [] },
        { name: "Chambres", covers: [] },
        { name: "Salle à manger", covers: [] },
      ],
    };
  }

  static getConfigForm(): Record<string, unknown> {
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"], mode: "dropdown" } } },
        { name: "groups", selector: { object: {} } },
        { name: "entity_labels", selector: { object: {} } },
        { name: "background_image", selector: { text: {} } },
      ],
    };
  }

  private groupStats(group: CoversGroupConfig): GroupStats {
    const ids = [...new Set(group.covers)];
    const states = ids.map((id) => entity(this.hass, id));
    return {
      total: ids.length,
      open: states.filter((state) => state?.state === "open" || state?.state === "opening").length,
      closed: states.filter((state) => state?.state === "closed").length,
      opening: states.filter((state) => state?.state === "opening").length,
      closing: states.filter((state) => state?.state === "closing").length,
      available: states.filter((state) => isAvailable(state)).length,
      moving: states.filter((state) => state?.state === "opening" || state?.state === "closing").length,
      availableIds: ids.filter((id) => isAvailable(entity(this.hass, id))),
    };
  }

  private groupStatus(stats: GroupStats): { label: string; tone: string } {
    if (!stats.available) return { label: "Indisponible", tone: "unavailable" };
    if (stats.opening && stats.closing) return { label: "En mouvement", tone: "moving" };
    if (stats.opening) return { label: "Ouverture en cours", tone: "moving" };
    if (stats.closing) return { label: "Fermeture en cours", tone: "moving" };
    if (stats.open === stats.total) return { label: stats.total === 1 ? "Ouvert" : "Tous ouverts", tone: "" };
    if (stats.closed === stats.total) return { label: stats.total === 1 ? "Fermé" : "Tous fermés", tone: "" };
    return { label: `${stats.open}/${stats.total} ouverts`, tone: "" };
  }

  private stateLabel(id: string, state?: HassEntity): string {
    if (!isAvailable(state)) return "Indisponible";
    if (state?.state === "open") return "Ouvert";
    if (state?.state === "opening") return "Ouverture en cours";
    if (state?.state === "closing") return "Fermeture en cours";
    if (state?.state === "closed") return "Fermé";
    return displayState(this.hass, id);
  }

  private renderGroup(group: CoversGroupConfig, index: number): TemplateResult {
    const stats = this.groupStats(group);
    const status = this.groupStatus(stats);
    const customImage = group.background_image?.trim() || this.config?.background_image?.trim();
    const imagePosition = group.background_position?.trim();
    const safePosition = imagePosition && /^[\w\s.%+-]+$/.test(imagePosition) ? imagePosition : "center";
    const imageClass = customImage ? "group-photo" : `group-photo mosaic quadrant-${index % 4}`;
    const name = group.name.trim();
    return html`
      <div class="group-tile">
        <img class=${imageClass} src=${customImage || defaultGroupImages} alt="" style=${customImage ? `object-position:${safePosition}` : ""} loading="lazy" />
        <button class="group-open" type="button" aria-haspopup="dialog" aria-label=${`Afficher les volets du groupe ${name}`} @click=${() => this.openDialog(`group:${index}`)}>
          <span class="group-head">
            <span class="tile-icon"><ha-icon .icon=${group.icon || "mdi:blinds-horizontal"}></ha-icon></span>
            <ha-icon class="group-arrow" icon="mdi:chevron-right"></ha-icon>
          </span>
          <span>
            <span class="group-name">${name}</span>
            <span class="group-subtitle">${stats.total} volet${stats.total === 1 ? "" : "s"} · ${stats.available}/${stats.total} disponibles</span>
            <span class=${`group-state ${status.tone}`}>${status.label}</span>
          </span>
        </button>
        <div class="group-controls" aria-label=${`Commandes du groupe ${name}`}>
          <button class="group-control" type="button" aria-label=${`Monter les volets du groupe ${name}`} ?disabled=${!stats.available} @click=${() => coverCommand(this.hass!, stats.availableIds, "open")}><ha-icon icon="mdi:arrow-up"></ha-icon>Monter</button>
          <button class="group-control" type="button" aria-label=${`Arrêter les volets du groupe ${name}`} ?disabled=${!stats.available} @click=${() => coverCommand(this.hass!, stats.availableIds, "stop")}><ha-icon icon="mdi:stop"></ha-icon>Stop</button>
          <button class="group-control" type="button" aria-label=${`Descendre les volets du groupe ${name}`} ?disabled=${!stats.available} @click=${() => coverCommand(this.hass!, stats.availableIds, "close")}><ha-icon icon="mdi:arrow-down"></ha-icon>Descendre</button>
        </div>
      </div>
    `;
  }

  protected render(): TemplateResult {
    if (!this.config || !this.hass) return html``;
    const groups = this.config.groups;
    const allIds = [...new Set(groups.flatMap((group) => group.covers))];
    const open = allIds.filter((id) => {
      const state = entity(this.hass, id)?.state;
      return state === "open" || state === "opening";
    }).length;
    const selectedIndex = this.dialog?.startsWith("group:") ? Number(this.dialog.slice(6)) : -1;
    const selectedGroup = Number.isInteger(selectedIndex) ? groups[selectedIndex] : undefined;

    return html`
      <ha-card>
        <div class="covers-shell">
          <header class="covers-header">
            <span class="tile-icon"><ha-icon .icon=${this.config.icon || "mdi:blinds-horizontal"}></ha-icon></span>
            <div class="title-wrap">
              <h2>${this.config.name || "Volets"}</h2>
              <p>${groups.length} groupe${groups.length === 1 ? "" : "s"} · ${allIds.length} volet${allIds.length === 1 ? "" : "s"}</p>
            </div>
            <span class="covers-total">${open}/${allIds.length} ouverts</span>
          </header>
          <div class="section-label">Groupes de volets</div>
          <div class="groups-grid">${groups.map((group, index) => this.renderGroup(group, index))}</div>
        </div>
      </ha-card>
      ${selectedGroup ? this.renderGroupDialog(selectedGroup) : nothing}
    `;
  }

  private renderGroupDialog(group: CoversGroupConfig): TemplateResult {
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
              <span class="muted">${stats.moving ? `${stats.moving} en mouvement` : "Commandes directes, sans position intermédiaire"}</span>
            </div>
            <div class="dialog-stat"><strong>${stats.available}/${stats.total}</strong><small>disponibles</small></div>
          </div>
          <div class="dialog-section-title">Commande groupée</div>
          <div class="group-bar">
            <button class="action" ?disabled=${!stats.available} @click=${() => coverCommand(this.hass!, stats.availableIds, "open")}><ha-icon icon="mdi:arrow-up"></ha-icon>Ouvrir</button>
            <button class="action" ?disabled=${!stats.available} @click=${() => coverCommand(this.hass!, stats.availableIds, "stop")}><ha-icon icon="mdi:stop"></ha-icon>Stop</button>
            <button class="action" ?disabled=${!stats.available} @click=${() => coverCommand(this.hass!, stats.availableIds, "close")}><ha-icon icon="mdi:arrow-down"></ha-icon>Fermer</button>
          </div>
          <div class="dialog-section-title">Volets</div>
          <div class="list">
            ${ids.length ? ids.map((id) => {
              const state = entity(this.hass, id);
              return html`
                <div class="list-row cover-device-row">
                  <span class="tile-icon"><ha-icon .icon=${state?.attributes.icon || "mdi:blinds-horizontal"}></ha-icon></span>
                  <div class="meta">
                    <span class="name">${this.config?.entity_labels?.[id] || friendlyName(state, id)}</span>
                    <span class="muted">${this.stateLabel(id, state)}</span>
                  </div>
                  <div class="cover-device-actions">
                    <button class="action" ?disabled=${!isAvailable(state)} @click=${() => coverCommand(this.hass!, [id], "open")}><ha-icon icon="mdi:arrow-up"></ha-icon>Ouvrir</button>
                    <button class="action" ?disabled=${!isAvailable(state)} @click=${() => coverCommand(this.hass!, [id], "stop")}><ha-icon icon="mdi:stop"></ha-icon>Stop</button>
                    <button class="action" ?disabled=${!isAvailable(state)} @click=${() => coverCommand(this.hass!, [id], "close")}><ha-icon icon="mdi:arrow-down"></ha-icon>Fermer</button>
                  </div>
                </div>
              `;
            }) : html`<div class="list-row">Aucun volet configuré dans ce groupe.</div>`}
          </div>
        </div>
      `,
    );
  }

  public getCardSize(): number {
    return 4 + Math.ceil((this.config?.groups.length ?? 4) / 2) * 4;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, min_columns: 3 };
  }
}
