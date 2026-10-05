import type { HomeAssistant } from "../types/home-assistant";

export interface EntityRegistryEntry {
  entity_id: string;
  device_id?: string | null;
  disabled_by?: string | null;
}

async function entityRegistry(hass: HomeAssistant): Promise<EntityRegistryEntry[]> {
  if (!hass.callWS) {
    throw new Error("L'API WebSocket Home Assistant n'est pas disponible.");
  }

  return hass.callWS<EntityRegistryEntry[]>({ type: "config/entity_registry/list" });
}

function entityIdsForDevice(entries: EntityRegistryEntry[], deviceId: string): string[] {
  return entries
    .filter((entry) => entry.device_id === deviceId)
    .map((entry) => entry.entity_id)
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Retourne toutes les entités enregistrées pour un appareil Home Assistant.
 * Les entités désactivées sont volontairement incluses, comme dans le registre.
 */
export async function deviceEntityIds(hass: HomeAssistant, deviceId: string): Promise<string[]> {
  const normalizedDeviceId = deviceId.trim();
  if (!normalizedDeviceId) return [];

  return entityIdsForDevice(await entityRegistry(hass), normalizedDeviceId);
}

/**
 * Retrouve l'appareil d'une entité puis retourne toutes ses entités sœurs.
 * Une entité sans appareil associé renvoie une liste vide.
 */
export async function siblingEntityIds(hass: HomeAssistant, entityId: string): Promise<string[]> {
  const normalizedEntityId = entityId.trim();
  if (!normalizedEntityId) return [];

  const entries = await entityRegistry(hass);
  const deviceId = entries.find((entry) => entry.entity_id === normalizedEntityId)?.device_id;
  return deviceId ? entityIdsForDevice(entries, deviceId) : [];
}
