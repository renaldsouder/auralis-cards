import type { HomeAssistant } from "../types/home-assistant";
import { domainOf, hexToRgb } from "./entities";

export async function activateEntity(hass: HomeAssistant, entityId?: string): Promise<void> {
  if (!entityId) return;
  const domain = domainOf(entityId);
  if (domain === "button" || domain === "input_button") {
    await hass.callService(domain, "press", {}, { entity_id: entityId });
    return;
  }
  if (domain === "script") {
    await hass.callService("script", "turn_on", {}, { entity_id: entityId });
    return;
  }
  if (domain === "scene") {
    await hass.callService("scene", "turn_on", {}, { entity_id: entityId });
    return;
  }
  await hass.callService("homeassistant", "turn_on", {}, { entity_id: entityId });
}

export async function deactivateEntity(hass: HomeAssistant, entityId?: string): Promise<void> {
  if (!entityId) return;
  await hass.callService("homeassistant", "turn_off", {}, { entity_id: entityId });
}

export async function toggleEntities(hass: HomeAssistant, entityIds: string[]): Promise<void> {
  if (!entityIds.length) return;
  await hass.callService("homeassistant", "toggle", {}, { entity_id: entityIds });
}

export async function setLightBrightness(
  hass: HomeAssistant,
  entityId: string,
  brightnessPct: number,
): Promise<void> {
  await hass.callService(
    "light",
    "turn_on",
    { brightness_pct: Math.round(brightnessPct) },
    { entity_id: entityId },
  );
}

export async function setLightColor(
  hass: HomeAssistant,
  entityIds: string[],
  color: string,
): Promise<void> {
  const rgbColor = hexToRgb(color);
  if (!entityIds.length || !rgbColor) return;
  await hass.callService("light", "turn_on", { rgb_color: rgbColor }, { entity_id: entityIds });
}

export async function setCoverPosition(
  hass: HomeAssistant,
  entityId: string,
  position: number,
): Promise<void> {
  await hass.callService(
    "cover",
    "set_cover_position",
    { position: Math.round(position) },
    { entity_id: entityId },
  );
}

export async function coverCommand(
  hass: HomeAssistant,
  entityIds: string[],
  command: "open" | "close" | "stop",
): Promise<void> {
  if (!entityIds.length) return;
  await hass.callService("cover", `${command}_cover`, {}, { entity_id: entityIds });
}

export function fireMoreInfo(element: HTMLElement, entityId?: string): void {
  if (!entityId) return;
  element.dispatchEvent(
    new CustomEvent("hass-more-info", {
      bubbles: true,
      composed: true,
      detail: { entityId },
    }),
  );
}
