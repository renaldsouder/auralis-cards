import type { HomeAssistant } from "../types/home-assistant";

const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/;
const MAX_DEPTH = 8;

/**
 * Toutes les entités citées dans une configuration de carte, à n'importe quelle profondeur :
 * valeurs (`entity`, `lights: [...]`, `players[].entity`…) et clés (`entity_labels`).
 */
export function collectEntityIds(value: unknown, found = new Set<string>(), depth = 0): Set<string> {
  if (depth > MAX_DEPTH || value === null || value === undefined) return found;
  if (typeof value === "string") {
    const id = value.trim();
    if (ENTITY_ID.test(id)) found.add(id);
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectEntityIds(item, found, depth + 1);
    return found;
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (ENTITY_ID.test(key)) found.add(key);
      collectEntityIds(item, found, depth + 1);
    }
  }
  return found;
}

/**
 * Vrai quand un changement de `hass` concerne la carte : une entité suivie a changé,
 * ou un réglage global (thème, langue, utilisateur, configuration) a été remplacé.
 * Home Assistant remplace l'objet d'état d'une entité à chaque changement : la comparaison
 * par identité suffit.
 */
export function hassChangeMatters(
  previous: HomeAssistant | undefined,
  next: HomeAssistant | undefined,
  watched: Iterable<string>,
): boolean {
  if (!previous || !next) return previous !== next;
  if (
    previous.themes !== next.themes
    || previous.locale !== next.locale
    || previous.user !== next.user
    || previous.config !== next.config
  ) return true;
  for (const id of watched) {
    if (previous.states[id] !== next.states[id]) return true;
  }
  return false;
}
