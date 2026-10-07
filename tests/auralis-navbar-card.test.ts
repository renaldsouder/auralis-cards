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

  it("supports secondary active paths", () => {
    expect(navbar.navbarItemActive({ label: "Systèmes", path: "/auralis/systemes", active_paths: ["/auralis/proxmox"] }, "/auralis/proxmox/nova")).toBe(true);
  });
});

describe("Auralis navbar configuration", () => {
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
});
