/**
 * Navigation interne du tableau de bord. Un chemin doit commencer par une seule barre
 * oblique : `//hote` ou `/\hote` désignent un autre site et feraient échouer pushState.
 */
export const INTERNAL_PATH = /^\/(?![/\\])[^\s\\]*$/;

export function isInternalPath(value: unknown): value is string {
  return typeof value === "string" && INTERNAL_PATH.test(value);
}

/**
 * Ouvre une vue (ou une ancre `#…`) sans recharger la page, comme les cartes natives de Home Assistant.
 * Retourne `false` si le chemin est refusé ou si le navigateur bloque le changement d'adresse.
 */
export function navigate(path: string, replace = false): boolean {
  if (typeof window === "undefined" || !(isInternalPath(path) || /^#\S*$/.test(path))) return false;
  try {
    if (replace) window.history.replaceState(null, "", path);
    else window.history.pushState(null, "", path);
  } catch (error) {
    console.warn("Auralis : navigation impossible", path, error);
    return false;
  }
  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace } }));
  return true;
}
