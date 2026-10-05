import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { PcCardConfig, PcDriveConfig, PcNetworkInterfaceConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { activateEntity } from "../utils/actions";
import { clamp, displayState, entity, friendlyName, isActive, isAvailable, numericState } from "../utils/entities";

export type PcAvailability = "online" | "offline" | "unavailable";
export type PcPowerAction = "shutdown" | "wake" | null;

const OFFLINE_STATES = new Set(["off", "offline", "disconnected", "not_home", "stopped"]);

export function pcAvailability(state?: HassEntity): PcAvailability {
  if (!state || !isAvailable(state)) return "unavailable";
  if (isActive(state)) return "online";
  if (OFFLINE_STATES.has(state.state.toLowerCase())) return "offline";
  return state.entity_id.startsWith("sensor.") ? "online" : "offline";
}

export function pcPowerAction(availability: PcAvailability): PcPowerAction {
  if (availability === "online") return "shutdown";
  if (availability === "offline") return "wake";
  return null;
}

export function pcPercentage(state?: HassEntity): number | undefined {
  if (!isAvailable(state)) return undefined;
  const value = numericState(state, Number.NaN);
  return Number.isFinite(value) ? clamp(value) : undefined;
}

export function pcTemperature(state?: HassEntity): number | undefined {
  if (!state || !isAvailable(state)) return undefined;
  const value = numericState(state, Number.NaN);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function attributeNumber(state: HassEntity | undefined, names: string[]): number | undefined {
  if (!state) return undefined;
  const entries = Object.entries(state.attributes);
  for (const name of names) {
    const match = entries.find(([key]) => key.toLowerCase() === name.toLowerCase());
    if (!match) continue;
    const parsed = typeof match[1] === "number" ? match[1] : Number.parseFloat(String(match[1]).replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function pcDriveUsage(state?: HassEntity): number | undefined {
  if (!state || !isAvailable(state)) return undefined;
  const value = attributeNumber(state, ["UsedSpacePercentage", "used_space_percentage", "used_percentage"]);
  if (value !== undefined) return clamp(value);
  return pcPercentage(state);
}

function formatStorage(megabytes: number): string {
  if (megabytes >= 1024) return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(megabytes / 1024)} Go`;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(megabytes)} Mo`;
}

export function pcDriveSummary(state?: HassEntity): string {
  if (!state || !isAvailable(state)) return "—";
  const used = attributeNumber(state, ["UsedSpaceMB", "used_space_mb"]);
  const total = attributeNumber(state, ["TotalSizeMB", "total_size_mb"]);
  if (used === undefined || total === undefined || total <= 0) return percentageLabel(pcDriveUsage(state));
  return `${formatStorage(used)} / ${formatStorage(total)}`;
}

export function pcUptimeLabel(state?: HassEntity, now = Date.now()): string {
  if (!state || !isAvailable(state)) return "—";
  const startedAt = Date.parse(state.state);
  if (!Number.isFinite(startedAt)) return "—";
  const totalMinutes = Math.max(0, Math.floor((now - startedAt) / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days > 0 ? `${days} j ` : ""}${hours} h ${minutes} min`;
}

export function pcSessionLabel(state?: HassEntity): string {
  if (!state || !isAvailable(state)) return "—";
  const labels: Record<string, string> = {
    active: "Active",
    connected: "Connectée",
    disconnected: "Déconnectée",
    locked: "Verrouillée",
    unlocked: "Déverrouillée",
  };
  return labels[state.state.toLowerCase()] || state.state;
}

export function pcActionAvailable(hass: HomeAssistant | undefined, entityId?: string): boolean {
  return Boolean(entityId && isAvailable(entity(hass, entityId)));
}

function percentageLabel(value: number | undefined): string {
  return value === undefined ? "—" : `${Math.round(value)}%`;
}

function pcBooleanLabel(state?: HassEntity, trueLabel = "Muet", falseLabel = "Actif"): string {
  if (!state || !isAvailable(state)) return "—";
  return ["true", "on", "yes", "1"].includes(state.state.toLowerCase()) ? trueLabel : falseLabel;
}

function pcNetworkLabel(state?: HassEntity): string {
  if (!state || !isAvailable(state)) return "Indisponible";
  return ["up", "on", "online", "connected", "active"].includes(state.state.toLowerCase()) ? "Connecté" : "Déconnecté";
}

function nonNegativeState(hass: HomeAssistant | undefined, entityId?: string): string {
  const state = entity(hass, entityId);
  if (!isAvailable(state)) return "—";
  const value = numericState(state, Number.NaN);
  return Number.isFinite(value) && value < 0 ? "—" : displayState(hass, entityId);
}

export class AuralisPcCard extends AuralisBaseCard<PcCardConfig> {
  static styles = [
    AuralisBaseCard.styles,
    css`
      .pc-shell, .pc-content { min-height: 530px; }
      .pc-header { padding-right: 82px; }
      .machine-stat-stack { right: 0; }
      .machine-gauge { margin-top: 50px; }
      .machine-context { max-width: 170px; }
      .machine-context span { display: block; margin-top: 6px; color: #91a0b2; font-size: 9px; }
      .machine-panel { max-height: 285px; overflow: auto; }
      .machine-bar { grid-template-columns: 72px minmax(0, 1fr) 46px; }
      .machine-bar > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pc-foot-item { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pc-dialog { max-width: 820px; }
      .pc-detail-section + .pc-detail-section { margin-top: 22px; }
      .pc-drive-row, .pc-network-row, .pc-info-row { padding: 12px 0; border-bottom: 1px solid var(--auralis-border); }
      .pc-drive-row:last-child, .pc-network-row:last-child, .pc-info-row:last-child { border-bottom: 0; }
      .pc-drive-top, .pc-network-row, .pc-info-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .pc-drive-top span, .pc-network-row span, .pc-info-row span { min-width: 0; color: var(--auralis-muted); font-size: 12px; }
      .pc-drive-top strong, .pc-network-row strong, .pc-info-row strong { min-width: 0; overflow-wrap: anywhere; text-align: right; }
      .pc-network-state { display: inline-flex; align-items: center; gap: 7px; }
      .pc-audio-device { padding: 14px; border: 1px solid var(--auralis-border); border-radius: 18px; background: var(--auralis-layer); }
      .pc-audio-device + .pc-audio-device { margin-top: 10px; }
      .pc-audio-device > strong { display: block; margin-top: 9px; overflow-wrap: anywhere; }
      .pc-audio-meta { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 10px; color: var(--auralis-muted); font-size: 12px; }
      @container (max-width: 290px) {
        .pc-header { padding-right: 0; }
        .machine-stat-stack { display: none; }
        .machine-gauge { margin-top: 36px; }
        .machine-bar { grid-template-columns: 58px minmax(0, 1fr) 40px; }
      }
    `,
  ];

  public setConfig(config: PcCardConfig): void {
    if (!config.online_entity) throw new Error("online_entity est obligatoire.");
    this.config = { ...config, name: config.name || "PC Bureau", theme: config.theme || "auto" };
  }

  static getStubConfig(): Partial<PcCardConfig> {
    return { name: "PC Bureau", theme: "carbon", online_entity: "binary_sensor.pc_online" };
  }

  static getConfigForm(): Record<string, unknown> {
    const entityFields = [
      "online_entity", "uptime_entity", "last_boot_entity", "last_activity_entity", "system_state_entity", "user_entity", "session_entity",
      "cpu_entity", "cpu_temperature_entity", "gpu_entity", "gpu_temperature_entity", "memory_entity", "clock_speed_entity",
      "storage_entity", "storage_label_entity", "network_down_entity", "network_up_entity", "network_total_entity",
      "battery_percentage_entity", "battery_status_entity", "battery_powerline_entity", "battery_remaining_entity", "battery_full_lifetime_entity",
      "audio_output_entity", "audio_output_state_entity", "audio_output_volume_entity", "audio_output_muted_entity", "audio_input_entity",
      "audio_input_state_entity", "audio_input_volume_entity", "audio_input_muted_entity", "audio_input_devices_entity", "audio_output_devices_entity",
      "audio_peak_entity", "audio_sessions_entity", "lock_entity", "sleep_entity", "restart_entity", "shutdown_entity", "wake_entity",
    ];
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        ...entityFields.map((name) => ({ name, required: name === "online_entity", selector: { entity: {} } })),
        { name: "drives", selector: { object: {} } },
        { name: "network_interfaces", selector: { object: {} } },
        { name: "card_background", selector: { object: {} } },
        { name: "show_grid", selector: { boolean: {} } },
        { name: "background_image", selector: { text: {} } },
        { name: "background_position", selector: { text: {} } },
        { name: "image_opacity", selector: { number: { min: 0, max: 100, step: 1, mode: "slider" } } },
        { name: "accent_color", selector: { text: {} } },
        { name: "image_brightness", selector: { number: { min: 30, max: 100, step: 1, mode: "slider" } } },
        { name: "glass_opacity", selector: { number: { min: 0.45, max: 0.96, step: 0.01, mode: "slider" } } },
      ],
    };
  }

  public getCardSize(): number { return 11; }
  public getGridOptions(): Record<string, number> { return { rows: 11, min_rows: 10, columns: 6, min_columns: 3 }; }

  protected render(): TemplateResult {
    if (!this.config || !this.hass) return html``;
    const availability = pcAvailability(entity(this.hass, this.config.online_entity));
    const cpu = pcPercentage(entity(this.hass, this.config.cpu_entity));
    const gpu = pcPercentage(entity(this.hass, this.config.gpu_entity));
    const memory = pcPercentage(entity(this.hass, this.config.memory_entity));
    const cpuTemperature = this.temperatureLabel(this.config.cpu_temperature_entity);
    const gpuTemperature = this.temperatureLabel(this.config.gpu_temperature_entity);
    const drives = this.validDrives();
    const sessionState = entity(this.hass, this.config.session_entity);
    const userState = entity(this.hass, this.config.user_entity);
    const session = isAvailable(sessionState) ? pcSessionLabel(sessionState) : undefined;
    const user = isAvailable(userState) ? displayState(this.hass, this.config.user_entity) : undefined;
    const uptime = this.uptimeLabel();
    const battery = pcPercentage(entity(this.hass, this.config.battery_percentage_entity));
    const systemState = this.availableDisplay(this.config.system_state_entity);
    const networkDown = this.availableDisplay(this.config.network_down_entity);
    const networkUp = this.availableDisplay(this.config.network_up_entity);
    const machineStyle = this.machineStyle("#7898ff");
    const statusLabel = availability === "online" ? "En ligne et disponible" : availability === "offline" ? "Hors ligne" : "État indisponible";
    const statusClass = availability === "online" ? "healthy" : availability === "offline" ? "danger" : "";
    const hasContext = Boolean(user || session || uptime);
    const panelMetrics = [
      gpu === undefined ? undefined : { label: "GPU", value: gpu },
      memory === undefined ? undefined : { label: "RAM", value: memory },
      ...drives.map((drive) => ({ label: drive.label, value: drive.usage })),
    ].filter((item): item is { label: string; value: number } => Boolean(item));

    return html`
      <ha-card>
        <div class="machine-shell pc-shell ${this.machineGridClass()}" style=${machineStyle}>
          <div class="machine-content pc-content">
            <header class="machine-header pc-header"><div><h2>${this.config.name}</h2><div class="machine-status"><span class="dot ${statusClass}"></span>${statusLabel}</div></div></header>
            ${cpuTemperature || gpuTemperature ? html`<div class="machine-stat-stack">${cpuTemperature ? html`<div class="machine-mini-stat"><small>CPU</small><strong>${cpuTemperature}</strong></div>` : nothing}${gpuTemperature ? html`<div class="machine-mini-stat"><small>GPU</small><strong>${gpuTemperature}</strong></div>` : nothing}</div>` : nothing}
            ${cpu === undefined ? nothing : html`<div class="machine-gauge" style=${`--value:${cpu}`}><div class="machine-gauge-content"><strong>${percentageLabel(cpu)}</strong><small>CPU</small></div></div>`}
            ${hasContext ? html`<div class="machine-context"><small>${user ? "Utilisateur" : session ? "Session" : "Uptime"}</small><strong>${user || session || uptime}</strong>${user && session ? html`<span>Session · ${session}</span>` : nothing}${uptime && (user || session) ? html`<span>Uptime · ${uptime}</span>` : nothing}</div>` : nothing}
            <section class="machine-panel">
              <div class="machine-panel-head"><div class="machine-panel-title"><small>Performance</small><strong>${availability === "online" ? `${this.config.name} fonctionne normalement` : availability === "offline" ? `${this.config.name} est hors ligne` : `État de ${this.config.name} indisponible`}</strong></div><button class="machine-accent-action" @click=${() => this.openDialog("details")}><ha-icon icon="mdi:pulse"></ha-icon>Détails</button></div>
              ${panelMetrics.length ? html`<div class="machine-bars">${panelMetrics.map((item) => this.renderBar(item.label, item.value))}</div>` : nothing}
              ${systemState || networkDown || networkUp || battery !== undefined ? html`<div class="machine-foot">${systemState ? html`<span class="pc-foot-item">Événement <strong>${systemState}</strong></span>` : nothing}${networkDown || networkUp ? html`<span class="pc-foot-item">Réseau <strong>${networkDown ? `↓ ${networkDown}` : ""}${networkDown && networkUp ? " · " : ""}${networkUp ? `↑ ${networkUp}` : ""}</strong></span>` : nothing}${battery !== undefined ? html`<span class="pc-foot-item">Batterie <strong>${percentageLabel(battery)}</strong></span>` : nothing}</div>` : nothing}
            </section>
          </div>
        </div>
      </ha-card>
      ${this.dialog === "details" ? this.renderDetails() : nothing}
    `;
  }

  private uptimeLabel(): string | undefined {
    if (this.config?.uptime_entity && isAvailable(entity(this.hass, this.config.uptime_entity))) return displayState(this.hass, this.config.uptime_entity);
    const derived = pcUptimeLabel(entity(this.hass, this.config?.last_boot_entity));
    return derived === "—" ? undefined : derived;
  }

  private availableDisplay(entityId?: string): string | undefined {
    return isAvailable(entity(this.hass, entityId)) ? displayState(this.hass, entityId) : undefined;
  }

  private temperatureLabel(entityId?: string): string {
    const state = entity(this.hass, entityId);
    return pcTemperature(state) === undefined ? "" : displayState(this.hass, entityId);
  }

  private renderBar(label: string, value: number): TemplateResult {
    return html`<div class="machine-bar"><span title=${label}>${label}</span><div class="track"><span style=${`width:${value}%`}></span></div><strong>${percentageLabel(value)}</strong></div>`;
  }

  private validDrives(): Array<{ config: PcDriveConfig; state: HassEntity; label: string; usage: number; summary: string }> {
    const configured = this.config?.drives?.length
      ? this.config.drives
      : this.config?.storage_entity
        ? [{ entity: this.config.storage_entity, label: "Disque" }]
        : [];
    return configured.flatMap((drive) => {
      const state = entity(this.hass, drive.entity);
      const usage = pcDriveUsage(state);
      if (!state || usage === undefined) return [];
      return [{ config: drive, state, label: this.driveLabel(drive, state), usage, summary: pcDriveSummary(state) }];
    });
  }

  private driveLabel(drive: PcDriveConfig, state?: HassEntity): string {
    if (drive.label) return drive.label;
    const attributeLabel = state?.attributes.Label;
    if (typeof attributeLabel === "string" && attributeLabel.trim()) return attributeLabel;
    return state?.state && state.state.length <= 3 ? `Disque ${state.state}` : friendlyName(state, "Stockage");
  }

  private confirmRestart = (): void => {
    if (!pcActionAvailable(this.hass, this.config?.restart_entity)) return;
    this.askConfirmation({ title: "Redémarrer le PC ?", message: "Les applications ouvertes pourront perdre leurs données non enregistrées.", confirmLabel: "Redémarrer", action: () => activateEntity(this.hass!, this.config?.restart_entity) });
    this.dialog = "details";
  };

  private confirmShutdown = (): void => {
    if (!pcActionAvailable(this.hass, this.config?.shutdown_entity)) return;
    this.askConfirmation({ title: "Éteindre le PC ?", message: "Cette action arrêtera la machine et les services qui y sont exécutés.", confirmLabel: "Éteindre", action: () => activateEntity(this.hass!, this.config?.shutdown_entity) });
    this.dialog = "details";
  };

  private renderDetails(): TemplateResult {
    const availability = pcAvailability(entity(this.hass, this.config?.online_entity));
    const online = availability === "online";
    const metrics: Array<[string, string | undefined, string]> = [
      ["CPU", this.config?.cpu_entity, "mdi:cpu-64-bit"], ["Température CPU", this.config?.cpu_temperature_entity, "mdi:thermometer"],
      ["GPU", this.config?.gpu_entity, "mdi:expansion-card"], ["Température GPU", this.config?.gpu_temperature_entity, "mdi:thermometer"],
      ["Mémoire", this.config?.memory_entity, "mdi:memory"], ["Fréquence", this.config?.clock_speed_entity, "mdi:speedometer"],
      ["Téléchargement", this.config?.network_down_entity, "mdi:download"], ["Envoi", this.config?.network_up_entity, "mdi:upload"],
    ];
    const configuredMetrics = metrics.filter(([label, id]) => label.includes("Température")
      ? pcTemperature(entity(this.hass, id)) !== undefined
      : isAvailable(entity(this.hass, id)));
    const drives = this.validDrives();
    const interfaces = (this.config?.network_interfaces || []).filter((item) => isAvailable(entity(this.hass, item.entity)));
    const systemRows: Array<[string, string]> = [
      this.availableDisplay(this.config?.user_entity) ? ["Utilisateur", this.availableDisplay(this.config?.user_entity)!] : undefined,
      isAvailable(entity(this.hass, this.config?.session_entity)) ? ["Session", pcSessionLabel(entity(this.hass, this.config?.session_entity))] : undefined,
      this.uptimeLabel() ? ["Uptime", this.uptimeLabel()!] : undefined,
      this.availableDisplay(this.config?.last_boot_entity) ? ["Dernier démarrage", this.availableDisplay(this.config?.last_boot_entity)!] : undefined,
      this.availableDisplay(this.config?.last_activity_entity) ? ["Dernière activité", this.availableDisplay(this.config?.last_activity_entity)!] : undefined,
      this.availableDisplay(this.config?.system_state_entity) ? ["Dernier événement", this.availableDisplay(this.config?.system_state_entity)!] : undefined,
    ].filter((row): row is [string, string] => Boolean(row));
    const batteryValue = pcPercentage(entity(this.hass, this.config?.battery_percentage_entity));
    const batteryRows: Array<[string, string]> = [
      batteryValue === undefined ? undefined : ["Batterie", percentageLabel(batteryValue)],
      this.availableDisplay(this.config?.battery_status_entity) ? ["État de charge", this.availableDisplay(this.config?.battery_status_entity)!] : undefined,
      this.availableDisplay(this.config?.battery_powerline_entity) ? ["Alimentation", this.availableDisplay(this.config?.battery_powerline_entity)!] : undefined,
      this.nonNegativeDisplay(this.config?.battery_remaining_entity) ? ["Autonomie restante", this.nonNegativeDisplay(this.config?.battery_remaining_entity)!] : undefined,
      this.nonNegativeDisplay(this.config?.battery_full_lifetime_entity) ? ["Autonomie maximale", this.nonNegativeDisplay(this.config?.battery_full_lifetime_entity)!] : undefined,
    ].filter((row): row is [string, string] => Boolean(row));
    const hasAudio = [this.config?.audio_output_entity, this.config?.audio_input_entity].some((id) => isAvailable(entity(this.hass, id)));
    const audioStats: Array<[string, string]> = [
      this.availableDisplay(this.config?.audio_sessions_entity) ? ["Sessions", this.availableDisplay(this.config?.audio_sessions_entity)!] : undefined,
      this.availableDisplay(this.config?.audio_peak_entity) ? ["Niveau de crête", this.availableDisplay(this.config?.audio_peak_entity)!] : undefined,
      this.availableDisplay(this.config?.audio_output_devices_entity) ? ["Sorties détectées", this.availableDisplay(this.config?.audio_output_devices_entity)!] : undefined,
      this.availableDisplay(this.config?.audio_input_devices_entity) ? ["Entrées détectées", this.availableDisplay(this.config?.audio_input_devices_entity)!] : undefined,
    ].filter((row): row is [string, string] => Boolean(row));
    const hasCommands = [this.config?.lock_entity, this.config?.sleep_entity, this.config?.restart_entity, this.config?.shutdown_entity, this.config?.wake_entity].some((id) => pcActionAvailable(this.hass, id));
    const lockAvailable = online && pcActionAvailable(this.hass, this.config?.lock_entity);
    const sleepAvailable = online && pcActionAvailable(this.hass, this.config?.sleep_entity);
    const restartAvailable = online && pcActionAvailable(this.hass, this.config?.restart_entity);
    const shutdownAvailable = online && pcActionAvailable(this.hass, this.config?.shutdown_entity);
    const wakeAvailable = availability === "offline" && pcActionAvailable(this.hass, this.config?.wake_entity);

    return this.renderDialog(this.config?.name || "PC", "mdi:laptop", html`
      <div class="dialog-body">
        <div class="dialog-overview"><div><span class="eyebrow">État de la machine</span><strong>${availability === "online" ? "En ligne et disponible" : availability === "offline" ? "Hors ligne" : "État indisponible"}</strong>${systemRows.length ? html`<span class="muted">${systemRows.slice(0, 2).map(([, value]) => value).join(" · ")}</span>` : nothing}</div>${batteryValue !== undefined || pcPercentage(entity(this.hass, this.config?.cpu_entity)) !== undefined ? html`<div class="dialog-stat"><strong>${batteryValue !== undefined ? percentageLabel(batteryValue) : percentageLabel(pcPercentage(entity(this.hass, this.config?.cpu_entity)))}</strong><small>${batteryValue !== undefined ? "Batterie" : "CPU"}</small></div>` : nothing}</div>
        ${configuredMetrics.length ? html`<section class="pc-detail-section"><div class="dialog-section-title">Performances principales</div><div class="grid two">${configuredMetrics.map(([label, id, icon]) => html`<div class="tile"><div class="tile-head"><span class="tile-icon"><ha-icon .icon=${icon}></ha-icon></span><strong>${label.includes("Température") ? this.temperatureLabel(id) : displayState(this.hass, id)}</strong></div><div style="margin-top:10px;">${label}</div></div>`)}</div></section>` : nothing}
        ${drives.length ? html`<section class="pc-detail-section"><div class="dialog-section-title">Stockage</div>${drives.map((drive) => html`<div class="pc-drive-row"><div class="pc-drive-top"><span>${drive.label}</span><strong>${drive.summary}</strong></div><div class="progress"><span style=${`width:${drive.usage}%`}></span></div></div>`)}</section>` : nothing}
        ${systemRows.length ? html`<section class="pc-detail-section"><div class="dialog-section-title">Session et système</div>${systemRows.map(([label, value]) => this.infoRow(label, value))}</section>` : nothing}
        ${batteryRows.length ? html`<section class="pc-detail-section"><div class="dialog-section-title">Alimentation</div>${batteryRows.map(([label, value]) => this.infoRow(label, value))}</section>` : nothing}
        ${hasAudio || audioStats.length ? html`<section class="pc-detail-section"><div class="dialog-section-title">Audio</div>${this.audioDevice("Sortie", this.config?.audio_output_entity, this.config?.audio_output_state_entity, this.config?.audio_output_volume_entity, this.config?.audio_output_muted_entity)}${this.audioDevice("Entrée", this.config?.audio_input_entity, this.config?.audio_input_state_entity, this.config?.audio_input_volume_entity, this.config?.audio_input_muted_entity)}${audioStats.length ? html`<div class="grid two" style="margin-top:10px;">${audioStats.map(([label, value]) => html`<div class="tile"><div class="tile-head"><span>${label}</span><strong>${value}</strong></div></div>`)}</div>` : nothing}</section>` : nothing}
        ${interfaces.length ? html`<section class="pc-detail-section"><div class="dialog-section-title">Interfaces réseau${this.availableDisplay(this.config?.network_total_entity) ? ` · ${this.availableDisplay(this.config?.network_total_entity)}` : ""}</div>${interfaces.map((item) => this.networkRow(item))}</section>` : nothing}
        ${hasCommands ? html`<section class="pc-detail-section"><div class="dialog-section-title">Commandes</div><div class="actions">${online && this.config?.lock_entity ? html`<button class="action" ?disabled=${!lockAvailable} @click=${() => activateEntity(this.hass!, this.config?.lock_entity)}><ha-icon icon="mdi:lock-outline"></ha-icon>Verrouiller</button>` : nothing}${online && this.config?.sleep_entity ? html`<button class="action" ?disabled=${!sleepAvailable} @click=${() => activateEntity(this.hass!, this.config?.sleep_entity)}><ha-icon icon="mdi:power-sleep"></ha-icon>Veille</button>` : nothing}${online && this.config?.restart_entity ? html`<button class="action" ?disabled=${!restartAvailable} @click=${this.confirmRestart}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer</button>` : nothing}${availability === "offline" && this.config?.wake_entity ? html`<button class="action primary" ?disabled=${!wakeAvailable} @click=${() => activateEntity(this.hass!, this.config?.wake_entity)}><ha-icon icon="mdi:power"></ha-icon>Démarrer</button>` : nothing}</div>${online && this.config?.shutdown_entity ? html`<div class="dialog-danger-zone"><button class="action danger" style="width:100%;" ?disabled=${!shutdownAvailable} @click=${this.confirmShutdown}><ha-icon icon="mdi:power"></ha-icon>Éteindre le PC</button></div>` : nothing}</section>` : nothing}
      </div>
    `, "pc-dialog");
  }

  private infoRow(label: string, value: string): TemplateResult { return html`<div class="pc-info-row"><span>${label}</span><strong>${value}</strong></div>`; }

  private nonNegativeDisplay(entityId?: string): string | undefined {
    const value = nonNegativeState(this.hass, entityId);
    return value === "—" ? undefined : value;
  }

  private audioDevice(label: string, deviceId?: string, stateId?: string, volumeId?: string, mutedId?: string): TemplateResult | typeof nothing {
    if (!isAvailable(entity(this.hass, deviceId))) return nothing;
    return html`<div class="pc-audio-device"><span class="eyebrow">${label}</span><strong>${displayState(this.hass, deviceId)}</strong><div class="pc-audio-meta">${isAvailable(entity(this.hass, stateId)) ? html`<span>État · ${displayState(this.hass, stateId)}</span>` : nothing}${isAvailable(entity(this.hass, volumeId)) ? html`<span>Volume · ${displayState(this.hass, volumeId)}</span>` : nothing}${isAvailable(entity(this.hass, mutedId)) ? html`<span>${pcBooleanLabel(entity(this.hass, mutedId))}</span>` : nothing}</div></div>`;
  }

  private networkRow(item: PcNetworkInterfaceConfig): TemplateResult {
    const state = entity(this.hass, item.entity);
    const label = pcNetworkLabel(state);
    return html`<div class="pc-network-row"><span>${item.label || friendlyName(state, "Interface réseau")}</span><strong class="pc-network-state"><span class="dot ${label === "Connecté" ? "healthy" : ""}"></span>${label}</strong></div>`;
  }
}
