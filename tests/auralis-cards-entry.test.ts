import { describe, expect, it, vi } from "vitest";

describe("Auralis entrypoint", () => {
  it("registers every card in the single HACS bundle", async () => {
    vi.stubGlobal("HTMLElement", class {});
    vi.stubGlobal("document", { createTreeWalker: () => ({}) });
    const definitions = new Map<string, CustomElementConstructor>();
    vi.stubGlobal("customElements", {
      get: (name: string) => definitions.get(name),
      define: (name: string, element: CustomElementConstructor) => definitions.set(name, element),
    });
    const cards: Array<{ type: string }> = [];
    vi.stubGlobal("window", { customCards: cards });

    await import("../auralis-cards.ts");

    const expected = [
      "auralis-navbar-card", "auralis-room-card", "auralis-covers-card",
      "auralis-thermostat-card", "auralis-lights-card", "auralis-switches-card", "auralis-fridge-card",
      "auralis-energy-card", "auralis-consumption-card", "auralis-climate-card", "auralis-weather-card", "auralis-actions-card", "auralis-cameras-card", "auralis-media-card", "auralis-tabs-card", "auralis-screensaver-card", "auralis-batteries-card", "auralis-irrigation-card", "auralis-pc-card", "auralis-unraid-card", "auralis-proxmox-card",
    ];
    expect([...definitions.keys()].filter((type) => type.startsWith("auralis-")).sort()).toEqual([...expected].sort());
    expect(cards.map((card) => card.type).sort()).toEqual([...expected].sort());

    const { AuralisEnergyCard } = await import("../src/cards/auralis-energy-card");
    expect(AuralisEnergyCard.prototype.getGridOptions()).toMatchObject({ columns: 12, min_columns: 6 });
  });
});
