import { css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type {
  ManagedService,
  ManagedVm,
  UnraidCardConfig,
  UnraidDisk,
} from "../types/config";
import type { HassEntity } from "../types/home-assistant";
import { activateEntity } from "../utils/actions";
import { displayState, entity, isAvailable } from "../utils/entities";
import { severity, severityClass, type Severity } from "../utils/severity";
import {
  BATTERY_LEVEL,
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
  meterTrack,
  metricSeverity,
  metricTile,
  percentageLabel,
  pruneSelection,
  selectionBar,
  sendWorkloadCommand,
  storageBar,
  storageFormFields,
  workloadActionEntity,
  workloadConfirmation,
  workloadCounts,
  workloadFormFields,
  workloadRow,
  workloadState,
  workloadToolbar,
  worstSeverity,
  type WorkloadAction,
  type WorkloadFilter,
  type WorkloadState,
} from "../utils/machines";
import { BOOLEAN, COMMAND, ENTITY, listSelector, SENSOR, TEMPERATURE, TEXT, YAML, type FormSelector } from "../utils/form";

type ServiceTab = "docker" | "vm";
type UnraidItem = ManagedService | ManagedVm;

export function unraidStateIsHealthy(
  state: HassEntity | undefined,
  healthyState = "on",
): boolean {
  return Boolean(
    isAvailable(state) && state!.state.toLowerCase() === healthyState.trim().toLowerCase(),
  );
}

export function unraidGroupLabel(
  group: string | undefined,
  labels: Record<string, string> | undefined,
  fallback: string,
): string {
  const key = group || "default";
  return labels?.[key]?.trim() || labels?.default?.trim() || group || fallback;
}

/** Disques sains sur le total, d'après les capteurs `healthy_disks_entity` et `total_disks_entity`. */
export function unraidDiskHealth(healthy?: HassEntity, total?: HassEntity): { healthy?: number; total?: number } {
  return { healthy: machineNumber(healthy), total: machineNumber(total) };
}

const FORM_LABELS: Record<string, string> = {
  status_entity: "Serveur en ligne (entité d’état)",
  array_state_entity: "État de l’array",
  array_usage_entity: "Occupation de l’array (%)",
  array_label_entity: "Capacité de l’array (texte)",
  healthy_disks_entity: "Nombre de disques sains",
  total_disks_entity: "Nombre total de disques",
  parity_entity: "État de la parité",
  parity_healthy_state: "Valeur d’une parité saine",
  parity_age_entity: "Dernière vérification de parité",
  parity_errors_entity: "Erreurs de parité",
  cpu_temperature_entity: "Température CPU",
  disk_temperature_entity: "Température des disques",
  docker_cpu_entity: "CPU de Docker",
  docker_memory_entity: "Mémoire de Docker",
  updates_entity: "Mises à jour disponibles",
  notifications_entity: "Notifications",
  ups_connected_entity: "Onduleur connecté",
  ups_status_entity: "État de l’onduleur",
  ups_battery_entity: "Batterie de l’onduleur (%)",
  ups_load_entity: "Charge de l’onduleur",
  ups_runtime_entity: "Autonomie de l’onduleur",
  server_url_entity: "Adresse de l’interface UNRAID",
  disks: "Disques",
  docker: "Conteneurs Docker",
  vms: "Machines virtuelles",
  docker_group_labels: "Noms des groupes Docker",
  vm_group_labels: "Noms des groupes de VM",
  array_start_entity: "Commande de démarrage de l’array",
  array_stop_entity: "Commande d’arrêt de l’array",
  restart_entity: "Commande de redémarrage du serveur",
  shutdown_entity: "Commande d’arrêt du serveur",
};

export class AuralisUnraidCard extends AuralisBaseCard<UnraidCardConfig> {
  static styles = [
    AuralisBaseCard.styles,
    machineStyles,
    css`
      .disk-summary-empty {
        padding: 12px;
        margin-top: 14px;
        border: 1px dashed rgba(195, 211, 229, 0.18);
        border-radius: 14px;
        color: #91a0b2;
        font-size: var(--auralis-text-xs);
        text-align: center;
      }

      .disk-summary {
        grid-template-columns: minmax(62px, 0.75fr) minmax(0, 1.35fr) 38px;
      }

      .disk-summary > span:first-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .machine-context .context-detail {
        display: block;
        margin-top: 6px;
        color: #91a0b2;
        font-size: var(--auralis-text-xs);
      }

      .disk-list {
        display: grid;
        gap: 8px;
      }

      .disk-group + .disk-group {
        margin-top: 14px;
      }

      .disk-group-title {
        margin: 0 2px 8px;
        color: var(--auralis-muted);
        font-size: var(--auralis-text-xs);
        font-weight: 700;
      }

      .disk-row {
        display: block;
        width: 100%;
        padding: 12px;
        border: 1px solid var(--auralis-border);
        border-radius: 16px;
        background: var(--auralis-layer);
        color: inherit;
        font: inherit;
        text-align: left;
      }

      button.disk-row {
        cursor: pointer;
      }

      .disk-row-head,
      .disk-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .disk-row-head strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .disk-state {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--auralis-muted);
        font-size: var(--auralis-text-xs);
      }

      .disk-meta {
        margin-top: 9px;
        color: var(--auralis-muted);
        font-size: var(--auralis-text-xs);
      }

      .disk-row .progress {
        height: 6px;
        margin-top: 9px;
      }

      .disk-row .progress > span {
        background: var(--machine-accent, var(--auralis-info));
      }

      .disk-row .progress.sev-warning > span,
      .disk-row .progress.sev-critical > span {
        background: var(--sev-color);
      }

      .parity-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-top: 10px;
      }

      .parity-summary .dialog-stat {
        min-width: 0;
      }

      @media (max-width: 560px) {
        .parity-summary {
          grid-template-columns: 1fr;
        }
      }
    `,
  ];

  private serviceTab: ServiceTab = "docker";
  private serviceFilter: WorkloadFilter = "all";
  private query = "";
  /** Charges cochées, avec l'état qu'elles avaient au moment de la sélection. */
  private selected = new Map<string, WorkloadState>();

  public setConfig(config: UnraidCardConfig): void {
    if (!config.status_entity) throw new Error("status_entity est obligatoire.");
    this.config = {
      ...config,
      name: config.name || "Serveur UNRAID",
      theme: config.theme || "auto",
      docker: config.docker || [],
      vms: config.vms || [],
      disks: config.disks || [],
    };
  }

  static getStubConfig(): Partial<UnraidCardConfig> {
    return { name: "Serveur UNRAID", theme: "carbon", status_entity: "binary_sensor.unraid_online", docker: [], vms: [] };
  }

  static getConfigForm(): Record<string, unknown> {
    const field = (name: string, selector: FormSelector) => ({ name, selector });
    return {
      schema: [
        { name: "name", selector: TEXT },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        { name: "status_entity", required: true, selector: ENTITY },
        field("array_state_entity", ENTITY),
        field("uptime_entity", SENSOR),
        field("version_entity", ENTITY),
        field("array_usage_entity", SENSOR),
        field("array_label_entity", SENSOR),
        field("healthy_disks_entity", SENSOR),
        field("total_disks_entity", SENSOR),
        field("parity_entity", ENTITY),
        { name: "parity_healthy_state", selector: TEXT },
        field("parity_age_entity", SENSOR),
        field("parity_errors_entity", SENSOR),
        field("cpu_entity", SENSOR),
        field("cpu_temperature_entity", TEMPERATURE),
        field("disk_temperature_entity", TEMPERATURE),
        field("memory_entity", SENSOR),
        field("network_down_entity", SENSOR),
        field("network_up_entity", SENSOR),
        field("docker_cpu_entity", SENSOR),
        field("docker_memory_entity", SENSOR),
        field("updates_entity", ENTITY),
        field("notifications_entity", ENTITY),
        field("ups_connected_entity", ENTITY),
        field("ups_status_entity", ENTITY),
        field("ups_battery_entity", SENSOR),
        field("ups_load_entity", SENSOR),
        field("ups_runtime_entity", SENSOR),
        field("server_url_entity", ENTITY),
        field("disks", listSelector(storageFormFields({
          group: { label: "Groupe", selector: TEXT },
          healthy_state: { label: "Valeur d’un état sain", selector: TEXT },
        }), { label: "name", description: "usage_entity" })),
        field("docker", listSelector(workloadFormFields(), { label: "name", description: "entity" })),
        field("vms", listSelector(workloadFormFields({ vm: true }), { label: "name", description: "entity" })),
        { name: "docker_group_labels", selector: YAML },
        { name: "vm_group_labels", selector: YAML },
        field("array_start_entity", COMMAND),
        field("array_stop_entity", COMMAND),
        field("restart_entity", COMMAND),
        field("shutdown_entity", COMMAND),
        field("wake_entity", COMMAND),
        { name: "background_image", selector: TEXT },
        { name: "background_position", selector: TEXT },
        { name: "image_opacity", selector: { number: { min: 0, max: 100, step: 1, mode: "slider" } } },
        { name: "card_background", selector: YAML },
        { name: "show_grid", selector: BOOLEAN },
        { name: "accent_color", selector: TEXT },
        { name: "image_brightness", selector: { number: { min: 30, max: 100, step: 1, mode: "slider" } } },
        { name: "glass_opacity", selector: { number: { min: 0.45, max: 0.96, step: 0.01, mode: "slider" } } },
      ],
      computeLabel: formLabels(FORM_LABELS),
      computeHelper: (schema: { name?: string }) =>
        schema.name === "docker_group_labels" || schema.name === "vm_group_labels"
          ? "Nom affiché pour chaque valeur de group, par exemple media: Multimédia." : undefined,
    };
  }

  public getCardSize(): number {
    return 12;
  }

  public getGridOptions(): Record<string, number> {
    return { rows: 11, min_rows: 10, columns: 6, min_columns: 3 };
  }

  /** Une charge cochée qui démarre, s'arrête ou devient indisponible quitte la sélection. */
  protected willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (!changed.has("hass") || !this.selected.size) return;
    const items = new Map(this.allItems().map((item) => [item.entity, item]));
    const next = pruneSelection(this.selected, (id) => (items.has(id) ? this.itemState(items.get(id)!) : undefined));
    if (next) this.selected = next;
  }

  protected render(): TemplateResult {
    if (!this.config || !this.hass) return html``;
    const availability = machineAvailability(entity(this.hass, this.config.status_entity));
    const online = availability === "online";
    const usage = machinePercentage(entity(this.hass, this.config.array_usage_entity));
    const activeDocker = (this.config.docker || []).filter((item) => this.itemState(item) === "active").length;
    const activeVms = (this.config.vms || []).filter((item) => this.itemState(item) === "active").length;
    const totalDocker = this.config.docker?.length || 0;
    const totalVms = this.config.vms?.length || 0;
    const cpu = machinePercentage(entity(this.hass, this.config.cpu_entity));
    const memory = machinePercentage(entity(this.hass, this.config.memory_entity));
    const featuredDisks = this.featuredDisks();
    const diskSummary = this.diskHealthSummary();
    const machineStyle = this.machineStyle("#ff7b55");

    return html`
      <ha-card>
        <div class="machine-shell ${this.machineGridClass()}" style=${machineStyle}>
          <div class="machine-content">
            <header class="machine-header"><div><h2>${this.config.name}</h2><div class="machine-status"><span class="dot ${machineStatusDot(availability)}"></span>${machineStatusLabel(availability, "UNRAID")}</div>${this.renderWakeButton(online, this.config.wake_entity, "Réveiller le serveur")}</div></header>
            <div class="machine-rail">
              <button class="rail-button" @click=${() => this.openDialog("server")} aria-label="Détails du serveur"><ha-icon icon="mdi:information-outline"></ha-icon></button>
              <button class="rail-button ${activeDocker ? "has-active" : ""}" @click=${() => this.openServices("docker")} aria-label="Docker"><ha-icon icon="mdi:cube-outline"></ha-icon></button>
              <button class="rail-button ${activeVms ? "has-active" : ""}" @click=${() => this.openServices("vm")} aria-label="Machines virtuelles"><ha-icon icon="mdi:monitor-multiple"></ha-icon></button>
            </div>
            ${this.renderResourceGauges(cpu, memory)}
            <div class="machine-context"><small>Array${usage === undefined ? "" : ` · ${percentageLabel(usage)} utilisés`}</small><strong>${this.arrayState(availability)}</strong>${diskSummary ? html`<span class="context-detail sev-text ${severityClass(diskSummary.level)}">${diskSummary.text}</span>` : nothing}</div>
            <section class="machine-panel">
              <div class="machine-panel-head"><div class="machine-panel-title"><small>Stockage</small><strong>${featuredDisks.length ? `${featuredDisks.length} disque${featuredDisks.length > 1 ? "s" : ""} affiché${featuredDisks.length > 1 ? "s" : ""}` : "Aucun disque sélectionné"}</strong></div><button class="machine-accent-action" @click=${() => this.openDialog("disks")}><ha-icon icon="mdi:harddisk"></ha-icon>Disques</button></div>
              <div class="machine-bars">
                ${featuredDisks.map((disk) => this.renderDiskSummary(disk))}
              </div>
              ${featuredDisks.length ? nothing : html`<div class="disk-summary-empty">Ajoutez <strong>show_on_card: true</strong> aux disques à afficher ici.</div>`}
              <div class="machine-foot"><span>Docker <strong>${activeDocker}/${totalDocker || "—"} actifs</strong></span><span>VM <strong>${activeVms}/${totalVms || "—"} actives</strong></span></div>
            </section>
          </div>
        </div>
      </ha-card>
      ${this.dialog === "services" ? this.renderServicesDialog() : nothing}
      ${this.dialog === "server" ? this.renderServerDialog() : nothing}
      ${this.dialog === "disks" ? this.renderDisksDialog() : nothing}
    `;
  }

  private arrayState(availability: ReturnType<typeof machineAvailability>): string {
    if (this.config?.array_state_entity) return displayState(this.hass, this.config.array_state_entity);
    return availability === "unavailable" ? "Indisponible" : availability === "online" ? "Démarré" : "Arrêté";
  }

  /** « 5/6 disques sains · 48 °C », coloré selon l'état et la température des disques. */
  private diskHealthSummary(): { text: string; level: Severity } | undefined {
    const config = this.config!;
    const { healthy, total } = unraidDiskHealth(entity(this.hass, config.healthy_disks_entity), entity(this.hass, config.total_disks_entity));
    const temperatureState = entity(this.hass, config.disk_temperature_entity);
    const temperature = machineNumber(temperatureState);
    const parts: string[] = [];
    if (healthy !== undefined) parts.push(total !== undefined ? `${healthy}/${total} disques sains` : `${healthy} disques sains`);
    if (temperature !== undefined) parts.push(displayState(this.hass, config.disk_temperature_entity));
    if (!parts.length) return undefined;
    const level = worstSeverity(
      healthy !== undefined && total !== undefined && healthy < total ? "warning" : "normal",
      metricSeverity(temperature, config.alert_levels, "temperature"),
    );
    return { text: parts.join(" · "), level };
  }

  /** Fiche Home Assistant d'une entité ; la fenêtre Auralis est fermée pour ne pas la masquer. */
  private openEntity(entityId?: string): (() => void) | undefined {
    if (!entityId) return undefined;
    return () => {
      if (this.dialog !== null) this.closeDialog();
      this.moreInfo(entityId);
    };
  }

  private openServices(tab: ServiceTab): void {
    this.serviceTab = tab;
    this.serviceFilter = "all";
    this.query = "";
    this.selected = new Map();
    this.openDialog("services");
  }

  private itemState(item: UnraidItem): WorkloadState {
    return workloadState(entity(this.hass, item.entity));
  }

  private allItems(): UnraidItem[] {
    return this.serviceTab === "docker" ? this.config?.docker || [] : this.config?.vms || [];
  }

  private serviceItems(): UnraidItem[] {
    return filterWorkloads(this.allItems(), this.query, this.serviceFilter, (item) => this.itemState(item));
  }

  private groupedItems(): Map<string, UnraidItem[]> {
    const labels = this.serviceTab === "docker"
      ? this.config?.docker_group_labels
      : this.config?.vm_group_labels;
    const fallback = this.serviceTab === "docker" ? "Services" : "Machines virtuelles";
    return groupWorkloads(this.serviceItems(), (item) => unraidGroupLabel(item.group, labels, fallback));
  }

  /** Charges cochées réparties selon la commande groupée qui leur correspond. */
  private selectedByAction(): { start: UnraidItem[]; stop: UnraidItem[] } {
    const start: UnraidItem[] = [];
    const stop: UnraidItem[] = [];
    for (const item of this.allItems()) {
      if (!this.selected.has(item.entity)) continue;
      const action = bulkAction(this.itemState(item));
      if (!action || !commandAvailable(this.hass, workloadActionEntity(item, action))) continue;
      (action === "start" ? start : stop).push(item);
    }
    return { start, stop };
  }

  private renderServicesDialog(): TemplateResult {
    const docker = this.serviceTab === "docker";
    const all = this.allItems();
    const counts = workloadCounts(all, (item) => this.itemState(item));
    const items = this.serviceItems();
    const { start, stop } = this.selectedByAction();
    return this.renderDialog(
      docker ? "Docker" : "Machines virtuelles",
      docker ? "mdi:cube-outline" : "mdi:monitor-multiple",
      html`
        <div class="dialog-body">
          <div class="dialog-overview"><div><span class="eyebrow">${docker ? "Conteneurs Docker" : "Machines virtuelles"}</span><strong>${counts.active} actif${counts.active > 1 ? "s" : ""} sur ${all.length}</strong><span class="muted">Rechercher, filtrer et piloter sans quitter le tableau de bord</span></div><div class="dialog-stat"><strong>${counts.stopped}</strong><small>arrêté${counts.stopped > 1 ? "s" : ""}</small></div></div>
          ${workloadToolbar({
            query: this.query,
            placeholder: docker ? "Rechercher un service" : "Rechercher une VM",
            filter: this.serviceFilter,
            counts,
            total: all.length,
            pausedLabel: "Suspendues",
            showPaused: !docker,
            onQuery: (query) => { this.query = query; this.requestUpdate(); },
            onFilter: (filter) => { this.serviceFilter = filter; this.requestUpdate(); },
          })}
          ${items.length
            ? Array.from(this.groupedItems()).map(([group, groupItems]) => html`
                <div class="section-label">${group}</div>
                <div class="list">${groupItems.map((item) => this.renderServiceRow(item))}</div>
              `)
            : html`<div class="empty">Aucun élément ne correspond à ce filtre.</div>`}
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

  private renderServiceRow(item: UnraidItem): TemplateResult {
    const state = this.itemState(item);
    return workloadRow({
      item,
      hass: this.hass,
      kind: this.serviceTab === "vm" ? "vm" : "container",
      state,
      selected: this.selected.has(item.entity),
      allowPause: this.serviceTab === "vm",
      isPending: (action) => this.isPending(this.itemKey(item, action)),
      onToggle: () => this.toggleSelected(item.entity, state),
      onAction: (action) => this.onItemAction(item, action),
      displayValue: (entityId) => displayState(this.hass, entityId),
    });
  }

  private toggleSelected(entityId: string, state: WorkloadState): void {
    const next = new Map(this.selected);
    if (next.has(entityId)) next.delete(entityId);
    else next.set(entityId, state);
    this.selected = next;
    this.requestUpdate();
  }

  private itemKey(item: UnraidItem, action: WorkloadAction): string {
    return `workload:${item.entity}:${action}`;
  }

  private bulkKey(): string {
    return `bulk:${this.serviceTab}`;
  }

  private onItemAction(item: UnraidItem, action: WorkloadAction): void {
    if (action === "stop" || action === "restart") this.confirmItemAction(item, action);
    else void this.runItemAction(item, action);
  }

  private async runItemAction(item: UnraidItem, action: WorkloadAction): Promise<void> {
    const hass = this.hass;
    if (!hass || this.itemState(item) === "unavailable") return;
    if (!commandAvailable(hass, workloadActionEntity(item, action))) return;
    await this.runCommand(this.itemKey(item, action), () => sendWorkloadCommand(hass, item, action), {
      errorMessage: `${item.name} : la commande a échoué.`,
    });
  }

  private confirmItemAction(item: UnraidItem, action: "stop" | "restart"): void {
    if (!commandAvailable(this.hass, workloadActionEntity(item, action))) return;
    this.askConfirmation({
      ...workloadConfirmation(item.name, action, this.serviceTab === "vm" ? "vm" : "container"),
      action: () => this.runItemAction(item, action),
    });
    this.dialog = "services";
  }

  /** Commande groupée : chaque échec est compté, les charges qui ont répondu quittent la sélection. */
  private async runBulk(action: "start" | "stop", items: UnraidItem[]): Promise<void> {
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
      ...bulkStopConfirmation(items.length, this.serviceTab === "vm" ? "vm" : "container"),
      action: () => this.runBulk("stop", items),
    });
    this.dialog = "services";
  };

  private isOnline(): boolean {
    return machineAvailability(entity(this.hass, this.config?.status_entity)) === "online";
  }

  private startArray = (): void => {
    const hass = this.hass;
    const entityId = this.config?.array_start_entity;
    if (!hass || !this.isOnline() || !commandAvailable(hass, entityId)) return;
    void this.runCommand("array:start", () => activateEntity(hass, entityId), {
      errorMessage: "Le démarrage de l’array a échoué.",
      successMessage: "Démarrage de l’array demandé.",
    });
  };

  private confirmArrayStop = (): void => {
    if (!this.isOnline() || !commandAvailable(this.hass, this.config?.array_stop_entity)) return;
    this.askConfirmation({
      title: "Arrêter l’array ?",
      message: "Les partages, conteneurs et machines virtuelles dépendants pourront devenir indisponibles.",
      confirmLabel: "Arrêter l’array",
      action: () => activateEntity(this.hass!, this.config?.array_stop_entity),
    });
    this.dialog = "server";
  };

  private confirmServerAction(action: "restart" | "shutdown"): void {
    const entityId = action === "restart" ? this.config?.restart_entity : this.config?.shutdown_entity;
    if (!this.isOnline() || !commandAvailable(this.hass, entityId)) return;
    this.askConfirmation({
      ...hostConfirmation(action, "le serveur", "L’array, les conteneurs Docker et les machines virtuelles pourront devenir indisponibles."),
      action: () => activateEntity(this.hass!, entityId),
    });
    this.dialog = "server";
  }

  private renderDiskRow(disk: UnraidDisk): TemplateResult {
    const usage = machinePercentage(entity(this.hass, disk.usage_entity));
    const status = entity(this.hass, disk.status_entity);
    const healthy = unraidStateIsHealthy(status, disk.healthy_state || "on");
    const stateClass = !disk.status_entity || healthy ? "healthy" : !isAvailable(status) ? "" : "danger";
    const stateLabel = !disk.status_entity
      ? "Suivi"
      : !isAvailable(status)
        ? "Indisponible"
        : healthy
          ? "Sain"
          : "À contrôler";
    const temperature = machineNumber(entity(this.hass, disk.temperature_entity));
    const temperatureLevel = metricSeverity(temperature, this.config?.alert_levels, "temperature");
    const content = html`
      <div class="disk-row-head">
        <strong>${disk.name}</strong>
        <span class="disk-state"><span class="dot ${stateClass}"></span>${stateLabel}</span>
      </div>
      ${meterTrack(disk.name, usage, "progress", metricSeverity(usage, this.config?.alert_levels, "disk"))}
      <div class="disk-meta">
        <span>${disk.capacity_entity ? displayState(this.hass, disk.capacity_entity) : `${percentageLabel(usage)} utilisés`}</span>
        ${disk.temperature_entity ? html`<span class="sev-text ${severityClass(temperatureLevel)}">${displayState(this.hass, disk.temperature_entity)}</span>` : nothing}
      </div>`;
    const open = this.openEntity(disk.usage_entity || disk.status_entity || disk.capacity_entity || disk.temperature_entity);
    return open
      ? html`<button type="button" class="disk-row" aria-label=${`${disk.name} : ${stateLabel}, ${percentageLabel(usage)} utilisés`} @click=${open}>${content}</button>`
      : html`<div class="disk-row">${content}</div>`;
  }

  private featuredDisks(): UnraidDisk[] {
    const disks = this.config?.disks || [];
    const explicitlySelected = disks.filter((disk) => disk.show_on_card === true);
    return explicitlySelected.length
      ? explicitlySelected
      : disks.filter((disk) => disk.show_on_card !== false);
  }

  private renderDiskSummary(disk: UnraidDisk): TemplateResult {
    const usage = machinePercentage(entity(this.hass, disk.usage_entity));
    return storageBar({
      label: disk.name,
      value: usage,
      level: metricSeverity(usage, this.config?.alert_levels, "disk"),
      open: this.openEntity(disk.usage_entity),
      className: "disk-summary",
    });
  }

  private groupedDisks(disks: UnraidDisk[]): Map<string, UnraidDisk[]> {
    return groupWorkloads(disks, (disk) => disk.group || "Stockage");
  }

  private renderDisksDialog(): TemplateResult {
    const disks = this.config?.disks || [];
    const reported = unraidDiskHealth(entity(this.hass, this.config?.healthy_disks_entity), entity(this.hass, this.config?.total_disks_entity));
    const available = disks.filter((disk) => isAvailable(entity(this.hass, disk.status_entity))).length;
    const healthy = disks.filter((disk) =>
      disk.status_entity && unraidStateIsHealthy(
        entity(this.hass, disk.status_entity),
        disk.healthy_state || "on",
      ),
    ).length;
    // Les compteurs de l'intégration priment sur le décompte des disques listés.
    const healthyLabel = reported.healthy !== undefined
      ? `${reported.healthy}/${reported.total ?? "—"}`
      : `${healthy}/${available || "—"}`;
    return this.renderDialog(
      "Disques",
      "mdi:harddisk",
      html`
        <div class="dialog-body">
          <div class="dialog-overview">
            <div><span class="eyebrow">Stockage UNRAID</span><strong>${disks.length} disque${disks.length > 1 ? "s" : ""} configuré${disks.length > 1 ? "s" : ""}</strong><span class="muted">Occupation, capacité, température et état de santé</span></div>
            <div class="dialog-stat"><strong>${healthyLabel}</strong><small>sains</small></div>
          </div>
          ${disks.length
            ? Array.from(this.groupedDisks(disks)).map(([group, items]) => html`
                <div class="disk-group"><div class="disk-group-title">${group}</div><div class="disk-list">${items.map((disk) => this.renderDiskRow(disk))}</div></div>
              `)
            : html`<div class="empty">Aucun disque n’est configuré.</div>`}
        </div>
      `,
    );
  }

  private configuredServerUrl(): string | undefined {
    const value = entity(this.hass, this.config?.server_url_entity)?.state;
    if (!value) return undefined;
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
    } catch {
      return undefined;
    }
  }

  /** Tuile de mesure de la fenêtre du serveur, ouvrant la fiche de son entité. */
  private statusTile(label: string, value: string, icon: string, entityId?: string, level: Severity = "normal"): TemplateResult {
    return metricTile({ label, value, icon, level, open: this.openEntity(entityId), layout: "label-first" });
  }

  private renderServerDialog(): TemplateResult {
    const config = this.config!;
    const usage = machinePercentage(entity(this.hass, config.array_usage_entity));
    const availability = machineAvailability(entity(this.hass, config.status_entity));
    const online = availability === "online";
    const levels = config.alert_levels;
    const parityState = entity(this.hass, config.parity_entity);
    const parityHealthy = config.parity_healthy_state
      ? unraidStateIsHealthy(parityState, config.parity_healthy_state)
      : isAvailable(parityState) &&
        /^(ok|valid|valide|healthy|protected|protégée)$/i.test(parityState!.state.trim());
    const parityLabel = !config.parity_entity
      ? "—"
      : !isAvailable(parityState)
        ? "Indisponible"
        : parityHealthy
          ? "Valide"
          : displayState(this.hass, config.parity_entity);
    const hasParityDetails = Boolean(config.parity_entity || config.parity_age_entity || config.parity_errors_entity);
    const hasMonitoring = Boolean(config.version_entity || config.updates_entity || config.notifications_entity);
    const hasNetwork = Boolean(config.network_down_entity || config.network_up_entity);
    const hasUps = Boolean(
      config.ups_connected_entity ||
      config.ups_status_entity ||
      config.ups_battery_entity ||
      config.ups_load_entity ||
      config.ups_runtime_entity,
    );
    const hasDockerMetrics = Boolean(config.docker_cpu_entity || config.docker_memory_entity);
    const hasDangerActions = Boolean(config.array_stop_entity || config.restart_entity || config.shutdown_entity);
    const serverUrl = this.configuredServerUrl();
    const arrayLabel = config.array_label_entity
      ? displayState(this.hass, config.array_label_entity)
      : percentageLabel(usage);
    const upsConnected = config.ups_connected_entity
      ? unraidStateIsHealthy(entity(this.hass, config.ups_connected_entity), "on")
        ? "Connecté"
        : "Déconnecté"
      : displayState(this.hass, config.ups_status_entity);
    const cpuLevel = worstSeverity(
      metricSeverity(machinePercentage(entity(this.hass, config.cpu_entity)), levels, "cpu"),
      metricSeverity(machineNumber(entity(this.hass, config.cpu_temperature_entity)), levels, "temperature"),
    );
    const batteryLevel = severity(machinePercentage(entity(this.hass, config.ups_battery_entity)), BATTERY_LEVEL, "below");
    const diskSummary = this.diskHealthSummary();
    const subtitle = config.uptime_entity
      ? `En service depuis ${displayState(this.hass, config.uptime_entity)}`
      : online
        ? "Stockage et services disponibles"
        : availability === "offline"
          ? "Le serveur est éteint"
          : "État du serveur inconnu";
    const arrayStartPending = this.isPending("array:start");
    return this.renderDialog(
      config.name || "Serveur UNRAID",
      config.icon || "mdi:server",
      html`
        <div class="dialog-body">
          <div class="dialog-overview"><div><span class="eyebrow">État du serveur</span><strong>${machineStatusLabel(availability)}</strong><span class="muted">${subtitle}</span></div><div class="dialog-stat"><strong>${percentageLabel(usage)}</strong><small>utilisé</small></div></div>
          <div class="dialog-section-title">Stockage et santé</div>
          <div class="grid two">
            ${this.statusTile("Array", `${this.arrayState(availability)} · ${arrayLabel}`, "mdi:database-outline", config.array_usage_entity || config.array_state_entity, metricSeverity(usage, levels, "disk"))}
            ${this.statusTile("CPU", `${displayState(this.hass, config.cpu_entity)} · ${displayState(this.hass, config.cpu_temperature_entity)}`, "mdi:cpu-64-bit", config.cpu_entity || config.cpu_temperature_entity, cpuLevel)}
            ${this.statusTile("RAM", displayState(this.hass, config.memory_entity), "mdi:memory", config.memory_entity, metricSeverity(machinePercentage(entity(this.hass, config.memory_entity)), levels, "memory"))}
            ${hasDockerMetrics
              ? this.statusTile("Docker", `CPU ${displayState(this.hass, config.docker_cpu_entity)} · RAM ${displayState(this.hass, config.docker_memory_entity)}`, "mdi:docker", config.docker_cpu_entity || config.docker_memory_entity)
              : this.statusTile("Parité", parityLabel, "mdi:shield-check-outline", config.parity_entity, config.parity_entity && isAvailable(parityState) && !parityHealthy ? "warning" : "normal")}
            ${diskSummary ? this.statusTile("Disques", diskSummary.text, "mdi:harddisk", config.healthy_disks_entity || config.disk_temperature_entity, diskSummary.level) : nothing}
          </div>
          ${hasMonitoring
            ? html`<div class="parity-summary">
                ${config.version_entity ? html`<div class="dialog-stat"><strong>${displayState(this.hass, config.version_entity)}</strong><small>version UNRAID</small></div>` : nothing}
                ${config.updates_entity ? html`<div class="dialog-stat"><strong>${displayState(this.hass, config.updates_entity)}</strong><small>mises à jour</small></div>` : nothing}
                ${config.notifications_entity ? html`<div class="dialog-stat"><strong>${displayState(this.hass, config.notifications_entity)}</strong><small>notifications</small></div>` : nothing}
              </div>`
            : nothing}
          ${hasParityDetails
            ? html`<div class="dialog-section"><div class="dialog-section-title">Parité</div><div class="parity-summary">
                ${config.parity_entity ? html`<div class="dialog-stat"><strong>${parityLabel}</strong><small>état</small></div>` : nothing}
                ${config.parity_age_entity ? html`<div class="dialog-stat"><strong>${displayState(this.hass, config.parity_age_entity)}</strong><small>dernière vérification</small></div>` : nothing}
                ${config.parity_errors_entity ? html`<div class="dialog-stat"><strong>${displayState(this.hass, config.parity_errors_entity)}</strong><small>erreurs détectées</small></div>` : nothing}
              </div></div>`
            : nothing}
          ${hasNetwork
            ? html`<div class="dialog-section"><div class="dialog-section-title">Activité réseau</div><div class="grid two">
                ${config.network_down_entity ? this.statusTile("Entrant", displayState(this.hass, config.network_down_entity), "mdi:download-network-outline", config.network_down_entity) : nothing}
                ${config.network_up_entity ? this.statusTile("Sortant", displayState(this.hass, config.network_up_entity), "mdi:upload-network-outline", config.network_up_entity) : nothing}
              </div></div>`
            : nothing}
          ${hasUps
            ? html`<div class="dialog-section"><div class="dialog-section-title">Onduleur</div><div class="grid two">
                ${this.statusTile("Connexion", upsConnected, "mdi:power-plug-outline", config.ups_connected_entity || config.ups_status_entity)}
                ${config.ups_status_entity ? this.statusTile("État", displayState(this.hass, config.ups_status_entity), "mdi:information-outline", config.ups_status_entity) : nothing}
                ${config.ups_battery_entity ? this.statusTile("Batterie", displayState(this.hass, config.ups_battery_entity), "mdi:battery-high", config.ups_battery_entity, batteryLevel) : nothing}
                ${config.ups_load_entity ? this.statusTile("Charge", displayState(this.hass, config.ups_load_entity), "mdi:gauge", config.ups_load_entity) : nothing}
                ${config.ups_runtime_entity ? this.statusTile("Autonomie", displayState(this.hass, config.ups_runtime_entity), "mdi:timer-outline", config.ups_runtime_entity) : nothing}
              </div></div>`
            : nothing}
          <div class="dialog-section">
            <div class="dialog-section-title">Services</div>
            <div class="actions">
              ${this.renderWakeButton(online, config.wake_entity, "Démarrer le serveur", "action primary")}
              ${config.array_start_entity ? html`<button class="action primary" aria-busy=${arrayStartPending ? "true" : "false"} ?disabled=${!online || arrayStartPending || !commandAvailable(this.hass, config.array_start_entity)} @click=${this.startArray}><ha-icon icon="mdi:play"></ha-icon>${arrayStartPending ? "Démarrage…" : "Démarrer l’array"}</button>` : nothing}
              ${serverUrl ? html`<button class="action primary" @click=${() => window.open(serverUrl, "_blank", "noopener,noreferrer")}><ha-icon icon="mdi:open-in-new"></ha-icon>Ouvrir UNRAID</button>` : nothing}
            </div>
          </div>
          ${hasDangerActions
            ? html`<div class="dialog-danger-zone"><div class="dialog-section-title">Zone sensible</div><div class="actions">
                ${config.array_stop_entity ? html`<button class="action danger" ?disabled=${!online || !commandAvailable(this.hass, config.array_stop_entity)} @click=${this.confirmArrayStop}><ha-icon icon="mdi:stop-circle-outline"></ha-icon>Arrêter l’array</button>` : nothing}
                ${config.restart_entity ? html`<button class="action danger" ?disabled=${!online || !commandAvailable(this.hass, config.restart_entity)} @click=${() => this.confirmServerAction("restart")}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer le serveur</button>` : nothing}
                ${config.shutdown_entity ? html`<button class="action danger" ?disabled=${!online || !commandAvailable(this.hass, config.shutdown_entity)} @click=${() => this.confirmServerAction("shutdown")}><ha-icon icon="mdi:power"></ha-icon>Éteindre le serveur</button>` : nothing}
              </div></div>`
            : nothing}
        </div>
      `,
    );
  }
}
