import type { HassEntity, HomeAssistant } from "../types/home-assistant";

export const ACTIVE_STATES = new Set([
  "on",
  "open",
  "opening",
  "playing",
  "running",
  "starting",
  "active",
  "online",
  "ok",
  "home",
  "heat",
  "cool",
]);

export function entity(hass: HomeAssistant | undefined, entityId?: string): HassEntity | undefined {
  return entityId && hass ? hass.states[entityId] : undefined;
}

export function isAvailable(state?: HassEntity): boolean {
  return Boolean(state && state.state !== "unknown" && state.state !== "unavailable");
}

export function isActive(state?: HassEntity): boolean {
  return Boolean(state && ACTIVE_STATES.has(state.state.toLowerCase()));
}

export function friendlyName(state?: HassEntity, fallback = "Appareil"): string {
  return state?.attributes.friendly_name || fallback;
}

export function numericState(state?: HassEntity, fallback = 0): number {
  if (!state) return fallback;
  const value = Number.parseFloat(state.state.replace(",", "."));
  return Number.isFinite(value) ? value : fallback;
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits }).format(value);
}

export function displayState(hass: HomeAssistant | undefined, entityId?: string, fallback = "—"): string {
  const state = entity(hass, entityId);
  if (!state || !isAvailable(state)) return fallback;
  if (hass?.formatEntityState) return hass.formatEntityState(state);
  const unit = state.attributes.unit_of_measurement;
  return `${state.state}${unit ? ` ${unit}` : ""}`;
}

export function coverPosition(state?: HassEntity): number | undefined {
  const value = state?.attributes.current_position;
  return typeof value === "number" ? clamp(value) : undefined;
}

export function lightBrightness(state?: HassEntity): number {
  const value = state?.attributes.brightness;
  return typeof value === "number" ? Math.round((value / 255) * 100) : isActive(state) ? 100 : 0;
}

export function lightRgbColor(state?: HassEntity): [number, number, number] | undefined {
  const value = state?.attributes.rgb_color;
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const rgb = value.slice(0, 3).map((channel) => clamp(Number(channel), 0, 255));
  return rgb.every(Number.isFinite) ? [Math.round(rgb[0]), Math.round(rgb[1]), Math.round(rgb[2])] : undefined;
}

export function lightSupportsColor(state?: HassEntity): boolean {
  if (lightRgbColor(state)) return true;
  const modes = state?.attributes.supported_color_modes;
  return Array.isArray(modes) && modes.some((mode) => ["hs", "rgb", "rgbw", "rgbww", "xy"].includes(mode));
}

export function rgbToHex(rgb: [number, number, number] | undefined, fallback = "#ffd166"): string {
  if (!rgb) return fallback;
  return `#${rgb.map((channel) => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgb(hex: string): [number, number, number] | undefined {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return undefined;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function summarizeRange(values: Array<number | undefined>): string {
  const valid = values.filter((value): value is number => typeof value === "number");
  if (!valid.length) return "—";
  const min = Math.round(Math.min(...valid));
  const max = Math.round(Math.max(...valid));
  return min === max ? `${min} %` : `${min}–${max} %`;
}

export function domainOf(entityId?: string): string {
  return entityId?.split(".")[0] || "";
}
