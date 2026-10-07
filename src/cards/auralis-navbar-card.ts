import { css, html, nothing, type CSSResultGroup, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import type { NavbarCardConfig, NavbarItemConfig } from "../types/config";
import { sharedStyles } from "../styles/shared";

const UNAVAILABLE_STATES = new Set(["unknown", "unavailable", ""]);

function pathnameOf(value: string): string {
  try {
    return new URL(value, "https://home-assistant.local").pathname.replace(/\/$/, "") || "/";
  } catch {
    return "/";
  }
}

export function navbarTarget(item: NavbarItemConfig): string | undefined {
  const candidate = (item.path || item.navigation_path || "").trim();
  if (!candidate || candidate.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(candidate)) return undefined;
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
): { centerX: number; availableWidth: number; top: number; bottom: number; centerY: number } {
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
  };
}

export class AuralisNavbarCard extends AuralisBaseCard<NavbarCardConfig> {
  static styles: CSSResultGroup = [
    sharedStyles,
    css`
      :host { container-type: inline-size; }
      :host([data-position]:not([data-position="inline"]):not([data-portal])) {
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
      :host([data-portal][data-position="left"]) { left: 0; }
      :host([data-portal][data-position="right"]) { right: 0; }
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
        font-size: 12px;
        font-weight: 700;
        line-height: 1.1;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .badge {
        position: absolute;
        top: -7px;
        right: -10px;
        min-width: 16px;
        height: 16px;
        box-sizing: border-box;
        padding: 0 4px;
        border: 2px solid var(--auralis-card);
        border-radius: 999px;
        background: var(--machine-accent, var(--auralis-info));
        color: white;
        font-size: 8px;
        font-weight: 800;
        line-height: 12px;
        text-align: center;
      }
      .compact .nav-item { min-height: 48px; padding: 8px 10px; }
      .labels-hidden .nav-item { flex-basis: 54px; }
      @container (max-width: 520px) {
        .nav-item { flex: 1 0 64px; flex-direction: column; gap: 4px; padding: 5px 8px; }
        .label { max-width: 74px; font-size: 10px; }
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
        ha-icon { --mdc-icon-size: 20px; }
      }
    `,
  ];

  private readonly routeChanged = (): void => this.requestUpdate();
  private isPortal = false;
  private overlay?: AuralisNavbarCard;
  private overlayConfig?: NavbarCardConfig;
  private dashboardElement?: Element;
  private dashboardObserver?: ResizeObserver;
  private readonly updateOverlayGeometry = (): void => {
    if (!this.overlay) return;
    const viewport = window.visualViewport;
    const placement = navbarOverlayPlacement(this.dashboardElement?.getBoundingClientRect(), {
      offsetLeft: viewport?.offsetLeft ?? 0,
      offsetTop: viewport?.offsetTop ?? 0,
      width: viewport?.width ?? window.innerWidth,
      height: viewport?.height ?? window.innerHeight,
    }, window.innerHeight);

    this.overlay.style.setProperty("--auralis-navbar-center-x", `${placement.centerX}px`);
    this.overlay.style.setProperty("--auralis-navbar-available-width", `${placement.availableWidth}px`);
    this.overlay.style.setProperty("--auralis-navbar-visual-top", `${placement.top}px`);
    this.overlay.style.setProperty("--auralis-navbar-visual-bottom", `${placement.bottom}px`);
    this.overlay.style.setProperty("--auralis-navbar-visual-center-y", `${placement.centerY}px`);
  };

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

  private syncOverlay(): void {
    if (this.isPortal) return;
    if (!this.config || this.config.position === "inline") {
      this.removeOverlay();
      return;
    }
    if (!this.overlay) {
      this.overlay = document.createElement("auralis-navbar-card") as AuralisNavbarCard;
      this.overlay.isPortal = true;
      this.overlay.setAttribute("data-portal", "");
      document.body.append(this.overlay);
    }
    if (this.overlayConfig !== this.config) {
      this.overlay.setConfig(this.config);
      this.overlayConfig = this.config;
    }
    this.overlay.hass = this.hass;

    const dashboard = this.findDashboardElement();
    if (dashboard !== this.dashboardElement) {
      this.dashboardObserver?.disconnect();
      this.dashboardElement = dashboard;
      if (dashboard && typeof ResizeObserver !== "undefined") {
        this.dashboardObserver = new ResizeObserver(this.updateOverlayGeometry);
        this.dashboardObserver.observe(dashboard);
      }
    }
    this.updateOverlayGeometry();
  }

  private removeOverlay(): void {
    this.dashboardObserver?.disconnect();
    this.dashboardObserver = undefined;
    this.dashboardElement = undefined;
    this.overlay?.remove();
    this.overlay = undefined;
    this.overlayConfig = undefined;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("location-changed", this.routeChanged);
    window.addEventListener("popstate", this.routeChanged);
    if (!this.isPortal) {
      window.addEventListener("resize", this.updateOverlayGeometry);
      window.visualViewport?.addEventListener("resize", this.updateOverlayGeometry);
      window.visualViewport?.addEventListener("scroll", this.updateOverlayGeometry);
    }
  }

  public disconnectedCallback(): void {
    window.removeEventListener("location-changed", this.routeChanged);
    window.removeEventListener("popstate", this.routeChanged);
    if (!this.isPortal) {
      window.removeEventListener("resize", this.updateOverlayGeometry);
      window.visualViewport?.removeEventListener("resize", this.updateOverlayGeometry);
      window.visualViewport?.removeEventListener("scroll", this.updateOverlayGeometry);
      this.removeOverlay();
    }
    super.disconnectedCallback();
  }

  protected updated(): void {
    super.updated();
    this.syncOverlay();
  }

  public setConfig(config: NavbarCardConfig): void {
    if (!Array.isArray(config.items) || config.items.length === 0) {
      throw new Error("items doit contenir au moins une destination.");
    }
    const position = config.position || "bottom";
    if (!["inline", "top", "bottom", "left", "right"].includes(position)) {
      throw new Error("position doit être inline, top, bottom, left ou right.");
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
    return { schema: [
      { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
      { name: "accent_color", selector: { text: {} } },
      { name: "position", selector: { select: { options: ["inline", "top", "bottom", "left", "right"], mode: "dropdown" } } },
      { name: "height_desktop", selector: { number: { min: 56, max: 160, mode: "box" } } },
      { name: "height_tablet", selector: { number: { min: 56, max: 160, mode: "box" } } },
      { name: "height_mobile", selector: { number: { min: 56, max: 160, mode: "box" } } },
      { name: "show_labels", selector: { boolean: {} } },
      { name: "compact", selector: { boolean: {} } },
      { name: "items", selector: { object: {} } },
    ] };
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
    const state = this.hass?.states[item.badge_entity];
    if (!state || UNAVAILABLE_STATES.has(state.state.toLowerCase())) return undefined;
    return this.hass?.formatEntityState?.(state) || state.state;
  }

  private navigate(event: MouseEvent, item: NavbarItemConfig): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = navbarTarget(item);
    if (!target) return;
    event.preventDefault();
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (current === target) return;
    window.history.pushState(null, "", target);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
  }

  protected render(): TemplateResult {
    if (!this.config) return html``;
    if (this.config.position !== "inline" && !this.isPortal) return html``;
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
              return html`<a class="nav-item ${active ? "active" : ""}" href=${target} aria-current=${active ? "page" : nothing} title=${item.label} @click=${(event: MouseEvent) => this.navigate(event, item)}>
                <span class="icon-wrap"><ha-icon .icon=${item.icon || "mdi:circle-outline"}></ha-icon>${badge ? html`<span class="badge">${badge}</span>` : nothing}</span>
                ${showLabels ? html`<span class="label">${item.label}</span>` : nothing}
              </a>`;
            })}
          </nav>
        </div>
      </ha-card>`;
  }

  public getCardSize(): number { return 1; }
  public getGridOptions(): Record<string, number> {
    return this.config?.position === "inline"
      ? { rows: 2, min_rows: 1, columns: 12, min_columns: 4 }
      : { columns: 1, min_columns: 1 };
  }
}
