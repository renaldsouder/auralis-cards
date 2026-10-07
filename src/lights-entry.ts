import "./types/home-assistant";
import { AuralisLightsCard } from "./cards/auralis-lights-card";

if (!customElements.get("auralis-lights-card")) customElements.define("auralis-lights-card", AuralisLightsCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "auralis-lights-card")) {
  window.customCards.push({
    type: "auralis-lights-card",
    name: "Auralis · Lumières",
    description: "Éclairage par groupes, couleurs et ambiances.",
    preview: true,
    getEntitySuggestion: (_hass: unknown, entityId: string) => entityId.startsWith("light.")
      ? { config: { type: "custom:auralis-lights-card", lights: [entityId] } }
      : null,
  });
}
