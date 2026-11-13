import { css, html, nothing, type CSSResultGroup, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { NavbarCardConfig, NavbarItemConfig } from "../types/config";
import type { HomeAssistant } from "../types/home-assistant";
import { sharedStyles } from "../styles/shared";
import { hasOpenAuralisDialog } from "../utils/dialog-visibility";
import { navigate } from "../utils/navigation";

const UNAVAILABLE_STATES = new Set(["unknown", "unavailable", ""]);
type NavbarPosition = NonNullable<NavbarCardConfig["position"]>;
type NavbarDevice = "phone" | "tablet" | "desktop";
type DockSide = "left" | "right";
/** Largeur réservée à côté d'une barre latérale : 160 px de barre et 16 px d'air. */
const SIDE_DOCK_WIDTH = 176;
const SIDE_DOCK_STYLE = `
  :host([data-auralis-navbar-reserve-right]) hui-view-container {
    box-sizing: border-box !important;
    padding-right: calc(var(--view-container-inset-right, 0px) + ${SIDE_DOCK_WIDTH}px) !important;
  }
  :host([data-auralis-navbar-reserve-left]) hui-view-container {
    box-sizing: border-box !important;
    padding-left: calc(var(--view-container-inset-left, 0px) + ${SIDE_DOCK_WIDTH}px) !important;
  }
`;
const dockOwners = new Map<ShadowRoot, { owners: Map<AuralisNavbarCard, DockSide>; style: HTMLStyleElement }>();
// La barre du bas ajoute la zone de sécurité (barre de geste des téléphones) à sa hauteur :
// la réserve en tient compte pour que le bas de la dernière carte reste visible.
const LAYOUT_STYLE = `
  :host([data-auralis-navbar-hide-header]) :not(.edit-mode) > .header { display: none !important; }
  :host([data-auralis-navbar-hide-header]) :not(.edit-mode) > hui-view-container {
    padding-top: calc(var(--safe-area-inset-top, 0px) + var(--view-container-padding-top, 0px)) !important;
  }
  :host([data-auralis-navbar-reserve-bottom]) :not(.edit-mode) > hui-view-container {
    padding-bottom: calc(var(--view-container-inset-bottom, 0px) + var(--view-container-padding-bottom, 0px) + var(--auralis-navbar-bottom-height, 72px) + env(safe-area-inset-bottom, 0px) + 16px) !important;
  }
  :host([data-auralis-navbar-reserve-top]) :not(.edit-mode) > hui-view-container {
    padding-top: calc(var(--header-height, 56px) + var(--safe-area-inset-top, 0px) + var(--view-container-padding-top, 0px) + var(--auralis-navbar-top-height, 72px) + 16px) !important;
  }
  :host([data-auralis-navbar-reserve-top][data-auralis-navbar-hide-header]) :not(.edit-mode) > hui-view-container {
    padding-top: calc(var(--safe-area-inset-top, 0px) + var(--view-container-padding-top, 0px) + var(--auralis-navbar-top-height, 72px) + 16px) !important;
  }
`;
const layoutOwners = new Map<ShadowRoot, { owners: Map<AuralisNavbarCard, NavbarPosition>; style: HTMLStyleElement }>();
/** Délai avant de retirer la barre quand plus aucune carte ne l'utilise (le temps qu'une nouvelle vue s'affiche). */
const PORTAL_GRACE = 1_000;

/**
 * `hide_native_header` masque l'en-tête Home Assistant, sauf pour les administrateurs :
 * son menu ⋮ est le seul accès au mode modification du tableau de bord.
 */
export function hidesNativeHeader(config: NavbarCardConfig | undefined, hass: HomeAssistant | undefined): boolean {
  return config?.hide_native_header === true && hass?.user?.is_admin !== true;
}

function refreshLayout(root: ShadowRoot): void {
  const entry = layoutOwners.get(root);
  if (!entry) return;
  const cards = [...entry.owners].filter(([card]) => card.isConnected && !card.preview && !card.editMode);
  const host = root.host as HTMLElement;
  const width = window.innerWidth;
  const height = (card: AuralisNavbarCard): number => width <= 600
    ? card.config?.height_mobile ?? 72 : width <= 1024
      ? card.config?.height_tablet ?? 72 : card.config?.height_desktop ?? 76;
  const bottom = cards.filter(([, position]) => position === "bottom").map(([card]) => card);
  const top = cards.filter(([, position]) => position === "top").map(([card]) => card);
  host.toggleAttribute("data-auralis-navbar-hide-header", cards.some(([card]) => hidesNativeHeader(card.config, card.hass)));
  host.toggleAttribute("data-auralis-navbar-reserve-bottom", bottom.length > 0);
  host.toggleAttribute("data-auralis-navbar-reserve-top", top.length > 0);
  if (bottom.length) host.style.setProperty("--auralis-navbar-bottom-height", `${Math.max(...bottom.map(height))}px`);
  else host.style.removeProperty("--auralis-navbar-bottom-height");
  if (top.length) host.style.setProperty("--auralis-navbar-top-height", `${Math.max(...top.map(height))}px`);
  else host.style.removeProperty("--auralis-navbar-top-height");
}

function reserveLayout(card: AuralisNavbarCard, root: ShadowRoot, position: NavbarPosition): void {
  let entry = layoutOwners.get(root);
  if (!entry) {
    const style = document.createElement("style");
    style.textContent = LAYOUT_STYLE;
    root.append(style);
    entry = { owners: new Map(), style };
    layoutOwners.set(root, entry);
  }
  entry.owners.set(card, position);
  if (!entry.style.isConnected) root.append(entry.style);
  refreshLayout(root);
}

function releaseLayout(card: AuralisNavbarCard, root?: ShadowRoot): void {
  if (!root) return;
  const entry = layoutOwners.get(root);
  if (!entry) return;
  entry.owners.delete(card);
  refreshLayout(root);
  if (!entry.owners.size) {
    entry.style.remove();
    layoutOwners.delete(root);
  }
}

function refreshDock(root: ShadowRoot): void {
  const entry = dockOwners.get(root);
  if (!entry) return;
  const sides = new Set(entry.owners.values());
  root.host.toggleAttribute("data-auralis-navbar-reserve-left", sides.has("left"));
  root.host.toggleAttribute("data-auralis-navbar-reserve-right", sides.has("right"));
}

/** Réserve la largeur de la barre à gauche ou à droite des cartes du tableau de bord. */
function reserveDock(card: AuralisNavbarCard, root: ShadowRoot, side: DockSide): void {
  let entry = dockOwners.get(root);
  if (!entry) {
    const style = document.createElement("style");
    style.dataset.auralisNavbarSideDock = "";
    style.textContent = SIDE_DOCK_STYLE;
    root.append(style);
    entry = { owners: new Map(), style };
    dockOwners.set(root, entry);
  }
  entry.owners.set(card, side);
  if (!entry.style.isConnected) root.append(entry.style);
  refreshDock(root);
}

function releaseDock(card: AuralisNavbarCard, root?: ShadowRoot): void {
  if (!root) return;
  const entry = dockOwners.get(root);
  if (!entry || !entry.owners.delete(card)) return;
  refreshDock(root);
  if (entry.owners.size) return;
  entry.style.remove();
  dockOwners.delete(root);
}

/**
 * Cartes sources d'une barre partagée, par tableau de bord. Une seule barre flottante existe
 * par tableau de bord, quel que soit le nombre de cartes navbar connectées : la **dernière
 * carte connectée l'emporte** (c'est celle de la vue affichée) ; quand elle part, la
 * précédente encore présente reprend la main. La barre n'est retirée qu'après un court délai
 * sans aucune source, pour survivre au changement de vue sans clignoter ni perdre son défilement.
 */
export class PortalRegistry<K, S> {
  private readonly entries = new Map<K, { sources: S[]; timer?: ReturnType<typeof setTimeout> }>();

  constructor(private readonly onEmpty: (key: K) => void, private readonly grace = PORTAL_GRACE) {}

  /** Ajoute (ou remet en tête) une source ; retourne la source active. */
  acquire(key: K, source: S): S {
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { sources: [] };
      this.entries.set(key, entry);
    }
    clearTimeout(entry.timer);
    entry.timer = undefined;
    entry.sources = [...entry.sources.filter((item) => item !== source), source];
    return source;
  }

  /** Retire une source ; retourne la nouvelle source active, s'il en reste une. */
  release(key: K, source: S): S | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    entry.sources = entry.sources.filter((item) => item !== source);
    if (entry.sources.length) return entry.sources[entry.sources.length - 1];
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      const current = this.entries.get(key);
      if (current !== entry || entry.sources.length) return;
      this.entries.delete(key);
      this.onEmpty(key);
    }, this.grace);
    return undefined;
  }

  active(key: K): S | undefined {
    const sources = this.entries.get(key)?.sources;
    return sources?.[sources.length - 1];
  }

  count(key: K): number {
    return this.entries.get(key)?.sources.length ?? 0;
  }
}

type PortalKey = ShadowRoot | Document;
const portals = new Map<PortalKey, AuralisNavbarCard>();
/** Carte et configuration appliquées en dernier à chaque barre partagée. */
const portalSources = new WeakMap<AuralisNavbarCard, { source: AuralisNavbarCard; config: NavbarCardConfig; position: NavbarPosition }>();
const portalRegistry = new PortalRegistry<PortalKey, AuralisNavbarCard>((key) => {
  portals.get(key)?.remove();
  portals.delete(key);
});

function portalFor(key: PortalKey): AuralisNavbarCard {
  let portal = portals.get(key);
  if (!portal) {
    portal = document.createElement("auralis-navbar-card") as AuralisNavbarCard;
    portal.isPortal = true;
    portal.setAttribute("data-portal", "");
    portal.toggleAttribute("data-dialog-open", hasOpenAuralisDialog());
    portals.set(key, portal);
  }
  if (!portal.isConnected) document.body.append(portal);
  return portal;
}

export function navbarDevice(viewportWidth: number, screenShortSide: number, android: boolean): NavbarDevice {
  if (android) return Math.min(viewportWidth, screenShortSide || viewportWidth) < 600 ? "phone" : "tablet";
  if (viewportWidth < 600) return "phone";
  return viewportWidth < 1200 ? "tablet" : "desktop";
}

function lovelaceRoot(element: HTMLElement): ShadowRoot | undefined {
  let root = element.getRootNode?.();
  while (root instanceof ShadowRoot) {
    if (root.host.localName === "hui-root") return root;
    root = root.host.getRootNode();
  }
  return undefined;
}

function pathnameOf(value: string): string {
  try {
    return new URL(value, "https://home-assistant.local").pathname.replace(/\/$/, "") || "/";
  } catch {
    return "/";
  }
}

/**
 * Texte de la pastille d'un onglet : uniquement un compteur, jamais l'état
 * formaté (« 3 notifications » déborderait). Rien à zéro ni pour un état
 * inactif ; « 99+ » au-delà de 99 ; « ! » pour un état binaire actif.
 */
export function navbarBadge(state: string | undefined): string | undefined {
  const value = state?.trim().toLowerCase() ?? "";
  if (UNAVAILABLE_STATES.has(value)) return undefined;
  const count = Number(value.replace(",", "."));
  if (Number.isFinite(count)) {
    const rounded = Math.round(count);
    if (rounded <= 0) return undefined;
    return rounded > 99 ? "99+" : String(rounded);
  }
  if (["on", "true", "problem", "open", "detected"].includes(value)) return "!";
  return undefined;
}

export function navbarTarget(item: NavbarItemConfig): string | undefined {
  const candidate = (item.path || item.navigation_path || "").trim();
  if (!candidate || candidate.startsWith("//") || candidate.includes("\\") || /^[a-z][a-z\d+.-]*:/i.test(candidate)) return undefined;
  if (candidate.startsWith("/") || candidate.startsWith("#")) return candidate;
  return `/${candidate}`;
}

export function navbarItemActive(item: NavbarItemConfig, currentPath: string): boolean {
  const candidates = [navbarTarget(item), ...(item.active_paths || [])]
    .filter((path): path is string => Boolean(path))
    .map(pathnameOf);
  const current = pathnameOf(currentPath);
  return candidates.some((candidate) => item.exact
    ? current === candidate
    : current === candidate || (candidate !== "/" && current.startsWith(`${candidate}/`)));
}

export function navbarOverlayPlacement(
  dashboard: Pick<DOMRect, "left" | "right"> | undefined,
  viewport: Pick<VisualViewport, "offsetLeft" | "offsetTop" | "width" | "height">,
  layoutHeight: number,
): { centerX: number; availableWidth: number; top: number; bottom: number; centerY: number; insetLeft: number; insetRight: number } {
  const left = dashboard ? Math.max(viewport.offsetLeft, dashboard.left) : viewport.offsetLeft;
  const right = dashboard
    ? Math.min(viewport.offsetLeft + viewport.width, dashboard.right)
    : viewport.offsetLeft + viewport.width;
  const contentLeft = right > left ? left : viewport.offsetLeft;
  const availableWidth = right > left ? right - left : viewport.width;
  return {
    centerX: contentLeft + availableWidth / 2,
    availableWidth,
    top: viewport.offsetTop,
    bottom: Math.max(0, layoutHeight - viewport.offsetTop - viewport.height),
    centerY: viewport.offsetTop + viewport.height / 2,
    // Une barre à gauche se pose à droite du menu latéral de Home Assistant, pas dessous.
    insetLeft: Math.max(0, contentLeft),
    insetRight: Math.max(0, viewport.offsetLeft + viewport.width - (contentLeft + availableWidth)),
  };
}

/** Défilement minimal qui rend visible un élément [start, start + size] dans une zone de `viewport` pixels. */
export function nearestScroll(start: number, size: number, scroll: number, viewport: number): number {
  if (start < scroll || size >= viewport) return Math.max(0, start);
  if (start + size > scroll + viewport) return start + size - viewport;
  return scroll;
}

export class AuralisNavbarCard extends AuralisBaseCard<NavbarCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    preview: { attribute: false },
    editMode: { attribute: false },
  };

  static styles: CSSResultGroup = [
    sharedStyles,
    css`
      :host { container-type: inline-size; }
      :host([data-position]:not([data-position="inline"]):not([data-portal]):not([data-edit-mode])) {
        position: absolute;
        width: 0;
        height: 0;
        overflow: hidden;
        pointer-events: none;
      }
      :host([data-portal]) {
        position: fixed;
        z-index: 1000;
        box-sizing: border-box;
      }
      :host([data-portal][data-dialog-open]) { display: none; }
      :host([data-portal][data-position="top"]),
      :host([data-portal][data-position="bottom"]) {
        left: var(--auralis-navbar-center-x, 50vw);
        width: min(720px, var(--auralis-navbar-available-width, 100vw));
        transform: translateX(-50%);
      }
      :host([data-portal][data-position="top"]) { top: var(--auralis-navbar-visual-top, 0px); }
      :host([data-portal][data-position="bottom"]) { bottom: var(--auralis-navbar-visual-bottom, 0px); }
      :host([data-portal][data-position="left"]),
      :host([data-portal][data-position="right"]) {
        top: var(--auralis-navbar-visual-center-y, 50%);
        width: min(160px, 100vw);
        max-height: 100dvh;
        transform: translateY(-50%);
      }
      :host([data-portal][data-position="left"]) { left: var(--auralis-navbar-inset-left, 0px); }
      :host([data-portal][data-position="right"]) { right: var(--auralis-navbar-inset-right, 0px); }
      ha-card {
        height: var(--navbar-height-desktop, 76px);
        box-sizing: border-box;
        overflow: visible;
        background: var(--machine-base-background, var(--auralis-bg));
      }
      :host([data-position="left"]) ha-card,
      :host([data-position="right"]) ha-card { height: auto; }
      .navbar-shell {
        position: relative;
        height: 100%;
        box-sizing: border-box;
        overflow: hidden;
        padding: 8px;
        border-radius: inherit;
        background: color-mix(in srgb, var(--auralis-card) 92%, transparent);
        backdrop-filter: blur(18px);
      }
      .navbar-shell::before {
        position: absolute;
        inset: 0;
        z-index: -1;
        background-image: var(--machine-image, none);
        background-position: var(--machine-image-position, center);
        background-size: cover;
        opacity: var(--machine-image-opacity, 0);
        filter: brightness(var(--machine-image-brightness, 0.72));
        content: "";
      }
      nav {
        display: flex;
        height: 100%;
        box-sizing: border-box;
        align-items: stretch;
        gap: 6px;
        overflow-x: auto;
        scrollbar-width: none;
        overscroll-behavior-x: contain;
        scroll-snap-type: x proximity;
      }
      nav::-webkit-scrollbar { display: none; }
      :host([data-position="bottom"]) nav { padding-bottom: env(safe-area-inset-bottom, 0); }
      :host([data-position="top"]) nav { padding-top: env(safe-area-inset-top, 0); }
      :host([data-position="left"]) .navbar-shell,
      :host([data-position="right"]) .navbar-shell,
      :host([data-position="left"]) nav,
      :host([data-position="right"]) nav {
        height: auto;
      }
      :host([data-position="left"]) nav,
      :host([data-position="right"]) nav {
        max-height: calc(100dvh - 16px);
        flex-direction: column;
        overflow-x: hidden;
        overflow-y: auto;
        padding-bottom: 0;
        scroll-snap-type: y proximity;
      }
      :host([data-position="left"]) .nav-item,
      :host([data-position="right"]) .nav-item {
        flex: 0 0 auto;
        min-height: 48px;
        flex-direction: row;
        justify-content: flex-start;
      }
      .nav-item {
        position: relative;
        display: flex;
        flex: 1 0 76px;
        min-width: 0;
        min-height: 0;
        align-items: center;
        justify-content: center;
        gap: 7px;
        box-sizing: border-box;
        padding: 10px 12px;
        overflow: hidden;
        border: 1px solid transparent;
        border-radius: 17px;
        color: var(--auralis-muted);
        text-decoration: none;
        scroll-snap-align: center;
        transition: color 160ms ease, background 160ms ease, border-color 160ms ease, transform 160ms ease;
        -webkit-tap-highlight-color: transparent;
      }
      .nav-item:hover, .nav-item:focus-visible {
        color: var(--auralis-text);
        background: color-mix(in srgb, var(--auralis-layer) 76%, transparent);
        outline: none;
      }
      .nav-item:focus-visible { box-shadow: 0 0 0 2px var(--machine-accent, var(--auralis-info)); }
      .nav-item:active { transform: scale(0.97); }
      .nav-item.active {
        border-color: color-mix(in srgb, var(--machine-accent, var(--auralis-info)) 30%, transparent);
        background: color-mix(in srgb, var(--machine-accent, var(--auralis-info)) 14%, var(--auralis-layer));
        color: var(--auralis-text);
      }
      .nav-item.active::after {
        position: absolute;
        right: 22%;
        bottom: 4px;
        left: 22%;
        height: 3px;
        border-radius: 99px;
        background: var(--machine-accent, var(--auralis-info));
        box-shadow: 0 0 12px color-mix(in srgb, var(--machine-accent, var(--auralis-info)) 65%, transparent);
        content: "";
      }
      .icon-wrap { position: relative; display: grid; place-items: center; flex: 0 0 auto; }
      ha-icon { --mdc-icon-size: 23px; }
      .active ha-icon { color: var(--machine-accent, var(--auralis-info)); }
      .label {
        min-width: 0;
        overflow: hidden;
        font-size: var(--auralis-text-sm);
        font-weight: 700;
        line-height: 1.1;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .badge {
        position: absolute;
        top: -8px;
        right: -12px;
        min-width: 18px;
        max-width: 34px;
        height: 18px;
        overflow: hidden;
        box-sizing: border-box;
        padding: 0 4px;
        border: 2px solid var(--auralis-card);
        border-radius: 999px;
        background: var(--machine-accent, var(--auralis-info));
        /* Encre sombre sur l'accent (clair par défaut), réglable par thème Home Assistant. */
        color: var(--auralis-navbar-badge-ink, #0b1118);
        font-size: var(--auralis-text-xs);
        font-weight: 800;
        line-height: 14px;
        text-align: center;
      }
      .compact .nav-item { min-height: 48px; padding: 8px 10px; }
      .labels-hidden .nav-item { flex-basis: 54px; }
      @container (max-width: 520px) {
        .nav-item { flex: 1 0 64px; flex-direction: column; gap: 4px; padding: 5px 8px; }
        .label { max-width: 74px; font-size: var(--auralis-text-xs); }
      }
      @media (max-width: 1024px) {
        ha-card { height: var(--navbar-height-tablet, 72px); }
      }
      @media (max-width: 600px) {
        ha-card { height: var(--navbar-height-mobile, 72px); }
        :host([data-position="bottom"]) ha-card {
          height: calc(var(--navbar-height-mobile, 72px) + env(safe-area-inset-bottom, 0px));
        }
        :host([data-position="top"]) ha-card {
          height: calc(var(--navbar-height-mobile, 72px) + env(safe-area-inset-top, 0px));
        }
        .navbar-shell { padding: 6px; }
        .nav-item { padding: 2px 6px; gap: 2px; }
        .compact .nav-item { min-height: 0; padding: 2px 6px; }
        ha-icon { --mdc-icon-size: 20px; }
      }
    `,
  ];

  private readonly routeChanged = (): void => this.requestUpdate();
  /** Vrai pour la barre flottante partagée, posée dans document.body. */
  public isPortal = false;
  /** Tableau de bord dont cette carte alimente (ou peut alimenter) la barre partagée. */
  private portalKey?: PortalKey;
  private dashboardElement?: Element;
  private dashboardObserver?: ResizeObserver;
  private dockRoot?: ShadowRoot;
  private layoutRoot?: ShadowRoot;
  /** Placement à recalculer (connexion, redimensionnement, changement de source active). */
  private layoutDirty = true;
  private syncedConfig?: NavbarCardConfig;
  private syncedEditing?: boolean;
  private syncedHeader?: boolean;
  /** Chemin pour lequel l'onglet actif a déjà été amené à l'écran. */
  private revealedPath?: string;
  public preview = false;
  public editMode = false;

  private get editing(): boolean {
    return this.preview || this.editMode;
  }

  private get effectivePosition(): NavbarPosition {
    const position = this.config?.position || "bottom";
    if (typeof window === "undefined") return position;
    const shortSide = Math.min(window.screen.width, window.screen.height);
    const device = navbarDevice(window.innerWidth, shortSide, /Android/i.test(navigator.userAgent));
    if (device === "phone") return this.config?.phone_position || position;
    if (device === "tablet") return this.config?.tablet_position || position;
    return position;
  }

  private readonly viewportChanged = (): void => {
    this.layoutDirty = true;
    this.requestUpdate();
  };

  private readonly updateOverlayGeometry = (): void => {
    const portal = this.activePortal();
    if (!portal) return;
    const viewport = window.visualViewport;
    const placement = navbarOverlayPlacement(this.dashboardElement?.getBoundingClientRect(), {
      offsetLeft: viewport?.offsetLeft ?? 0,
      offsetTop: viewport?.offsetTop ?? 0,
      width: viewport?.width ?? window.innerWidth,
      height: viewport?.height ?? window.innerHeight,
    }, window.innerHeight);

    portal.style.setProperty("--auralis-navbar-center-x", `${placement.centerX}px`);
    portal.style.setProperty("--auralis-navbar-available-width", `${placement.availableWidth}px`);
    portal.style.setProperty("--auralis-navbar-visual-top", `${placement.top}px`);
    portal.style.setProperty("--auralis-navbar-visual-bottom", `${placement.bottom}px`);
    portal.style.setProperty("--auralis-navbar-visual-center-y", `${placement.centerY}px`);
    portal.style.setProperty("--auralis-navbar-inset-left", `${placement.insetLeft}px`);
    portal.style.setProperty("--auralis-navbar-inset-right", `${placement.insetRight}px`);
  };

  /** Barre partagée, si cette carte en est la source active. */
  private activePortal(): AuralisNavbarCard | undefined {
    return this.portalKey && portalRegistry.active(this.portalKey) === this ? portals.get(this.portalKey) : undefined;
  }

  /** Une autre carte a pris ou rendu la main sur la barre : recalcul complet au prochain rendu. */
  private sourceChanged(): void {
    this.layoutDirty = true;
    this.requestUpdate();
  }

  private findDashboardElement(): Element | undefined {
    let node: Node | null = this;
    let main: Element | undefined;
    while (node) {
      if (node instanceof Element) {
        const tag = node.tagName.toLowerCase();
        if (tag === "ha-panel-lovelace" || tag === "hui-root") return node;
        if (tag === "main") main = node;
      }
      node = node.parentNode || (node instanceof ShadowRoot ? node.host : null);
    }
    return main;
  }

  /**
   * Après chaque rendu de la carte source. Le placement complet (parcours de l'arbre jusqu'au
   * tableau de bord, réserves d'espace, mesures) n'est refait qu'au changement de
   * configuration, de mode d'édition, de taille d'écran ou à la (re)connexion ; sinon on ne
   * transmet que le nouvel état de Home Assistant à la barre (pastilles).
   */
  private syncOverlay(): void {
    if (this.isPortal) return;
    const header = hidesNativeHeader(this.config, this.hass);
    if (this.layoutDirty || this.syncedConfig !== this.config || this.syncedEditing !== this.editing || this.syncedHeader !== header) {
      this.layoutDirty = false;
      this.syncedConfig = this.config;
      this.syncedEditing = this.editing;
      this.syncedHeader = header;
      this.syncLayout();
      return;
    }
    const portal = this.activePortal();
    if (portal) portal.hass = this.hass;
  }

  private syncLayout(): void {
    const position = this.effectivePosition;
    this.setAttribute("data-position", position);
    // Une carte qui a déjà quitté la page peut encore finir une mise à jour (changement de vue) :
    // elle ne doit ni créer de barre ni garder de réserve, sinon les barres s'empileraient.
    const attached = Boolean(this.isConnected && this.config && !this.editing);
    const root = attached ? lovelaceRoot(this) : undefined;
    const key: PortalKey | undefined = attached && position !== "inline" && typeof document !== "undefined" ? root ?? document : undefined;

    if (this.portalKey !== key) {
      if (this.portalKey) this.leavePortal();
      this.portalKey = key;
      if (key) {
        const previous = portalRegistry.active(key);
        portalRegistry.acquire(key, this);
        if (previous && previous !== this) previous.sourceChanged();
      }
    }
    const active = key !== undefined && portalRegistry.active(key) === this;

    // Seule la source active réserve de la place : deux cartes ne poussent jamais le contenu deux fois.
    const side = active && root && (position === "left" || position === "right") ? position : undefined;
    if (this.dockRoot && (this.dockRoot !== root || !side)) releaseDock(this, this.dockRoot);
    if (side && root) reserveDock(this, root, side);
    this.dockRoot = side ? root : undefined;

    const layoutRoot = attached && root && ((active && (position === "bottom" || position === "top")) || hidesNativeHeader(this.config, this.hass))
      ? root : undefined;
    if (this.layoutRoot !== layoutRoot) releaseLayout(this, this.layoutRoot);
    if (layoutRoot) reserveLayout(this, layoutRoot, active ? position : "inline");
    this.layoutRoot = layoutRoot;

    if (!active || !key) {
      this.stopGeometry();
      return;
    }
    const portal = portalFor(key);
    const applied = portalSources.get(portal);
    if (applied?.source !== this || applied.config !== this.config || applied.position !== position) {
      portal.setConfig({ ...this.config!, position });
      portalSources.set(portal, { source: this, config: this.config!, position });
    }
    portal.hass = this.hass;

    const dashboard = this.findDashboardElement();
    if (dashboard !== this.dashboardElement || !this.dashboardObserver) {
      this.dashboardObserver?.disconnect();
      this.dashboardObserver = undefined;
      this.dashboardElement = dashboard;
      if (dashboard && typeof ResizeObserver !== "undefined") {
        this.dashboardObserver = new ResizeObserver(this.updateOverlayGeometry);
        this.dashboardObserver.observe(dashboard);
      }
    }
    this.updateOverlayGeometry();
  }

  private stopGeometry(): void {
    this.dashboardObserver?.disconnect();
    this.dashboardObserver = undefined;
    this.dashboardElement = undefined;
  }

  /** Rend la barre partagée : la source précédente reprend la main, ou la barre disparaît après un délai. */
  private leavePortal(): void {
    const key = this.portalKey;
    if (!key) return;
    this.portalKey = undefined;
    this.stopGeometry();
    const wasActive = portalRegistry.active(key) === this;
    const next = portalRegistry.release(key, this);
    if (wasActive && next) next.sourceChanged();
  }

  /** Après un changement de vue, l'onglet actif est amené à l'écran dans la barre (sans faire défiler la page). */
  private revealActiveItem(): void {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    if (path === this.revealedPath) return;
    const nav = this.renderRoot?.querySelector?.<HTMLElement>("nav");
    const item = nav?.querySelector<HTMLElement>(".nav-item.active");
    if (!nav || !item) return;
    this.revealedPath = path;
    const vertical = nav.scrollHeight > nav.clientHeight + 1 && nav.scrollWidth <= nav.clientWidth + 1;
    if (vertical) {
      nav.scrollTop = nearestScroll(item.offsetTop - nav.offsetTop, item.offsetHeight, nav.scrollTop, nav.clientHeight);
    } else if (nav.scrollWidth > nav.clientWidth + 1) {
      nav.scrollLeft = nearestScroll(item.offsetLeft - nav.offsetLeft, item.offsetWidth, nav.scrollLeft, nav.clientWidth);
    }
  }

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("location-changed", this.routeChanged);
    window.addEventListener("popstate", this.routeChanged);
    if (!this.isPortal) {
      window.addEventListener("resize", this.viewportChanged);
      window.visualViewport?.addEventListener("resize", this.viewportChanged);
      window.visualViewport?.addEventListener("scroll", this.updateOverlayGeometry);
      // Home Assistant rattache une vue mise en cache ou réaffiche la carte après une condition
      // de visibilité : la barre doit revenir tout de suite, sans attendre le prochain état.
      this.layoutDirty = true;
      this.requestUpdate();
    }
  }

  public disconnectedCallback(): void {
    window.removeEventListener("location-changed", this.routeChanged);
    window.removeEventListener("popstate", this.routeChanged);
    if (!this.isPortal) {
      window.removeEventListener("resize", this.viewportChanged);
      window.visualViewport?.removeEventListener("resize", this.viewportChanged);
      window.visualViewport?.removeEventListener("scroll", this.updateOverlayGeometry);
      releaseDock(this, this.dockRoot);
      this.dockRoot = undefined;
      releaseLayout(this, this.layoutRoot);
      this.layoutRoot = undefined;
      this.leavePortal();
      this.layoutDirty = true;
    }
    super.disconnectedCallback();
  }

  protected willUpdate(): void {
    this.toggleAttribute("data-edit-mode", this.editing);
  }

  protected updated(): void {
    super.updated();
    if (this.isPortal || this.effectivePosition === "inline" || this.editing) this.revealActiveItem();
    if (!this.isPortal) this.syncOverlay();
  }

  public setConfig(config: NavbarCardConfig): void {
    if (!Array.isArray(config.items) || config.items.length === 0) {
      throw new Error("items doit contenir au moins une destination.");
    }
    const position = config.position || "bottom";
    if (!["inline", "top", "bottom", "left", "right"].includes(position)) {
      throw new Error("position doit être inline, top, bottom, left ou right.");
    }
    if (config.phone_position && !["inline", "top", "bottom"].includes(config.phone_position)) {
      throw new Error("phone_position doit être inline, top ou bottom.");
    }
    if (config.tablet_position && !["inline", "top", "bottom", "left", "right"].includes(config.tablet_position)) {
      throw new Error("tablet_position doit être inline, top, bottom, left ou right.");
    }
    const items = config.items.map((item) => ({ ...item, label: item.label?.trim() }));
    if (items.some((item) => !item.label || !navbarTarget(item))) {
      throw new Error("Chaque entrée de navigation doit avoir un label et un path valides.");
    }
    for (const key of ["height_desktop", "height_tablet", "height_mobile"] as const) {
      const height = config[key];
      if (height !== undefined && (!Number.isInteger(height) || height < 56 || height > 160)) {
        throw new Error(`${key} doit être un nombre entier entre 56 et 160 pixels.`);
      }
    }
    this.config = { theme: "auto", accent_color: "#79d6f2", show_labels: true, ...config, position, items };
    this.setAttribute?.("data-position", position);
  }

  public static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      theme: "Thème", accent_color: "Couleur d’accent", position: "Position", phone_position: "Position sur téléphone",
      tablet_position: "Position sur tablette", height_desktop: "Hauteur sur ordinateur (px)", height_tablet: "Hauteur sur tablette (px)",
      height_mobile: "Hauteur sur téléphone (px)", hide_native_header: "Masquer l’en-tête Home Assistant (sauf administrateurs)",
      show_labels: "Afficher les libellés", compact: "Présentation compacte", items: "Destinations (label, icon, path, badge_entity…)",
    };
    return {
      schema: [
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        { name: "accent_color", selector: { text: {} } },
        { name: "position", selector: { select: { options: ["inline", "top", "bottom", "left", "right"], mode: "dropdown" } } },
        { name: "phone_position", selector: { select: { options: ["inline", "top", "bottom"], mode: "dropdown" } } },
        { name: "tablet_position", selector: { select: { options: ["inline", "top", "bottom", "left", "right"], mode: "dropdown" } } },
        { name: "height_desktop", selector: { number: { min: 56, max: 160, mode: "box" } } },
        { name: "height_tablet", selector: { number: { min: 56, max: 160, mode: "box" } } },
        { name: "height_mobile", selector: { number: { min: 56, max: 160, mode: "box" } } },
        { name: "hide_native_header", selector: { boolean: {} } },
        { name: "show_labels", selector: { boolean: {} } },
        { name: "compact", selector: { boolean: {} } },
        { name: "items", selector: { object: {} } },
      ],
      computeLabel: ({ name }: { name: string }) => labels[name],
    };
  }

  public static getStubConfig(): NavbarCardConfig {
    return {
      type: "custom:auralis-navbar-card",
      position: "bottom",
      items: [
        { label: "Accueil", icon: "mdi:home-outline", path: "/dashboard-auralis/accueil" },
        { label: "Pièces", icon: "mdi:floor-plan", path: "/dashboard-auralis/pieces" },
        { label: "Systèmes", icon: "mdi:server-network", path: "/dashboard-auralis/systemes" },
      ],
    };
  }

  private badge(item: NavbarItemConfig): string | undefined {
    if (!item.badge_entity) return undefined;
    return navbarBadge(this.hass?.states[item.badge_entity]?.state);
  }

  private onItemClick(event: MouseEvent, item: NavbarItemConfig): void {
    if (this.editing) {
      event.preventDefault();
      return;
    }
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = navbarTarget(item);
    if (!target) return;
    event.preventDefault();
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (current === target) return;
    navigate(target);
  }

  protected render(): TemplateResult {
    if (!this.config) return html``;
    if (this.effectivePosition !== "inline" && !this.isPortal && !this.editing) return html``;
    const currentPath = typeof window === "undefined" ? "/" : window.location.pathname;
    const showLabels = this.config.show_labels !== false;
    const classes = [this.config.compact ? "compact" : "", showLabels ? "" : "labels-hidden"].filter(Boolean).join(" ");
    const heightStyle = (["desktop", "tablet", "mobile"] as const)
      .map((device) => {
        const height = this.config?.[`height_${device}`];
        return height === undefined ? "" : `--navbar-height-${device}:${height}px`;
      })
      .filter(Boolean)
      .join(";");
    return html`
      <ha-card style=${`${this.machineStyle("#79d6f2")};${heightStyle}`}>
        <div class="navbar-shell ${classes}">
          <nav aria-label=${this.config.aria_label || this.config.name || "Navigation Auralis"}>
            ${this.config.items.map((item) => {
              const target = navbarTarget(item)!;
              const active = navbarItemActive(item, currentPath);
              const badge = this.badge(item);
              return html`<a class="nav-item ${active ? "active" : ""}" href=${target} aria-current=${active ? "page" : nothing}
                aria-label=${badge ? `${item.label}, ${badge === "!" ? "alerte" : `${badge} en attente`}` : nothing}
                title=${item.label} @click=${(event: MouseEvent) => this.onItemClick(event, item)}>
                <span class="icon-wrap"><ha-icon .icon=${item.icon || "mdi:circle-outline"}></ha-icon>${badge ? html`<span class="badge" aria-hidden="true">${badge}</span>` : nothing}</span>
                ${showLabels ? html`<span class="label">${item.label}</span>` : nothing}
              </a>`;
            })}
          </nav>
        </div>
      </ha-card>`;
  }

  public getCardSize(): number { return 1; }
  public getGridOptions(): Record<string, number> {
    return this.effectivePosition === "inline" || this.editing
      ? { rows: 2, min_rows: 1, columns: 12, min_columns: 4 }
      : { columns: 1, min_columns: 1 };
  }
}
