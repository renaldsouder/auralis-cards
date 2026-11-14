import { beforeAll, describe, expect, it, vi } from "vitest";
import type { TabsCardConfig } from "../src/cards/auralis-tabs-card";

type EditorModule = typeof import("../src/editors/auralis-tabs-card-editor");
let editor: EditorModule;

const base = (): TabsCardConfig => ({
  type: "custom:auralis-tabs-card",
  remember_tab: true,
  tabs: [
    { label: "Lumières", icon: "mdi:lightbulb", cards: [{ type: "custom:auralis-lights-card" }, { type: "tile", entity: "light.salon" }] },
    { name: "Volets", card: { type: "custom:auralis-covers-card" } },
  ],
});

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  editor = await import("../src/editors/auralis-tabs-card-editor");
});

describe("Auralis tabs editor", () => {
  it("reads one card or a list of cards per tab", () => {
    const { tabs } = base();
    expect(editor.cardsOf(tabs[0])).toHaveLength(2);
    expect(editor.cardsOf(tabs[1])).toEqual([{ type: "custom:auralis-covers-card" }]);
    expect(editor.cardsOf(undefined)).toEqual([]);
  });

  it("writes a tab's cards as a list and drops the single-card form", () => {
    const next = editor.withTabCards(base(), 1, [{ type: "custom:auralis-covers-card" }, { type: "markdown" }]);
    expect(next.tabs[1]).toEqual({ name: "Volets", cards: [{ type: "custom:auralis-covers-card" }, { type: "markdown" }] });
    expect(next.tabs[0]).toEqual(base().tabs[0]);
    expect(next.remember_tab).toBe(true);
  });

  it("does not modify the configuration it receives", () => {
    const config = base();
    const snapshot = structuredClone(config);
    editor.withTabCards(config, 0, []);
    editor.withTabFields(config, 0, { label: "Autre" });
    editor.withNewTab(config);
    editor.withoutTab(config, 0);
    expect(config).toEqual(snapshot);
  });

  it("applies tab fields, removes emptied ones and replaces the name alias by label", () => {
    const next = editor.withTabFields(base(), 1, { label: "Volets roulants", icon: "mdi:window-shutter", badge_entity: "", columns: 2 });
    expect(next.tabs[1]).toEqual({ label: "Volets roulants", icon: "mdi:window-shutter", columns: 2, card: { type: "custom:auralis-covers-card" } });
    const cleared = editor.withTabFields(base(), 0, { icon: undefined });
    expect(cleared.tabs[0].icon).toBeUndefined();
    expect(cleared.tabs[0].label).toBe("Lumières");
  });

  it("adds an empty tab and never removes the last one", () => {
    const added = editor.withNewTab(base());
    expect(added.tabs).toHaveLength(3);
    expect(added.tabs[2]).toEqual({ label: "Onglet 3", cards: [] });
    const single: TabsCardConfig = { type: "custom:auralis-tabs-card", tabs: [{ label: "Seul", cards: [] }] };
    expect(editor.withoutTab(single, 0)).toBe(single);
    expect(editor.withoutTab(base(), 0).tabs.map((tab) => tab.name ?? tab.label)).toEqual(["Volets"]);
  });

  it("moves items within bounds only", () => {
    expect(editor.moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(editor.moveItem(["a", "b", "c"], 2, 1)).toEqual(["a", "c", "b"]);
    expect(editor.moveItem(["a", "b"], 0, 5)).toEqual(["a", "b"]);
    expect(editor.moveItem(["a", "b"], -1, 0)).toEqual(["a", "b"]);
  });

  it("separates card options from the tab list", () => {
    expect(editor.cardOptions(base())).toEqual({ type: "custom:auralis-tabs-card", remember_tab: true });
  });

  it("names cards in the picker bar from the registered card list, then from their type", () => {
    const registry = [{ type: "auralis-lights-card", name: "Auralis · Lumières" }];
    expect(editor.cardTitle({ type: "custom:auralis-lights-card" }, registry)).toBe("Lumières");
    expect(editor.cardTitle({ type: "custom:auralis-covers-card" }, registry)).toBe("Covers");
    expect(editor.cardTitle({ type: "history-graph" })).toBe("History graph");
    expect(editor.cardTitle({ type: "tile" })).toBe("Tile");
    expect(editor.cardTitle(undefined)).toBe("Carte");
  });
});
