import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type {
  ManagedProxmoxWorkload,
  ProxmoxCardConfig,
  ProxmoxStorage,
} from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { activateEntity } from "../utils/actions";
import { informationValue } from "../utils/information";
import {
  clamp,
  displayState,
  entity,
  isActive,
  isAvailable,
  numericState,
} from "../utils/entities";

type WorkloadTab = "vm" | "container";
type WorkloadFilter = "all" | "active" | "stopped" | "paused";

export type ProxmoxAvailability = "online" | "offline" | "unavailable";

export function proxmoxAvailability(state?: HassEntity): ProxmoxAvailability {
  if (!isAvailable(state)) return "unavailable";
  return isActive(state) ? "online" : "offline";
}

export function proxmoxPercentage(state?: HassEntity): number | undefined {
  if (!isAvailable(state)) return undefined;
  const unit = state?.attributes.unit_of_measurement;
  if (unit && unit !== "%") return undefined;
  const value = numericState(state, Number.NaN);
  return Number.isFinite(value) ? clamp(value) : undefined;
}

export function proxmoxActionAvailable(
  hass: HomeAssistant | undefined,
  entityId?: string,
): boolean {
  return Boolean(entityId && isAvailable(entity(hass, entityId)));
}

function percentageLabel(value: number | undefined): string {
  return value === undefined ? "—" : `${Math.round(value)}%`;
}

export class AuralisProxmoxCard extends AuralisBaseCard<ProxmoxCardConfig> {
  static styles = [
    AuralisBaseCard.styles,
    css`
      .search {
        width: 100%;
        box-sizing: border-box;
        padding: 12px 14px;
        margin-bottom: 10px;
        border: 1px solid var(--auralis-border);
        border-radius: 14px;
        outline: none;
        background: var(--auralis-layer);
        color: var(--auralis-text);
      }

      .filters {
        display: flex;
        overflow-x: auto;
        gap: 7px;
        padding-bottom: 10px;
      }

      .filters button {
        flex: 0 0 auto;
        padding: 8px 12px;
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
        font-size: 12px;
        font-weight: 720;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

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

      .service-icon.healthy { color: var(--auralis-healthy); background: color-mix(in srgb, var(--auralis-healthy) 16%, transparent); }
      .service-icon.warning { color: var(--auralis-active); }
      .service-icon.stopped, .service-icon.unavailable { color: var(--auralis-muted); background: var(--auralis-layer); }
      .service-icon.unavailable { opacity: .5; }
      .storage-bar { grid-template-columns: minmax(70px, 1fr) minmax(50px, 2fr) 38px; }
      .storage-bar > span { overflow-wrap: anywhere; }
      .storage-detail { padding: 16px 0; border-bottom: 1px solid var(--auralis-border); }
      .storage-detail .muted { margin-top: 8px; font-size: 12px; }
      .storage-detail .machine-bar, .storage-detail .machine-bar strong { color: var(--auralis-text); }
      .storage-detail .track span { background: var(--auralis-healthy); }
      .machine-panel { margin-top: auto; max-height: 285px; overflow: auto; }
      .node-information {
        display: grid;
        grid-template-columns: repeat(var(--info-columns, 3), minmax(0, 1fr));
        gap: 8px;
        margin: 10px 0 20px;
      }
      .info-tile {
        min-width: 0;
        padding: 11px 10px;
        border: 1px solid var(--auralis-border);
        border-radius: 14px;
        background: rgba(9, 14, 20, var(--machine-glass-alpha, .84));
        color: var(--auralis-text);
        backdrop-filter: blur(8px);
        overflow-wrap: anywhere;
      }
      .info-label { display: flex; align-items: center; gap: 5px; color: #a1b0c2; font-size: 10px; line-height: 1.35; }
      .info-label ha-icon { flex: 0 0 auto; --mdc-icon-size: 14px; color: var(--machine-accent); }
      .info-value { display: block; margin-top: 7px; color: #f7f9fc; font-size: 12px; line-height: 1.45; font-weight: 700; }
      .machine-rail + .node-information { margin-top: 120px; }
      @container (max-width: 310px) {
        .node-information { grid-template-columns: repeat(var(--info-mobile-columns, 2), minmax(0, 1fr)); }
      }
      .selection {
        grid-column: 1;
      }
      .selection-placeholder { width: 25px; height: 19px; }

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
        font-size: 10px;
      }

    `,
  ];

  private workloadTab: WorkloadTab = "vm";
  private workloadFilter: WorkloadFilter = "all";
  private query = "";
  private selected = new Set<string>();

  protected updated(): void {
    super.updated();
    const selectable = new Set(this.allWorkloads()
      .filter((item) => !this.itemActive(item) && !this.itemPaused(item) && isAvailable(entity(this.hass, item.entity)))
      .map((item) => item.entity));
    const next = new Set([...this.selected].filter((id) => selectable.has(id)));
    if (next.size !== this.selected.size) {
      this.selected = next;
      this.requestUpdate();
    }
  }

  public setConfig(config: ProxmoxCardConfig): void {
    if (!config.status_entity) throw new Error("status_entity est obligatoire.");
    if (config.info_items !== undefined && (!Array.isArray(config.info_items) || config.info_items.some((item) => !item || typeof item.entity !== "string" || !item.entity.trim()))) {
      throw new Error("info_items doit être une liste de tuiles avec une entity pour chacune.");
    }
    if (config.info_columns !== undefined && (!Number.isInteger(config.info_columns) || config.info_columns < 1 || config.info_columns > 4)) {
      throw new Error("info_columns doit être un entier entre 1 et 4.");
    }
    this.config = {
      ...config,
      name: config.name || "Proxmox",
      theme: config.theme || "auto",
      nodes: config.nodes || [],
      vms: config.vms || [],
      containers: config.containers || [],
    };
  }

  static getStubConfig(): Partial<ProxmoxCardConfig> {
    return {
      name: "Proxmox",
      theme: "carbon",
      status_entity: "binary_sensor.proxmox_online",
      nodes: [],
      vms: [],
      containers: [],
    };
  }

  static getConfigForm(): Record<string, unknown> {
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        {
          name: "theme",
          selector: {
            select: { options: ["auto", "halo", "carbon", "mono", "aurora"] },
          },
        },
        { name: "status_entity", required: true, selector: { entity: {} } },
        { name: "version_entity", selector: { entity: {} } },
        { name: "quorum_entity", selector: { entity: {} } },
        { name: "cpu_entity", selector: { entity: {} } },
        { name: "uptime_entity", selector: { entity: {} } },
        { name: "info_items", selector: { object: {} } },
        { name: "info_columns", selector: { number: { min: 1, max: 4, mode: "box" } } },
        { name: "temperature_entity", selector: { entity: {} } },
        { name: "network_down_entity", selector: { entity: {} } },
        { name: "network_up_entity", selector: { entity: {} } },
        { name: "storages", selector: { object: {} } },
        { name: "disks", selector: { object: {} } },
        { name: "cluster_usage_entity", selector: { entity: {} } },
        { name: "memory_entity", selector: { entity: {} } },
        { name: "memory_label_entity", selector: { entity: {} } },
        { name: "storage_entity", selector: { entity: {} } },
        { name: "storage_label_entity", selector: { entity: {} } },
        { name: "ceph_entity", selector: { entity: {} } },
        { name: "backup_entity", selector: { entity: {} } },
        { name: "alerts_entity", selector: { entity: {} } },
        { name: "backup_action_entity", selector: { entity: {} } },
        { name: "restart_entity", selector: { entity: {} } },
        { name: "shutdown_entity", selector: { entity: {} } },
        { name: "background_image", selector: { text: {} } },
        { name: "background_position", selector: { text: {} } },
        { name: "accent_color", selector: { text: {} } },
        {
          name: "image_brightness",
          selector: { number: { min: 30, max: 100, step: 1, mode: "slider" } },
        },
        {
          name: "glass_opacity",
          selector: { number: { min: 0.45, max: 0.96, step: 0.01, mode: "slider" } },
        },
      ],
      computeHelper: (schema: { name?: string }) =>
        schema.name === "backup_action_entity"
          ? "Les stockages, disques, VM et conteneurs se configurent en YAML."
          : undefined,
    };
  }

  public getCardSize(): number {
    return 12;
  }

  public getGridOptions(): Record<string, number> {
    return { rows: 11, min_rows: 10, columns: 6, min_columns: 3 };
  }

  protected render(): TemplateResult {
    if (!this.config || !this.hass) return html``;
    const availability = proxmoxAvailability(entity(this.hass, this.config.status_entity));
    const cpu = proxmoxPercentage(entity(this.hass, this.config.cpu_entity || this.config.cluster_usage_entity));
    const memory = proxmoxPercentage(entity(this.hass, this.config.memory_entity));
    const activeVms = (this.config.vms || []).some((item) => this.itemActive(item));
    const activeContainers = (this.config.containers || []).some((item) => this.itemActive(item));
    const storages = this.storageItems().filter((item) => item.show_on_card !== false);
    const statusLabel = availability === "online" ? "Nœud en ligne et disponible"
      : availability === "offline" ? "Nœud hors ligne" : "État du nœud indisponible";
    return html`
      <ha-card>
        <div class="machine-shell ${this.machineGridClass()}" style=${this.machineStyle("#50d59b")}>
          <div class="machine-content">
            <header class="machine-header"><div><h2>${this.config.name}</h2>
              <div class="machine-status"><span class="dot ${availability === "online" ? "healthy" : availability === "offline" ? "danger" : ""}"></span>${statusLabel}</div>
            </div></header>
            <div class="machine-rail">
              <button class="rail-button" @click=${() => this.openDialog("cluster")} title="Détails du nœud" aria-label="Détails du nœud"><ha-icon icon="mdi:information-outline"></ha-icon></button>
              <button class="rail-button ${activeVms ? "has-active" : ""}" @click=${() => this.openWorkloads("vm")} title="Machines virtuelles" aria-label="Machines virtuelles"><ha-icon icon="mdi:monitor-multiple"></ha-icon></button>
              <button class="rail-button ${activeContainers ? "has-active" : ""}" @click=${() => this.openWorkloads("container")} title="Conteneurs LXC" aria-label="Conteneurs LXC"><ha-icon icon="mdi:cube-outline"></ha-icon></button>
            </div>
            ${this.renderResourceGauges(cpu, memory)}
            ${this.renderInformation()}
            <section class="machine-panel">
              <div class="machine-panel-head">
                <div class="machine-panel-title"><small>Stockage</small><strong>Espaces de stockage</strong></div>
                <button class="machine-accent-action" @click=${() => this.openDialog("storage")} aria-label="Stockages et disques"><ha-icon icon="mdi:harddisk"></ha-icon>Disques</button>
              </div>
              <div class="machine-bars">${storages.map((item) => this.renderStorageBar(item))}</div>
              ${storages.length ? nothing : html`<div class="empty">Aucun stockage sélectionné.</div>`}
            </section>
          </div>
        </div>
      </ha-card>
      ${this.dialog === "cluster" ? this.renderClusterDialog() : nothing}
      ${this.dialog === "workloads" ? this.renderWorkloadsDialog() : nothing}
      ${this.dialog === "storage" ? this.renderStorageDialog() : nothing}
    `;
  }

  private renderInformation(): TemplateResult | typeof nothing {
    const items = (this.config?.info_items ?? [])
      .filter((item) => item.show !== false)
      .map((item) => ({ item, value: informationValue(this.hass, item) }))
      .filter(({ item, value }) => value !== undefined || item.hide_unavailable === false);
    if (!items.length) return nothing;
    const columns = this.config?.info_columns ?? 3;
    return html`<section class="node-information" aria-label="Informations du nœud"
      style=${`--info-columns:${columns};--info-mobile-columns:${Math.min(columns, 2)}`}>
      ${items.map(({ item, value }) => html`<div class="info-tile">
        <div class="info-label">${item.icon ? html`<ha-icon icon=${item.icon}></ha-icon>` : nothing}
          <span>${item.label ?? entity(this.hass, item.entity)?.attributes.friendly_name ?? item.entity}</span>
        </div>
        <strong class="info-value">${value ?? "Indisponible"}</strong>
      </div>`)}
    </section>`;
  }

  private storageItems(): ProxmoxStorage[] {
    if (this.config?.storages !== undefined) return this.config.storages;
    return this.config?.storage_entity ? [{
      name: "Stockage", usage_entity: this.config.storage_entity,
      capacity_entity: this.config.storage_label_entity,
    }] : [];
  }

  private renderStorageBar(item: ProxmoxStorage): TemplateResult {
    const usage = proxmoxPercentage(entity(this.hass, item.usage_entity));
    return html`<div class="machine-bar storage-bar">
      <span title=${item.name}>${item.name}</span>
      <div class="track" role="meter" aria-label=${item.name}
        aria-valuemin="0" aria-valuemax="100" aria-valuenow=${usage ?? nothing}
        aria-valuetext=${usage === undefined ? "Indisponible" : percentageLabel(usage)}>
        <span style=${`width:${usage ?? 0}%`}></span>
      </div><strong>${percentageLabel(usage)}</strong>
    </div>`;
  }

  private renderStorageDialog(): TemplateResult {
    const section = (title: string, items: ProxmoxStorage[]) => html`
      <div class="dialog-section-title">${title}</div>
      ${items.length ? items.map((item) => html`<div class="storage-detail">
        ${this.renderStorageBar(item)}
        <div class="muted">${[
          item.capacity_entity ? displayState(this.hass, item.capacity_entity) : "",
          item.status_entity ? displayState(this.hass, item.status_entity) : "",
          item.temperature_entity ? displayState(this.hass, item.temperature_entity) : "",
        ].filter(Boolean).join(" · ")}</div>
      </div>`) : html`<div class="empty">Aucun élément configuré.</div>`}`;
    return this.renderDialog("Stockages et disques", "mdi:harddisk", html`
      <div class="dialog-body">
        ${section("Espaces de stockage", this.storageItems())}
        ${section("Disques physiques", this.config?.disks || [])}
      </div>`);
  }

  private itemActive(item: ManagedProxmoxWorkload): boolean {
    return isActive(entity(this.hass, item.entity));
  }

  private itemPaused(item: ManagedProxmoxWorkload): boolean {
    const state = entity(this.hass, item.entity)?.state.toLowerCase();
    return state === "paused" || state === "suspended";
  }

  private openWorkloads(tab: WorkloadTab): void {
    this.workloadTab = tab;
    this.workloadFilter = "all";
    this.query = "";
    this.selected = new Set();
    this.openDialog("workloads");
  }

  private allWorkloads(): ManagedProxmoxWorkload[] {
    return this.workloadTab === "vm"
      ? this.config?.vms || []
      : this.config?.containers || [];
  }

  private workloadItems(): ManagedProxmoxWorkload[] {
    const query = this.query.trim().toLocaleLowerCase("fr");
    return this.allWorkloads().filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLocaleLowerCase("fr").includes(query) ||
        item.group?.toLocaleLowerCase("fr").includes(query) ||
        item.node?.toLocaleLowerCase("fr").includes(query);
      const active = this.itemActive(item);
      const paused = this.itemPaused(item);
      const matchesFilter =
        this.workloadFilter === "all" ||
        (this.workloadFilter === "active" && active) ||
        (this.workloadFilter === "paused" && paused) ||
        (this.workloadFilter === "stopped" && !active && !paused);
      return matchesQuery && matchesFilter;
    });
  }

  private groupedItems(): Map<string, ManagedProxmoxWorkload[]> {
    const groups = new Map<string, ManagedProxmoxWorkload[]>();
    for (const item of this.workloadItems()) {
      const group = item.group || item.node || (this.workloadTab === "vm" ? "Machines virtuelles" : "Conteneurs LXC");
      groups.set(group, [...(groups.get(group) || []), item]);
    }
    return groups;
  }

  private renderWorkloadsDialog(): TemplateResult {
    const all = this.allWorkloads();
    const active = all.filter((item) => this.itemActive(item)).length;
    const paused = all.filter((item) => this.itemPaused(item)).length;
    const stopped = all.filter((item) => !this.itemActive(item) && !this.itemPaused(item)).length;

    return this.renderDialog(
      this.workloadTab === "vm" ? "Machines virtuelles" : "Conteneurs LXC",
      this.workloadTab === "vm" ? "mdi:layers-triple-outline" : "mdi:cube-outline",
      html`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">${this.workloadTab === "vm" ? "Machines virtuelles" : "Conteneurs LXC"}</span><strong>${active} actif${active > 1 ? "s" : ""} sur ${all.length}</strong><span class="muted">Filtrer, démarrer et ouvrir les consoles depuis le dashboard</span></div>
            <div class="dialog-stat"><strong>${stopped}</strong><small>arrêté${stopped > 1 ? "s" : ""}</small></div>
          </div>
          <input class="search" placeholder=${this.workloadTab === "vm" ? "Rechercher une VM" : "Rechercher un conteneur"} .value=${this.query} @input=${(event: Event) => { this.query = (event.target as HTMLInputElement).value; this.requestUpdate(); }} />
          <div class="filters">
            ${this.filterButton("all", `Tous · ${all.length}`)}
            ${this.filterButton("active", `Actifs · ${active}`)}
            ${this.filterButton("stopped", `Arrêtés · ${stopped}`)}
            ${this.filterButton("paused", `Suspendus · ${paused}`)}
          </div>
          ${this.workloadItems().length
            ? Array.from(this.groupedItems()).map(
                ([group, items]) => html`<div class="section-label">${group}</div><div class="list">${items.map((item) => this.renderWorkloadRow(item))}</div>`,
              )
            : html`<div class="empty">Aucune charge ne correspond à ce filtre.</div>`}
        </div>
        <div class="sticky-actions">
          <strong>${this.selected.size} sélectionné${this.selected.size > 1 ? "s" : ""}</strong>
          <div style="display:flex;gap:8px;"><button class="action" @click=${() => { this.selected = new Set(); this.requestUpdate(); }}>Annuler</button><button class="action primary" ?disabled=${!this.selected.size} @click=${this.startSelected}><ha-icon icon="mdi:play"></ha-icon>Démarrer (${this.selected.size})</button></div>
        </div>
      `,
    );
  }

  private filterButton(filter: WorkloadFilter, label: string): TemplateResult {
    return html`<button class=${this.workloadFilter === filter ? "active" : ""} @click=${() => { this.workloadFilter = filter; this.requestUpdate(); }}>${label}</button>`;
  }

  private renderWorkloadRow(item: ManagedProxmoxWorkload): TemplateResult {
    const active = this.itemActive(item);
    const paused = this.itemPaused(item);
    const startAvailable = isAvailable(entity(this.hass, item.entity)) && proxmoxActionAvailable(this.hass, item.start_entity || (item.entity.startsWith("switch.") ? item.entity : undefined));
    const available = isAvailable(entity(this.hass, item.entity));
    const stateClass = !available ? "unavailable" : active ? "healthy" : paused ? "warning" : "stopped";
    const stateLabel = !available ? "Indisponible" : active ? "Actif" : paused ? "Suspendu" : "Arrêté";
    return html`
      <div class="list-row">
        ${active
          ? html`<span class="selection selection-placeholder" aria-hidden="true"></span>`
          : html`<input class="selection" type="checkbox" aria-label=${`Sélectionner ${item.name}`} .checked=${this.selected.has(item.entity)} ?disabled=${paused || !startAvailable} @change=${() => this.toggleSelected(item.entity)} />`}
        <div class="service-main">
          <span class="service-icon ${stateClass}"><ha-icon .icon=${item.icon || (this.workloadTab === "vm" ? "mdi:monitor" : "mdi:cube-outline")}></ha-icon></span>
          <div class="meta">
            <div class="name">${item.name}</div>
            <div class="state"><span class="dot ${stateClass}" style="display:inline-block;margin-right:5px;"></span>${stateLabel}${item.node ? ` · ${item.node}` : ""}${item.cpu_entity ? ` · CPU ${displayState(this.hass, item.cpu_entity)}` : ""}</div>
            <div class="resource-tags">${item.vcpus ? html`<span>${item.vcpus} vCPU</span>` : nothing}${item.memory ? html`<span>${item.memory}</span>` : nothing}${item.storage ? html`<span>${item.storage}</span>` : nothing}${item.ip_entity ? html`<span>${displayState(this.hass, item.ip_entity)}</span>` : nothing}</div>
          </div>
        </div>
        ${this.renderWorkloadAction(item, active, paused)}
      </div>
    `;
  }

  private renderWorkloadAction(item: ManagedProxmoxWorkload, active: boolean, paused: boolean): TemplateResult {
    if (!isAvailable(entity(this.hass, item.entity))) return html`<span class="muted">Indisponible</span>`;
    if (paused) return html`<button class="action primary" ?disabled=${!proxmoxActionAvailable(this.hass, item.resume_entity)} @click=${() => activateEntity(this.hass!, item.resume_entity)}><ha-icon icon="mdi:play"></ha-icon>Reprendre</button>`;
    if (!active) return html`<button class="action primary" ?disabled=${!proxmoxActionAvailable(this.hass, item.start_entity || (item.entity.startsWith("switch.") ? item.entity : undefined))} @click=${() => this.startItem(item)}><ha-icon icon="mdi:play"></ha-icon>Démarrer</button>`;
    if (item.console_url) return html`<button class="action" @click=${() => window.open(item.console_url, "_blank", "noopener,noreferrer")}><ha-icon icon="mdi:console"></ha-icon>Console</button>`;
    return html`<button class="action" ?disabled=${!proxmoxActionAvailable(this.hass, item.restart_entity)} @click=${() => activateEntity(this.hass!, item.restart_entity)}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer</button>`;
  }

  private toggleSelected(entityId: string): void {
    const next = new Set(this.selected);
    next.has(entityId) ? next.delete(entityId) : next.add(entityId);
    this.selected = next;
    this.requestUpdate();
  }

  private async startItem(item: ManagedProxmoxWorkload): Promise<void> {
    if (!isAvailable(entity(this.hass, item.entity)) || this.itemActive(item) || this.itemPaused(item)) return;
    const entityId = item.start_entity || (item.entity.startsWith("switch.") ? item.entity : undefined);
    if (!proxmoxActionAvailable(this.hass, entityId)) return;
    await activateEntity(this.hass!, entityId);
  }

  private startSelected = async (): Promise<void> => {
    const all = this.allWorkloads();
    await Promise.all(
      all.filter((item) => this.selected.has(item.entity) && !this.itemActive(item) && !this.itemPaused(item)).map((item) => this.startItem(item)),
    );
    this.selected = new Set();
    this.requestUpdate();
  };

  private confirmClusterAction(action: "restart" | "shutdown"): void {
    const restart = action === "restart";
    const entityId = restart ? this.config?.restart_entity : this.config?.shutdown_entity;
    if (
      proxmoxAvailability(entity(this.hass, this.config?.status_entity)) !== "online" ||
      !proxmoxActionAvailable(this.hass, entityId)
    ) return;
    this.askConfirmation({
      title: `${restart ? "Redémarrer" : "Arrêter"} ${this.config?.name || "le nœud"} ?`,
      message: "Cette action peut interrompre plusieurs machines virtuelles et services. Vérifiez les migrations avant de continuer.",
      confirmLabel: restart ? "Redémarrer" : "Arrêter",
      action: () => activateEntity(this.hass!, entityId),
    });
    this.dialog = "cluster";
  }

  private renderClusterDialog(): TemplateResult {
    const config = this.config!;
    const availability = proxmoxAvailability(entity(this.hass, config.status_entity));
    const online = availability === "online";
    const metrics = [
      ["CPU", config.cpu_entity || config.cluster_usage_entity, "mdi:cpu-64-bit"],
      ["RAM", config.memory_label_entity || config.memory_entity, "mdi:memory"],
      ["Durée de fonctionnement", config.uptime_entity, "mdi:clock-outline"],
      ["Température", config.temperature_entity, "mdi:thermometer"],
      ["Réception réseau", config.network_down_entity, "mdi:download-network"],
      ["Émission réseau", config.network_up_entity, "mdi:upload-network"],
      ["Version", config.version_entity, "mdi:server"],
      ["Quorum", config.quorum_entity, "mdi:lan"],
      ["Ceph", config.ceph_entity, "mdi:database-check-outline"],
      ["Dernière sauvegarde", config.backup_entity, "mdi:calendar-clock"],
      ["Alertes", config.alerts_entity, "mdi:alert-circle-outline"],
    ].filter(([, id]) => isAvailable(entity(this.hass, id)));
    return this.renderDialog(config.name || "Détails du nœud", "mdi:information-outline", html`
      <div class="dialog-body">
        <div class="dialog-overview"><div><span class="eyebrow">État du nœud</span>
          <strong>${online ? "En ligne et disponible" : availability === "offline" ? "Hors ligne" : "État indisponible"}</strong>
        </div></div>
        <div class="grid two">${metrics.map(([label, id, icon]) => html`<div class="tile">
          <div class="tile-head"><span class="tile-icon"><ha-icon .icon=${icon}></ha-icon></span><strong>${displayState(this.hass, id)}</strong></div>
          <div style="margin-top:10px">${label}</div>
        </div>`)}</div>
        ${config.backup_action_entity ? html`<div class="dialog-section"><button class="action"
          ?disabled=${!online || !proxmoxActionAvailable(this.hass, config.backup_action_entity)}
          @click=${() => activateEntity(this.hass!, config.backup_action_entity)}>
          <ha-icon icon="mdi:backup-restore"></ha-icon>Lancer la sauvegarde</button></div>` : nothing}
        ${config.restart_entity || config.shutdown_entity ? html`
          <div class="dialog-danger-zone"><div class="dialog-section-title">Actions du nœud</div><div class="actions">
            ${config.restart_entity ? html`<button class="action danger" ?disabled=${!online || !proxmoxActionAvailable(this.hass, config.restart_entity)} @click=${() => this.confirmClusterAction("restart")}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer</button>` : nothing}
            ${config.shutdown_entity ? html`<button class="action danger" ?disabled=${!online || !proxmoxActionAvailable(this.hass, config.shutdown_entity)} @click=${() => this.confirmClusterAction("shutdown")}><ha-icon icon="mdi:power"></ha-icon>Arrêter</button>` : nothing}
          </div></div>` : nothing}
      </div>`);
  }
}
