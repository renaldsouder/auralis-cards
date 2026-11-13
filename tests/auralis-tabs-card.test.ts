import { beforeAll, describe, expect, it, vi } from "vitest";
import type { TabsCardConfig } from "../src/cards/auralis-tabs-card";

type TabsModule = typeof import("../src/cards/auralis-tabs-card");
let tabs: TabsModule;

const config = (overrides: Partial<TabsCardConfig> = {}): TabsCardConfig => ({
  type: "custom:auralis-tabs-card",
  tabs: [
    { label: "Lumières", icon: "mdi:lightbulb", cards: [{ type: "custom:auralis-lights-card" }] },
    { name: "Volets", card: { type: "custom:auralis-covers-card" } },
    { icon: "mdi:cctv", cards: [{ type: "markdown" }, { type: "custom:auralis-cameras-card" }] },
  ],
  ...overrides,
});

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  tabs = await import("../src/cards/auralis-tabs-card");
});

describe("Auralis tabs", () => {
  it("names tabs from label, then name, then their position", () => {
    const { tabs: list } = config();
    expect(list.map((tab, index) => tabs.tabLabel(tab, index))).toEqual(["Lumières", "Volets", "Onglet 3"]);
  });

  it("accepts one card or a list of cards per tab", () => {
    const { tabs: list } = config();
    expect(list.map((tab) => tabs.tabCards(tab).length)).toEqual([1, 1, 2]);
  });

  it("opens default_tab counted from 1, or the remembered tab while it still exists", () => {
    expect(tabs.initialTab(config())).toBe(0);
    expect(tabs.initialTab(config({ default_tab: 2 }))).toBe(1);
    expect(tabs.initialTab(config({ default_tab: 9 }))).toBe(2);
    expect(tabs.initialTab(config({ default_tab: 2 }), 2)).toBe(2);
    expect(tabs.initialTab(config({ default_tab: 2 }), 7)).toBe(1);
  });

  it("moves with arrows, Home and End, and wraps around", () => {
    expect(tabs.nextTab(0, 3, "ArrowRight")).toBe(1);
    expect(tabs.nextTab(2, 3, "ArrowRight")).toBe(0);
    expect(tabs.nextTab(0, 3, "ArrowLeft")).toBe(2);
    expect(tabs.nextTab(1, 3, "End")).toBe(2);
    expect(tabs.nextTab(1, 3, "Home")).toBe(0);
    expect(tabs.nextTab(1, 3, "Enter")).toBeUndefined();
  });

  it("shows a short badge for counts and active states only", () => {
    expect(tabs.tabBadge("3")).toBe("3");
    expect(tabs.tabBadge("140")).toBe("99+");
    expect(tabs.tabBadge("0")).toBeUndefined();
    expect(tabs.tabBadge("on")).toBe("•");
    expect(tabs.tabBadge("off")).toBeUndefined();
    expect(tabs.tabBadge("unavailable")).toBeUndefined();
  });

  it("rejects empty tabs and cards without type", () => {
    const card = new tabs.AuralisTabsCard();
    expect(() => card.setConfig({ type: "custom:auralis-tabs-card", tabs: [] })).toThrow("au moins un onglet");
    expect(() => card.setConfig(config({ tabs: [{ label: "Vide", cards: [] }] }))).toThrow("ne contient aucune carte");
    expect(() => card.setConfig(config({ tabs: [{ label: "Cassé", cards: [{} as never] }] }))).toThrow("carte sans type");
    expect(() => card.setConfig(config({ tab_style: "bulles" as never }))).toThrow("tab_style");
    card.setConfig(config({ default_tab: 3 }));
    expect((card as unknown as { active: number }).active).toBe(2);
    expect(card.getGridOptions()).toEqual({ columns: 12, min_columns: 6, rows: "auto" });
  });
});
