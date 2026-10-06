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
    expect(card.getCardSize()).toBe(1);
    expect(card.getGridOptions()).toEqual({ rows: 2, min_rows: 1, columns: 12, min_columns: 4 });
  });
});
