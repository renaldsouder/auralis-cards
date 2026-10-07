import "./types/home-assistant";
import { AuralisThermostatCard } from "./cards/auralis-thermostat-card";

if (!customElements.get("auralis-thermostat-card")) customElements.define("auralis-thermostat-card", AuralisThermostatCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "auralis-thermostat-card")) {
  window.customCards.push({
    type: "auralis-thermostat-card",
    name: "Auralis · Thermostats",
    description: "Températures, consignes et modes de plusieurs thermostats.",
    preview: true,
    getEntitySuggestion: (_hass: unknown, entityId: string) => entityId.startsWith("climate.")
      ? { config: { type: "custom:auralis-thermostat-card", entity: entityId } }
      : null,
  });
}
