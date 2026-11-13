import "./src/types/home-assistant";
import { AuralisRoomCard } from "./src/cards/auralis-room-card";
import { AuralisCoversCard } from "./src/cards/auralis-covers-card";
import { AuralisPcCard } from "./src/cards/auralis-pc-card";
import { AuralisUnraidCard } from "./src/cards/auralis-unraid-card";
import { AuralisProxmoxCard } from "./src/cards/auralis-proxmox-card";
import { AuralisNavbarCard } from "./src/cards/auralis-navbar-card";
import { AuralisLightsCard } from "./src/cards/auralis-lights-card";
import { AuralisSwitchesCard } from "./src/cards/auralis-switches-card";
import { AuralisThermostatCard } from "./src/cards/auralis-thermostat-card";
import { AuralisFridgeCard } from "./src/cards/auralis-fridge-card";
import { AuralisEnergyCard } from "./src/cards/auralis-energy-card";
import { AuralisClimateCard } from "./src/cards/auralis-climate-card";
import { AuralisWeatherCard } from "./src/cards/auralis-weather-card";
import { AuralisActionsCard } from "./src/cards/auralis-actions-card";
import { AuralisCamerasCard } from "./src/cards/auralis-cameras-card";
import { AuralisMediaCard } from "./src/cards/auralis-media-card";
import { AuralisTabsCard } from "./src/cards/auralis-tabs-card";
import { AuralisScreensaverCard } from "./src/cards/auralis-screensaver-card";
import { AuralisBatteriesCard } from "./src/cards/auralis-batteries-card";
import { AuralisIrrigationCard } from "./src/cards/auralis-irrigation-card";

const VERSION = "0.23.0";

if (!customElements.get("auralis-room-card")) customElements.define("auralis-room-card", AuralisRoomCard);
if (!customElements.get("auralis-covers-card")) customElements.define("auralis-covers-card", AuralisCoversCard);
if (!customElements.get("auralis-pc-card")) customElements.define("auralis-pc-card", AuralisPcCard);
if (!customElements.get("auralis-unraid-card")) customElements.define("auralis-unraid-card", AuralisUnraidCard);
if (!customElements.get("auralis-proxmox-card")) customElements.define("auralis-proxmox-card", AuralisProxmoxCard);
if (!customElements.get("auralis-navbar-card")) customElements.define("auralis-navbar-card", AuralisNavbarCard);
if (!customElements.get("auralis-lights-card")) customElements.define("auralis-lights-card", AuralisLightsCard);
if (!customElements.get("auralis-switches-card")) customElements.define("auralis-switches-card", AuralisSwitchesCard);
if (!customElements.get("auralis-thermostat-card")) customElements.define("auralis-thermostat-card", AuralisThermostatCard);
if (!customElements.get("auralis-fridge-card")) customElements.define("auralis-fridge-card", AuralisFridgeCard);
if (!customElements.get("auralis-energy-card")) customElements.define("auralis-energy-card", AuralisEnergyCard);
if (!customElements.get("auralis-climate-card")) customElements.define("auralis-climate-card", AuralisClimateCard);
if (!customElements.get("auralis-weather-card")) customElements.define("auralis-weather-card", AuralisWeatherCard);
if (!customElements.get("auralis-actions-card")) customElements.define("auralis-actions-card", AuralisActionsCard);
if (!customElements.get("auralis-cameras-card")) customElements.define("auralis-cameras-card", AuralisCamerasCard);
if (!customElements.get("auralis-media-card")) customElements.define("auralis-media-card", AuralisMediaCard);
if (!customElements.get("auralis-tabs-card")) customElements.define("auralis-tabs-card", AuralisTabsCard);
if (!customElements.get("auralis-screensaver-card")) customElements.define("auralis-screensaver-card", AuralisScreensaverCard);
if (!customElements.get("auralis-batteries-card")) customElements.define("auralis-batteries-card", AuralisBatteriesCard);
if (!customElements.get("auralis-irrigation-card")) customElements.define("auralis-irrigation-card", AuralisIrrigationCard);

// Alias de transition : les anciens dashboards continuent de fonctionner,
// tandis que l'éditeur Home Assistant ne propose que les nouvelles cartes Auralis.
if (!customElements.get("orbit-room-card")) customElements.define("orbit-room-card", class extends AuralisRoomCard {});
if (!customElements.get("orbit-pc-card")) customElements.define("orbit-pc-card", class extends AuralisPcCard {});
if (!customElements.get("orbit-unraid-card")) customElements.define("orbit-unraid-card", class extends AuralisUnraidCard {});
if (!customElements.get("orbit-proxmox-card")) customElements.define("orbit-proxmox-card", class extends AuralisProxmoxCard {});
if (!customElements.get("orbit-navbar-card")) customElements.define("orbit-navbar-card", class extends AuralisNavbarCard {});

window.customCards = window.customCards || [];

const cards = [
  {
    type: "auralis-tabs-card",
    name: "Auralis · Onglets",
    description: "Range plusieurs cartes, Auralis ou non, sous des onglets avec icônes et pastilles.",
    preview: false,
  },
  {
    type: "auralis-screensaver-card",
    name: "Auralis · Veille d'écran",
    description: "Écran de veille plein écran pour tablette murale : horloge, date, météo et valeurs, réveil au premier toucher.",
    preview: false,
  },
  {
    type: "auralis-batteries-card",
    name: "Auralis · Batteries et alertes",
    description: "Liste les piles faibles et les appareils indisponibles de la maison, découverts automatiquement.",
    preview: false,
  },
  {
    type: "auralis-irrigation-card",
    name: "Auralis · Arrosage",
    description: "Vannes d’arrosage : état, temps restant, prochain arrosage, arrosage minuté sûr, pile, erreurs et pluie prévue.",
    preview: true,
    getEntitySuggestion: (_hass: unknown, entityId: string) => /^(switch|valve)\.[a-z0-9_]*(arros|irrig)/.test(entityId)
      ? { config: { type: "custom:auralis-irrigation-card", valve_entity: entityId } }
      : null,
  },
  {
    type: "auralis-navbar-card",
    name: "Auralis · Navigation",
    description: "Navigation thématique entre les vues et sous-vues d’un tableau de bord.",
    preview: true,
  },
  {
    type: "auralis-room-card",
    name: "Auralis · Pièce",
    description: "Contrôle moderne des lumières, volets et du climat d’une pièce.",
    preview: true,
    getEntitySuggestion: (_hass: unknown, entityId: string) => {
      const domain = entityId.split(".")[0];
      if (domain === "light") return { config: { type: "custom:auralis-room-card", lights: [entityId] } };
      if (domain === "cover") return { config: { type: "custom:auralis-room-card", covers: [entityId] } };
      return null;
    },
  },
  {
    type: "auralis-covers-card",
    name: "Auralis · Volets",
    description: "Groupes de volets illustrés et commandes individuelles.",
    preview: true,
    getEntitySuggestion: (_hass: unknown, entityId: string) => entityId.startsWith("cover.")
      ? { config: { type: "custom:auralis-covers-card", groups: [{ name: "Volets", covers: [entityId] }] } }
      : null,
  },
  {
    type: "auralis-pc-card",
    name: "Auralis · PC",
    description: "Suivi des performances et commandes sécurisées d’un ordinateur.",
    preview: false,
  },
  {
    type: "auralis-unraid-card",
    name: "Auralis · UNRAID",
    description: "Supervision de l’array, de Docker et des machines virtuelles UNRAID.",
    preview: false,
  },
  {
    type: "auralis-proxmox-card",
    name: "Auralis · Proxmox",
    description: "Supervision d’un cluster Proxmox, de ses nœuds, VM et conteneurs LXC.",
    preview: false,
  },
  {
    type: "auralis-lights-card",
    name: "Auralis · Lumières",
    description: "Éclairage par groupes, couleurs et ambiances.",
    preview: true,
    getEntitySuggestion: (_hass: unknown, entityId: string) => entityId.startsWith("light.")
      ? { config: { type: "custom:auralis-lights-card", lights: [entityId] } }
      : null,
  },
  {
    type: "auralis-thermostat-card",
    name: "Auralis · Thermostats",
    description: "Températures, consignes et modes de plusieurs thermostats.",
    preview: true,
    getEntitySuggestion: (_hass: unknown, entityId: string) => entityId.startsWith("climate.")
      ? { config: { type: "custom:auralis-thermostat-card", entity: entityId } }
      : null,
  },
  {
    type: "auralis-switches-card",
    name: "Auralis · Prises et interrupteurs",
    description: "Commandes groupées et individuelles pour les entités switch.",
    preview: true,
    getEntitySuggestion: (_hass: unknown, entityId: string) => entityId.startsWith("switch.")
      ? { config: { type: "custom:auralis-switches-card", switches: [entityId] } }
      : null,
  },
  {
    type: "auralis-fridge-card",
    name: "Auralis · Frigo connecté",
    description: "Températures, portes, alertes et commandes du réfrigérateur.",
    preview: true,
  },
  {
    type: "auralis-energy-card",
    name: "Auralis · Énergie",
    description: "Consommation électrique quotidienne comparée à J−7, puissance et index compteur.",
    preview: true,
  },
  {
    type: "auralis-climate-card",
    name: "Auralis · Climat des pièces",
    description: "Températures, humidité et batteries de plusieurs pièces, avec courbes colorées par palier.",
    preview: true,
  },
  {
    type: "auralis-weather-card",
    name: "Auralis · Météo",
    description: "Horloge, conditions actuelles sur un ciel qui suit le temps, prévisions colorées et vigilance.",
    preview: true,
    getEntitySuggestion: (_hass: unknown, entityId: string) => entityId.startsWith("weather.")
      ? { config: { type: "custom:auralis-weather-card", entity: entityId } }
      : null,
  },
  {
    type: "auralis-actions-card",
    name: "Auralis · Actions",
    description: "Tuiles à un appui pour scripts, boutons, scènes et interrupteurs, avec confirmation et retour d’exécution.",
    preview: true,
    getEntitySuggestion: (_hass: unknown, entityId: string) => /^(script|button|input_button|scene)\./.test(entityId)
      ? { config: { type: "custom:auralis-actions-card", actions: [{ entity: entityId }] } }
      : null,
  },
  {
    type: "auralis-cameras-card",
    name: "Auralis · Caméras",
    description: "Mosaïque de caméras rafraîchie, détection de mouvement et fenêtre en direct avec commandes.",
    preview: true,
    getEntitySuggestion: (_hass: unknown, entityId: string) => entityId.startsWith("camera.")
      ? { config: { type: "custom:auralis-cameras-card", cameras: [{ entity: entityId }] } }
      : null,
  },
  {
    type: "auralis-media-card",
    name: "Auralis · Média",
    description: "Ampli, enceintes et télévision : pochette, lecture, volume plafonné, sources et modes sonores.",
    preview: true,
    getEntitySuggestion: (_hass: unknown, entityId: string) => entityId.startsWith("media_player.")
      ? { config: { type: "custom:auralis-media-card", entity: entityId } }
      : null,
  },
];

for (const card of cards) {
  if (!window.customCards.some((registered) => registered.type === card.type)) window.customCards.push(card);
}

console.info(
  `%c AURALIS CARDS %c v${VERSION} `,
  "color:#fff;background:#3d7ce8;font-weight:700;padding:3px 7px;border-radius:7px 0 0 7px;",
  "color:#17233d;background:#dfeaff;font-weight:700;padding:3px 7px;border-radius:0 7px 7px 0;",
);
