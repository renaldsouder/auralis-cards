import type { HassEntity, HomeAssistant } from "../types/home-assistant";

/**
 * Registres exposés par le frontend Home Assistant (2023.x et plus récent) sur l'objet `hass`.
 * Seuls les champs lus ici sont décrits ; tous sont facultatifs selon la version.
 */
export interface AreaEntityEntry {
  entity_id: string;
  name?: string | null;
  device_id?: string | null;
  area_id?: string | null;
  hidden?: boolean;
  hidden_by?: string | null;
  disabled_by?: string | null;
  entity_category?: string | null;
}

export interface AreaDeviceEntry {
  id?: string;
  area_id?: string | null;
}

export interface AreaEntry {
  area_id: string;
  name: string;
  aliases?: string[];
}

export type HomeAssistantWithRegistries = HomeAssistant & {
  entities?: Record<string, AreaEntityEntry>;
  devices?: Record<string, AreaDeviceEntry>;
  areas?: Record<string, AreaEntry>;
};

export interface AreaOptions {
  /** Ajoute aux lumières les interrupteurs `switch.*` qui ne sont pas des prises (`device_class: outlet`). */
  includeSwitches?: boolean;
}

export interface ResolvedArea {
  status: "ok";
  areaId: string;
  name: string;
  lights: string[];
  covers: string[];
  temperature?: string;
  humidity?: string;
  climate?: string;
  media?: string;
  tv?: string;
  /** Toutes les entités retenues, pour le suivi des changements d'état. */
  entities: string[];
}

export type AreaResolution =
  | ResolvedArea
  /** Aucune zone ne porte cet identifiant ou ce nom. */
  | { status: "not-found"; area: string }
  /** Le frontend n'expose pas (encore) les registres : Home Assistant trop ancien ou en cours de chargement. */
  | { status: "unavailable"; area: string };

interface AreaMembers {
  area?: AreaEntry;
  /** Entités visibles de la zone, dans l'ordre du registre. */
  ids: string[];
}

/** Volets qu'une commande « tout ouvrir » d'une pièce ne doit jamais actionner. */
const EXCLUDED_COVER_CLASSES = new Set(["garage", "gate"]);
const BATTERY_NAME = /batter(?:ie|y)/i;

const normalize = (value: string): string => value.trim().toLocaleLowerCase("fr");

/** Zone désignée par son identifiant (`salon`) ou son nom (`Salon`), sans tenir compte de la casse. */
export function findArea(areas: Record<string, AreaEntry> | undefined, area: string): AreaEntry | undefined {
  if (!areas) return undefined;
  const wanted = normalize(area);
  if (!wanted) return undefined;
  const all = Object.values(areas);
  return areas[area.trim()]
    ?? all.find((entry) => normalize(entry.area_id) === wanted)
    ?? all.find((entry) => normalize(entry.name ?? "") === wanted)
    ?? all.find((entry) => entry.aliases?.some((alias) => normalize(alias) === wanted));
}

/** Entités masquées, désactivées, de configuration ou de diagnostic : jamais reprises d'une zone. */
export function isHiddenEntry(entry: AreaEntityEntry): boolean {
  return entry.hidden === true
    || Boolean(entry.hidden_by)
    || Boolean(entry.disabled_by)
    || entry.entity_category === "config"
    || entry.entity_category === "diagnostic";
}

/** Zone d'une entité : la sienne, sinon celle de son appareil. */
export function entityAreaId(entry: AreaEntityEntry, devices?: Record<string, AreaDeviceEntry>): string | undefined {
  if (entry.area_id) return entry.area_id;
  return entry.device_id ? devices?.[entry.device_id]?.area_id ?? undefined : undefined;
}

/** `light.*`, `sensor.salon_?` : `*` remplace n'importe quelle suite de caractères, `?` un seul. */
export function globToRegExp(pattern: string): RegExp {
  const source = pattern.trim().replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${source}$`, "i");
}

const memberCache = new WeakMap<object, Map<string, { devices: unknown; areas: unknown; members: AreaMembers }>>();

function areaMembers(hass: HomeAssistantWithRegistries, area: string): AreaMembers {
  const entities = hass.entities!;
  const key = normalize(area);
  let byArea = memberCache.get(entities);
  if (!byArea) memberCache.set(entities, byArea = new Map());
  const cached = byArea.get(key);
  if (cached && cached.devices === hass.devices && cached.areas === hass.areas) return cached.members;
  const found = findArea(hass.areas, area);
  const members: AreaMembers = {
    area: found,
    ids: found
      ? Object.values(entities)
        .filter((entry) => entry && !isHiddenEntry(entry) && entityAreaId(entry, hass.devices) === found.area_id)
        .map((entry) => entry.entity_id)
      : [],
  };
  byArea.set(key, { devices: hass.devices, areas: hass.areas, members });
  return members;
}

function displayName(hass: HomeAssistantWithRegistries, id: string): string {
  const name = hass.states[id]?.attributes.friendly_name ?? hass.entities?.[id]?.name;
  return typeof name === "string" && name ? name : id;
}

const deviceClass = (state?: HassEntity): unknown => state?.attributes.device_class;

/** Premier capteur de la classe demandée, en évitant ceux qui mesurent une batterie. */
function pickSensor(hass: HomeAssistantWithRegistries, ids: string[], wanted: string): string | undefined {
  const sensors = ids.filter((id) => id.startsWith("sensor.") && deviceClass(hass.states[id]) === wanted);
  return sensors.find((id) => !BATTERY_NAME.test(id) && !BATTERY_NAME.test(displayName(hass, id))) ?? sensors[0];
}

function classify(hass: HomeAssistantWithRegistries, members: AreaMembers, exclude: string[], options: AreaOptions): ResolvedArea {
  const patterns = exclude.filter((pattern) => typeof pattern === "string" && pattern.trim()).map(globToRegExp);
  const ids = members.ids.filter((id) => !patterns.some((pattern) => pattern.test(id)));
  const byName = (left: string, right: string) => displayName(hass, left).localeCompare(displayName(hass, right), "fr");

  let lights = ids.filter((id) => id.startsWith("light.")
    || (options.includeSwitches === true && id.startsWith("switch.") && deviceClass(hass.states[id]) !== "outlet"));
  // Un groupe de lumières présent dans la zone remplace ses membres (attribut `entity_id` des groupes).
  const grouped = new Set(lights.flatMap((id) => {
    const members = hass.states[id]?.attributes.entity_id;
    return Array.isArray(members) ? members.filter((member): member is string => typeof member === "string") : [];
  }));
  lights = lights.filter((id) => !grouped.has(id)).sort(byName);

  const covers = ids
    .filter((id) => id.startsWith("cover.") && !EXCLUDED_COVER_CLASSES.has(String(deviceClass(hass.states[id]))))
    .sort(byName);
  const players = ids.filter((id) => id.startsWith("media_player."));
  const resolved: ResolvedArea = {
    status: "ok",
    areaId: members.area!.area_id,
    name: members.area!.name || members.area!.area_id,
    lights,
    covers,
    temperature: pickSensor(hass, ids, "temperature"),
    humidity: pickSensor(hass, ids, "humidity"),
    climate: ids.find((id) => id.startsWith("climate.")),
    media: players.find((id) => deviceClass(hass.states[id]) !== "tv"),
    tv: players.find((id) => deviceClass(hass.states[id]) === "tv"),
    entities: [],
  };
  resolved.entities = [...new Set([
    ...lights, ...covers,
    ...[resolved.temperature, resolved.humidity, resolved.climate, resolved.media, resolved.tv].filter((id): id is string => Boolean(id)),
  ])];
  return resolved;
}

const resolutionCache = new WeakMap<AreaMembers, Map<string, { states: number; result: ResolvedArea }>>();

/**
 * Entités d'une zone Home Assistant, rangées par rôle pour la carte Pièce : lumières, volets,
 * capteurs de température et d'humidité, thermostat, lecteur multimédia et télévision.
 *
 * Le résultat est mémorisé tant que les registres (`hass.entities`, `hass.devices`,
 * `hass.areas`), la zone, les exclusions et le nombre d'entités de la zone ayant un état
 * ne changent pas : un même objet est renvoyé, ce qui permet de le comparer par identité.
 */
export function resolveAreaEntities(
  hass: HomeAssistantWithRegistries | undefined,
  area: string,
  exclude: readonly string[] = [],
  options: AreaOptions = {},
): AreaResolution {
  const registries = hass;
  if (!registries?.entities || !registries.areas) return { status: "unavailable", area };
  const members = areaMembers(registries, area);
  if (!members.area) return { status: "not-found", area };
  const key = `${options.includeSwitches === true}|${exclude.join("\n")}`;
  // Une entité dont l'état arrive après les registres change la classification (device_class).
  const states = members.ids.reduce((count, id) => count + (registries.states[id] ? 1 : 0), 0);
  let byOptions = resolutionCache.get(members);
  if (!byOptions) resolutionCache.set(members, byOptions = new Map());
  const cached = byOptions.get(key);
  if (cached && cached.states === states) return cached.result;
  const result = classify(registries, members, [...exclude], options);
  byOptions.set(key, { states, result });
  return result;
}

/** Première zone (par nom) qui contient des lumières ou des volets, pour la carte proposée par défaut. */
export function suggestArea(hass: HomeAssistantWithRegistries | undefined): string | undefined {
  const registries = hass;
  if (!registries?.entities || !registries.areas) return undefined;
  return Object.values(registries.areas)
    .sort((left, right) => (left.name ?? "").localeCompare(right.name ?? "", "fr"))
    .find((area) => {
      const resolved = resolveAreaEntities(registries, area.area_id);
      return resolved.status === "ok" && (resolved.lights.length > 0 || resolved.covers.length > 0);
    })?.area_id;
}
