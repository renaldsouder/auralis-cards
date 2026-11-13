/** Contrôles de configuration partagés par les cartes. */

/** Couleur CSS acceptée telle quelle (nom, #hex, rgb(), hsl(), var()…), sans `;` ni accolade. */
export const SAFE_COLOR = /^[#\w(),.%\s-]+$/;

/** Couleur nettoyée, ou `undefined` si elle est absente ou dangereuse à injecter dans un style. */
export function safeColor(value: unknown): string | undefined {
  const color = typeof value === "string" ? value.trim() : "";
  return color && SAFE_COLOR.test(color) ? color : undefined;
}

/** Vrai pour une valeur absente (vide) ou une chaîne qui respecte le motif. */
export function optionalMatch(value: unknown, pattern: RegExp): boolean {
  return value === undefined || value === null || value === "" || (typeof value === "string" && pattern.test(value));
}

/** Nombre borné à [min, max], ou `undefined` si la valeur est absente ou non numérique. */
export function bounded(value: unknown, min: number, max: number): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : undefined;
}
