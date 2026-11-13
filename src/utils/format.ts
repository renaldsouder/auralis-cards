/**
 * Formats de dates et de durées partagés par les cartes. Créer un `Intl.DateTimeFormat` coûte
 * cher (plusieurs dizaines par rendu sur la carte météo) : on les garde en cache par langue,
 * fuseau et options.
 */

const dateFormats = new Map<string, Intl.DateTimeFormat>();
const relativeFormats = new Map<string, Intl.RelativeTimeFormat>();
const MAX_CACHED = 200;

function remember<T>(cache: Map<string, T>, key: string, create: () => T): T {
  let value = cache.get(key);
  if (value === undefined) {
    // Garde-fou : la liste d'options utilisée par les cartes est courte, mais on ne grossit jamais sans fin.
    if (cache.size >= MAX_CACHED) cache.clear();
    value = create();
    cache.set(key, value);
  }
  return value;
}

/**
 * Formateur mis en cache. Un fuseau inconnu du navigateur retombe sur le fuseau local
 * au lieu de lever une erreur.
 */
export function dateTimeFormat(
  options: Intl.DateTimeFormatOptions,
  timeZone?: string,
  locale = "fr-FR",
): Intl.DateTimeFormat {
  const key = `${locale}|${timeZone ?? ""}|${JSON.stringify(options)}`;
  return remember(dateFormats, key, () => {
    try {
      return new Intl.DateTimeFormat(locale, timeZone ? { ...options, timeZone } : options);
    } catch {
      return new Intl.DateTimeFormat(locale, options);
    }
  });
}

/** Date ou heure formatée dans le fuseau donné (celui de Home Assistant en général). */
export function formatTime(
  time: number,
  options: Intl.DateTimeFormatOptions,
  timeZone?: string,
  locale = "fr-FR",
): string {
  return dateTimeFormat(options, timeZone, locale).format(time);
}

/** Heure, minutes et secondes : « 14:05:09 ». */
export function clockTime(time: number, timeZone?: string, seconds = false): string {
  return formatTime(time, seconds
    ? { hour: "2-digit", minute: "2-digit", second: "2-digit" }
    : { hour: "2-digit", minute: "2-digit" }, timeZone);
}

/** Jour civil triable (AAAA-MM-JJ) dans le fuseau donné. */
export function dayKey(time: number, timeZone?: string): string {
  return formatTime(time, { year: "numeric", month: "2-digit", day: "2-digit" }, timeZone, "en-CA");
}

/** Heure (0 à 23) dans le fuseau donné. */
export function hourOf(time: number, timeZone?: string): number {
  return Number(formatTime(time, { hour: "numeric", hourCycle: "h23" }, timeZone).replace(/\D/g, "")) || 0;
}

/** Durée écoulée en français court : « à l’instant », « il y a 5 min », « hier »… */
export function relativeTime(time: number, now: number, locale = "fr"): string {
  const seconds = Math.round((time - now) / 1000);
  if (!Number.isFinite(seconds)) return "";
  if (Math.abs(seconds) < 45) return "à l’instant";
  const format = remember(relativeFormats, locale, () => new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" }));
  const units: Array<[Intl.RelativeTimeFormatUnit, number, number]> = [
    ["minute", 60, 3_600],
    ["hour", 3_600, 86_400],
    ["day", 86_400, 2_592_000],
    ["month", 2_592_000, 31_536_000],
    ["year", 31_536_000, Number.POSITIVE_INFINITY],
  ];
  const [unit, size] = units.find(([, , limit]) => Math.abs(seconds) < limit)!;
  return format.format(Math.round(seconds / size), unit);
}

/** Nombre de formateurs en cache (pour les tests). */
export function cachedFormatCount(): number {
  return dateFormats.size;
}
