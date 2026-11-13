import { css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type {
  ManagedProxmoxWorkload,
  ProxmoxCardConfig,
  ProxmoxNode,
  ProxmoxStorage,
} from "../types/config";
import { activateEntity } from "../utils/actions";
import { informationValue } from "../utils/information";
import { displayState, entity } from "../utils/entities";
import { severityClass, type Severity } from "../utils/severity";
import {
  bulkAction,
  bulkStopConfirmation,
  commandAvailable,
  filterWorkloads,
  formLabels,
  groupWorkloads,
  hostConfirmation,
  machineAvailability,
  machineNumber,
  machinePercentage,
  machineStatusDot,
  machineStatusLabel,
  machineStyles,
  metricSeverity,
  metricTile,
  percentageLabel,
  pruneSelection,
  selectionBar,
  sendWorkloadCommand,
  storageBar,
  workloadActionEntity,
  workloadConfirmation,
  workloadCounts,
  workloadRow,
  workloadState,
  workloadToolbar,
  type WorkloadAction,
  type WorkloadFilter,
  type WorkloadState,
} from "../utils/machines";

type WorkloadTab = "vm" | "container";

const FORM_LABELS: Record<string, string> = {
  status_entity: "Nœud en ligne (entité d’état)",
  quorum_entity: "Quorum",
  cpu_entity: "Charge CPU du nœud (%)",
  info_items: "Tuiles d’information",
  info_columns: "Colonnes des tuiles d’information",
  temperature_entity: "Température",
  storages: "Espaces de stockage",
  disks: "Disques physiques",
  cluster_usage_entity: "Charge du cluster (%, ancien champ)",
  memory_label_entity: "Mémoire (texte affiché)",
  storage_entity: "Stockage utilisé (%, ancien champ)",
  storage_label_entity: "Capacité du stockage (texte)",
  ceph_entity: "État Ceph",
  backup_entity: "Dernière sauvegarde",
  alerts_entity: "Alertes",
  backup_action_entity: "Commande de sauvegarde",
  restart_entity: "Commande de redémarrage du nœud",
  shutdown_entity: "Commande d’arrêt du nœud",
};

export class AuralisProxmoxCard extends AuralisBaseCard<ProxmoxCardConfig> {
  static styles = [
    AuralisBaseCard.styles,
    machineStyles,
    css`
      .storage-bar { grid-template-columns: minmax(70px, 1fr) minmax(50px, 2fr) 38px; }
      .storage-bar > span { overflow-wrap: anywhere; }
      .storage-detail { padding: 16px 0; border-bottom: 1px solid var(--auralis-border); }
      .storage-detail .muted { margin-top: 8px; font-size: var(--auralis-text-sm); }
      .storage-detail .machine-bar, .storage-detail .machine-bar strong { color: var(--auralis-text); }
      .storage-detail .machine-bar .track span { background: var(--sev-color, var(--auralis-healthy)); }
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
      .info-label { display: flex; align-items: center; gap: 5px; color: #a1b0c2; font-size: var(--auralis-text-xs); line-height: 1.35; }
      .info-label ha-icon { flex: 0 0 auto; --mdc-icon-size: 14px; color: var(--machine-accent); }
      .info-value { display: block; margin-top: 7px; color: #f7f9fc; font-size: 12px; line-height: 1.45; font-weight: 700; }
      .machine-rail + .node-information { margin-top: 120px; }
      @container (max-width: 310px) {
        .node-information { grid-template-columns: repeat(var(--info-mobile-columns, 2), minmax(0, 1fr)); }
      }

      .node-list { display: grid; gap: 8px; }
      .node-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border: 1px solid var(--auralis-border);
        border-radius: 16px;
        background: var(--auralis-layer);
      }
      .node-row .tile-icon { width: 34px; height: 34px; border-radius: 11px; }
      .node-row .tile-icon ha-icon { --mdc-icon-size: 18px; }
      .node-main { min-width: 0; }
      .node-main strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .node-state { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; margin-top: 3px; color: var(--auralis-muted); font-size: var(--auralis-text-xs); }
      .node-state .dot { display: inline-block; margin-right: 5px; }
      .node-actions { display: flex; gap: 6px; }
      .node-actions .icon-button { color: var(--auralis-danger); }
    `,
  ];

  private workloadTab: WorkloadTab = "vm";
  private workloadFilter: WorkloadFilter = "all";
  private query = "";
  /** Charges cochées, avec l'état qu'elles avaient au moment de la sélection. */
  private selected = new Map<string, WorkloadState>();

  /** Une charge cochée qui démarre, s'arrête ou devient indisponible quitte la sélection. */
  protected willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (!changed.has("hass") || !this.selected.size) return;
    const items = new Map(this.allWorkloads().map((item) => [item.entity, item]));
    const next = pruneSelection(this.selected, (id) => (items.has(id) ? this.itemState(items.get(id)!) : undefined));
    if (next) this.selected = next;
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
        { name: "wake_entity", selector: { entity: {} } },
        { name: "background_image", selector: { text: {} } },
        { name: "background_position", selector: { text: {} } },
        { name: "image_opacity", selector: { number: { min: 0, max: 100, step: 1, mode: "slider" } } },
        { name: "card_background", selector: { object: {} } },
        { name: "show_grid", selector: { boolean: {} } },
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
      computeLabel: formLabels(FORM_LABELS),
      computeHelper: (schema: { name?: string }) =>
        schema.name === "backup_action_entity"
          ? "Les nœuds, stockages, disques, VM et conteneurs se configurent en YAML."
          : undefined,
    };
  }

  public getCardSize(): number {
    return 12;
  }

  public getGridOptions(): Record<string, number> {
    // Omit rows so Sections uses the content height, including optional info tiles.
    return { columns: 6, min_columns: 3 };
  }

  protected render(): TemplateResult {
    if (!this.config || !this.hass) return html``;
    const availability = machineAvailability(entity(this.hass, this.config.status_entity));
    const cpu = machinePercentage(entity(this.hass, this.config.cpu_entity || this.config.cluster_usage_entity));
    const memory = machinePercentage(entity(this.hass, this.config.memory_entity));
    const activeVms = (this.config.vms || []).some((item) => this.itemState(item) === "active");
    const activeContainers = (this.config.containers || []).some((item) => this.itemState(item) === "active");
    const storages = this.storageItems().filter((item) => item.show_on_card !== false);
    return html`
      <ha-card>
        <div class="machine-shell ${this.machineGridClass()}" style=${this.machineStyle("#50d59b")}>
          <div class="machine-content">
            <header class="machine-header"><div><h2>${this.config.name}</h2>
              <div class="machine-status"><span class="dot ${machineStatusDot(availability)}"></span>${machineStatusLabel(availability)}</div>
              ${this.renderWakeButton(availability === "online", this.config.wake_entity, "Démarrer le nœud")}
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

  /** Fiche Home Assistant d'une entité ; la fenêtre Auralis est fermée pour ne pas la masquer. */
  private openEntity(entityId?: string): (() => void) | undefined {
    if (!entityId) return undefined;
    return () => {
      if (this.dialog !== null) this.closeDialog();
      this.moreInfo(entityId);
    };
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
    const usage = machinePercentage(entity(this.hass, item.usage_entity));
    return storageBar({
      label: item.name,
      value: usage,
      level: metricSeverity(usage, this.config?.alert_levels, "disk"),
      open: this.openEntity(item.usage_entity || item.capacity_entity || item.status_entity),
      className: "storage-bar",
    });
  }

  private renderStorageDialog(): TemplateResult {
    const section = (title: string, items: ProxmoxStorage[]) => html`
      <div class="dialog-section-title">${title}</div>
      ${items.length ? items.map((item) => {
        const temperature = machineNumber(entity(this.hass, item.temperature_entity));
        const temperatureLevel = metricSeverity(temperature, this.config?.alert_levels, "temperature");
        return html`<div class="storage-detail">
          ${this.renderStorageBar(item)}
          <div class="muted">${[
            item.capacity_entity ? displayState(this.hass, item.capacity_entity) : "",
            item.status_entity ? displayState(this.hass, item.status_entity) : "",
          ].filter(Boolean).join(" · ")}${item.temperature_entity
            ? html`${item.capacity_entity || item.status_entity ? " · " : ""}<span class="sev-text ${severityClass(temperatureLevel)}">${displayState(this.hass, item.temperature_entity)}</span>`
            : nothing}</div>
        </div>`;
      }) : html`<div class="empty">Aucun élément configuré.</div>`}`;
    return this.renderDialog("Stockages et disques", "mdi:harddisk", html`
      <div class="dialog-body">
        ${section("Espaces de stockage", this.storageItems())}
        ${section("Disques physiques", this.config?.disks || [])}
      </div>`);
  }

  private itemState(item: ManagedProxmoxWorkload): WorkloadState {
    return workloadState(entity(this.hass, item.entity));
  }

  private openWorkloads(tab: WorkloadTab): void {
    this.workloadTab = tab;
    this.workloadFilter = "all";
    this.query = "";
    this.selected = new Map();
    this.openDialog("workloads");
  }

  private allWorkloads(): ManagedProxmoxWorkload[] {
    return this.workloadTab === "vm"
      ? this.config?.vms || []
      : this.config?.containers || [];
  }

  private workloadItems(): ManagedProxmoxWorkload[] {
    return filterWorkloads(this.allWorkloads(), this.query, this.workloadFilter, (item) => this.itemState(item));
  }

  private groupedItems(): Map<string, ManagedProxmoxWorkload[]> {
    const fallback = this.workloadTab === "vm" ? "Machines virtuelles" : "Conteneurs LXC";
    return groupWorkloads(this.workloadItems(), (item) => item.group || item.node || fallback);
  }

  /** Charges cochées réparties selon la commande groupée qui leur correspond. */
  private selectedByAction(): { start: ManagedProxmoxWorkload[]; stop: ManagedProxmoxWorkload[] } {
    const start: ManagedProxmoxWorkload[] = [];
    const stop: ManagedProxmoxWorkload[] = [];
    for (const item of this.allWorkloads()) {
      if (!this.selected.has(item.entity)) continue;
      const action = bulkAction(this.itemState(item));
      if (!action || !commandAvailable(this.hass, workloadActionEntity(item, action))) continue;
      (action === "start" ? start : stop).push(item);
    }
    return { start, stop };
  }

  private renderWorkloadsDialog(): TemplateResult {
    const vm = this.workloadTab === "vm";
    const all = this.allWorkloads();
    const counts = workloadCounts(all, (item) => this.itemState(item));
    const { start, stop } = this.selectedByAction();

    return this.renderDialog(
      vm ? "Machines virtuelles" : "Conteneurs LXC",
      vm ? "mdi:layers-triple-outline" : "mdi:cube-outline",
      html`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">${vm ? "Machines virtuelles" : "Conteneurs LXC"}</span><strong>${counts.active} actif${counts.active > 1 ? "s" : ""} sur ${all.length}</strong><span class="muted">Filtrer, démarrer et ouvrir les consoles depuis le dashboard</span></div>
            <div class="dialog-stat"><strong>${counts.stopped}</strong><small>arrêté${counts.stopped > 1 ? "s" : ""}</small></div>
          </div>
          ${workloadToolbar({
            query: this.query,
            placeholder: vm ? "Rechercher une VM" : "Rechercher un conteneur",
            filter: this.workloadFilter,
            counts,
            total: all.length,
            pausedLabel: "Suspendus",
            showPaused: true,
            onQuery: (query) => { this.query = query; this.requestUpdate(); },
            onFilter: (filter) => { this.workloadFilter = filter; this.requestUpdate(); },
          })}
          ${this.workloadItems().length
            ? Array.from(this.groupedItems()).map(
                ([group, items]) => html`<div class="section-label">${group}</div><div class="list">${items.map((item) => this.renderWorkloadRow(item))}</div>`,
              )
            : html`<div class="empty">Aucune charge ne correspond à ce filtre.</div>`}
        </div>
        ${selectionBar({
          startCount: start.length,
          stopCount: stop.length,
          pending: this.isPending(this.bulkKey()),
          onClear: () => { this.selected = new Map(); this.requestUpdate(); },
          onStart: this.startSelected,
          onStop: this.stopSelected,
        })}
      `,
    );
  }

  private renderWorkloadRow(item: ManagedProxmoxWorkload): TemplateResult {
    const state = this.itemState(item);
    return workloadRow({
      item,
      hass: this.hass,
      kind: this.workloadTab,
      state,
      selected: this.selected.has(item.entity),
      detail: item.node,
      allowPause: true,
      isPending: (action) => this.isPending(this.itemKey(item, action)),
      onToggle: () => this.toggleSelected(item.entity, state),
      onAction: (action) => this.onWorkloadAction(item, action),
      displayValue: (entityId) => displayState(this.hass, entityId),
    });
  }

  private itemKey(item: ManagedProxmoxWorkload, action: WorkloadAction): string {
    return `workload:${item.entity}:${action}`;
  }

  private bulkKey(): string {
    return `bulk:${this.workloadTab}`;
  }

  private onWorkloadAction(item: ManagedProxmoxWorkload, action: WorkloadAction): void {
    if (action === "stop" || action === "restart") this.confirmWorkloadAction(item, action);
    else void this.runWorkloadAction(item, action);
  }

  /** Commande d'une VM ou d'un LXC ; un `switch` sans `stop_entity` est éteint. */
  private async runWorkloadAction(item: ManagedProxmoxWorkload, action: WorkloadAction): Promise<void> {
    const hass = this.hass;
    const state = this.itemState(item);
    if (!hass || state === "unavailable") return;
    // Démarrer une charge déjà active ou suspendue n'a pas de sens.
    if (action === "start" && state !== "stopped") return;
    if (!commandAvailable(hass, workloadActionEntity(item, action))) return;
    await this.runCommand(this.itemKey(item, action), () => sendWorkloadCommand(hass, item, action), {
      errorMessage: `${item.name} : la commande a échoué.`,
    });
  }

  private confirmWorkloadAction(item: ManagedProxmoxWorkload, action: "stop" | "restart"): void {
    if (!commandAvailable(this.hass, workloadActionEntity(item, action))) return;
    this.askConfirmation({
      ...workloadConfirmation(item.name, action, this.workloadTab),
      action: () => this.runWorkloadAction(item, action),
    });
    this.dialog = "workloads";
  }

  private toggleSelected(entityId: string, state: WorkloadState): void {
    const next = new Map(this.selected);
    if (next.has(entityId)) next.delete(entityId);
    else next.set(entityId, state);
    this.selected = next;
    this.requestUpdate();
  }

  /** Commande groupée : chaque échec est compté, les charges qui ont répondu quittent la sélection. */
  private async runBulk(action: "start" | "stop", items: ManagedProxmoxWorkload[]): Promise<void> {
    const hass = this.hass;
    if (!hass || !items.length) return;
    await this.runCommand(this.bulkKey(), async () => {
      const results = await Promise.allSettled(items.map((item) => sendWorkloadCommand(hass, item, action)));
      const next = new Map(this.selected);
      results.forEach((result, index) => { if (result.status === "fulfilled") next.delete(items[index].entity); });
      this.selected = next;
      this.requestUpdate();
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed) throw new Error(`${failed} sur ${items.length} n’${failed > 1 ? "ont" : "a"} pas répondu.`);
    }, { errorMessage: action === "start" ? "Démarrage groupé incomplet." : "Arrêt groupé incomplet." });
  }

  private startSelected = async (): Promise<void> => {
    await this.runBulk("start", this.selectedByAction().start);
  };

  private stopSelected = (): void => {
    const items = this.selectedByAction().stop;
    if (!items.length) return;
    this.askConfirmation({
      ...bulkStopConfirmation(items.length, this.workloadTab),
      action: () => this.runBulk("stop", items),
    });
    this.dialog = "workloads";
  };

  private confirmClusterAction(action: "restart" | "shutdown"): void {
    const entityId = action === "restart" ? this.config?.restart_entity : this.config?.shutdown_entity;
    if (
      machineAvailability(entity(this.hass, this.config?.status_entity)) !== "online" ||
      !commandAvailable(this.hass, entityId)
    ) return;
    this.askConfirmation({
      ...hostConfirmation(
        action,
        this.config?.name || "le nœud",
        "Cette action peut interrompre plusieurs machines virtuelles et services. Vérifiez les migrations avant de continuer.",
        "Arrêter",
      ),
      action: () => activateEntity(this.hass!, entityId),
    });
    this.dialog = "cluster";
  }

  private confirmNodeAction(node: ProxmoxNode, action: "restart" | "shutdown"): void {
    const entityId = action === "restart" ? node.restart_entity : node.shutdown_entity;
    if (machineAvailability(entity(this.hass, node.status_entity)) !== "online" || !commandAvailable(this.hass, entityId)) return;
    this.askConfirmation({
      ...hostConfirmation(action, node.name, "Les machines virtuelles et conteneurs de ce nœud seront interrompus. Vérifiez les migrations avant de continuer.", "Arrêter"),
      action: () => activateEntity(this.hass!, entityId),
    });
    this.dialog = "cluster";
  }

  private runBackup = (): void => {
    const hass = this.hass;
    const entityId = this.config?.backup_action_entity;
    if (!hass || !commandAvailable(hass, entityId)) return;
    void this.runCommand("backup", () => activateEntity(hass, entityId), {
      errorMessage: "La sauvegarde n’a pas pu être lancée.",
      successMessage: "Sauvegarde lancée.",
    });
  };

  /** Liste compacte des nœuds du cluster : état, CPU et RAM, redémarrage et arrêt confirmés. */
  private renderNodes(): TemplateResult | typeof nothing {
    const nodes = this.config?.nodes || [];
    if (!nodes.length) return nothing;
    const levels = this.config?.alert_levels;
    return html`<div class="dialog-section"><div class="dialog-section-title">Nœuds</div><div class="node-list">
      ${nodes.map((node) => {
        const availability = machineAvailability(entity(this.hass, node.status_entity));
        const online = availability === "online";
        const cpu = machinePercentage(entity(this.hass, node.cpu_entity));
        const memory = machinePercentage(entity(this.hass, node.memory_entity));
        const temperature = machineNumber(entity(this.hass, node.temperature_entity));
        const metric = (label: string, value: string, level: Severity) =>
          html`<span class="sev-text ${severityClass(level)}">${label ? `${label} ` : ""}${value}</span>`;
        return html`<div class="node-row">
          <span class="tile-icon"><ha-icon .icon=${node.icon || "mdi:server"}></ha-icon></span>
          <div class="node-main"><strong>${node.name}</strong>
            <div class="node-state">
              <span><span class="dot ${machineStatusDot(availability)}"></span>${machineStatusLabel(availability)}</span>
              ${node.cpu_entity ? metric("CPU", percentageLabel(cpu), metricSeverity(cpu, levels, "cpu")) : nothing}
              ${node.memory_entity ? metric("RAM", percentageLabel(memory), metricSeverity(memory, levels, "memory")) : nothing}
              ${node.temperature_entity ? metric("", displayState(this.hass, node.temperature_entity), metricSeverity(temperature, levels, "temperature")) : nothing}
            </div>
          </div>
          <div class="node-actions">
            ${node.restart_entity ? html`<button type="button" class="icon-button" aria-label=${`Redémarrer ${node.name}`} title="Redémarrer"
              ?disabled=${!online || !commandAvailable(this.hass, node.restart_entity)} @click=${() => this.confirmNodeAction(node, "restart")}><ha-icon icon="mdi:restart"></ha-icon></button>` : nothing}
            ${node.shutdown_entity ? html`<button type="button" class="icon-button" aria-label=${`Arrêter ${node.name}`} title="Arrêter"
              ?disabled=${!online || !commandAvailable(this.hass, node.shutdown_entity)} @click=${() => this.confirmNodeAction(node, "shutdown")}><ha-icon icon="mdi:power"></ha-icon></button>` : nothing}
          </div>
        </div>`;
      })}
    </div></div>`;
  }

  private renderClusterDialog(): TemplateResult {
    const config = this.config!;
    const availability = machineAvailability(entity(this.hass, config.status_entity));
    const online = availability === "online";
    const levels = config.alert_levels;
    const value = (id?: string) => machinePercentage(entity(this.hass, id));
    const metrics: Array<[string, string | undefined, string, Severity]> = [
      ["CPU", config.cpu_entity || config.cluster_usage_entity, "mdi:cpu-64-bit", metricSeverity(value(config.cpu_entity || config.cluster_usage_entity), levels, "cpu")],
      ["RAM", config.memory_label_entity || config.memory_entity, "mdi:memory", metricSeverity(value(config.memory_entity), levels, "memory")],
      ["Durée de fonctionnement", config.uptime_entity, "mdi:clock-outline", "normal"],
      ["Température", config.temperature_entity, "mdi:thermometer", metricSeverity(machineNumber(entity(this.hass, config.temperature_entity)), levels, "temperature")],
      ["Réception réseau", config.network_down_entity, "mdi:download-network", "normal"],
      ["Émission réseau", config.network_up_entity, "mdi:upload-network", "normal"],
      ["Version", config.version_entity, "mdi:server", "normal"],
      ["Quorum", config.quorum_entity, "mdi:lan", "normal"],
      ["Ceph", config.ceph_entity, "mdi:database-check-outline", "normal"],
      ["Dernière sauvegarde", config.backup_entity, "mdi:calendar-clock", "normal"],
      ["Alertes", config.alerts_entity, "mdi:alert-circle-outline", "normal"],
    ];
    // Une mesure configurée mais indisponible affiche « — » au lieu de disparaître.
    const configured = metrics.filter(([, id]) => Boolean(id));
    const backupPending = this.isPending("backup");
    return this.renderDialog(config.name || "Détails du nœud", config.icon || "mdi:information-outline", html`
      <div class="dialog-body">
        <div class="dialog-overview"><div><span class="eyebrow">État du nœud</span>
          <strong>${machineStatusLabel(availability)}</strong>
        </div></div>
        <div class="grid two">${configured.map(([label, id, icon, level]) => metricTile({
          label, icon, level, value: displayState(this.hass, id), open: this.openEntity(id),
        }))}</div>
        ${this.renderNodes()}
        ${!online && config.wake_entity ? html`<div class="dialog-section"><div class="actions">${this.renderWakeButton(online, config.wake_entity, "Démarrer le nœud", "action primary")}</div></div>` : nothing}
        ${config.backup_action_entity ? html`<div class="dialog-section"><button class="action" aria-busy=${backupPending ? "true" : "false"}
          ?disabled=${!online || backupPending || !commandAvailable(this.hass, config.backup_action_entity)}
          @click=${this.runBackup}>
          <ha-icon .icon=${backupPending ? "mdi:timer-sand" : "mdi:backup-restore"}></ha-icon>${backupPending ? "Lancement…" : "Lancer la sauvegarde"}</button></div>` : nothing}
        ${config.restart_entity || config.shutdown_entity ? html`
          <div class="dialog-danger-zone"><div class="dialog-section-title">Actions du nœud</div><div class="actions">
            ${config.restart_entity ? html`<button class="action danger" ?disabled=${!online || !commandAvailable(this.hass, config.restart_entity)} @click=${() => this.confirmClusterAction("restart")}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer</button>` : nothing}
            ${config.shutdown_entity ? html`<button class="action danger" ?disabled=${!online || !commandAvailable(this.hass, config.shutdown_entity)} @click=${() => this.confirmClusterAction("shutdown")}><ha-icon icon="mdi:power"></ha-icon>Arrêter</button>` : nothing}
          </div></div>` : nothing}
      </div>`);
  }
}
