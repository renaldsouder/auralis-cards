import type { LovelaceCardConfig } from "./home-assistant";

export type AuralisTheme = "auto" | "halo" | "carbon" | "mono" | "aurora";
export type CardBackgroundMode = "grid" | "solid" | "gradient";

export interface CardBackgroundConfig {
  mode?: CardBackgroundMode;
  color?: string;
  gradient?: string;
}

export interface BaseCardConfig extends LovelaceCardConfig {
  name?: string;
  icon?: string;
  theme?: AuralisTheme;
  background_image?: string;
  background_position?: string;
  image_opacity?: number;
  accent_color?: string;
  image_brightness?: number;
  glass_opacity?: number;
  card_background?: CardBackgroundConfig;
  show_grid?: boolean;
}

export interface NavbarItemConfig {
  label: string;
  icon?: string;
  path?: string;
  /** Alias compatible avec les conventions Lovelace. */
  navigation_path?: string;
  exact?: boolean;
  active_paths?: string[];
  badge_entity?: string;
}

export interface NavbarCardConfig extends BaseCardConfig {
  type: "custom:auralis-navbar-card";
  items: NavbarItemConfig[];
  show_labels?: boolean;
  compact?: boolean;
  aria_label?: string;
}

export interface RoomPopupTitles {
  details?: string;
  lights?: string;
  covers?: string;
  climate?: string;
  media?: string;
  tv?: string;
  ambiance?: string;
}

export type RoomSideControlType = "lights" | "covers" | "climate" | "media" | "tv" | "scene" | "entity";
export type RoomOverlayPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type RoomBackgroundMode = CardBackgroundMode;

export interface RoomSideControlConfig {
  type: RoomSideControlType;
  entity?: string;
  label?: string;
  icon?: string;
  popup_title?: string;
  action?: "toggle" | "more-info" | "activate";
}

export interface RoomThermostatConfig {
  show?: boolean;
  position?: RoomOverlayPosition;
  show_border?: boolean;
  show_background?: boolean;
  entity?: string;
  label?: string;
  step?: number;
  label_color?: string;
  value_color?: string;
  button_color?: string;
  background_color?: string;
  border_color?: string;
}

export interface RoomSceneConfig {
  entity: string;
  label?: string;
  icon?: string;
  /** @deprecated Utiliser ambiance.position pour placer le bouton unique. */
  position?: RoomOverlayPosition;
}

export interface RoomAmbianceConfig {
  label?: string;
  icon?: string;
  position?: RoomOverlayPosition;
}

/** @deprecated Utiliser CardBackgroundConfig. */
export type RoomBackgroundConfig = CardBackgroundConfig;

export interface RoomClimatePopupConfig {
  graph_entities?: string[];
  graph_period?: number;
  graph_period_unit?: "hours" | "days" | "months";
  /** @deprecated Utiliser graph_period avec graph_period_unit. */
  graph_hours?: number;
  show_overview?: boolean;
  show_current_values?: boolean;
  show_thermostat?: boolean;
}

export interface RoomCardConfig extends BaseCardConfig {
  type: "custom:auralis-room-card";
  subtitle?: string;
  lights?: string[];
  covers?: string[];
  left_controls?: RoomSideControlConfig[];
  right_controls?: RoomSideControlConfig[];
  thermostat?: RoomThermostatConfig;
  ambiance?: RoomAmbianceConfig;
  scenes?: RoomSceneConfig[];
  entity_labels?: Record<string, string>;
  cover_labels?: Record<string, string>;
  popup_titles?: RoomPopupTitles;
  climate_popup?: RoomClimatePopupConfig;
  temperature_entity?: string;
  humidity_entity?: string;
  climate_entity?: string;
  media_player_entity?: string;
  /** @deprecated Utiliser scenes pour configurer une ou plusieurs ambiances. */
  scene_entity?: string;
}

export interface PcDriveConfig {
  entity: string;
  label?: string;
}

export interface PcNetworkInterfaceConfig {
  entity: string;
  label?: string;
}

export interface PcCardConfig extends BaseCardConfig {
  type: "custom:auralis-pc-card";
  online_entity: string;
  uptime_entity?: string;
  last_boot_entity?: string;
  last_activity_entity?: string;
  system_state_entity?: string;
  user_entity?: string;
  cpu_entity?: string;
  cpu_temperature_entity?: string;
  gpu_entity?: string;
  gpu_temperature_entity?: string;
  memory_entity?: string;
  clock_speed_entity?: string;
  storage_entity?: string;
  storage_label_entity?: string;
  drives?: PcDriveConfig[];
  network_down_entity?: string;
  network_up_entity?: string;
  network_total_entity?: string;
  network_interfaces?: PcNetworkInterfaceConfig[];
  battery_percentage_entity?: string;
  battery_status_entity?: string;
  battery_powerline_entity?: string;
  battery_remaining_entity?: string;
  battery_full_lifetime_entity?: string;
  audio_output_entity?: string;
  audio_output_state_entity?: string;
  audio_output_volume_entity?: string;
  audio_output_muted_entity?: string;
  audio_input_entity?: string;
  audio_input_state_entity?: string;
  audio_input_volume_entity?: string;
  audio_input_muted_entity?: string;
  audio_input_devices_entity?: string;
  audio_output_devices_entity?: string;
  audio_peak_entity?: string;
  audio_sessions_entity?: string;
  lock_entity?: string;
  sleep_entity?: string;
  restart_entity?: string;
  shutdown_entity?: string;
  wake_entity?: string;
  session_entity?: string;
}

export interface ManagedService {
  name: string;
  entity: string;
  icon?: string;
  group?: string;
  cpu_entity?: string;
  restart_entity?: string;
  start_entity?: string;
  stop_entity?: string;
}

export interface ManagedVm extends ManagedService {
  pause_entity?: string;
  resume_entity?: string;
  console_url?: string;
  ip_entity?: string;
  vcpus?: number;
  memory?: string;
  storage?: string;
}

export interface UnraidDisk {
  name: string;
  group?: string;
  /** Affiche ce disque dans la synthèse de la carte principale. */
  show_on_card?: boolean;
  usage_entity?: string;
  capacity_entity?: string;
  temperature_entity?: string;
  status_entity?: string;
  healthy_state?: string;
}

export interface UnraidCardConfig extends BaseCardConfig {
  type: "custom:auralis-unraid-card";
  status_entity: string;
  array_state_entity?: string;
  uptime_entity?: string;
  version_entity?: string;
  array_usage_entity?: string;
  array_label_entity?: string;
  healthy_disks_entity?: string;
  total_disks_entity?: string;
  parity_entity?: string;
  parity_healthy_state?: string;
  parity_age_entity?: string;
  parity_errors_entity?: string;
  cpu_entity?: string;
  cpu_temperature_entity?: string;
  disk_temperature_entity?: string;
  memory_entity?: string;
  network_down_entity?: string;
  network_up_entity?: string;
  docker_cpu_entity?: string;
  docker_memory_entity?: string;
  updates_entity?: string;
  notifications_entity?: string;
  ups_connected_entity?: string;
  ups_status_entity?: string;
  ups_battery_entity?: string;
  ups_load_entity?: string;
  ups_runtime_entity?: string;
  server_url_entity?: string;
  docker?: ManagedService[];
  vms?: ManagedVm[];
  disks?: UnraidDisk[];
  docker_group_labels?: Record<string, string>;
  vm_group_labels?: Record<string, string>;
  array_start_entity?: string;
  array_stop_entity?: string;
  shutdown_entity?: string;
  restart_entity?: string;
}

export interface ProxmoxNode {
  name: string;
  status_entity: string;
  icon?: string;
  cpu_entity?: string;
  memory_entity?: string;
  temperature_entity?: string;
  restart_entity?: string;
  shutdown_entity?: string;
}

export interface ManagedProxmoxWorkload extends ManagedVm {
  node?: string;
}

export interface ProxmoxCardConfig extends BaseCardConfig {
  type: "custom:auralis-proxmox-card";
  status_entity: string;
  version_entity?: string;
  quorum_entity?: string;
  cluster_usage_entity?: string;
  memory_entity?: string;
  memory_label_entity?: string;
  storage_entity?: string;
  storage_label_entity?: string;
  ceph_entity?: string;
  backup_entity?: string;
  alerts_entity?: string;
  nodes?: ProxmoxNode[];
  vms?: ManagedProxmoxWorkload[];
  containers?: ManagedProxmoxWorkload[];
  backup_action_entity?: string;
  restart_entity?: string;
  shutdown_entity?: string;
}
