import "./src/types/home-assistant";
import { AuralisRoomCard } from "./src/cards/auralis-room-card";
import { AuralisCoversCard } from "./src/cards/auralis-covers-card";
import { AuralisPcCard } from "./src/cards/auralis-pc-card";
import { AuralisUnraidCard } from "./src/cards/auralis-unraid-card";
import { AuralisProxmoxCard } from "./src/cards/auralis-proxmox-card";
import { AuralisNavbarCard } from "./src/cards/auralis-navbar-card";
import { AuralisLightsCard } from "./src/cards/auralis-lights-card";
import { AuralisThermostatCard } from "./src/cards/auralis-thermostat-card";
import { AuralisFridgeCard } from "./src/cards/auralis-fridge-card";

const VERSION = "0.13.7";

if (!customElements.get("auralis-room-card")) customElements.define("auralis-room-card", AuralisRoomCard);
if (!customElements.get("auralis-covers-card")) customElements.define("auralis-covers-card", AuralisCoversCard);
if (!customElements.get("auralis-pc-card")) customElements.define("auralis-pc-card", AuralisPcCard);
if (!customElements.get("auralis-unraid-card")) customElements.define("auralis-unraid-card", AuralisUnraidCard);
if (!customElements.get("auralis-proxmox-card")) customElements.define("auralis-proxmox-card", AuralisProxmoxCard);
if (!customElements.get("auralis-navbar-card")) customElements.define("auralis-navbar-card", AuralisNavbarCard);
if (!customElements.get("auralis-lights-card")) customElements.define("auralis-lights-card", AuralisLightsCard);
if (!customElements.get("auralis-thermostat-card")) customElements.define("auralis-thermostat-card", AuralisThermostatCard);
if (!customElements.get("auralis-fridge-card")) customElements.define("auralis-fridge-card", AuralisFridgeCard);

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
    type: "auralis-fridge-card",
    name: "Auralis · Frigo connecté",
    description: "Températures, portes, alertes et commandes du réfrigérateur.",
    preview: true,
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
