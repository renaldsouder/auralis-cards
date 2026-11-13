import "../auralis-cards";
import type { HassEntity, HomeAssistant } from "./types/home-assistant";
import type {
  CoversCardConfig,
  NavbarCardConfig,
  PcCardConfig,
  ProxmoxCardConfig,
  RoomCardConfig,
  UnraidCardConfig,
} from "./types/config";

class MockHaCard extends HTMLElement {}
class MockHaIcon extends HTMLElement {
  static observedAttributes = ["icon"];
  connectedCallback(): void { this.icon = this.getAttribute("icon") || ""; }
  attributeChangedCallback(_name: string, _old: string | null, value: string): void { this.icon = value; }
  set icon(value: string) {
    const symbol = value.includes("light") ? "●" : value.includes("server") ? "▤" : value.includes("monitor") ? "▣" : "◇";
    this.textContent = symbol;
    this.style.display = "inline-grid";
    this.style.placeItems = "center";
  }
}
if (!customElements.get("ha-card")) customElements.define("ha-card", MockHaCard);
if (!customElements.get("ha-icon")) customElements.define("ha-icon", MockHaIcon);

const e = (entity_id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity => ({
  entity_id,
  state,
  attributes: { friendly_name: entity_id.split(".")[1].replaceAll("_", " "), ...attributes },
});

const states = [
  e("sensor.salon_temperature", "21.5", { unit_of_measurement: "°C" }),
  e("sensor.salon_humidity", "46", { unit_of_measurement: "%" }),
  e("climate.salon", "heat", { friendly_name: "Climat Salon", temperature: 20.5, current_temperature: 21.5, target_temp_step: 0.5, min_temp: 7, max_temp: 28 }),
  e("media_player.salon", "playing", {
    friendly_name: "Enceinte du salon", device_class: "speaker", media_title: "So What", media_artist: "Miles Davis", media_album_name: "Kind of Blue",
    entity_picture: "/images/lumieres-ambiance.jpg", media_duration: 562, media_position: 148, media_position_updated_at: new Date().toISOString(),
    volume_level: 0.34, is_volume_muted: false, shuffle: false, repeat: "off", source: "Spotify", source_list: ["Spotify", "AirPlay", "Radio"],
    supported_features: 1 | 2 | 4 | 8 | 16 | 32 | 128 | 256 | 2048 | 16384 | 32768 | 262144,
  }),
  e("media_player.tv_salon", "on", { friendly_name: "Télévision Salon", device_class: "tv", media_title: "France 2", app_name: "TNT", volume_level: 0.22, supported_features: 4 | 8 | 128 | 256 | 2048, source: "TV", source_list: ["TV", "HDMI 1", "Netflix", "YouTube"] }),
  e("media_player.tx_nr686", "on", {
    friendly_name: "Onkyo TX-NR686", volume_level: 0.32, is_volume_muted: false, source: "tv", sound_mode: "Dolby Surround",
    source_list: ["tv", "bd-dvd", "game", "cbl-sat", "strm-box", "pc", "bluetooth", "network", "fm", "phono"],
    sound_mode_list: ["Stéréo", "Direct", "Dolby Surround", "DTS Neural:X", "Jeu", "Musique"],
    supported_features: 4 | 8 | 1024 | 2048 | 128 | 256 | 16384 | 65536,
  }),
  e("light.plafonnier", "on", { friendly_name: "Plafonnier", brightness: 178 }),
  e("light.lampadaire", "on", { friendly_name: "Lampadaire", brightness: 102 }),
  e("light.bibliotheque", "on", { friendly_name: "Bibliothèque", brightness: 216 }),
  e("light.ambiance_tv", "off", { friendly_name: "Ambiance TV", brightness: 0 }),
  e("cover.baie", "open", { friendly_name: "Baie vitrée", current_position: 75 }),
  e("cover.fenetre", "open", { friendly_name: "Fenêtre", current_position: 35 }),
  e("cover.bureau_fenetre", "closed", { friendly_name: "Fenêtre du bureau" }),
  e("cover.bureau_velux", "open", { friendly_name: "Velux du bureau" }),
  e("cover.chambre_principale", "open", { friendly_name: "Chambre principale" }),
  e("cover.chambre_enfant", "closed", { friendly_name: "Chambre enfant" }),
  e("cover.salle_manger", "open", { friendly_name: "Salle à manger" }),
  e("cover.cuisine", "open", { friendly_name: "Cuisine" }),
  e("binary_sensor.pc_online", "on"),
  e("sensor.pc_session", "Unlocked"),
  e("sensor.pc_user", "rso"),
  e("sensor.pc_last_boot", "2026-10-04T16:22:48+00:00"),
  e("sensor.pc_last_activity", "2026-10-05T16:55:06+00:00"),
  e("sensor.pc_system_state", "ApplicationStarted"),
  e("sensor.pc_cpu", "32", { unit_of_measurement: "%" }),
  e("sensor.pc_cpu_temp", "54", { unit_of_measurement: "°C" }),
  e("sensor.pc_gpu", "18", { unit_of_measurement: "%" }),
  e("sensor.pc_gpu_temp", "0", { unit_of_measurement: "°C" }),
  e("sensor.pc_ram", "46", { unit_of_measurement: "%" }),
  e("sensor.pc_storage", "60", { unit_of_measurement: "%" }),
  e("sensor.pc_storage_label", "1,2 / 2 To"),
  e("sensor.pc_drive_c", "C", { Label: "Windows", UsedSpacePercentage: 63, UsedSpaceMB: 322560, TotalSizeMB: 512000 }),
  e("sensor.pc_drive_d", "D", { Label: "Données", UsedSpacePercentage: 41, UsedSpaceMB: 419840, TotalSizeMB: 1024000 }),
  e("sensor.pc_battery", "100", { unit_of_measurement: "%" }),
  e("sensor.pc_battery_status", "High"),
  e("sensor.pc_powerline", "Online"),
  e("sensor.pc_audio_output", "SteelSeries Sonar - Gaming (SteelSeries Sonar Virtual Audio Device)"),
  e("sensor.pc_audio_output_state", "ACTIVE"),
  e("sensor.pc_audio_output_volume", "100", { unit_of_measurement: "%" }),
  e("sensor.pc_audio_output_muted", "False"),
  e("sensor.pc_audio_input", "SteelSeries Sonar - Microphone (SteelSeries Sonar Virtual Audio Device)"),
  e("sensor.pc_audio_input_state", "ACTIVE"),
  e("sensor.pc_audio_input_volume", "0", { unit_of_measurement: "%" }),
  e("sensor.pc_audio_input_muted", "False"),
  e("sensor.pc_audio_sessions", "6"),
  e("sensor.pc_audio_peak", "0"),
  e("sensor.pc_network_count", "3"),
  e("sensor.pc_network_vpn", "Up", { friendly_name: "OpenVPN TAP-Windows6" }),
  e("sensor.pc_network_ethernet", "Up", { friendly_name: "Ethernet 2" }),
  e("sensor.pc_network_wifi", "Down", { friendly_name: "Wi-Fi" }),
  e("sensor.pc_down", "12,4 Mb/s"),
  e("sensor.pc_up", "1,2 Mb/s"),
  e("binary_sensor.unraid_online", "on"),
  e("sensor.unraid_uptime", "18 jours"),
  e("sensor.unraid_array_usage", "68", { unit_of_measurement: "%" }),
  e("sensor.unraid_array_label", "16,3 / 24 To"),
  e("sensor.unraid_healthy_disks", "6"),
  e("sensor.unraid_total_disks", "6"),
  e("sensor.unraid_parity", "Valide"),
  e("sensor.unraid_parity_age", "il y a 12 j"),
  e("sensor.unraid_parity_errors", "0"),
  e("sensor.unraid_cpu", "18", { unit_of_measurement: "%" }),
  e("sensor.unraid_cpu_temp", "49", { unit_of_measurement: "°C" }),
  e("sensor.unraid_disk_max_temp", "48", { unit_of_measurement: "°C" }),
  e("sensor.unraid_ram", "42", { unit_of_measurement: "%" }),
  e("sensor.unraid_down", "38 Mb/s"),
  e("sensor.unraid_up", "8 Mb/s"),
  e("sensor.unraid_version", "7.3.2"),
  e("sensor.unraid_updates", "5"),
  e("sensor.unraid_notifications", "3"),
  e("sensor.unraid_docker_cpu", "3.7", { unit_of_measurement: "%" }),
  e("sensor.unraid_docker_memory", "9.5", { unit_of_measurement: "%" }),
  e("binary_sensor.unraid_ups_connected", "on"),
  e("sensor.unraid_ups_status", "ONLINE"),
  e("sensor.unraid_ups_battery", "100", { unit_of_measurement: "%" }),
  e("sensor.unraid_ups_load", "25", { unit_of_measurement: "%" }),
  e("sensor.unraid_ups_runtime", "1 heure"),
  e("switch.docker_ha", "on"),
  e("switch.docker_mqtt", "on"),
  e("switch.docker_plex", "off"),
  e("switch.docker_grafana", "off"),
  e("switch.vm_homelab", "on"),
  e("switch.vm_windows", "off"),
  e("sensor.vm_homelab_ip", "192.168.1.42"),
  e("sensor.unraid_disk_1_usage", "78", { unit_of_measurement: "%" }),
  e("sensor.unraid_disk_1_capacity", "6,2 / 8 To"),
  e("sensor.unraid_disk_1_temp", "43", { unit_of_measurement: "°C" }),
  e("binary_sensor.unraid_disk_1_healthy", "on"),
  e("sensor.unraid_disk_2_usage", "63", { unit_of_measurement: "%" }),
  e("sensor.unraid_disk_2_capacity", "5 / 8 To"),
  e("sensor.unraid_disk_2_temp", "41", { unit_of_measurement: "°C" }),
  e("binary_sensor.unraid_disk_2_healthy", "on"),
  e("button.unraid_array_start", "2026-10-05T08:00:00+02:00"),
  e("button.unraid_array_stop", "2026-10-05T08:00:00+02:00"),
  e("button.unraid_restart", "2026-10-05T08:00:00+02:00"),
  e("button.unraid_shutdown", "2026-10-05T08:00:00+02:00"),
  e("button.docker_ha_restart", "2026-10-05T08:00:00+02:00"),
  e("button.docker_mqtt_restart", "2026-10-05T08:00:00+02:00"),
  e("button.vm_homelab_restart", "2026-10-05T08:00:00+02:00"),
  e("button.vm_homelab_pause", "2026-10-05T08:00:00+02:00"),
  e("button.vm_homelab_resume", "2026-10-05T08:00:00+02:00"),
  e("binary_sensor.proxmox_online", "on"),
  e("sensor.proxmox_version", "9.0"),
  e("sensor.proxmox_quorum", "3 / 3"),
  e("sensor.proxmox_usage", "42", { unit_of_measurement: "%" }),
  e("sensor.proxmox_memory", "58", { unit_of_measurement: "%" }),
  e("sensor.proxmox_memory_label", "186 Go"),
  e("sensor.proxmox_storage", "59", { unit_of_measurement: "%" }),
  e("sensor.proxmox_storage_label", "14,2 / 24 To"),
  e("sensor.proxmox_ceph", "HEALTH_OK"),
  e("sensor.proxmox_backup", "2026-10-06T01:30:00+02:00"),
  e("binary_sensor.proxmox_backup_running", "off"),
  e("sensor.proxmox_uptime", "291.2725", { unit_of_measurement: "h" }),
  e("sensor.proxmox_memory_used", "11.3387", { unit_of_measurement: "GiB" }),
  e("sensor.proxmox_memory_total", "15.4001", { unit_of_measurement: "GiB" }),
  e("sensor.proxmox_alerts", "0"),
  e("binary_sensor.pve_01_online", "on"),
  e("binary_sensor.pve_02_online", "on"),
  e("binary_sensor.pve_03_online", "on"),
  e("sensor.pve_01_cpu", "38", { unit_of_measurement: "%" }),
  e("sensor.pve_02_cpu", "47", { unit_of_measurement: "%" }),
  e("sensor.pve_03_cpu", "41", { unit_of_measurement: "%" }),
  e("sensor.pve_01_temp", "48", { unit_of_measurement: "°C" }),
  e("sensor.pve_02_temp", "51", { unit_of_measurement: "°C" }),
  e("sensor.pve_03_temp", "46", { unit_of_measurement: "°C" }),
  e("switch.proxmox_vm_ha", "on"),
  e("switch.proxmox_vm_windows", "off"),
  e("switch.proxmox_lxc_mqtt", "on"),
  e("switch.proxmox_lxc_grafana", "on"),
  e("sensor.proxmox_vm_ha_ip", "192.168.1.50"),
  e("sensor.chambre_temperature", "18.4", { unit_of_measurement: "°C" }),
  e("sensor.chambre_humidity", "52", { unit_of_measurement: "%" }),
  e("sensor.chambre_battery", "88", { unit_of_measurement: "%" }),
  e("sensor.salle_de_bain_temperature", "23.6", { unit_of_measurement: "°C" }),
  e("sensor.salle_de_bain_humidity", "71", { unit_of_measurement: "%" }),
  e("sensor.salle_de_bain_battery", "12", { unit_of_measurement: "%" }),
  e("sensor.bureau_temperature", "26.3", { unit_of_measurement: "°C" }),
  e("sensor.bureau_humidity", "39", { unit_of_measurement: "%" }),
  e("sensor.hall_temperature", "16.2", { unit_of_measurement: "°C" }),
  e("sensor.garderie_temperature", "unavailable", { unit_of_measurement: "°C" }),
  e("sensor.exterieur_temperature", "7.8", { unit_of_measurement: "°C" }),
  e("sensor.exterieur_humidity", "83", { unit_of_measurement: "%" }),
  e("weather.maison", "partlycloudy", {
    friendly_name: "Maison", temperature: 8.4, temperature_unit: "°C", apparent_temperature: 6.1, dew_point: 5.2,
    humidity: 81, pressure: 1017, pressure_unit: "hPa", wind_speed: 17, wind_gust_speed: 32, wind_speed_unit: "km/h",
    wind_bearing: 250, uv_index: 1.4, cloud_coverage: 55, visibility: 18, visibility_unit: "km", supported_features: 3,
  }),
  e("sun.sun", "above_horizon", {
    next_setting: new Date(Date.now() + 2.5 * 3_600_000).toISOString(),
    next_rising: new Date(Date.now() + 16 * 3_600_000).toISOString(),
  }),
  e("sensor.vigilance_meteo", "Jaune", { friendly_name: "Vigilance vent" }),
  e("script.wake_skynet", "off", { friendly_name: "Réveiller Skynet", last_triggered: new Date(Date.now() - 3 * 3_600_000).toISOString() }),
  e("binary_sensor.skynet_online", "off", { friendly_name: "Skynet en ligne" }),
  e("button.reboot_freebox", new Date(Date.now() - 2 * 86_400_000).toISOString(), { friendly_name: "Redémarrer la Freebox" }),
  e("button.reboot_ha", "unknown", { friendly_name: "Redémarrer Home Assistant" }),
  e("scene.salon_cinema", new Date(Date.now() - 20 * 60_000).toISOString(), { friendly_name: "Cinéma" }),
  e("scene.salon_soiree", "unknown", { friendly_name: "Soirée" }),
  e("automation.volets_soir", "on", { friendly_name: "Volets du soir", last_triggered: new Date(Date.now() - 86_400_000).toISOString() }),
  e("switch.mode_invites", "on", { friendly_name: "Mode invités" }),
  e("camera.allee", "streaming", { friendly_name: "Allée", entity_picture: "/images/pieces/garage-exterieur.jpg" }),
  e("camera.jardin", "idle", { friendly_name: "Jardin", entity_picture: "/images/pieces/jardin.jpg" }),
  e("camera.piscine", "recording", { friendly_name: "Piscine", entity_picture: "/images/pieces/piscine.jpg" }),
  e("camera.garderie", "idle", { friendly_name: "Garderie", entity_picture: "/images/pieces/garderie.jpg" }),
  e("camera.voisin", "unavailable", { friendly_name: "Côté voisin" }),
  e("binary_sensor.allee_mouvement", "on", { friendly_name: "Mouvement allée" }),
  { ...e("binary_sensor.jardin_mouvement", "off", { friendly_name: "Mouvement jardin" }), last_changed: new Date(Date.now() - 25 * 60_000).toISOString() },
  e("light.projecteur_allee", "off", { friendly_name: "Projecteur allée" }),
  e("button.sirene_exterieure", "unknown", { friendly_name: "Sirène extérieure" }),
  e("switch.porche", "on", { friendly_name: "Porche" }),
  e("switch.allee", "off", { friendly_name: "Allée" }),
  e("switch.terrasse", "on", { friendly_name: "Terrasse" }),
  e("switch.meuble_tv", "on", { friendly_name: "Meuble TV" }),
  e("light.ruban_salon", "on", { friendly_name: "Ruban du salon", brightness: 150, rgb_color: [255, 120, 60], supported_color_modes: ["rgb"] }),
  e("climate.refrigerateur", "cool", { friendly_name: "Réfrigérateur", current_temperature: 4.4, temperature: 4, target_temp_step: 1, min_temp: 1, max_temp: 7, preset_modes: ["normal", "eco", "vacances"], preset_mode: "eco" }),
  e("sensor.compteur_gaz", "8423.61", { friendly_name: "Compteur de gaz", unit_of_measurement: "m³", device_class: "gas" }),
  e("sensor.debit_gaz", "0.42", { friendly_name: "Débit de gaz", unit_of_measurement: "m³/h" }),
  e("script.wake_skynet_demo", "off", { friendly_name: "Réveiller le serveur" }),
].reduce<Record<string, HassEntity>>((map, item) => ({ ...map, [item.entity_id]: item }), {});

const hass: HomeAssistant = {
  states,
  themes: { darkMode: false },
  formatEntityState: (state) => `${state.state}${state.attributes.unit_of_measurement ? ` ${state.attributes.unit_of_measurement}` : ""}`,
  callService: async (domain, service, data, target) => {
    console.info("Service Home Assistant simulé", { domain, service, data, target });
    if (domain === "media_player") simulateMedia(String((target as { entity_id?: string } | undefined)?.entity_id ?? ""), service, data ?? {});
  },
  // Historique simulé : une oscillation journalière qui se termine sur la valeur actuelle du capteur.
  callWS: async <T>(message: Record<string, unknown>): Promise<T> => {
    // Statistiques journalières simulées : 14 jours de consommation pour la carte Énergie.
    if (message.type === "recorder/statistics_during_period") {
      const day = 86_400_000;
      const today = new Date().setHours(0, 0, 0, 0);
      return Object.fromEntries((message.statistic_ids as string[]).map((id) => [id, Array.from({ length: 14 }, (_, index) => ({
        start: today - (13 - index) * day,
        change: Math.round((4.2 + 1.6 * Math.sin(index * 0.9) + (index % 7 === 5 ? 1.8 : 0)) * 100) / 100,
      }))])) as T;
    }
    if (message.type !== "history/history_during_period") throw new Error("Commande WebSocket non simulée");
    const start = Date.parse(String(message.start_time));
    const end = Date.parse(String(message.end_time));
    const cycle = (time: number, shift: number): number => Math.sin((time / 86_400_000) * 2 * Math.PI + shift);
    return Object.fromEntries((message.entity_ids as string[]).map((id, index) => {
      const current = Number.parseFloat(states[id]?.state ?? "");
      if (!Number.isFinite(current)) return [id, []];
      const amplitude = id.includes("humidity") ? 7 : id.includes("exterieur") ? 5 : 1.8;
      return [id, Array.from({ length: 120 }, (_, step) => {
        const time = start + ((end - start) * step) / 119;
        const value = current + amplitude * (cycle(time, index) - cycle(end, index)) + Math.sin(step * 1.7 + index) * amplitude * 0.06;
        return { s: value.toFixed(1), lu: time / 1000 };
      })];
    })) as T;
  },
  // Prévisions simulées : renvoyées une fois, comme le premier message de weather/subscribe_forecast.
  connection: {
    subscribeMessage: async <T>(callback: (message: T) => void, message: Record<string, unknown>) => {
      const hourly = message.forecast_type === "hourly";
      const conditions = hourly
        ? ["partlycloudy", "partlycloudy", "cloudy", "rainy", "rainy", "pouring", "cloudy", "partlycloudy", "clear-night", "clear-night"]
        : ["partlycloudy", "rainy", "lightning-rainy", "cloudy", "sunny", "sunny", "snowy-rainy"];
      const start = hourly ? Math.floor(Date.now() / 3_600_000) * 3_600_000 : new Date().setHours(12, 0, 0, 0);
      const forecast = Array.from({ length: hourly ? 24 : 7 }, (_, index) => ({
        datetime: new Date(start + index * (hourly ? 3_600_000 : 86_400_000)).toISOString(),
        condition: conditions[index % conditions.length],
        temperature: hourly ? 8.4 + 3 * Math.sin((index - 2) / 4) : [11, 9, 7, 6, 14, 17, 3][index],
        templow: hourly ? undefined : [4, 5, 2, -1, 6, 9, -3][index],
        precipitation_probability: hourly ? [5, 10, 30, 70, 85, 90, 40, 15, 0, 0][index % 10] : [20, 80, 90, 30, 0, 5, 60][index],
        wind_speed: 12 + index,
      }));
      window.setTimeout(() => callback({ type: message.forecast_type, forecast } as T), 300);
      return () => undefined;
    },
  },
};

// Lecteurs simulés : les commandes de la carte Média modifient vraiment l'état affiché.
const mounted: Array<{ hass?: HomeAssistant }> = [];
function simulateMedia(id: string, service: string, data: Record<string, unknown>): void {
  const current = states[id];
  if (!current) return;
  const attributes = { ...current.attributes };
  let state = current.state;
  const volume = typeof attributes.volume_level === "number" ? attributes.volume_level : 0;
  if (service === "turn_on") state = "on";
  if (service === "turn_off") state = "off";
  if (service === "media_play") state = "playing";
  if (service === "media_pause") state = "paused";
  if (service === "media_play_pause") state = state === "playing" ? "paused" : "playing";
  if (service === "volume_set") attributes.volume_level = data.volume_level;
  if (service === "volume_up" || service === "volume_down") attributes.volume_level = Math.min(1, Math.max(0, Math.round((volume + (service === "volume_up" ? 0.01 : -0.01)) * 100) / 100));
  if (service === "volume_mute") attributes.is_volume_muted = data.is_volume_muted;
  if (service === "select_source") { attributes.source = data.source; if (state === "off") state = "on"; }
  if (service === "select_sound_mode") attributes.sound_mode = data.sound_mode;
  if (service === "shuffle_set") attributes.shuffle = data.shuffle;
  if (service === "repeat_set") attributes.repeat = data.repeat;
  if (service === "media_seek") Object.assign(attributes, { media_position: data.seek_position, media_position_updated_at: new Date().toISOString() });
  if (service === "media_next_track" || service === "media_previous_track") Object.assign(attributes, { media_position: 0, media_position_updated_at: new Date().toISOString() });
  if (["media_pause", "media_play", "media_play_pause"].includes(service) && typeof attributes.media_position === "number") {
    const updated = Date.parse(String(attributes.media_position_updated_at));
    const elapsed = current.state === "playing" && Number.isFinite(updated) ? (Date.now() - updated) / 1000 : 0;
    Object.assign(attributes, { media_position: attributes.media_position + elapsed, media_position_updated_at: new Date().toISOString() });
  }
  states[id] = { ...current, state, attributes };
  window.setTimeout(() => {
    const next = { ...hass, states: { ...states } };
    for (const card of mounted) card.hass = next;
  }, 250);
}

const lightsCard = {
  type: "custom:auralis-lights-card",
  name: "Éclairages",
  groups: [
    { name: "Extérieur", icon: "mdi:outdoor-lamp", show_lights: true, lights: ["switch.porche", "switch.allee", "switch.terrasse"] },
    { name: "Salon", icon: "mdi:sofa-outline", show_lights: true, lights: ["light.ruban_salon", "switch.meuble_tv"] },
  ],
};

const fridgeCard = {
  type: "custom:auralis-fridge-card",
  name: "Réfrigérateur",
  background_image: "/images/frigo-connecte.jpg",
  climate_entity: "climate.refrigerateur",
};

const gasCard = {
  type: "custom:auralis-energy-card",
  energy_entity: "sensor.compteur_gaz",
  power_entity: "sensor.debit_gaz",
};

const mediaCard = {
  type: "custom:auralis-media-card",
  name: "Multimédia",
  players: [
    { entity: "media_player.tx_nr686", name: "Ampli Onkyo", max_volume: 70, volume_step: 2, volume_scale: 80,
      sources: [
        { source: "tv", name: "Télé" }, { source: "bd-dvd", name: "Blu-ray" }, { source: "game", name: "Console" },
        { source: "strm-box", name: "Box TV" }, { source: "bluetooth", name: "Bluetooth" }, { source: "network", name: "Réseau" },
      ] },
    { entity: "media_player.salon", name: "Enceinte" },
    { entity: "media_player.tv_salon", name: "TV" },
  ],
};

const actionsCard = {
  type: "custom:auralis-actions-card",
  name: "Actions rapides",
  icon: "mdi:lightning-bolt-outline",
  actions: [
    { entity: "script.wake_skynet", name: "Réveiller Skynet", icon: "mdi:nas", color: "#FF8055", state_entity: "binary_sensor.skynet_online" },
    { entity: "button.reboot_freebox", name: "Redémarrer la Freebox", icon: "mdi:web-box", color: "#FF6B74", danger: true,
      confirm: "Redémarrer la Freebox ? La connexion Internet sera coupée quelques minutes." },
    { entity: "button.reboot_ha", name: "Redémarrer HA", icon: "mdi:home-assistant", confirm: true, danger: true },
    { entity: "automation.volets_soir" },
    { entity: "switch.mode_invites", icon: "mdi:account-group-outline", color: "#B79CFF" },
    { navigation_path: "/cameras", name: "Caméras", icon: "mdi:cctv" },
  ],
};

const scenesCard = {
  type: "custom:auralis-actions-card",
  layout: "compact",
  actions: [
    { entity: "scene.salon_cinema", icon: "mdi:movie-open-outline" },
    { entity: "scene.salon_soiree", icon: "mdi:weather-night" },
    { entity: "switch.mode_invites", name: "Invités", icon: "mdi:account-group-outline", color: "#B79CFF" },
  ],
};

const camerasCard = {
  type: "custom:auralis-cameras-card",
  name: "Caméras",
  refresh_interval: 5,
  cameras: [
    { entity: "camera.allee", icon: "mdi:gate", motion_entity: "binary_sensor.allee_mouvement", actions: [
      { entity: "light.projecteur_allee", name: "Projecteur", icon: "mdi:spotlight-beam" },
      { entity: "button.sirene_exterieure", name: "Sirène", icon: "mdi:alarm-light-outline", confirm: "Déclencher la sirène extérieure ?" },
    ] },
    { entity: "camera.jardin", icon: "mdi:flower-outline", motion_entity: "binary_sensor.jardin_mouvement" },
    { entity: "camera.piscine", icon: "mdi:pool" },
    { entity: "camera.garderie", icon: "mdi:teddy-bear" },
    { entity: "camera.voisin" },
  ],
};

const weather = {
  type: "custom:auralis-weather-card",
  entity: "weather.maison",
  temperature_entity: "sensor.exterieur_temperature",
  alert_entity: "sensor.vigilance_meteo",
  forecast_count: 6,
};

const climate = {
  type: "custom:auralis-climate-card",
  name: "Températures",
  theme: "carbon",
  card_background: { mode: "gradient", gradient: "linear-gradient(145deg, #09111A 0%, #0D1822 58%, #081018 100%)" },
  accent_color: "#79d6f2",
  rooms: [
    { name: "Salon", icon: "mdi:sofa-outline", temperature_entity: "sensor.salon_temperature", humidity_entity: "sensor.salon_humidity" },
    { name: "Chambre", icon: "mdi:bed-outline", temperature_entity: "sensor.chambre_temperature", humidity_entity: "sensor.chambre_humidity", battery_entity: "sensor.chambre_battery" },
    { name: "Salle de bain", icon: "mdi:shower", temperature_entity: "sensor.salle_de_bain_temperature", humidity_entity: "sensor.salle_de_bain_humidity", battery_entity: "sensor.salle_de_bain_battery" },
    { name: "Bureau", icon: "mdi:desk", temperature_entity: "sensor.bureau_temperature", humidity_entity: "sensor.bureau_humidity" },
    { name: "Hall", icon: "mdi:door", temperature_entity: "sensor.hall_temperature" },
    { name: "Garderie", temperature_entity: "sensor.garderie_temperature" },
    { name: "Extérieur", temperature_entity: "sensor.exterieur_temperature", humidity_entity: "sensor.exterieur_humidity", outdoor: true },
  ],
};

const room: RoomCardConfig = {
  type: "custom:auralis-room-card",
  name: "Salon",
  theme: "carbon",
  card_background: { mode: "gradient", gradient: "linear-gradient(145deg, #09111A 0%, #0D1822 58%, #081018 100%)" },
  show_grid: false,
  background_position: "center",
  accent_color: "#79d6f2",
  temperature_entity: "sensor.salon_temperature",
  humidity_entity: "sensor.salon_humidity",
  climate_entity: "climate.salon",
  media_player_entity: "media_player.salon",
  ambiance: { label: "Ambiance", icon: "mdi:creation-outline", position: "bottom-right" },
  scenes: [
    { entity: "scene.soiree_salon", label: "Mode soirée", icon: "mdi:weather-night" },
    { entity: "scene.normal_salon", label: "Mode normal", icon: "mdi:lightbulb-group-outline" },
  ],
  subtitle: "Aucun appareil en alerte",
  left_controls: [{ type: "lights", label: "Lumières", icon: "mdi:ceiling-light-outline" }],
  right_controls: [
    { type: "media", entity: "media_player.salon", label: "Musique", icon: "mdi:music-note" },
    { type: "tv", entity: "media_player.tv_salon", label: "TV", icon: "mdi:television" },
  ],
  thermostat: {
    entity: "climate.salon",
    position: "bottom-left",
    label: "Thermostat",
    step: 0.5,
    label_color: "#b9c6d5",
    value_color: "#ffffff",
    button_color: "#79d6f2",
    background_color: "rgba(13,18,25,.78)",
    border_color: "rgba(121,214,242,.28)",
  },
  lights: ["light.plafonnier", "light.lampadaire", "light.bibliotheque", "light.ambiance_tv"],
  covers: ["cover.baie", "cover.fenetre"],
};

const covers: CoversCardConfig = {
  type: "custom:auralis-covers-card",
  theme: "carbon",
  groups: [
    { name: "Salon", covers: ["cover.baie", "cover.fenetre"] },
    { name: "Bureau", covers: ["cover.bureau_fenetre", "cover.bureau_velux"] },
    { name: "Chambres", covers: ["cover.chambre_principale", "cover.chambre_enfant"] },
    { name: "Salle à manger", covers: ["cover.salle_manger", "cover.cuisine"] },
  ],
};

const pc: PcCardConfig = {
  type: "custom:auralis-pc-card",
  name: "Aurora",
  theme: "carbon",
  card_background: { mode: "gradient", gradient: "linear-gradient(145deg, #09111A 0%, #0D1822 58%, #081018 100%)" },
  show_grid: false,
  background_image: "/pc-bureau.png",
  background_position: "58% center",
  image_opacity: 35,
  accent_color: "#7997ff",
  online_entity: "binary_sensor.pc_online",
  session_entity: "sensor.pc_session",
  user_entity: "sensor.pc_user",
  last_boot_entity: "sensor.pc_last_boot",
  last_activity_entity: "sensor.pc_last_activity",
  system_state_entity: "sensor.pc_system_state",
  cpu_entity: "sensor.pc_cpu",
  // Capteur CPU volontairement absent et température GPU à 0 : les deux zones sont masquées.
  gpu_entity: "sensor.pc_gpu",
  gpu_temperature_entity: "sensor.pc_gpu_temp",
  memory_entity: "sensor.pc_ram",
  drives: [
    { entity: "sensor.pc_drive_c", label: "Système C:" },
    { entity: "sensor.pc_drive_d", label: "Données D:" },
  ],
  battery_percentage_entity: "sensor.pc_battery",
  battery_status_entity: "sensor.pc_battery_status",
  battery_powerline_entity: "sensor.pc_powerline",
  audio_output_entity: "sensor.pc_audio_output",
  audio_output_state_entity: "sensor.pc_audio_output_state",
  audio_output_volume_entity: "sensor.pc_audio_output_volume",
  audio_output_muted_entity: "sensor.pc_audio_output_muted",
  audio_input_entity: "sensor.pc_audio_input",
  audio_input_state_entity: "sensor.pc_audio_input_state",
  audio_input_volume_entity: "sensor.pc_audio_input_volume",
  audio_input_muted_entity: "sensor.pc_audio_input_muted",
  audio_sessions_entity: "sensor.pc_audio_sessions",
  audio_peak_entity: "sensor.pc_audio_peak",
  network_total_entity: "sensor.pc_network_count",
  network_interfaces: [
    { entity: "sensor.pc_network_vpn", label: "OpenVPN" },
    { entity: "sensor.pc_network_ethernet", label: "Ethernet 2" },
    { entity: "sensor.pc_network_wifi", label: "Wi-Fi" },
  ],
  network_down_entity: "sensor.pc_down",
  network_up_entity: "sensor.pc_up",
  lock_entity: "button.pc_lock",
  sleep_entity: "button.pc_sleep",
  restart_entity: "button.pc_restart",
  shutdown_entity: "button.pc_shutdown",
};

const unraid: UnraidCardConfig = {
  type: "custom:auralis-unraid-card",
  name: "Atlas",
  theme: "carbon",
  card_background: { mode: "gradient", gradient: "linear-gradient(145deg, #09111A 0%, #0D1822 58%, #081018 100%)" },
  show_grid: false,
  background_image: "/nas.png",
  background_position: "51% center",
  accent_color: "#ff8055",
  status_entity: "binary_sensor.unraid_online",
  wake_entity: "script.wake_skynet_demo",
  uptime_entity: "sensor.unraid_uptime",
  array_usage_entity: "sensor.unraid_array_usage",
  array_label_entity: "sensor.unraid_array_label",
  healthy_disks_entity: "sensor.unraid_healthy_disks",
  total_disks_entity: "sensor.unraid_total_disks",
  parity_entity: "sensor.unraid_parity",
  parity_age_entity: "sensor.unraid_parity_age",
  parity_errors_entity: "sensor.unraid_parity_errors",
  cpu_entity: "sensor.unraid_cpu",
  cpu_temperature_entity: "sensor.unraid_cpu_temp",
  disk_temperature_entity: "sensor.unraid_disk_max_temp",
  memory_entity: "sensor.unraid_ram",
  network_down_entity: "sensor.unraid_down",
  network_up_entity: "sensor.unraid_up",
  version_entity: "sensor.unraid_version",
  updates_entity: "sensor.unraid_updates",
  notifications_entity: "sensor.unraid_notifications",
  docker_cpu_entity: "sensor.unraid_docker_cpu",
  docker_memory_entity: "sensor.unraid_docker_memory",
  ups_connected_entity: "binary_sensor.unraid_ups_connected",
  ups_status_entity: "sensor.unraid_ups_status",
  ups_battery_entity: "sensor.unraid_ups_battery",
  ups_load_entity: "sensor.unraid_ups_load",
  ups_runtime_entity: "sensor.unraid_ups_runtime",
  array_start_entity: "button.unraid_array_start",
  array_stop_entity: "button.unraid_array_stop",
  restart_entity: "button.unraid_restart",
  shutdown_entity: "button.unraid_shutdown",
  disks: [
    { name: "Disque 1", group: "Array", show_on_card: true, usage_entity: "sensor.unraid_disk_1_usage", capacity_entity: "sensor.unraid_disk_1_capacity", temperature_entity: "sensor.unraid_disk_1_temp", status_entity: "binary_sensor.unraid_disk_1_healthy" },
    { name: "Disque 2", group: "Array", show_on_card: true, usage_entity: "sensor.unraid_disk_2_usage", capacity_entity: "sensor.unraid_disk_2_capacity", temperature_entity: "sensor.unraid_disk_2_temp", status_entity: "binary_sensor.unraid_disk_2_healthy" },
  ],
  docker_group_labels: { Maison: "Domotique", Médias: "Multimédia", default: "Applications" },
  vm_group_labels: { Production: "Serveurs", Bureau: "Postes de travail", default: "Machines virtuelles" },
  docker: [
    { name: "Home Assistant", entity: "switch.docker_ha", group: "Maison", restart_entity: "button.docker_ha_restart" },
    { name: "Mosquitto", entity: "switch.docker_mqtt", group: "Maison", restart_entity: "button.docker_mqtt_restart" },
    { name: "Plex", entity: "switch.docker_plex", group: "Médias" },
    { name: "Grafana", entity: "switch.docker_grafana", group: "Infrastructure" },
  ],
  vms: [
    { name: "HomeLab Ubuntu", entity: "switch.vm_homelab", group: "Production", vcpus: 4, memory: "8 Go", storage: "120 Go", ip_entity: "sensor.vm_homelab_ip", restart_entity: "button.vm_homelab_restart", pause_entity: "button.vm_homelab_pause", resume_entity: "button.vm_homelab_resume", console_url: "#" },
    { name: "Windows 11", entity: "switch.vm_windows", group: "Bureau", vcpus: 8, memory: "16 Go", storage: "256 Go" },
  ],
};

const navbar: NavbarCardConfig = {
  type: "custom:auralis-navbar-card",
  name: "Navigation principale",
  theme: "carbon",
  position: "bottom",
  items: [
    { label: "Accueil", icon: "mdi:home-outline", path: "/" },
    { label: "Pièces", icon: "mdi:floor-plan", path: "/pieces" },
    { label: "Systèmes", icon: "mdi:server-network", path: "/systemes", badge_entity: "sensor.unraid_notifications" },
    { label: "Énergie", icon: "mdi:lightning-bolt-outline", path: "/energie" },
  ],
};

const proxmox: ProxmoxCardConfig = {
  type: "custom:auralis-proxmox-card",
  name: "Proxmox Jarvis",
  theme: "carbon",
  background_image: "/unraid.png",
  background_position: "47% center",
  accent_color: "#50d59b",
  status_entity: "binary_sensor.proxmox_online",
  wake_entity: "script.wake_skynet_demo",
  version_entity: "sensor.proxmox_version",
  quorum_entity: "sensor.proxmox_quorum",
  cluster_usage_entity: "sensor.proxmox_usage",
  memory_entity: "sensor.proxmox_memory",
  memory_label_entity: "sensor.proxmox_memory_label",
  info_columns: 3,
  info_items: [
    { entity: "sensor.proxmox_uptime", label: "En ligne depuis", icon: "mdi:clock-outline", format: "duration", duration_unit: "hours" },
    { entity: "sensor.proxmox_backup", label: "Sauvegarde", icon: "mdi:backup-restore", format: "datetime", active_entity: "binary_sensor.proxmox_backup_running", active_text: "En cours" },
    { entity: "sensor.proxmox_memory_used", label: "RAM utilisée", icon: "mdi:memory", format: "ratio", total_entity: "sensor.proxmox_memory_total", unit: "Gio", precision: 1 },
  ],
  storage_entity: "sensor.proxmox_storage",
  storage_label_entity: "sensor.proxmox_storage_label",
  storages: [
    { name: "Local système", usage_entity: "sensor.proxmox_storage", capacity_entity: "sensor.proxmox_storage_label" },
    { name: "Volumes des VM", usage_entity: "sensor.proxmox_storage" },
    { name: "Sauvegardes", usage_entity: "sensor.proxmox_storage", show_on_card: false },
  ],
  disks: [{ name: "NVMe physique", capacity_entity: "sensor.proxmox_storage_label" }],
  ceph_entity: "sensor.proxmox_ceph",
  backup_entity: "sensor.proxmox_backup",
  alerts_entity: "sensor.proxmox_alerts",
  backup_action_entity: "button.proxmox_backup_now",
  restart_entity: "button.proxmox_cluster_restart",
  shutdown_entity: "button.proxmox_cluster_shutdown",
  nodes: [
    { name: "pve-01", status_entity: "binary_sensor.pve_01_online", cpu_entity: "sensor.pve_01_cpu", temperature_entity: "sensor.pve_01_temp", restart_entity: "button.pve_01_restart", shutdown_entity: "button.pve_01_shutdown" },
    { name: "pve-02", status_entity: "binary_sensor.pve_02_online", cpu_entity: "sensor.pve_02_cpu", temperature_entity: "sensor.pve_02_temp", restart_entity: "button.pve_02_restart", shutdown_entity: "button.pve_02_shutdown" },
    { name: "pve-03", status_entity: "binary_sensor.pve_03_online", cpu_entity: "sensor.pve_03_cpu", temperature_entity: "sensor.pve_03_temp", restart_entity: "button.pve_03_restart", shutdown_entity: "button.pve_03_shutdown" },
  ],
  vms: [
    { name: "Home Assistant", entity: "switch.proxmox_vm_ha", node: "pve-01", group: "Maison", vcpus: 4, memory: "8 Go", storage: "64 Go", ip_entity: "sensor.proxmox_vm_ha_ip", start_entity: "button.proxmox_vm_ha_start", restart_entity: "button.proxmox_vm_ha_restart", console_url: "#" },
    { name: "Windows 11", entity: "switch.proxmox_vm_windows", node: "pve-02", group: "Bureau", vcpus: 8, memory: "16 Go", storage: "256 Go", start_entity: "button.proxmox_vm_windows_start" },
  ],
  containers: [
    { name: "Mosquitto", entity: "switch.proxmox_lxc_mqtt", node: "pve-01", group: "Maison", vcpus: 1, memory: "1 Go", restart_entity: "button.proxmox_lxc_mqtt_restart" },
    { name: "Grafana", entity: "switch.proxmox_lxc_grafana", node: "pve-03", group: "Infrastructure", vcpus: 2, memory: "2 Go", restart_entity: "button.proxmox_lxc_grafana_restart" },
  ],
};

const mount = <T extends HTMLElement & { hass?: HomeAssistant; setConfig(config: unknown): void }>(tag: string, config: unknown): void => {
  const card = document.createElement(tag) as T;
  card.setConfig(config);
  card.hass = hass;
  mounted.push(card);
  document.querySelector("#demo")?.append(card);
};

mount("auralis-navbar-card", navbar);
mount("auralis-weather-card", weather);
mount("auralis-actions-card", actionsCard);
mount("auralis-actions-card", scenesCard);
mount("auralis-cameras-card", camerasCard);
mount("auralis-media-card", mediaCard);
mount("auralis-lights-card", lightsCard);
mount("auralis-fridge-card", fridgeCard);
mount("auralis-energy-card", gasCard);
mount("auralis-room-card", room);
mount("auralis-climate-card", climate);
mount("auralis-covers-card", covers);
mount("auralis-pc-card", pc);
mount("auralis-unraid-card", unraid);
mount("auralis-proxmox-card", proxmox);
