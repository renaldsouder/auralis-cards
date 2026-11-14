import { beforeAll, describe, expect, it, vi } from "vitest";
import type { NavbarCardConfig } from "../src/types/config";

type NavbarModule = typeof import("../src/cards/auralis-navbar-card");
let navbar: NavbarModule;

const config = (overrides: Partial<NavbarCardConfig> = {}): NavbarCardConfig => ({
  type: "custom:auralis-navbar-card",
  items: [
    { label: "Accueil", icon: "mdi:home", path: "/auralis/accueil" },
    { label: "Pièces", icon: "mdi:floor-plan", path: "/auralis/pieces" },
  ],
  ...overrides,
});

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  navbar = await import("../src/cards/auralis-navbar-card");
});

describe("Auralis navbar routes", () => {
  it("accepts internal paths and rejects external or executable URLs", () => {
    expect(navbar.navbarTarget({ label: "Pièces", path: "auralis/pieces" })).toBe("/auralis/pieces");
    expect(navbar.navbarTarget({ label: "Pièces", navigation_path: "/auralis/pieces" })).toBe("/auralis/pieces");
    expect(navbar.navbarTarget({ label: "Dangereux", path: "javascript:alert(1)" })).toBeUndefined();
    expect(navbar.navbarTarget({ label: "Externe", path: "https://example.com" })).toBeUndefined();
    expect(navbar.navbarTarget({ label: "Invalide", path: "//example.com" })).toBeUndefined();
  });

  it("marks routes and sub-views active without prefix collisions", () => {
    const item = { label: "Pièces", path: "/auralis/pieces" };
    expect(navbar.navbarItemActive(item, "/auralis/pieces")).toBe(true);
    expect(navbar.navbarItemActive(item, "/auralis/pieces/salon")).toBe(true);
    expect(navbar.navbarItemActive(item, "/auralis/pieces-annexes")).toBe(false);
    expect(navbar.navbarItemActive({ ...item, exact: true }, "/auralis/pieces/salon")).toBe(false);
  });

  it("shows only a short counter in the badge", () => {
    expect(navbar.navbarBadge("3")).toBe("3");
    expect(navbar.navbarBadge("0")).toBeUndefined();
    expect(navbar.navbarBadge("2.0")).toBe("2");
    expect(navbar.navbarBadge("150")).toBe("99+");
    expect(navbar.navbarBadge("on")).toBe("!");
    expect(navbar.navbarBadge("off")).toBeUndefined();
    expect(navbar.navbarBadge("notifications")).toBeUndefined();
    expect(navbar.navbarBadge("unavailable")).toBeUndefined();
    expect(navbar.navbarBadge(undefined)).toBeUndefined();
  });

  it("supports secondary active paths", () => {
    expect(navbar.navbarItemActive({ label: "Systèmes", path: "/auralis/systemes", active_paths: ["/auralis/proxmox"] }, "/auralis/proxmox/nova")).toBe(true);
  });
});

describe("Auralis navbar configuration", () => {
  it("recognizes Android tablets in portrait and landscape", () => {
    expect(navbar.navbarDevice(800, 800, true)).toBe("tablet");
    expect(navbar.navbarDevice(1280, 800, true)).toBe("tablet");
    expect(navbar.navbarDevice(393, 393, true)).toBe("phone");
    expect(navbar.navbarDevice(1440, 900, false)).toBe("desktop");
  });

  it("centers the overlay in the dashboard area and follows the visible mobile viewport", () => {
    const desktop = navbar.navbarOverlayPlacement(
      { left: 240, right: 1200 },
      { offsetLeft: 0, offsetTop: 0, width: 1200, height: 800 },
      800,
    );
    expect(desktop).toMatchObject({ centerX: 720, availableWidth: 960, bottom: 0 });

    const mobile = navbar.navbarOverlayPlacement(
      { left: 0, right: 390 },
      { offsetLeft: 0, offsetTop: 0, width: 390, height: 760 },
      844,
    );
    expect(mobile).toMatchObject({ centerX: 195, availableWidth: 390, bottom: 84 });
  });

  it("requires at least one complete internal destination", () => {
    const card = new navbar.AuralisNavbarCard();
    expect(() => card.setConfig(config({ items: [] }))).toThrow("items doit contenir au moins une destination.");
    expect(() => card.setConfig(config({ items: [{ label: "", path: "/auralis" }] }))).toThrow("Chaque entrée de navigation doit avoir un label et un path valides.");
    expect(() => card.setConfig(config({ items: [{ label: "Site", path: "https://example.com" }] }))).toThrow("Chaque entrée de navigation doit avoir un label et un path valides.");
  });

  it("applies Auralis defaults and exposes a compact grid footprint", () => {
    const card = new navbar.AuralisNavbarCard();
    card.setConfig(config());
    const internals = card as unknown as { config: NavbarCardConfig };
    expect(internals.config.theme).toBe("auto");
    expect(internals.config.show_labels).toBe(true);
    expect(internals.config.position).toBe("bottom");
    expect(card.getCardSize()).toBe(1);
    expect(card.getGridOptions()).toEqual({ columns: 1, min_columns: 1 });
    card.setConfig(config({ position: "inline" }));
    expect(card.getGridOptions()).toEqual({ rows: 2, min_rows: 1, columns: 12, min_columns: 4 });
  });

  it("accepts separate navigation heights for desktop, tablet and mobile", () => {
    const card = new navbar.AuralisNavbarCard();
    card.setConfig(config({ height_desktop: 88, height_tablet: 76, height_mobile: 64 }));
    const internals = card as unknown as { config: NavbarCardConfig };
    expect(internals.config.height_desktop).toBe(88);
    expect(internals.config.height_tablet).toBe(76);
    expect(internals.config.height_mobile).toBe(64);
    expect(() => card.setConfig(config({ height_mobile: 48 }))).toThrow("height_mobile doit être");
  });

  it("accepts hiding the native dashboard header", () => {
    const card = new navbar.AuralisNavbarCard();
    card.setConfig(config({ height_mobile: 56, compact: true, hide_native_header: true }));
    expect(card.config?.hide_native_header).toBe(true);
    expect(card.config?.height_mobile).toBe(56);
  });

  it("keeps the native header for administrators so they can still enter edit mode", () => {
    const hidden = config({ hide_native_header: true });
    const user = (is_admin: boolean) => ({ states: {}, callService: async () => undefined, user: { is_admin } });
    expect(navbar.hidesNativeHeader(hidden, user(false))).toBe(true);
    expect(navbar.hidesNativeHeader(hidden, user(true))).toBe(false);
    expect(navbar.hidesNativeHeader(config({}), user(false))).toBe(false);
  });

  it("accepts separate tablet and phone positions", () => {
    const card = new navbar.AuralisNavbarCard();
    card.setConfig(config({ position: "bottom", phone_position: "bottom", tablet_position: "right" }));
    const internals = card as unknown as { config: NavbarCardConfig };
    expect(internals.config.tablet_position).toBe("right");
    expect(() => card.setConfig(config({ phone_position: "right" as NavbarCardConfig["phone_position"] }))).toThrow("phone_position doit être");
    expect(() => card.setConfig(config({ tablet_position: "corner" as NavbarCardConfig["tablet_position"] }))).toThrow("tablet_position doit être");
  });

  it("accepts four fixed screen edges and frees its dashboard grid footprint", () => {
    const card = new navbar.AuralisNavbarCard();
    const setAttribute = vi.fn();
    (card as unknown as { setAttribute: typeof setAttribute }).setAttribute = setAttribute;
    for (const position of ["top", "bottom", "left", "right"] as const) {
      card.setConfig(config({ position }));
      expect(setAttribute).toHaveBeenLastCalledWith("data-position", position);
      expect(card.getGridOptions()).toEqual({ columns: 1, min_columns: 1 });
    }
    expect(() => card.setConfig(config({ position: "corner" as NavbarCardConfig["position"] }))).toThrow("position doit être");
  });

  it("never creates or keeps a floating bar once the card has left the page", () => {
    const append = vi.fn();
    vi.stubGlobal("document", { body: { append } });
    const card = new navbar.AuralisNavbarCard();
    const internals = card as unknown as {
      isConnected: boolean;
      setAttribute: (name: string, value: string) => void;
      portalKey?: unknown;
      syncOverlay: () => void;
    };
    internals.setAttribute = vi.fn();
    card.setConfig(config({ position: "bottom" }));
    internals.isConnected = false;
    internals.portalKey = undefined;

    // A route change finishes its update after Home Assistant removed the view.
    internals.syncOverlay();

    expect(append).not.toHaveBeenCalled();
    expect(internals.portalKey).toBeUndefined();
    vi.unstubAllGlobals();
    vi.stubGlobal("HTMLElement", class {});
  });

  it("shares one bar per dashboard: the last connected card wins, the bar outlives a view switch", () => {
    vi.useFakeTimers();
    const removed = vi.fn();
    const registry = new navbar.PortalRegistry<string, string>(removed, 1_000);
    expect(registry.acquire("salon", "vue-a")).toBe("vue-a");
    registry.acquire("salon", "vue-b");
    expect(registry.active("salon")).toBe("vue-b");
    expect(registry.count("salon")).toBe(2);
    // La carte active part : la précédente reprend la main.
    expect(registry.release("salon", "vue-b")).toBe("vue-a");
    // Changement de vue : l'ancienne carte part avant que la nouvelle arrive.
    expect(registry.release("salon", "vue-a")).toBeUndefined();
    vi.advanceTimersByTime(500);
    registry.acquire("salon", "vue-c");
    vi.advanceTimersByTime(1_000);
    expect(removed).not.toHaveBeenCalled();
    expect(registry.active("salon")).toBe("vue-c");
    // Plus aucune carte : la barre disparaît après le délai.
    registry.release("salon", "vue-c");
    vi.advanceTimersByTime(1_000);
    expect(removed).toHaveBeenCalledWith("salon");
    expect(registry.active("salon")).toBeUndefined();
    vi.useRealTimers();
  });

  it("scrolls the active item just enough to show it", () => {
    expect(navbar.nearestScroll(40, 76, 0, 300)).toBe(0);
    expect(navbar.nearestScroll(400, 76, 0, 300)).toBe(176);
    expect(navbar.nearestScroll(20, 76, 100, 300)).toBe(20);
    expect(navbar.nearestScroll(0, 400, 50, 300)).toBe(0);
  });

  it("places a side bar next to the Home Assistant sidebar", () => {
    const placement = navbar.navbarOverlayPlacement(
      { left: 256, right: 1200 },
      { offsetLeft: 0, offsetTop: 0, width: 1280, height: 800 },
      800,
    );
    expect(placement).toMatchObject({ insetLeft: 256, insetRight: 80 });
  });

  it("lifts a floating bar off the screen edge and reserves that gap", () => {
    expect(navbar.navbarReservedHeight(config({ height_tablet: 64 }), 900)).toBe(64);
    expect(navbar.navbarReservedHeight(config({ height_tablet: 64, floating: true }), 900)).toBe(64 + navbar.FLOATING_GAP);
    expect(navbar.navbarReservedHeight(config({ floating: true }), 1280)).toBe(76 + navbar.FLOATING_GAP);
    expect(navbar.navbarReservedHeight(config({ height_mobile: 56 }), 400)).toBe(56);
  });

  it("floats only the bar placed on the screen, never the card shown in the editor", () => {
    const card = new navbar.AuralisNavbarCard();
    const toggleAttribute = vi.fn();
    const internals = card as unknown as { toggleAttribute: typeof toggleAttribute; willUpdate: () => void };
    internals.toggleAttribute = toggleAttribute;
    card.setConfig(config({ floating: true }));
    internals.willUpdate();
    expect(toggleAttribute).toHaveBeenCalledWith("data-floating", false);
    card.isPortal = true;
    internals.willUpdate();
    expect(toggleAttribute).toHaveBeenCalledWith("data-floating", true);
    card.setConfig(config({}));
    internals.willUpdate();
    expect(toggleAttribute).toHaveBeenCalledWith("data-floating", false);
  });

  it("fits an icon-only bar to its buttons instead of stretching them", () => {
    const card = new navbar.AuralisNavbarCard();
    const toggleAttribute = vi.fn();
    const internals = card as unknown as { toggleAttribute: typeof toggleAttribute; willUpdate: () => void };
    internals.toggleAttribute = toggleAttribute;
    card.isPortal = true;
    card.setConfig(config({}));
    internals.willUpdate();
    expect(toggleAttribute).toHaveBeenCalledWith("data-fit", false);
    card.setConfig(config({ show_labels: false }));
    internals.willUpdate();
    expect(toggleAttribute).toHaveBeenLastCalledWith("data-fit", true);
    card.setConfig(config({ floating: true }));
    internals.willUpdate();
    expect(toggleAttribute).toHaveBeenLastCalledWith("data-fit", true);
    card.isPortal = false;
    internals.willUpdate();
    expect(toggleAttribute).toHaveBeenLastCalledWith("data-fit", false);
  });

  it("labels its editor fields in French", () => {
    const form = navbar.AuralisNavbarCard.getConfigForm() as { computeLabel: (field: { name: string }) => string };
    expect(form.computeLabel({ name: "position" })).toBe("Position");
    expect(form.computeLabel({ name: "hide_native_header" })).toContain("en-tête");
    expect(form.computeLabel({ name: "floating" })).toContain("flottante");
  });

  it("returns to an editable card footprint while dashboard editing is active", () => {
    const card = new navbar.AuralisNavbarCard();
    card.setConfig(config({ position: "bottom" }));
    card.preview = true;
    expect(card.getGridOptions()).toEqual({ rows: 2, min_rows: 1, columns: 12, min_columns: 4 });
    card.preview = false;
    card.editMode = true;
    expect(card.getGridOptions()).toEqual({ rows: 2, min_rows: 1, columns: 12, min_columns: 4 });
    card.editMode = false;
    expect(card.getGridOptions()).toEqual({ columns: 1, min_columns: 1 });
  });
});
