import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { PcCardConfig, PcDriveConfig, PcExtraEntityConfig, PcNetworkInterfaceConfig } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { activateEntity } from "../utils/actions";
import { clamp, displayState, entity, friendlyName, isAvailable, isCommandable, numericState } from "../utils/entities";
import { severity, severityClass, type Severity } from "../utils/severity";
import {
  BATTERY_LEVEL,
  commandAvailable,
  formLabels,
  hostConfirmation,
  machineAvailability,
  machinePercentage,
  machineStatusDot,
  machineStatusLabel,
  machineStyles,
  meterTrack,
  metricSeverity,
  metricTile,
  percentageLabel,
  storageBar,
  type MachineAvailability,
} from "../utils/machines";

/** État du PC : un capteur qui publie une valeur (CPU, utilisateur…) signifie que le PC répond. */
export function pcAvailability(state?: HassEntity): MachineAvailability {
  return machineAvailability(state, true);
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
  return machinePercentage(state);
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

interface PcDrive {
  config: PcDriveConfig;
  state?: HassEntity;
  label: string;
  /** `undefined` quand le disque est indisponible : la carte affiche « — ». */
  usage?: number;
  summary: string;
}

const FORM_LABELS: Record<string, string> = {
  status_entity: "PC en ligne (entité d’état)",
  last_boot_entity: "Dernier démarrage",
  last_activity_entity: "Dernière activité",
  system_state_entity: "Dernier événement système",
  user_entity: "Utilisateur connecté",
  session_entity: "État de la session",
  cpu_temperature_entity: "Température CPU",
  gpu_entity: "Charge GPU (%)",
  gpu_temperature_entity: "Température GPU",
  clock_speed_entity: "Fréquence du processeur",
  storage_entity: "Stockage utilisé (%, ancien champ)",
  storage_label_entity: "Capacité du stockage (texte)",
  network_total_entity: "Nombre d’interfaces réseau",
  battery_percentage_entity: "Batterie (%)",
  battery_status_entity: "État de charge",
  battery_powerline_entity: "Alimentation secteur",
  battery_remaining_entity: "Autonomie restante",
  battery_full_lifetime_entity: "Autonomie maximale",
  audio_output_entity: "Sortie audio",
  audio_output_state_entity: "État de la sortie audio",
  audio_output_volume_entity: "Volume de sortie",
  audio_output_muted_entity: "Sortie muette",
  audio_input_entity: "Entrée audio",
  audio_input_state_entity: "État de l’entrée audio",
  audio_input_volume_entity: "Volume d’entrée",
  audio_input_muted_entity: "Entrée muette",
  audio_input_devices_entity: "Entrées audio détectées",
  audio_output_devices_entity: "Sorties audio détectées",
  audio_peak_entity: "Niveau de crête audio",
  audio_sessions_entity: "Sessions audio",
  lock_entity: "Commande de verrouillage",
  sleep_entity: "Commande de mise en veille",
  restart_entity: "Commande de redémarrage",
  shutdown_entity: "Commande d’arrêt",
  drives: "Disques",
  network_interfaces: "Interfaces réseau",
  extra_sections: "Sections supplémentaires",
};

export class AuralisPcCard extends AuralisBaseCard<PcCardConfig> {
  static styles = [
    AuralisBaseCard.styles,
    machineStyles,
    css`
      .pc-header { padding-right: 82px; }
      .machine-stat-stack { right: 0; }
      .machine-mini-stat.sev-warning strong, .machine-mini-stat.sev-critical strong { color: var(--sev-color); }
      .machine-gauge { margin-top: 50px; }
      .machine-context { max-width: 170px; }
      .machine-context span { display: block; margin-top: 6px; color: #91a0b2; font-size: var(--auralis-text-xs); }
      .machine-panel { max-height: 285px; overflow: auto; }
      .machine-bar { grid-template-columns: 72px minmax(0, 1fr) 46px; }
      .machine-bar > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pc-foot-item { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pc-foot-item .sev-text.sev-warning, .pc-foot-item .sev-text.sev-critical { color: var(--sev-color); }
      .pc-dialog { max-width: 820px; }
      .pc-detail-section + .pc-detail-section { margin-top: 22px; }
      .pc-drive-row, .pc-network-row, .pc-info-row { padding: 12px 0; border-bottom: 1px solid var(--auralis-border); }
      .pc-drive-row { display: block; width: 100%; border-top: 0; border-right: 0; border-left: 0; background: transparent; color: inherit; font: inherit; text-align: left; }
      button.pc-drive-row { cursor: pointer; }
      .pc-drive-row:last-child, .pc-network-row:last-child, .pc-info-row:last-child { border-bottom: 0; }
      .pc-drive-top, .pc-network-row, .pc-info-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .pc-drive-top span, .pc-network-row span, .pc-info-row span { min-width: 0; color: var(--auralis-muted); font-size: 12px; }
      .pc-drive-top strong, .pc-network-row strong, .pc-info-row strong { min-width: 0; overflow-wrap: anywhere; text-align: right; }
      .pc-network-state { display: inline-flex; align-items: center; gap: 7px; }
      .pc-extra-row { width: 100%; min-height: var(--auralis-target); padding: 12px 0; border: 0; border-bottom: 1px solid var(--auralis-border); background: transparent; color: inherit; display: flex; align-items: center; justify-content: space-between; gap: 12px; text-align: left; cursor: pointer; font: inherit; }
      .pc-extra-row:last-child { border-bottom: 0; }
      .pc-extra-row:hover { color: var(--auralis-info); }
      .pc-extra-row span { min-width: 0; color: var(--auralis-muted); font-size: 12px; }
      .pc-extra-row strong { min-width: 0; overflow-wrap: anywhere; text-align: right; }
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
    // `status_entity` est le nom commun des cartes machines ; `online_entity` reste accepté.
    const status = config.status_entity || config.online_entity;
    if (!status) throw new Error("status_entity (ou online_entity) est obligatoire.");
    this.config = { ...config, status_entity: status, online_entity: status, name: config.name || "PC Bureau", theme: config.theme || "auto" };
  }

  static getStubConfig(): Partial<PcCardConfig> {
    return { name: "PC Bureau", theme: "carbon", status_entity: "binary_sensor.pc_online" };
  }

  static getConfigForm(): Record<string, unknown> {
    const entityFields = [
      "status_entity", "uptime_entity", "last_boot_entity", "last_activity_entity", "system_state_entity", "user_entity", "session_entity",
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
        { name: "icon", selector: { icon: {} } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        ...entityFields.map((name) => ({ name, selector: { entity: {} } })),
        { name: "drives", selector: { object: {} } },
        { name: "network_interfaces", selector: { object: {} } },
        { name: "extra_sections", selector: { object: {} } },
        { name: "card_background", selector: { object: {} } },
        { name: "show_grid", selector: { boolean: {} } },
        { name: "background_image", selector: { text: {} } },
        { name: "background_position", selector: { text: {} } },
        { name: "image_opacity", selector: { number: { min: 0, max: 100, step: 1, mode: "slider" } } },
        { name: "accent_color", selector: { text: {} } },
        { name: "image_brightness", selector: { number: { min: 30, max: 100, step: 1, mode: "slider" } } },
        { name: "glass_opacity", selector: { number: { min: 0.45, max: 0.96, step: 0.01, mode: "slider" } } },
      ],
      computeLabel: formLabels(FORM_LABELS),
      computeHelper: (schema: { name?: string }) =>
        schema.name === "status_entity" ? "Obligatoire. L’ancien nom online_entity reste accepté en YAML."
          : schema.name === "storage_label_entity" ? "Texte de capacité affiché pour le disque de storage_entity." : undefined,
    };
  }

  public getCardSize(): number { return 11; }
  public getGridOptions(): Record<string, number> { return { rows: 11, min_rows: 10, columns: 6, min_columns: 3 }; }

  private availability(): MachineAvailability {
    return pcAvailability(entity(this.hass, this.config?.status_entity || this.config?.online_entity));
  }

  protected render(): TemplateResult {
    if (!this.config || !this.hass) return html``;
    const config = this.config;
    const levels = config.alert_levels;
    const availability = this.availability();
    const cpu = machinePercentage(entity(this.hass, config.cpu_entity));
    const gpu = machinePercentage(entity(this.hass, config.gpu_entity));
    const memory = machinePercentage(entity(this.hass, config.memory_entity));
    const cpuTemperature = this.temperatureLabel(config.cpu_temperature_entity);
    const gpuTemperature = this.temperatureLabel(config.gpu_temperature_entity);
    const drives = this.drives();
    const sessionState = entity(this.hass, config.session_entity);
    const userState = entity(this.hass, config.user_entity);
    const session = isAvailable(sessionState) ? pcSessionLabel(sessionState) : undefined;
    const user = isAvailable(userState) ? displayState(this.hass, config.user_entity) : undefined;
    const uptime = this.uptimeLabel();
    const battery = machinePercentage(entity(this.hass, config.battery_percentage_entity));
    const systemState = this.availableDisplay(config.system_state_entity);
    const networkDown = this.availableDisplay(config.network_down_entity);
    const networkUp = this.availableDisplay(config.network_up_entity);
    const machineStyle = this.machineStyle("#7898ff");
    const hasContext = Boolean(user || session || uptime);
    const panelBars = [
      gpu === undefined ? undefined : storageBar({ label: "GPU", value: gpu, level: metricSeverity(gpu, levels, "cpu"), open: this.openEntity(config.gpu_entity) }),
      ...drives.map((drive) => storageBar({
        label: drive.label,
        value: drive.usage,
        level: metricSeverity(drive.usage, levels, "disk"),
        open: this.openEntity(drive.config.entity),
      })),
    ].filter((item): item is TemplateResult => Boolean(item));
    const miniStat = (label: string, value: string, entityId?: string) => html`<div class="machine-mini-stat ${severityClass(this.temperatureLevel(entityId))}"><small>${label}</small><strong>${value}</strong></div>`;

    return html`
      <ha-card>
        <div class="machine-shell pc-shell ${this.machineGridClass()}" style=${machineStyle}>
          <div class="machine-content pc-content">
            <header class="machine-header pc-header"><div><h2>${config.name}</h2><div class="machine-status"><span class="dot ${machineStatusDot(availability)}"></span>${machineStatusLabel(availability)}</div>${this.renderWakeButton(availability === "online", config.wake_entity, "Démarrer le PC")}</div></header>
            ${cpuTemperature || gpuTemperature ? html`<div class="machine-stat-stack">${cpuTemperature ? miniStat("CPU", cpuTemperature, config.cpu_temperature_entity) : nothing}${gpuTemperature ? miniStat("GPU", gpuTemperature, config.gpu_temperature_entity) : nothing}</div>` : nothing}
            ${this.renderResourceGauges(cpu, memory)}
            ${hasContext ? html`<div class="machine-context"><small>${user ? "Utilisateur" : session ? "Session" : "Uptime"}</small><strong>${user || session || uptime}</strong>${user && session ? html`<span>Session · ${session}</span>` : nothing}${uptime && (user || session) ? html`<span>Uptime · ${uptime}</span>` : nothing}</div>` : nothing}
            <section class="machine-panel">
              <div class="machine-panel-head"><div class="machine-panel-title"><small>Performance</small><strong>${availability === "online" ? `${config.name} fonctionne normalement` : availability === "offline" ? `${config.name} est hors ligne` : `État de ${config.name} indisponible`}</strong></div><button class="machine-accent-action" @click=${() => this.openDialog("details")}><ha-icon icon="mdi:pulse"></ha-icon>Détails</button></div>
              ${panelBars.length ? html`<div class="machine-bars">${panelBars}</div>` : nothing}
              ${systemState || networkDown || networkUp || battery !== undefined ? html`<div class="machine-foot">${systemState ? html`<span class="pc-foot-item">Événement <strong>${systemState}</strong></span>` : nothing}${networkDown || networkUp ? html`<span class="pc-foot-item">Réseau <strong>${networkDown ? `↓ ${networkDown}` : ""}${networkDown && networkUp ? " · " : ""}${networkUp ? `↑ ${networkUp}` : ""}</strong></span>` : nothing}${battery !== undefined ? html`<span class="pc-foot-item">Batterie <strong class="sev-text ${severityClass(this.batteryLevel(battery))}">${percentageLabel(battery)}</strong></span>` : nothing}</div>` : nothing}
            </section>
          </div>
        </div>
      </ha-card>
      ${this.dialog === "details" ? this.renderDetails() : nothing}
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

  private batteryLevel(value?: number): Severity {
    return severity(value, BATTERY_LEVEL, "below");
  }

  private temperatureLevel(entityId?: string): Severity {
    return metricSeverity(pcTemperature(entity(this.hass, entityId)), this.config?.alert_levels, "temperature");
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

  /** Disques configurés, y compris indisponibles (affichés « — » au lieu de disparaître). */
  private drives(): PcDrive[] {
    const config = this.config;
    const legacy = !config?.drives?.length && config?.storage_entity;
    const configured: PcDriveConfig[] = config?.drives?.length
      ? config.drives
      : config?.storage_entity
        ? [{ entity: config.storage_entity, label: "Disque" }]
        : [];
    return configured.map((drive) => {
      const state = entity(this.hass, drive.entity);
      // Ancien format : storage_label_entity fournit le texte de capacité du disque unique.
      const label = legacy ? this.availableDisplay(config?.storage_label_entity) : undefined;
      return { config: drive, state, label: this.driveLabel(drive, state), usage: pcDriveUsage(state), summary: label ?? pcDriveSummary(state) };
    });
  }

  private driveLabel(drive: PcDriveConfig, state?: HassEntity): string {
    if (drive.label) return drive.label;
    const attributeLabel = state?.attributes.Label;
    if (typeof attributeLabel === "string" && attributeLabel.trim()) return attributeLabel;
    return state?.state && state.state.length <= 3 ? `Disque ${state.state}` : friendlyName(state, "Stockage");
  }

  private confirmRestart = (): void => {
    const entityId = this.config?.restart_entity;
    if (this.availability() !== "online" || !commandAvailable(this.hass, entityId)) return;
    this.askConfirmation({
      ...hostConfirmation("restart", "le PC", "Les applications ouvertes pourront perdre leurs données non enregistrées."),
      action: () => activateEntity(this.hass!, entityId),
    });
    this.dialog = "details";
  };

  private confirmShutdown = (): void => {
    const entityId = this.config?.shutdown_entity;
    if (this.availability() !== "online" || !commandAvailable(this.hass, entityId)) return;
    this.askConfirmation({
      ...hostConfirmation("shutdown", "le PC", "Cette action arrêtera la machine et les services qui y sont exécutés."),
      action: () => activateEntity(this.hass!, entityId),
    });
    this.dialog = "details";
  };

  private confirmSleep = (): void => {
    const entityId = this.config?.sleep_entity;
    if (this.availability() !== "online" || !commandAvailable(this.hass, entityId)) return;
    this.askConfirmation({
      title: "Mettre le PC en veille ?",
      message: "La session reste ouverte ; le PC ne répondra plus jusqu’à son réveil.",
      confirmLabel: "Mettre en veille",
      danger: false,
      action: () => activateEntity(this.hass!, entityId),
    });
    this.dialog = "details";
  };

  private lock = (): void => {
    const hass = this.hass;
    const entityId = this.config?.lock_entity;
    if (!hass || this.availability() !== "online" || !commandAvailable(hass, entityId)) return;
    void this.runCommand("lock", () => activateEntity(hass, entityId), {
      errorMessage: "Le verrouillage a échoué.",
      successMessage: "Verrouillage demandé.",
    });
  };

  private renderCommands(online: boolean): TemplateResult | typeof nothing {
    const config = this.config!;
    const wake = this.renderWakeButton(online, config.wake_entity, "Démarrer", "action primary");
    const visible = online
      ? [config.lock_entity, config.sleep_entity, config.restart_entity, config.shutdown_entity].some(Boolean)
      : wake !== nothing;
    if (!visible) return nothing;
    const lockPending = this.isPending("lock");
    return html`<section class="pc-detail-section"><div class="dialog-section-title">Commandes</div><div class="actions">
      ${online && config.lock_entity ? html`<button class="action" aria-busy=${lockPending ? "true" : "false"} ?disabled=${lockPending || !commandAvailable(this.hass, config.lock_entity)} @click=${this.lock}><ha-icon .icon=${lockPending ? "mdi:timer-sand" : "mdi:lock-outline"}></ha-icon>${lockPending ? "Verrouillage…" : "Verrouiller"}</button>` : nothing}
      ${online && config.sleep_entity ? html`<button class="action" ?disabled=${!commandAvailable(this.hass, config.sleep_entity)} @click=${this.confirmSleep}><ha-icon icon="mdi:power-sleep"></ha-icon>Veille</button>` : nothing}
      ${online && config.restart_entity ? html`<button class="action" ?disabled=${!commandAvailable(this.hass, config.restart_entity)} @click=${this.confirmRestart}><ha-icon icon="mdi:restart"></ha-icon>Redémarrer</button>` : nothing}
      ${wake}
    </div>${online && config.shutdown_entity ? html`<div class="dialog-danger-zone"><button class="action danger" style="width:100%;" ?disabled=${!commandAvailable(this.hass, config.shutdown_entity)} @click=${this.confirmShutdown}><ha-icon icon="mdi:power"></ha-icon>Éteindre le PC</button></div>` : nothing}</section>`;
  }

  private renderDriveRow(drive: PcDrive): TemplateResult {
    const level = metricSeverity(drive.usage, this.config?.alert_levels, "disk");
    const content = html`<div class="pc-drive-top"><span>${drive.label}</span><strong>${drive.usage === undefined ? "—" : drive.summary}</strong></div>${meterTrack(drive.label, drive.usage, "progress", level)}`;
    const open = this.openEntity(drive.config.entity);
    return open
      ? html`<button type="button" class="pc-drive-row" aria-label=${`${drive.label} : ${percentageLabel(drive.usage)}`} @click=${open}>${content}</button>`
      : html`<div class="pc-drive-row">${content}</div>`;
  }

  private renderDetails(): TemplateResult {
    const config = this.config!;
    const levels = config.alert_levels;
    const availability = this.availability();
    const online = availability === "online";
    const percent = (id?: string) => machinePercentage(entity(this.hass, id));
    const metrics: Array<[string, string | undefined, string, "cpu" | "memory" | "temperature" | undefined]> = [
      ["CPU", config.cpu_entity, "mdi:cpu-64-bit", "cpu"], ["Température CPU", config.cpu_temperature_entity, "mdi:thermometer", "temperature"],
      ["GPU", config.gpu_entity, "mdi:expansion-card", "cpu"], ["Température GPU", config.gpu_temperature_entity, "mdi:thermometer", "temperature"],
      ["Mémoire", config.memory_entity, "mdi:memory", "memory"], ["Fréquence", config.clock_speed_entity, "mdi:speedometer", undefined],
      ["Téléchargement", config.network_down_entity, "mdi:download", undefined], ["Envoi", config.network_up_entity, "mdi:upload", undefined],
    ];
    const configuredMetrics = metrics.filter(([, id, , metric]) => metric === "temperature"
      ? pcTemperature(entity(this.hass, id)) !== undefined
      : isAvailable(entity(this.hass, id)));
    const drives = this.drives();
    const interfaces = (config.network_interfaces || []).filter((item) => isAvailable(entity(this.hass, item.entity)));
    const systemRows: Array<[string, string]> = [
      this.availableDisplay(config.user_entity) ? ["Utilisateur", this.availableDisplay(config.user_entity)!] : undefined,
      isAvailable(entity(this.hass, config.session_entity)) ? ["Session", pcSessionLabel(entity(this.hass, config.session_entity))] : undefined,
      this.uptimeLabel() ? ["Uptime", this.uptimeLabel()!] : undefined,
      this.availableDisplay(config.last_boot_entity) ? ["Dernier démarrage", this.availableDisplay(config.last_boot_entity)!] : undefined,
      this.availableDisplay(config.last_activity_entity) ? ["Dernière activité", this.availableDisplay(config.last_activity_entity)!] : undefined,
      this.availableDisplay(config.system_state_entity) ? ["Dernier événement", this.availableDisplay(config.system_state_entity)!] : undefined,
    ].filter((row): row is [string, string] => Boolean(row));
    const batteryValue = percent(config.battery_percentage_entity);
    const batteryRows: Array<[string, string, string]> = [
      batteryValue === undefined ? undefined : ["Batterie", percentageLabel(batteryValue), severityClass(this.batteryLevel(batteryValue))],
      ["État de charge", this.availableDisplay(config.battery_status_entity)],
      ["Alimentation", this.availableDisplay(config.battery_powerline_entity)],
      ["Autonomie restante", this.nonNegativeDisplay(config.battery_remaining_entity)],
      ["Autonomie maximale", this.nonNegativeDisplay(config.battery_full_lifetime_entity)],
    ].flatMap((row) => (row && row[1] ? [[row[0], row[1], row[2] ?? ""] as [string, string, string]] : []));
    const hasAudio = [config.audio_output_entity, config.audio_input_entity].some((id) => isAvailable(entity(this.hass, id)));
    const audioStats: Array<[string, string]> = [
      this.availableDisplay(config.audio_sessions_entity) ? ["Sessions", this.availableDisplay(config.audio_sessions_entity)!] : undefined,
      this.availableDisplay(config.audio_peak_entity) ? ["Niveau de crête", this.availableDisplay(config.audio_peak_entity)!] : undefined,
      this.availableDisplay(config.audio_output_devices_entity) ? ["Sorties détectées", this.availableDisplay(config.audio_output_devices_entity)!] : undefined,
      this.availableDisplay(config.audio_input_devices_entity) ? ["Entrées détectées", this.availableDisplay(config.audio_input_devices_entity)!] : undefined,
    ].filter((row): row is [string, string] => Boolean(row));
    const cpuValue = percent(config.cpu_entity);
    const metricLevel = (id: string | undefined, metric?: "cpu" | "memory" | "temperature"): Severity => !metric ? "normal"
      : metric === "temperature" ? this.temperatureLevel(id) : metricSeverity(percent(id), levels, metric);

    return this.renderDialog(config.name || "PC", config.icon || "mdi:laptop", html`
      <div class="dialog-body">
        <div class="dialog-overview"><div><span class="eyebrow">État de la machine</span><strong>${machineStatusLabel(availability)}</strong>${systemRows.length ? html`<span class="muted">${systemRows.slice(0, 2).map(([, value]) => value).join(" · ")}</span>` : nothing}</div>${batteryValue !== undefined || cpuValue !== undefined ? html`<div class="dialog-stat"><strong>${batteryValue !== undefined ? percentageLabel(batteryValue) : percentageLabel(cpuValue)}</strong><small>${batteryValue !== undefined ? "Batterie" : "CPU"}</small></div>` : nothing}</div>
        ${configuredMetrics.length ? html`<section class="pc-detail-section"><div class="dialog-section-title">Performances principales</div><div class="grid two">${configuredMetrics.map(([label, id, icon, metric]) => metricTile({
          label,
          icon,
          value: metric === "temperature" ? this.temperatureLabel(id) : displayState(this.hass, id),
          level: metricLevel(id, metric),
          open: this.openEntity(id),
        }))}</div></section>` : nothing}
        ${drives.length ? html`<section class="pc-detail-section"><div class="dialog-section-title">Stockage</div>${drives.map((drive) => this.renderDriveRow(drive))}</section>` : nothing}
        ${systemRows.length ? html`<section class="pc-detail-section"><div class="dialog-section-title">Session et système</div>${systemRows.map(([label, value]) => this.infoRow(label, value))}</section>` : nothing}
        ${batteryRows.length ? html`<section class="pc-detail-section"><div class="dialog-section-title">Alimentation</div>${batteryRows.map(([label, value, className]) => this.infoRow(label, value, className))}</section>` : nothing}
        ${hasAudio || audioStats.length ? html`<section class="pc-detail-section"><div class="dialog-section-title">Audio</div>${this.audioDevice("Sortie", config.audio_output_entity, config.audio_output_state_entity, config.audio_output_volume_entity, config.audio_output_muted_entity)}${this.audioDevice("Entrée", config.audio_input_entity, config.audio_input_state_entity, config.audio_input_volume_entity, config.audio_input_muted_entity)}${audioStats.length ? html`<div class="grid two" style="margin-top:10px;">${audioStats.map(([label, value]) => html`<div class="tile"><div class="tile-head"><span>${label}</span><strong>${value}</strong></div></div>`)}</div>` : nothing}</section>` : nothing}
        ${interfaces.length ? html`<section class="pc-detail-section"><div class="dialog-section-title">Interfaces réseau${this.availableDisplay(config.network_total_entity) ? ` · ${this.availableDisplay(config.network_total_entity)}` : ""}</div>${interfaces.map((item) => this.networkRow(item))}</section>` : nothing}
        ${(config.extra_sections || []).filter((section) => section.entities?.length).map((section) => html`<section class="pc-detail-section"><div class="dialog-section-title">${section.title}</div>${section.entities.map((item) => this.extraEntityRow(item))}</section>`)}
        ${this.renderCommands(online)}
      </div>
    `, "pc-dialog");
  }

  private infoRow(label: string, value: string, className = ""): TemplateResult {
    return html`<div class="pc-info-row"><span>${label}</span><strong class="sev-text ${className}">${value}</strong></div>`;
  }

  private extraEntityRow(item: PcExtraEntityConfig): TemplateResult {
    const state = entity(this.hass, item.entity);
    const domain = item.entity.split(".")[0];
    const value = domain === "button" ? (isCommandable(state) ? "Ouvrir" : "Indisponible") : displayState(this.hass, item.entity);
    return html`<button type="button" class="pc-extra-row" @click=${this.openEntity(item.entity)}><span>${item.label || friendlyName(state, item.entity)}</span><strong>${value}</strong></button>`;
  }

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
