import "./types/home-assistant";
import { AuralisFridgeCard } from "./cards/auralis-fridge-card";

if (!customElements.get("auralis-fridge-card")) customElements.define("auralis-fridge-card", AuralisFridgeCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "auralis-fridge-card")) {
  window.customCards.push({
    type: "auralis-fridge-card",
    name: "Auralis · Frigo connecté",
    description: "Températures, portes, alertes et commandes du réfrigérateur.",
    preview: true,
  });
}
