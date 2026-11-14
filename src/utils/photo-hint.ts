import { html, type TemplateResult } from "lit";

/**
 * Indice posé sur une photo ou une image qui ouvre la fenêtre de réglages de la carte.
 * Purement visuel : l'élément cliquable porte déjà son libellé et `aria-haspopup="dialog"`.
 * Styles `.photo-hint` dans les styles partagés ; `inline` le place dans le flux du texte.
 */
export function photoHint(inline = false): TemplateResult {
  return html`<span class="photo-hint ${inline ? "inline" : ""}" aria-hidden="true"><ha-icon icon="mdi:tune-variant"></ha-icon></span>`;
}
