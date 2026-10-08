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

    await import("../auralis-cards");

    const expected = [
      "auralis-navbar-card", "auralis-room-card", "auralis-covers-card",
      "auralis-thermostat-card", "auralis-lights-card", "auralis-fridge-card",
      "auralis-pc-card", "auralis-unraid-card", "auralis-proxmox-card",
    ];
    expect([...definitions.keys()].filter((type) => type.startsWith("auralis-")).sort()).toEqual([...expected].sort());
    expect(cards.map((card) => card.type).sort()).toEqual([...expected].sort());
  });
});
