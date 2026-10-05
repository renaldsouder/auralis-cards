import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type {
  ManagedProxmoxWorkload,
  ProxmoxCardConfig,
  ProxmoxNode,
} from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { activateEntity } from "../utils/actions";
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

function workloadRatio(active: number, total: number): number | undefined {
  return total ? clamp((active / total) * 100) : undefined;
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

      .selection {
        grid-column: 1;
      }

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

      .machine-gauge.metric-unavailable {
        --value: 0;
      }

      .machine-gauge.metric-unavailable .machine-gauge-content strong,
      .machine-bar.metric-unavailable strong {
        color: #8e9baa;
      }

      .machine-bar.metric-unavailable .track span {
        width: 0 !important;
        background: transparent;
      }

      .machine-bar.cluster-bar {
        grid-template-columns: 48px minmax(0, 1fr) minmax(42px, auto);
      }

      .cluster-signals {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
        margin-top: 16px;
      }

      .cluster-signals.with-alerts {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .cluster-signal {
        min-width: 0;
        padding: 8px 9px;
        border: 1px solid rgba(195, 211, 229, 0.12);
        border-radius: 11px;
        background: rgba(255, 255, 255, 0.035);
      }

      .cluster-signal small,
      .cluster-signal strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cluster-signal small {
        color: #8f9daf;
        font-size: 8px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .cluster-signal strong {
        margin-top: 5px;
        color: #f4f7fb;
        font-size: 9px;
      }

      .cluster-signal.warning strong {
        color: var(--auralis-active);
      }

      .node-list {
        display: grid;
        gap: 8px;
      }

      .node-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid var(--auralis-border);
        border-radius: 16px;
        background: var(--auralis-layer);
      }

      .node-actions {
        display: flex;
        gap: 7px;
      }

      .node-actions .icon-button {
        width: 36px;
        height: 36px;
      }

      @media (max-width: 480px) {
        .node-row {
          grid-template-columns: auto minmax(0, 1fr);
        }

        .node-actions {
          grid-column: 2;
        }
      }
    `,
  ];

  private workloadTab: WorkloadTab = "vm";
  private workloadFilter: WorkloadFilter = "all";
  private query = "";
  private selected = new Set<string>();

  public setConfig(config: ProxmoxCardConfig): void {
    if (!config.status_entity) throw new Error("status_entity est obligatoire.");
    this.config = {
      ...config,
      name: config.name || "Cluster Proxmox",
      theme: config.theme || "auto",
      nodes: config.nodes || [],
      vms: config.vms || [],
      containers: config.containers || [],
    };
  }

  static getStubConfig(): Partial<ProxmoxCardConfig> {
    return {
      name: "Cluster Proxmox",
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
          ? "Les nœuds, VM et conteneurs se configurent en YAML."
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

    const status = entity(this.hass, this.config.status_entity);
    const availability = proxmoxAvailability(status);
    const online = availability === "online";
    const usage = proxmoxPercentage(entity(this.hass, this.config.cluster_usage_entity));
    const memory = proxmoxPercentage(entity(this.hass, this.config.memory_entity));
    const storage = proxmoxPercentage(entity(this.hass, this.config.storage_entity));
    const onlineNodes = (this.config.nodes || []).filter((node) => this.nodeActive(node)).length;
    const totalNodes = this.config.nodes?.length || 0;
    const activeVms = (this.config.vms || []).filter((item) => this.itemActive(item)).length;
    const totalVms = this.config.vms?.length || 0;
    const activeContainers = (this.config.containers || []).filter((item) =>
      this.itemActive(item),
    ).length;
    const totalContainers = this.config.containers?.length || 0;
    const vmRatio = workloadRatio(activeVms, totalVms);
    const containerRatio = workloadRatio(activeContainers, totalContainers);
    const quorum = this.config.quorum_entity
      ? displayState(this.hass, this.config.quorum_entity)
      : `${onlineNodes} / ${totalNodes || "—"}`;
    const nodeNames = (this.config.nodes || []).map((node) => node.name).join(" · ") || "Aucun nœud configuré";
    const memoryLabel = this.config.memory_label_entity
      ? displayState(this.hass, this.config.memory_label_entity)
      : percentageLabel(memory);
    const storageLabel = this.config.storage_label_entity
      ? displayState(this.hass, this.config.storage_label_entity)
      : percentageLabel(storage);
    const alertState = entity(this.hass, this.config.alerts_entity);
    const alertCount = isAvailable(alertState)
      ? numericState(alertState, Number.NaN)
      : undefined;
    const alertLabel = alertCount === 0
      ? "Aucune"
      : Number.isFinite(alertCount)
        ? `${Math.round(alertCount!)} active${alertCount === 1 ? "" : "s"}`
        : displayState(this.hass, this.config.alerts_entity);
    const nodeSummary = !totalNodes
      ? "Aucun nœud configuré"
      : onlineNodes === totalNodes
        ? totalNodes === 1
          ? "Le nœud est disponible"
          : `Les ${totalNodes} nœuds sont disponibles`
        : `${onlineNodes}/${totalNodes} nœuds disponibles`;
    const statusLabel = availability === "online"
      ? `Proxmox · quorum ${quorum}`
      : availability === "offline"
        ? "Proxmox · cluster hors ligne"
        : "État du cluster indisponible";
    const statusClass = availability === "online" ? "healthy" : availability === "offline" ? "danger" : "";
    const backupAvailable = online && proxmoxActionAvailable(this.hass, this.config.backup_action_entity);

    return html`
      <ha-card>
        <div class="machine-shell ${this.machineGridClass()}" style=${this.machineStyle("#50d59b")}>
          <div class="machine-content">
            <header class="machine-header">
              <div>
                <h2>${this.config.name}</h2>
                <div class="machine-status">
                  <span class="dot ${statusClass}"></span>
                  ${statusLabel}
                </div>
              </div>
            </header>
            <div class="machine-stat-stack">
              <div class="machine-mini-stat"><small>Charge</small><strong>${percentageLabel(usage)}</strong></div>
              <div class="machine-mini-stat"><small>Mémoire</small><strong>${memoryLabel}</strong></div>
            </div>
            <div class="machine-rail">
              <button class="rail-button" @click=${() => this.openDialog("cluster")} aria-label="Détails du cluster"><ha-icon icon="mdi:lan"></ha-icon></button>
              <button class="rail-button" @click=${() => this.openWorkloads("vm")} aria-label="Machines virtuelles"><ha-icon icon="mdi:layers-triple-outline"></ha-icon></button>
              <button class="rail-button" @click=${() => this.openWorkloads("container")} aria-label="Conteneurs LXC"><ha-icon icon="mdi:cube-outline"></ha-icon></button>
              <button class="rail-button" ?disabled=${!backupAvailable} @click=${() => activateEntity(this.hass!, this.config?.backup_action_entity)} aria-label="Lancer la sauvegarde"><ha-icon icon="mdi:backup-restore"></ha-icon></button>
            </div>
            <div class="machine-gauge ${usage === undefined ? "metric-unavailable" : ""}" style=${`--value:${usage ?? 0}`}>
              <div class="machine-gauge-content"><strong>${percentageLabel(usage)}</strong><small>Cluster</small></div>
            </div>
            <div class="machine-context"><small>Nœuds</small><strong>${nodeNames}</strong></div>
            <section class="machine-panel">
              <div class="machine-panel-head">
                <div class="machine-panel-title"><small>Cluster</small><strong>${nodeSummary}</strong></div>
                <button class="machine-accent-action" @click=${() => this.openDialog("cluster")}><ha-icon icon="mdi:source-branch"></ha-icon>Cluster</button>
              </div>
              <div class="machine-bars">
                <div class="machine-bar cluster-bar ${vmRatio === undefined ? "metric-unavailable" : ""}"><span>VM</span><div class="track"><span style=${`width:${vmRatio ?? 0}%`}></span></div><strong>${activeVms}/${totalVms || "—"}</strong></div>
                <div class="machine-bar cluster-bar ${containerRatio === undefined ? "metric-unavailable" : ""}"><span>LXC</span><div class="track"><span style=${`width:${containerRatio ?? 0}%`}></span></div><strong>${activeContainers}/${totalContainers || "—"}</strong></div>
                <div class="machine-bar cluster-bar ${storage === undefined ? "metric-unavailable" : ""}"><span>Stockage</span><div class="track"><span style=${`width:${storage ?? 0}%`}></span></div><strong title=${storageLabel}>${storageLabel}</strong></div>
              </div>
              <div class="cluster-signals ${this.config.alerts_entity ? "with-alerts" : ""}">
                <span class="cluster-signal"><small>Ceph</small><strong title=${displayState(this.hass, this.config.ceph_entity)}>${displayState(this.hass, this.config.ceph_entity)}</strong></span>
                <span class="cluster-signal"><small>Backup</small><strong title=${displayState(this.hass, this.config.backup_entity)}>${displayState(this.hass, this.config.backup_entity)}</strong></span>
                ${this.config.alerts_entity
                  ? html`<span class="cluster-signal ${typeof alertCount === "number" && alertCount > 0 ? "warning" : ""}"><small>Alertes</small><strong title=${alertLabel}>${alertLabel}</strong></span>`
                  : nothing}
              </div>
            </section>
          </div>
        </div>
      </ha-card>
      ${this.dialog === "cluster" ? this.renderClusterDialog() : nothing}
      ${this.dialog === "workloads" ? this.renderWorkloadsDialog() : nothing}
    `;
  }

  private nodeActive(node: ProxmoxNode): boolean {
    return isActive(entity(this.hass, node.status_entity));
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
      "Charges virtuelles",
      this.workloadTab === "vm" ? "mdi:layers-triple-outline" : "mdi:cube-outline",
      html`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">${this.workloadTab === "vm" ? "Machines virtuelles" : "Conteneurs LXC"}</span><strong>${active} actif${active > 1 ? "s" : ""} sur ${all.length}</strong><span class="muted">Filtrer, démarrer et ouvrir les consoles depuis le dashboard</span></div>
            <div class="dialog-stat"><strong>${stopped}</strong><small>arrêté${stopped > 1 ? "s" : ""}</small></div>
          </div>
          <div class="tabs">
            <button class=${this.workloadTab === "vm" ? "active" : ""} @click=${() => this.changeTab("vm")}>VM · ${this.config?.vms?.length || 0}</button>
            <button class=${this.workloadTab === "container" ? "active" : ""} @click=${() => this.changeTab("container")}>LXC · ${this.config?.containers?.length || 0}</button>
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

  private changeTab(tab: WorkloadTab): void {
    this.workloadTab = tab;
    this.workloadFilter = "all";
    this.selected = new Set();
    this.requestUpdate();
  }

  private renderWorkloadRow(item: ManagedProxmoxWorkload): TemplateResult {
    const active = this.itemActive(item);
    const paused = this.itemPaused(item);
    const startAvailable = proxmoxActionAvailable(this.hass, item.start_entity || item.entity);
    const stateClass = active ? "healthy" : paused ? "warning" : "danger";
    const stateLabel = active ? "Actif" : paused ? "Suspendu" : "Arrêté";
    return html`
      <div class="list-row">
        <input class="selection" type="checkbox" .checked=${this.selected.has(item.entity)} ?disabled=${active || paused || !startAvailable} @change=${() => this.toggleSelected(item.entity)} />
        <div class="service-main">
          <span class="service-icon"><ha-icon .icon=${item.icon || (this.workloadTab === "vm" ? "mdi:monitor" : "mdi:cube-outline")}></ha-icon></span>
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
    if (paused) return html`<button class="action primary" ?disabled=${!proxmoxActionAvailable(this.hass, item.resume_entity)} @click=${() => activateEntity(this.hass!, item.resume_entity)}><ha-icon icon="mdi:play"></ha-icon>Reprendre</button>`;
    if (!active) return html`<button class="action primary" ?disabled=${!proxmoxActionAvailable(this.hass, item.start_entity || item.entity)} @click=${() => this.startItem(item)}><ha-icon icon="mdi:play"></ha-icon>Démarrer</button>`;
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
    const entityId = item.start_entity || item.entity;
    if (!proxmoxActionAvailable(this.hass, entityId)) return;
    await activateEntity(this.hass!, entityId);
  }

  private startSelected = async (): Promise<void> => {
    const all = [...(this.config?.vms || []), ...(this.config?.containers || [])];
    await Promise.all(
      all.filter((item) => this.selected.has(item.entity)).map((item) => this.startItem(item)),
    );
    this.selected = new Set();
    this.requestUpdate();
  };

  private confirmNodeAction(node: ProxmoxNode, action: "restart" | "shutdown"): void {
    const restart = action === "restart";
    const entityId = restart ? node.restart_entity : node.shutdown_entity;
    if (!this.nodeActive(node) || !proxmoxActionAvailable(this.hass, entityId)) return;
    this.askConfirmation({
      title: `${restart ? "Redémarrer" : "Arrêter"} ${node.name} ?`,
      message: restart
        ? "Les charges hébergées sur ce nœud pourront être interrompues pendant le redémarrage."
        : "Le nœud et les charges qui n’ont pas été migrées deviendront indisponibles.",
      confirmLabel: restart ? "Redémarrer" : "Arrêter",
      action: () => activateEntity(this.hass!, entityId),
    });
    this.dialog = "cluster";
  }

  private confirmClusterAction(action: "restart" | "shutdown"): void {
    const restart = action === "restart";
    const entityId = restart ? this.config?.restart_entity : this.config?.shutdown_entity;
    if (
      proxmoxAvailability(entity(this.hass, this.config?.status_entity)) !== "online" ||
      !proxmoxActionAvailable(this.hass, entityId)
    ) return;
    this.askConfirmation({
      title: `${restart ? "Redémarrer" : "Arrêter"} le cluster ?`,
      message: "Cette action peut interrompre plusieurs machines virtuelles et services. Vérifiez les migrations avant de continuer.",
      confirmLabel: restart ? "Redémarrer" : "Arrêter",
      action: () => activateEntity(this.hass!, entityId),
    });
    this.dialog = "cluster";
  }

  private renderClusterDialog(): TemplateResult {
    const onlineNodes = (this.config?.nodes || []).filter((node) => this.nodeActive(node)).length;
    const totalNodes = this.config?.nodes?.length || 0;
    const usage = proxmoxPercentage(entity(this.hass, this.config?.cluster_usage_entity));
    const availability = proxmoxAvailability(entity(this.hass, this.config?.status_entity));
    const online = availability === "online";
    const backupAvailable = online && proxmoxActionAvailable(this.hass, this.config?.backup_action_entity);
    const restartAvailable = online && proxmoxActionAvailable(this.hass, this.config?.restart_entity);
    const shutdownAvailable = online && proxmoxActionAvailable(this.hass, this.config?.shutdown_entity);
    const alertState = entity(this.hass, this.config?.alerts_entity);
    const alertCount = isAvailable(alertState) ? numericState(alertState, Number.NaN) : undefined;
    const alertLabel = alertCount === 0
      ? "Aucune"
      : Number.isFinite(alertCount)
        ? `${Math.round(alertCount!)} active${alertCount === 1 ? "" : "s"}`
        : displayState(this.hass, this.config?.alerts_entity);

    return this.renderDialog(
      this.config?.name || "Cluster Proxmox",
      "mdi:server-network",
      html`
        <div class="dialog-body">
          <div class="dialog-overview"><div><span class="eyebrow">État du cluster</span><strong>${online ? `${onlineNodes}/${totalNodes || "—"} nœuds disponibles` : availability === "offline" ? "Cluster hors ligne" : "État indisponible"}</strong><span class="muted">${this.config?.version_entity ? `Version ${displayState(this.hass, this.config.version_entity)}` : "Quorum, ressources et sauvegardes"}</span></div><div class="dialog-stat"><strong>${percentageLabel(usage)}</strong><small>charge</small></div></div>
          <div class="dialog-section-title">Nœuds</div>
          <div class="node-list">
            ${(this.config?.nodes || []).map((node) => {
              const nodeAvailability = proxmoxAvailability(entity(this.hass, node.status_entity));
              const active = nodeAvailability === "online";
              const nodeStatusClass = active ? "healthy" : nodeAvailability === "offline" ? "danger" : "";
              const nodeStatusLabel = active ? "En ligne" : nodeAvailability === "offline" ? "Hors ligne" : "État indisponible";
              const restartNodeAvailable = active && proxmoxActionAvailable(this.hass, node.restart_entity);
              const shutdownNodeAvailable = active && proxmoxActionAvailable(this.hass, node.shutdown_entity);
              return html`
                <div class="node-row">
                  <span class="tile-icon"><ha-icon .icon=${node.icon || "mdi:server"}></ha-icon></span>
                  <div class="meta"><div class="name">${node.name}</div><div class="state"><span class="dot ${nodeStatusClass}" style="display:inline-block;margin-right:5px;"></span>${nodeStatusLabel}${node.cpu_entity ? ` · CPU ${displayState(this.hass, node.cpu_entity)}` : ""}${node.memory_entity ? ` · RAM ${displayState(this.hass, node.memory_entity)}` : ""}${node.temperature_entity ? ` · ${displayState(this.hass, node.temperature_entity)}` : ""}</div></div>
                  <div class="node-actions"><button class="icon-button" ?disabled=${!restartNodeAvailable} @click=${() => this.confirmNodeAction(node, "restart")} aria-label=${`Redémarrer ${node.name}`}><ha-icon icon="mdi:restart"></ha-icon></button><button class="icon-button" ?disabled=${!shutdownNodeAvailable} @click=${() => this.confirmNodeAction(node, "shutdown")} aria-label=${`Arrêter ${node.name}`}><ha-icon icon="mdi:power"></ha-icon></button></div>
                </div>
              `;
            })}
            ${totalNodes ? nothing : html`<div class="empty">Ajoutez les nœuds dans la configuration YAML.</div>`}
          </div>
          <div class="dialog-section"><div class="dialog-section-title">Services du cluster</div><div class="actions"><button class="action" @click=${() => this.openWorkloads("vm")}><ha-icon icon="mdi:layers-triple-outline"></ha-icon>VM · ${this.config?.vms?.length || 0}</button><button class="action" @click=${() => this.openWorkloads("container")}><ha-icon icon="mdi:cube-outline"></ha-icon>LXC · ${this.config?.containers?.length || 0}</button><button class="action primary" ?disabled=${!backupAvailable} @click=${() => activateEntity(this.hass!, this.config?.backup_action_entity)}><ha-icon icon="mdi:backup-restore"></ha-icon>Lancer le backup</button></div></div>
          <div class="grid two" style="margin-top:18px;">
            <div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:harddisk"></ha-icon></span><strong>${this.config?.storage_label_entity ? displayState(this.hass, this.config.storage_label_entity) : percentageLabel(proxmoxPercentage(entity(this.hass, this.config?.storage_entity)))}</strong></div><div style="margin-top:10px;">Stockage</div></div>
            <div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:database-check-outline"></ha-icon></span><strong>${displayState(this.hass, this.config?.ceph_entity)}</strong></div><div style="margin-top:10px;">Ceph</div></div>
            <div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:calendar-clock"></ha-icon></span><strong>${displayState(this.hass, this.config?.backup_entity)}</strong></div><div style="margin-top:10px;">Sauvegarde</div></div>
            ${this.config?.alerts_entity ? html`<div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon icon="mdi:alert-circle-outline"></ha-icon></span><strong>${alertLabel}</strong></div><div style="margin-top:10px;">Alertes</div></div>` : nothing}
          </div>
          <div class="dialog-danger-zone"><div class="dialog-section-title">Zone sensible</div><div class="actions"><button class="action danger" ?disabled=${!restartAvailable} @click=${() => this.confirmClusterAction("restart")}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer</button><button class="action danger" ?disabled=${!shutdownAvailable} @click=${() => this.confirmClusterAction("shutdown")}><ha-icon icon="mdi:power"></ha-icon>Arrêter</button></div></div>
        </div>
      `,
    );
  }
}
