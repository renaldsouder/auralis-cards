import type { HassEntity, HomeAssistant } from "../types/home-assistant";

/**
 * Affichage « optimiste » : dès qu'une commande part, la carte montre l'état demandé (lampe
 * allumée, curseur à sa nouvelle valeur…) et le marque « en attente » jusqu'à ce que l'appareil
 * le confirme. Sans confirmation dans le délai, l'état réel revient et un message l'explique.
 */

/** Délai laissé à un appareil pour confirmer une commande. */
export const CONFIRM_TIMEOUT = 10_000;

/** État attendu d'une entité après une commande. */
export interface Expectation {
  entityId: string;
  /** État visé (`on`, `off`, `locked`, `playing`…), absent si seule une valeur change. */
  state?: string;
  /** Attributs visés (`brightness`, `current_position`, `volume_level`…), affichés aussitôt. */
  attributes?: Record<string, unknown>;
}

/** Commande en attente de confirmation. */
export interface PendingExpectation extends Expectation {
  /** Clé de la commande (`runCommand`), pour l'état « en cours » des boutons. */
  key?: string;
  /** Objet d'état au moment de l'envoi : toute mise à jour de l'appareil le remplace. */
  sent?: HassEntity;
  deadline: number;
  /** Objet d'état affiché, recalculé seulement quand l'état réel change. */
  shown?: { base?: HassEntity; state: HassEntity };
}

/** Domaines dont l'état est simplement `on` / `off`. */
const ON_OFF = new Set(["light", "switch", "fan", "input_boolean", "humidifier", "siren", "automation", "remote", "media_player", "valve"]);
const OFF_STATES = new Set(["off", "standby", "unavailable", "unknown"]);

const domainOf = (id: string): string => id.split(".")[0] ?? "";

/** Entités visées par un appel de service, dans `target` ou dans les données. */
export function targetIds(data?: Record<string, unknown>, target?: Record<string, unknown>): string[] {
  const raw = target?.entity_id ?? data?.entity_id;
  const list = Array.isArray(raw) ? raw : [raw];
  return [...new Set(list.filter((id): id is string => typeof id === "string" && id.includes(".")))];
}

/** Vrai quand l'état réel correspond à l'état visé (un lecteur « allumé » peut être en lecture, en pause…). */
export function stateMatches(entityId: string, expected: string, actual: string | undefined): boolean {
  if (actual === undefined) return false;
  if (actual === expected) return true;
  const domain = domainOf(entityId);
  if (domain === "media_player" && expected === "on") return !OFF_STATES.has(actual);
  if (domain === "media_player" && expected === "off") return actual === "standby";
  if (domain === "valve") return (expected === "open" && actual === "opening") || (expected === "closed" && actual === "closing");
  const left = Number(expected);
  const right = Number(actual);
  return expected.trim() !== "" && Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 1e-6;
}

const isOn = (id: string, state?: HassEntity): boolean => {
  if (!state) return false;
  if (domainOf(id) === "valve") return state.state === "open" || state.state === "opening";
  return !OFF_STATES.has(state.state) && state.state !== "closed" && state.state !== "closing";
};

const onState = (id: string): string => (domainOf(id) === "valve" ? "open" : "on");
const offState = (id: string): string => (domainOf(id) === "valve" ? "closed" : "off");

/** Attributs de lumière demandés par `light.turn_on`. */
function lightAttributes(data: Record<string, unknown>): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  const pct = Number(data.brightness_pct);
  if (data.brightness_pct !== undefined && Number.isFinite(pct)) attributes.brightness = Math.round(Math.min(100, Math.max(0, pct)) * 2.55);
  const brightness = Number(data.brightness);
  if (data.brightness !== undefined && Number.isFinite(brightness)) attributes.brightness = Math.round(brightness);
  if (Array.isArray(data.rgb_color) && data.rgb_color.length === 3) {
    attributes.rgb_color = data.rgb_color;
    attributes.color_mode = "rgb";
  }
  return attributes;
}

/** Vrai quand rien ne changerait : la commande n'attend alors aucune confirmation. */
function alreadyThere(expectation: Expectation, current?: HassEntity): boolean {
  if (!current) return true;
  if (expectation.state !== undefined && !stateMatches(expectation.entityId, expectation.state, current.state)) return false;
  for (const [name, value] of Object.entries(expectation.attributes ?? {})) {
    const actual = current.attributes[name];
    if (typeof value === "number" && typeof actual === "number" ? Math.abs(value - actual) > 1e-6 : JSON.stringify(value) !== JSON.stringify(actual)) return false;
  }
  return true;
}

/**
 * États attendus après un appel de service, quand on sait les prévoir : marche/arrêt,
 * bascule, intensité et couleur, position d'un volet, volume, lecture/pause, verrou, mode
 * de chauffage, choix dans une liste, valeur numérique. Une entité déjà dans l'état visé,
 * indisponible, ou une commande imprévisible (scène, script, ouverture d'un volet…) n'en
 * produit aucun.
 */
export function expectedChanges(
  hass: HomeAssistant | undefined,
  domain: string,
  service: string,
  data: Record<string, unknown> = {},
  target?: Record<string, unknown>,
): Expectation[] {
  const result: Expectation[] = [];
  for (const id of targetIds(data, target)) {
    const current = hass?.states[id];
    if (!current || current.state === "unavailable") continue;
    const idDomain = domainOf(id);
    let expectation: Expectation | undefined;

    if ((service === "turn_on" || service === "turn_off" || service === "toggle") && ON_OFF.has(idDomain)
      && (domain === idDomain || domain === "homeassistant")) {
      const on = service === "toggle" ? !isOn(id, current) : service === "turn_on";
      expectation = { entityId: id, state: on ? onState(id) : offState(id) };
      if (on && idDomain === "light" && domain === "light") {
        const attributes = lightAttributes(data);
        if (Object.keys(attributes).length) expectation.attributes = attributes;
      }
    } else if (domain === "lock" && (service === "lock" || service === "unlock")) {
      expectation = { entityId: id, state: service === "lock" ? "locked" : "unlocked" };
    } else if (domain === "cover" && service === "set_cover_position" && Number.isFinite(Number(data.position))) {
      expectation = { entityId: id, attributes: { current_position: Number(data.position) } };
    } else if (domain === "media_player" && service === "volume_set" && Number.isFinite(Number(data.volume_level))) {
      expectation = { entityId: id, attributes: { volume_level: Number(data.volume_level) } };
    } else if (domain === "media_player" && service === "media_play_pause" && (current.state === "playing" || current.state === "paused")) {
      expectation = { entityId: id, state: current.state === "playing" ? "paused" : "playing" };
    } else if (domain === "fan" && service === "set_percentage" && Number.isFinite(Number(data.percentage))) {
      expectation = { entityId: id, attributes: { percentage: Number(data.percentage) } };
    } else if (domain === "climate" && service === "set_hvac_mode" && typeof data.hvac_mode === "string") {
      expectation = { entityId: id, state: data.hvac_mode };
    } else if ((domain === "select" || domain === "input_select") && service === "select_option" && typeof data.option === "string") {
      expectation = { entityId: id, state: data.option };
    } else if ((domain === "number" || domain === "input_number") && service === "set_value" && Number.isFinite(Number(data.value))) {
      expectation = { entityId: id, state: String(data.value) };
    }

    if (expectation && !alreadyThere(expectation, current)) result.push(expectation);
  }
  return result;
}

/**
 * Vrai quand l'appareil a répondu : son état a été mis à jour depuis l'envoi et correspond à
 * l'état visé. Une valeur seule (intensité, position, volume) est confirmée par la première
 * mise à jour : l'appareil peut l'arrondir ou passer par des positions intermédiaires.
 */
export function isConfirmed(pending: PendingExpectation, actual?: HassEntity): boolean {
  // Un appareil devenu indisponible n'attend plus rien : son état réel s'affiche.
  if (!actual || actual.state === "unavailable") return true;
  if (actual === pending.sent) return false;
  return pending.state === undefined || stateMatches(pending.entityId, pending.state, actual.state);
}

/** Objet d'état montré à la carte : l'état réel, remplacé par l'état visé. */
export function shownState(pending: PendingExpectation, actual?: HassEntity): HassEntity | undefined {
  if (!actual) return actual;
  if (pending.shown?.base === actual) return pending.shown.state;
  const state: HassEntity = {
    ...actual,
    state: pending.state ?? actual.state,
    attributes: { ...actual.attributes, ...pending.attributes },
  };
  pending.shown = { base: actual, state };
  return state;
}
