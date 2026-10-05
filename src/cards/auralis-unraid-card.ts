import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type {
  ManagedService,
  ManagedVm,
  UnraidCardConfig,
  UnraidDisk,
} from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { activateEntity, deactivateEntity } from "../utils/actions";
import {
  clamp,
  displayState,
  domainOf,
  entity,
  isActive,
  isAvailable,
  numericState,
} from "../utils/entities";

type ServiceTab = "docker" | "vm";
type ServiceFilter = "all" | "active" | "stopped" | "paused";
type ServiceAction = "start" | "stop" | "restart" | "pause" | "resume";

export type UnraidWorkloadState = "active" | "paused" | "stopped" | "unavailable";

export function unraidWorkloadState(state?: HassEntity): UnraidWorkloadState {
  if (!isAvailable(state)) return "unavailable";
  const value = state!.state.toLowerCase();
  if (value === "paused" || value === "suspended") return "paused";
  return isActive(state) ? "active" : "stopped";
}

export function unraidPercentage(state?: HassEntity): number | undefined {
  if (!isAvailable(state)) return undefined;
  const value = numericState(state, Number.NaN);
  return Number.isFinite(value) ? clamp(value) : undefined;
}

export function unraidStateIsHealthy(
  state: HassEntity | undefined,
  healthyState = "on",
): boolean {
  return Boolean(
    isAvailable(state) && state!.state.toLowerCase() === healthyState.trim().toLowerCase(),
  );
}

function unraidNumber(state?: HassEntity): number | undefined {
  if (!isAvailable(state)) return undefined;
  const value = numericState(state, Number.NaN);
  return Number.isFinite(value) ? value : undefined;
}

export function unraidActionAvailable(
  hass: HomeAssistant | undefined,
  entityId?: string,
): boolean {
  return Boolean(entityId && isAvailable(entity(hass, entityId)));
}

export function unraidActionEntity(
  item: ManagedService | ManagedVm,
  action: ServiceAction,
): string | undefined {
  if (action === "start") return item.start_entity || (domainOf(item.entity) === "switch" ? item.entity : undefined);
  if (action === "stop") return item.stop_entity || (domainOf(item.entity) === "switch" ? item.entity : undefined);
  if (action === "restart") return item.restart_entity;
  if (action === "pause") return (item as ManagedVm).pause_entity;
  return (item as ManagedVm).resume_entity;
}

function percentageLabel(value: number | undefined): string {
  return value === undefined ? "—" : `${Math.round(value)}%`;
}

export class AuralisUnraidCard extends AuralisBaseCard<UnraidCardConfig> {
  static styles = [
    AuralisBaseCard.styles,
    css`
      .array-card {
        margin-bottom: 10px;
      }

      .disk-dots {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 5px;
      }

      .disk-dots span {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: var(--auralis-healthy);
      }

      .service-count {
        font-size: 26px;
        font-weight: 740;
        letter-spacing: -0.05em;
      }

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

      .service-icon {
        display: grid;
        width: 38px;
        height: 38px;
        place-items: center;
        border-radius: 12px;
        background: var(--auralis-accent-soft);
        color: var(--auralis-info);
      }

      .selection {
        grid-column: 1;
      }

      .service-main {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 10px;
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

      .danger-zone {
        margin-top: 10px;
        border-color: color-mix(in srgb, var(--auralis-danger) 40%, transparent);
      }

      .service-actions {
        display: flex;
        max-width: 250px;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 6px;
      }

      .service-actions .action {
        min-height: 36px;
        padding: 6px 9px;
        font-size: 11px;
      }

      .service-actions .action ha-icon {
        --mdc-icon-size: 16px;
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
        font-size: 11px;
        font-weight: 700;
      }

      .disk-row {
        padding: 12px;
        border: 1px solid var(--auralis-border);
        border-radius: 16px;
        background: var(--auralis-layer);
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
        font-size: 11px;
      }

      .disk-meta {
        margin-top: 9px;
        color: var(--auralis-muted);
        font-size: 11px;
      }

      .disk-row .progress {
        height: 6px;
        margin-top: 9px;
      }

      .disk-row .progress > span {
        background: var(--machine-accent, var(--auralis-info));
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
        .service-actions {
          grid-column: 2;
          max-width: none;
          justify-content: flex-start;
        }

        .parity-summary {
          grid-template-columns: 1fr;
        }
      }
    `,
  ];

  private serviceTab: ServiceTab = "docker";
  private serviceFilter: ServiceFilter = "all";
  private query = "";
  private selected = new Set<string>();

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
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        { name: "status_entity", required: true, selector: { entity: {} } },
        { name: "array_state_entity", selector: { entity: {} } },
        { name: "uptime_entity", selector: { entity: {} } },
        { name: "version_entity", selector: { entity: {} } },
        { name: "array_usage_entity", selector: { entity: {} } },
        { name: "array_label_entity", selector: { entity: {} } },
        { name: "healthy_disks_entity", selector: { entity: {} } },
        { name: "total_disks_entity", selector: { entity: {} } },
        { name: "parity_entity", selector: { entity: {} } },
        { name: "parity_healthy_state", selector: { text: {} } },
        { name: "parity_age_entity", selector: { entity: {} } },
        { name: "parity_errors_entity", selector: { entity: {} } },
        { name: "cpu_entity", selector: { entity: {} } },
        { name: "cpu_temperature_entity", selector: { entity: {} } },
        { name: "disk_temperature_entity", selector: { entity: {} } },
        { name: "memory_entity", selector: { entity: {} } },
        { name: "network_down_entity", selector: { entity: {} } },
        { name: "network_up_entity", selector: { entity: {} } },
        { name: "docker_cpu_entity", selector: { entity: {} } },
        { name: "docker_memory_entity", selector: { entity: {} } },
        { name: "updates_entity", selector: { entity: {} } },
        { name: "notifications_entity", selector: { entity: {} } },
        { name: "ups_connected_entity", selector: { entity: {} } },
        { name: "ups_status_entity", selector: { entity: {} } },
        { name: "ups_battery_entity", selector: { entity: {} } },
        { name: "ups_load_entity", selector: { entity: {} } },
        { name: "ups_runtime_entity", selector: { entity: {} } },
        { name: "server_url_entity", selector: { entity: {} } },
        { name: "array_start_entity", selector: { entity: {} } },
        { name: "array_stop_entity", selector: { entity: {} } },
        { name: "restart_entity", selector: { entity: {} } },
        { name: "shutdown_entity", selector: { entity: {} } },
        { name: "background_image", selector: { text: {} } },
        { name: "background_position", selector: { text: {} } },
        { name: "image_opacity", selector: { number: { min: 0, max: 100, step: 1, mode: "slider" } } },
        { name: "card_background", selector: { object: {} } },
        { name: "show_grid", selector: { boolean: {} } },
        { name: "accent_color", selector: { text: {} } },
        { name: "image_brightness", selector: { number: { min: 30, max: 100, step: 1, mode: "slider" } } },
        { name: "glass_opacity", selector: { number: { min: 0.45, max: 0.96, step: 0.01, mode: "slider" } } },
      ],
      computeHelper: (schema: { name?: string }) =>
        schema.name === "array_stop_entity" ? "Les listes de disques, Docker et VM se configurent en YAML." : undefined,
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
    const online = isAvailable(status) && isActive(status);
    const available = isAvailable(status);
    const usage = unraidPercentage(entity(this.hass, this.config.array_usage_entity));
    const healthyValue = unraidNumber(entity(this.hass, this.config.healthy_disks_entity));
    const totalValue = unraidNumber(entity(this.hass, this.config.total_disks_entity));
    const monitoredDisks = (this.config.disks || []).filter((disk) =>
      isAvailable(entity(this.hass, disk.status_entity)),
    );
    const derivedHealthy = monitoredDisks.filter((disk) =>
      unraidStateIsHealthy(entity(this.hass, disk.status_entity), disk.healthy_state || "on"),
    ).length;
    const healthy = healthyValue === undefined
      ? monitoredDisks.length
        ? derivedHealthy
        : undefined
      : Math.round(healthyValue);
    const total = totalValue === undefined
      ? monitoredDisks.length || undefined
      : Math.round(totalValue);
    const activeDocker = (this.config.docker || []).filter((item) => this.itemActive(item)).length;
    const activeVms = (this.config.vms || []).filter((item) => this.itemActive(item)).length;
    const totalDocker = this.config.docker?.length || 0;
    const totalVms = this.config.vms?.length || 0;
    const memory = unraidPercentage(entity(this.hass, this.config.memory_entity));
    const diskHealth = healthy !== undefined && total ? clamp((healthy / total) * 100) : undefined;
    const diskTemperatureEntity = this.config.disk_temperature_entity || this.config.cpu_temperature_entity;
    const temperatureLabel = this.config.disk_temperature_entity ? "Disque max." : "CPU";
    const parityState = entity(this.hass, this.config.parity_entity);
    const parityHealthy = this.config.parity_healthy_state
      ? unraidStateIsHealthy(parityState, this.config.parity_healthy_state)
      : isAvailable(parityState) &&
        /^(ok|valid|valide|healthy|protected|protégée)$/i.test(parityState!.state.trim());
    const parityLabel = !this.config.parity_entity
      ? "—"
      : !isAvailable(parityState)
        ? "Indisponible"
        : parityHealthy
          ? "Valide"
          : displayState(this.hass, this.config.parity_entity);
    const contextTitle = this.config.parity_entity
      ? "Parité"
      : this.config.array_state_entity
        ? "Array"
        : this.config.updates_entity || this.config.notifications_entity
          ? "Surveillance"
          : "Système";
    const contextText = this.config.parity_entity
      ? `${parityLabel}${this.config.parity_age_entity ? ` · vérifiée ${displayState(this.hass, this.config.parity_age_entity)}` : ""}`
      : this.config.array_state_entity
        ? displayState(this.hass, this.config.array_state_entity)
        : [
            this.config.updates_entity ? `${displayState(this.hass, this.config.updates_entity)} mises à jour` : "",
            this.config.notifications_entity ? `${displayState(this.hass, this.config.notifications_entity)} notifications` : "",
          ].filter(Boolean).join(" · ") || "—";
    const statusLabel = !available
      ? "état indisponible"
      : online
        ? parityHealthy
          ? "array protégée"
          : "serveur en ligne"
        : "serveur hors ligne";
    const machineStyle = this.machineStyle("#ff7b55");

    return html`
      <ha-card>
        <div class="machine-shell ${this.machineGridClass()}" style=${machineStyle}>
          <div class="machine-content">
            <header class="machine-header"><div><h2>${this.config.name}</h2><div class="machine-status"><span class="dot ${online ? "healthy" : "danger"}"></span>UNRAID · ${statusLabel}</div></div></header>
            <div class="machine-stat-stack">
              <div class="machine-mini-stat"><small>Utilisé</small><strong>${percentageLabel(usage)}</strong></div>
              <div class="machine-mini-stat"><small>${temperatureLabel}</small><strong>${displayState(this.hass, diskTemperatureEntity)}</strong></div>
            </div>
            <div class="machine-rail">
              <button class="rail-button" @click=${() => this.openDialog("server")} aria-label="Détails"><ha-icon icon="mdi:harddisk"></ha-icon></button>
              <button class="rail-button" @click=${() => this.openServices("docker")} aria-label="Docker"><ha-icon icon="mdi:cube-outline"></ha-icon></button>
              <button class="rail-button" @click=${() => this.openServices("vm")} aria-label="Machines virtuelles"><ha-icon icon="mdi:shield-server-outline"></ha-icon></button>
            </div>
            <div class="machine-gauge" style=${`--value:${usage ?? 0}`}><div class="machine-gauge-content"><strong>${percentageLabel(usage)}</strong><small>${this.config.array_label_entity ? displayState(this.hass, this.config.array_label_entity) : "Array"}</small></div></div>
            <div class="machine-context"><small>${contextTitle}</small><strong>${contextText}</strong></div>
            <section class="machine-panel">
              <div class="machine-panel-head"><div class="machine-panel-title"><small>Array</small><strong>${this.config.array_label_entity ? displayState(this.hass, this.config.array_label_entity) : `${percentageLabel(usage)} utilisés`}</strong></div><button class="machine-accent-action" @click=${() => this.openDialog("server")}><ha-icon icon="mdi:database-outline"></ha-icon>Explorer</button></div>
              <div class="machine-bars">
                <div class="machine-bar"><span>Disques</span><div class="track"><span style=${`width:${diskHealth ?? 0}%`}></span></div><strong>${healthy === undefined || total === undefined ? "—" : `${healthy}/${total}`}</strong></div>
                <div class="machine-bar"><span>RAM</span><div class="track"><span style=${`width:${memory ?? 0}%`}></span></div><strong>${percentageLabel(memory)}</strong></div>
              </div>
              <div class="machine-foot"><span>Docker <strong>${activeDocker}/${totalDocker || "—"} actifs</strong></span><span>VM <strong>${activeVms}/${totalVms || "—"} actives</strong></span></div>
            </section>
          </div>
        </div>
      </ha-card>
      ${this.dialog === "services" ? this.renderServicesDialog() : nothing}
      ${this.dialog === "server" ? this.renderServerDialog() : nothing}
    `;
  }

  private statusTile(label: string, value: string, icon: string): TemplateResult {
    return html`<div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon .icon=${icon}></ha-icon></span></div><div style="margin-top:10px;font-weight:680;">${label}</div><div class="muted">${value}</div></div>`;
  }

  private serviceTile(label: string, active: number, total: number, icon: string, tab: ServiceTab): TemplateResult {
    return html`
      <div class="tile clickable" @click=${() => this.openServices(tab)}>
        <div class="tile-head"><span class="tile-icon"><ha-icon .icon=${icon}></ha-icon></span><span class="service-count">${active}/${total}</span></div>
        <div style="margin-top:10px;font-weight:680;">${label}</div><div class="muted">${active} actif${active > 1 ? "s" : ""}</div>
      </div>
    `;
  }

  private openServices(tab: ServiceTab): void {
    this.serviceTab = tab;
    this.serviceFilter = "all";
    this.query = "";
    this.selected = new Set();
    this.openDialog("services");
  }

  private itemActive(item: ManagedService): boolean {
    return this.itemState(item) === "active";
  }

  private itemPaused(item: ManagedService): boolean {
    return this.itemState(item) === "paused";
  }

  private itemState(item: ManagedService): UnraidWorkloadState {
    return unraidWorkloadState(entity(this.hass, item.entity));
  }

  private serviceItems(): Array<ManagedService | ManagedVm> {
    const items = this.serviceTab === "docker" ? this.config?.docker || [] : this.config?.vms || [];
    const query = this.query.trim().toLocaleLowerCase("fr");
    return items.filter((item) => {
      const matchesQuery = !query || item.name.toLocaleLowerCase("fr").includes(query) || item.group?.toLocaleLowerCase("fr").includes(query);
      const state = this.itemState(item);
      const matchesFilter =
        this.serviceFilter === "all" ||
        (this.serviceFilter === "active" && state === "active") ||
        (this.serviceFilter === "paused" && state === "paused") ||
        (this.serviceFilter === "stopped" && state === "stopped");
      return matchesQuery && matchesFilter;
    });
  }

  private groupedItems(): Map<string, Array<ManagedService | ManagedVm>> {
    const groups = new Map<string, Array<ManagedService | ManagedVm>>();
    for (const item of this.serviceItems()) {
      const group = item.group || (this.serviceTab === "docker" ? "Services" : "Machines virtuelles");
      groups.set(group, [...(groups.get(group) || []), item]);
    }
    return groups;
  }

  private renderServicesDialog(): TemplateResult {
    const all = this.serviceTab === "docker" ? this.config?.docker || [] : this.config?.vms || [];
    const active = all.filter((item) => this.itemActive(item)).length;
    const stopped = all.filter((item) => this.itemState(item) === "stopped").length;
    const paused = all.filter((item) => this.itemPaused(item)).length;
    return this.renderDialog(
      "Services & machines",
      this.serviceTab === "docker" ? "mdi:cube-outline" : "mdi:monitor-multiple",
      html`
        <div class="dialog-body">
          <div class="dialog-overview"><div><span class="eyebrow">${this.serviceTab === "docker" ? "Conteneurs Docker" : "Machines virtuelles"}</span><strong>${active} actif${active > 1 ? "s" : ""} sur ${all.length}</strong><span class="muted">Rechercher, filtrer et piloter sans quitter le tableau de bord</span></div><div class="dialog-stat"><strong>${stopped}</strong><small>arrêté${stopped > 1 ? "s" : ""}</small></div></div>
          <div class="tabs">
            <button class=${this.serviceTab === "docker" ? "active" : ""} @click=${() => this.changeTab("docker")}>Docker · ${this.config?.docker?.length || 0}</button>
            <button class=${this.serviceTab === "vm" ? "active" : ""} @click=${() => this.changeTab("vm")}>Machines virtuelles · ${this.config?.vms?.length || 0}</button>
          </div>
          <input class="search" placeholder=${this.serviceTab === "docker" ? "Rechercher un service" : "Rechercher une VM"} .value=${this.query} @input=${(event: Event) => { this.query = (event.target as HTMLInputElement).value; this.requestUpdate(); }} />
          <div class="filters">
            ${this.filterButton("all", `Tous · ${all.length}`)}
            ${this.filterButton("active", `Actifs · ${active}`)}
            ${this.filterButton("stopped", `Arrêtés · ${stopped}`)}
            ${this.serviceTab === "vm" ? this.filterButton("paused", `Suspendues · ${paused}`) : nothing}
          </div>
          ${this.serviceItems().length
            ? Array.from(this.groupedItems()).map(([group, items]) => html`
                <div class="section-label">${group}</div>
                <div class="list">${items.map((item) => this.renderServiceRow(item))}</div>
              `)
            : html`<div class="empty">Aucun élément ne correspond à ce filtre.</div>`}
        </div>
        <div class="sticky-actions">
          <strong>${this.selected.size} sélectionné${this.selected.size > 1 ? "s" : ""}</strong>
          <div style="display:flex;gap:8px;"><button class="action" @click=${() => { this.selected = new Set(); this.requestUpdate(); }}>Annuler</button><button class="action primary" ?disabled=${!this.selected.size} @click=${this.startSelected}><ha-icon icon="mdi:play"></ha-icon>Démarrer (${this.selected.size})</button></div>
        </div>
      `,
    );
  }

  private filterButton(filter: ServiceFilter, label: string): TemplateResult {
    return html`<button class=${this.serviceFilter === filter ? "active" : ""} @click=${() => { this.serviceFilter = filter; this.requestUpdate(); }}>${label}</button>`;
  }

  private changeTab(tab: ServiceTab): void {
    this.serviceTab = tab;
    this.serviceFilter = "all";
    this.selected = new Set();
    this.requestUpdate();
  }

  private renderServiceRow(item: ManagedService | ManagedVm): TemplateResult {
    const state = this.itemState(item);
    const stateClass = state === "active" ? "healthy" : state === "paused" ? "warning" : "danger";
    const stateLabel = state === "active" ? "Actif" : state === "paused" ? "Suspendue" : state === "stopped" ? "Arrêté" : "Indisponible";
    const isVm = this.serviceTab === "vm";
    const vm = item as ManagedVm;
    const startAvailable = unraidActionAvailable(this.hass, unraidActionEntity(item, "start"));
    return html`
      <div class="list-row">
        <input class="selection" type="checkbox" .checked=${this.selected.has(item.entity)} ?disabled=${state !== "stopped" || !startAvailable} @change=${() => this.toggleSelected(item.entity)} />
        <div class="service-main">
          <span class="service-icon"><ha-icon .icon=${item.icon || (isVm ? "mdi:monitor" : "mdi:cube-outline")}></ha-icon></span>
          <div class="meta">
            <div class="name">${item.name}</div>
            <div class="state"><span class="dot ${stateClass}" style="display:inline-block;margin-right:5px;"></span>${stateLabel}${item.cpu_entity ? ` · CPU ${displayState(this.hass, item.cpu_entity)}` : ""}</div>
            ${isVm ? html`<div class="resource-tags">${vm.vcpus ? html`<span>${vm.vcpus} vCPU</span>` : nothing}${vm.memory ? html`<span>${vm.memory}</span>` : nothing}${vm.storage ? html`<span>${vm.storage}</span>` : nothing}${vm.ip_entity ? html`<span>${displayState(this.hass, vm.ip_entity)}</span>` : nothing}</div>` : nothing}
          </div>
        </div>
        ${this.renderServiceActions(item, state)}
      </div>
    `;
  }

  private renderServiceActions(item: ManagedService | ManagedVm, state: UnraidWorkloadState): TemplateResult {
    const vm = item as ManagedVm;
    const isVm = this.serviceTab === "vm";
    const actionButton = (
      action: ServiceAction,
      label: string,
      icon: string,
      style = "",
      confirm = false,
    ): TemplateResult => {
      const entityId = unraidActionEntity(item, action);
      if (!entityId) return html``;
      const enabled = state !== "unavailable" && unraidActionAvailable(this.hass, entityId);
      const handler = confirm
        ? () => this.confirmItemAction(item, action)
        : () => this.runItemAction(item, action);
      return html`<button class=${`action ${style}`.trim()} ?disabled=${!enabled} @click=${handler}><ha-icon .icon=${icon}></ha-icon>${label}</button>`;
    };

    return html`
      <div class="service-actions">
        ${state === "stopped" ? actionButton("start", "Démarrer", "mdi:play", "primary") : nothing}
        ${state === "paused" ? actionButton("resume", "Reprendre", "mdi:play", "primary") : nothing}
        ${state === "active" && isVm ? actionButton("pause", "Pause", "mdi:pause") : nothing}
        ${state === "active" ? actionButton("restart", "Redémarrer", "mdi:restart", "", true) : nothing}
        ${state === "active" || state === "paused"
          ? actionButton("stop", isVm ? "Éteindre" : "Arrêter", "mdi:stop-circle-outline", "danger", true)
          : nothing}
        ${isVm && vm.console_url
          ? html`<button class="action" @click=${() => window.open(vm.console_url, "_blank", "noopener,noreferrer")}><ha-icon icon="mdi:console"></ha-icon>Console</button>`
          : nothing}
      </div>
    `;
  }

  private toggleSelected(entityId: string): void {
    const next = new Set(this.selected);
    next.has(entityId) ? next.delete(entityId) : next.add(entityId);
    this.selected = next;
    this.requestUpdate();
  }

  private async runItemAction(
    item: ManagedService | ManagedVm,
    action: ServiceAction,
  ): Promise<void> {
    const entityId = unraidActionEntity(item, action);
    if (!unraidActionAvailable(this.hass, entityId)) return;
    const usesSwitchFallback =
      (action === "start" && !item.start_entity && entityId === item.entity) ||
      (action === "stop" && !item.stop_entity && entityId === item.entity);
    if (action === "stop" && usesSwitchFallback) {
      await deactivateEntity(this.hass!, entityId);
      return;
    }
    await activateEntity(this.hass!, entityId);
  }

  private async startItem(item: ManagedService): Promise<void> {
    await this.runItemAction(item, "start");
  }

  private confirmItemAction(item: ManagedService | ManagedVm, action: ServiceAction): void {
    const entityId = unraidActionEntity(item, action);
    if (!unraidActionAvailable(this.hass, entityId)) return;
    const restart = action === "restart";
    const isVm = this.serviceTab === "vm";
    const actionLabel = restart ? "Redémarrer" : isVm ? "Éteindre" : "Arrêter";
    this.askConfirmation({
      title: `${actionLabel} ${item.name} ?`,
      message: restart
        ? "Le service sera brièvement indisponible pendant son redémarrage."
        : isVm
          ? "La machine virtuelle et ses services deviendront indisponibles."
          : "Le conteneur et le service qu’il fournit deviendront indisponibles.",
      confirmLabel: actionLabel,
      action: () => this.runItemAction(item, action),
    });
    this.dialog = "services";
  }

  private startSelected = async (): Promise<void> => {
    const all = [...(this.config?.docker || []), ...(this.config?.vms || [])];
    const selected = all.filter((item) => this.selected.has(item.entity));
    await Promise.all(selected.map((item) => this.startItem(item)));
    this.selected = new Set();
    this.requestUpdate();
  };

  private confirmArrayStop = (): void => {
    if (!unraidActionAvailable(this.hass, this.config?.array_stop_entity)) return;
    this.askConfirmation({
      title: "Arrêter l’array ?",
      message: "Les partages, conteneurs et machines virtuelles dépendants pourront devenir indisponibles.",
      confirmLabel: "Arrêter l’array",
      action: () => activateEntity(this.hass!, this.config?.array_stop_entity),
    });
    this.dialog = "server";
  };

  private confirmServerAction(action: "restart" | "shutdown"): void {
    const restart = action === "restart";
    const entityId = restart ? this.config?.restart_entity : this.config?.shutdown_entity;
    if (!unraidActionAvailable(this.hass, entityId)) return;
    this.askConfirmation({
      title: `${restart ? "Redémarrer" : "Éteindre"} le serveur ?`,
      message: "L’array, les conteneurs Docker et les machines virtuelles pourront devenir indisponibles.",
      confirmLabel: restart ? "Redémarrer" : "Éteindre",
      action: () => activateEntity(this.hass!, entityId),
    });
    this.dialog = "server";
  }

  private renderDiskRow(disk: UnraidDisk): TemplateResult {
    const usage = unraidPercentage(entity(this.hass, disk.usage_entity));
    const status = entity(this.hass, disk.status_entity);
    const healthy = unraidStateIsHealthy(status, disk.healthy_state || "on");
    const stateClass = !disk.status_entity || healthy ? "healthy" : "danger";
    const stateLabel = !disk.status_entity
      ? "Suivi"
      : !isAvailable(status)
        ? "Indisponible"
        : healthy
          ? "Sain"
          : "À contrôler";
    return html`
      <div class="disk-row">
        <div class="disk-row-head">
          <strong>${disk.name}</strong>
          <span class="disk-state"><span class="dot ${stateClass}"></span>${stateLabel}</span>
        </div>
        <div class="progress"><span style=${`width:${usage ?? 0}%`}></span></div>
        <div class="disk-meta">
          <span>${disk.capacity_entity ? displayState(this.hass, disk.capacity_entity) : `${percentageLabel(usage)} utilisés`}</span>
          ${disk.temperature_entity ? html`<span>${displayState(this.hass, disk.temperature_entity)}</span>` : nothing}
        </div>
      </div>
    `;
  }

  private groupedDisks(disks: UnraidDisk[]): Map<string, UnraidDisk[]> {
    const groups = new Map<string, UnraidDisk[]>();
    for (const disk of disks) {
      const group = disk.group || "Stockage";
      groups.set(group, [...(groups.get(group) || []), disk]);
    }
    return groups;
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

  private renderServerDialog(): TemplateResult {
    const usage = unraidPercentage(entity(this.hass, this.config?.array_usage_entity));
    const activeDocker = (this.config?.docker || []).filter((item) => this.itemActive(item)).length;
    const activeVms = (this.config?.vms || []).filter((item) => this.itemActive(item)).length;
    const totalDocker = this.config?.docker?.length || 0;
    const totalVms = this.config?.vms?.length || 0;
    const status = entity(this.hass, this.config?.status_entity);
    const online = isAvailable(status) && isActive(status);
    const disks = this.config?.disks || [];
    const parityState = entity(this.hass, this.config?.parity_entity);
    const parityHealthy = this.config?.parity_healthy_state
      ? unraidStateIsHealthy(parityState, this.config.parity_healthy_state)
      : isAvailable(parityState) &&
        /^(ok|valid|valide|healthy|protected|protégée)$/i.test(parityState!.state.trim());
    const parityLabel = !this.config?.parity_entity
      ? "—"
      : !isAvailable(parityState)
        ? "Indisponible"
        : parityHealthy
          ? "Valide"
          : displayState(this.hass, this.config.parity_entity);
    const hasParityDetails = Boolean(
      this.config?.parity_entity ||
      this.config?.parity_age_entity ||
      this.config?.parity_errors_entity,
    );
    const hasMonitoring = Boolean(
      this.config?.version_entity ||
      this.config?.updates_entity ||
      this.config?.notifications_entity,
    );
    const hasNetwork = Boolean(
      this.config?.network_down_entity || this.config?.network_up_entity,
    );
    const hasUps = Boolean(
      this.config?.ups_connected_entity ||
      this.config?.ups_status_entity ||
      this.config?.ups_battery_entity ||
      this.config?.ups_load_entity ||
      this.config?.ups_runtime_entity,
    );
    const hasDockerMetrics = Boolean(
      this.config?.docker_cpu_entity || this.config?.docker_memory_entity,
    );
    const hasDangerActions = Boolean(
      this.config?.array_stop_entity || this.config?.restart_entity || this.config?.shutdown_entity,
    );
    const serverUrl = this.configuredServerUrl();
    const arrayState = this.config?.array_state_entity
      ? displayState(this.hass, this.config.array_state_entity)
      : online
        ? "Démarré"
        : "Indisponible";
    const arrayLabel = this.config?.array_label_entity
      ? displayState(this.hass, this.config.array_label_entity)
      : percentageLabel(usage);
    const upsConnected = this.config?.ups_connected_entity
      ? unraidStateIsHealthy(entity(this.hass, this.config.ups_connected_entity), "on")
        ? "Connecté"
        : "Déconnecté"
      : displayState(this.hass, this.config?.ups_status_entity);
    return this.renderDialog(
      this.config?.name || "Serveur UNRAID",
      "mdi:server",
      html`
        <div class="dialog-body">
          <div class="dialog-overview"><div><span class="eyebrow">État du serveur</span><strong>Serveur ${online ? "en ligne" : "indisponible"}</strong><span class="muted">${this.config?.uptime_entity ? `En service depuis ${displayState(this.hass, this.config.uptime_entity)}` : "Stockage et services disponibles"}</span></div><div class="dialog-stat"><strong>${percentageLabel(usage)}</strong><small>utilisé</small></div></div>
          <div class="dialog-section-title">Stockage et santé</div>
          <div class="grid two">
            ${this.statusTile("Array", `${arrayState} · ${arrayLabel}`, "mdi:database-outline")}
            ${this.statusTile("CPU", `${displayState(this.hass, this.config?.cpu_entity)} · ${displayState(this.hass, this.config?.cpu_temperature_entity)}`, "mdi:cpu-64-bit")}
            ${this.statusTile("RAM", displayState(this.hass, this.config?.memory_entity), "mdi:memory")}
            ${hasDockerMetrics
              ? this.statusTile("Docker", `CPU ${displayState(this.hass, this.config?.docker_cpu_entity)} · RAM ${displayState(this.hass, this.config?.docker_memory_entity)}`, "mdi:docker")
              : this.statusTile("Parité", parityLabel, "mdi:shield-check-outline")}
          </div>
          ${hasMonitoring
            ? html`<div class="parity-summary">
                ${this.config?.version_entity ? html`<div class="dialog-stat"><strong>${displayState(this.hass, this.config.version_entity)}</strong><small>version UNRAID</small></div>` : nothing}
                ${this.config?.updates_entity ? html`<div class="dialog-stat"><strong>${displayState(this.hass, this.config.updates_entity)}</strong><small>mises à jour</small></div>` : nothing}
                ${this.config?.notifications_entity ? html`<div class="dialog-stat"><strong>${displayState(this.hass, this.config.notifications_entity)}</strong><small>notifications</small></div>` : nothing}
              </div>`
            : nothing}
          ${hasParityDetails
            ? html`<div class="dialog-section"><div class="dialog-section-title">Parité</div><div class="parity-summary">
                ${this.config?.parity_entity ? html`<div class="dialog-stat"><strong>${parityLabel}</strong><small>état</small></div>` : nothing}
                ${this.config?.parity_age_entity ? html`<div class="dialog-stat"><strong>${displayState(this.hass, this.config.parity_age_entity)}</strong><small>dernière vérification</small></div>` : nothing}
                ${this.config?.parity_errors_entity ? html`<div class="dialog-stat"><strong>${displayState(this.hass, this.config.parity_errors_entity)}</strong><small>erreurs détectées</small></div>` : nothing}
              </div></div>`
            : nothing}
          ${disks.length
            ? html`<div class="dialog-section"><div class="dialog-section-title">Détail des disques</div>${Array.from(this.groupedDisks(disks)).map(([group, items]) => html`<div class="disk-group"><div class="disk-group-title">${group}</div><div class="disk-list">${items.map((disk) => this.renderDiskRow(disk))}</div></div>`)}</div>`
            : nothing}
          ${hasNetwork
            ? html`<div class="dialog-section"><div class="dialog-section-title">Activité réseau</div><div class="grid two">
                ${this.config?.network_down_entity ? this.statusTile("Entrant", displayState(this.hass, this.config.network_down_entity), "mdi:download-network-outline") : nothing}
                ${this.config?.network_up_entity ? this.statusTile("Sortant", displayState(this.hass, this.config.network_up_entity), "mdi:upload-network-outline") : nothing}
              </div></div>`
            : nothing}
          ${hasUps
            ? html`<div class="dialog-section"><div class="dialog-section-title">Onduleur</div><div class="grid two">
                ${this.statusTile("Connexion", upsConnected, "mdi:power-plug-outline")}
                ${this.config?.ups_status_entity ? this.statusTile("État", displayState(this.hass, this.config.ups_status_entity), "mdi:information-outline") : nothing}
                ${this.config?.ups_battery_entity ? this.statusTile("Batterie", displayState(this.hass, this.config.ups_battery_entity), "mdi:battery-high") : nothing}
                ${this.config?.ups_load_entity ? this.statusTile("Charge", displayState(this.hass, this.config.ups_load_entity), "mdi:gauge") : nothing}
                ${this.config?.ups_runtime_entity ? this.statusTile("Autonomie", displayState(this.hass, this.config.ups_runtime_entity), "mdi:timer-outline") : nothing}
              </div></div>`
            : nothing}
          <div class="dialog-section">
            <div class="dialog-section-title">Services</div>
            <div class="actions">
              ${this.config?.array_start_entity ? html`<button class="action primary" ?disabled=${!unraidActionAvailable(this.hass, this.config.array_start_entity)} @click=${() => activateEntity(this.hass!, this.config?.array_start_entity)}><ha-icon icon="mdi:play"></ha-icon>Démarrer l’array</button>` : nothing}
              <button class="action" @click=${() => this.openServices("docker")}><ha-icon icon="mdi:cube-outline"></ha-icon>Docker · ${activeDocker}/${totalDocker}</button>
              <button class="action" @click=${() => this.openServices("vm")}><ha-icon icon="mdi:monitor-multiple"></ha-icon>VM · ${activeVms}/${totalVms}</button>
              ${serverUrl ? html`<button class="action primary" @click=${() => window.open(serverUrl, "_blank", "noopener,noreferrer")}><ha-icon icon="mdi:open-in-new"></ha-icon>Ouvrir UNRAID</button>` : nothing}
            </div>
          </div>
          ${hasDangerActions
            ? html`<div class="dialog-danger-zone"><div class="dialog-section-title">Zone sensible</div><div class="actions">
                ${this.config?.array_stop_entity ? html`<button class="action danger" ?disabled=${!unraidActionAvailable(this.hass, this.config.array_stop_entity)} @click=${this.confirmArrayStop}><ha-icon icon="mdi:stop-circle-outline"></ha-icon>Arrêter l’array</button>` : nothing}
                ${this.config?.restart_entity ? html`<button class="action danger" ?disabled=${!unraidActionAvailable(this.hass, this.config.restart_entity)} @click=${() => this.confirmServerAction("restart")}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer le serveur</button>` : nothing}
                ${this.config?.shutdown_entity ? html`<button class="action danger" ?disabled=${!unraidActionAvailable(this.hass, this.config.shutdown_entity)} @click=${() => this.confirmServerAction("shutdown")}><ha-icon icon="mdi:power"></ha-icon>Éteindre le serveur</button>` : nothing}
              </div></div>`
            : nothing}
        </div>
      `,
    );
  }
}
