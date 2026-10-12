import { beforeAll, describe, expect, it, vi } from "vitest";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";
import type { SwitchesGroupConfig } from "../src/types/config";

let SwitchesCard: typeof import("../src/cards/auralis-switches-card").AuralisSwitchesCard;

const state = (entity_id: string, value: string): HassEntity => ({ entity_id, state: value, attributes: {} });

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  SwitchesCard = (await import("../src/cards/auralis-switches-card")).AuralisSwitchesCard;
});

describe("Auralis switches card", () => {
  it("accepts one switch or multiple configured groups and rejects other domains", () => {
    const card = new SwitchesCard();
    card.setConfig({ type: "custom:auralis-switches-card", name: "Prise", switches: ["switch.prise"] });
    expect(card.config?.groups).toEqual([{ name: "Prise", switches: ["switch.prise"] }]);
    card.setConfig({ type: "custom:auralis-switches-card", groups: [
      { name: "Salon", switches: ["switch.lampe", "switch.tv"] },
      { name: "Bureau", switches: ["switch.ecran"] },
    ], group_columns: 2 });
    expect(card.config?.groups).toHaveLength(2);
    expect(() => card.setConfig({ type: "custom:auralis-switches-card", switches: ["light.lampe"] })).toThrow("switch.*");
    expect(() => card.setConfig({ type: "custom:auralis-switches-card", groups: [] })).toThrow();
    expect(() => card.setConfig({ type: "custom:auralis-switches-card", switches: ["switch.prise"], group_columns: 5 })).toThrow("entre 1 et 4");
  });

  it("counts unique switches and sends group commands only to available switches that need a change", async () => {
    const callService = vi.fn(async () => undefined);
    const hass: HomeAssistant = { states: {
      "switch.lampe": state("switch.lampe", "on"),
      "switch.tv": state("switch.tv", "off"),
      "switch.absente": state("switch.absente", "unavailable"),
    }, callService };
    const card = new SwitchesCard();
    card.setConfig({ type: "custom:auralis-switches-card", groups: [
      { name: "Salon", switches: ["switch.lampe", "switch.tv", "switch.absente", "switch.lampe"] },
    ] });
    card.hass = hass;
    vi.spyOn(card, "requestUpdate").mockImplementation(() => undefined);
    const internals = card as unknown as {
      groupStats(group: SwitchesGroupConfig): { total: number; active: number; available: number; availableIds: string[] };
      power(ids: string[], on: boolean): Promise<void>;
      renderGroup(group: SwitchesGroupConfig, index: number): { values: unknown[] };
      dialog: string | null;
    };
    const group = card.config!.groups![0];
    expect(internals.groupStats(group)).toEqual({ total: 3, active: 1, available: 2, availableIds: ["switch.lampe", "switch.tv"] });
    const handlers = internals.renderGroup(group, 0).values.filter((value): value is () => Promise<void> => typeof value === "function");
    expect(handlers).toHaveLength(2);
    await handlers[1]();
    expect(callService).toHaveBeenNthCalledWith(1, "switch", "turn_on", {}, { entity_id: ["switch.tv"] });
    hass.states["switch.tv"].state = "on";
    const offHandlers = internals.renderGroup(group, 0).values.filter((value): value is () => Promise<void> => typeof value === "function");
    await offHandlers[1]();
    expect(callService).toHaveBeenNthCalledWith(2, "switch", "turn_off", {}, { entity_id: ["switch.lampe", "switch.tv"] });
    expect(internals.dialog).toBeNull();
  });

  it("opens the detail popup with the arrow and keeps the visual settings on the card", () => {
    const card = new SwitchesCard();
    card.setConfig({ type: "custom:auralis-switches-card", name: "Prises", switches: ["switch.prise"], group_columns: 2,
      background_image: "/local/prises.jpg", accent_color: "#ffd27a", card_background: { mode: "solid", color: "#101820" } });
    card.hass = { states: { "switch.prise": state("switch.prise", "off") }, callService: vi.fn(async () => undefined) };
    const internals = card as unknown as {
      renderGroup(group: SwitchesGroupConfig, index: number): { values: unknown[] };
      render(): { values: unknown[] };
      dialog: string | null;
    };
    const group = card.config!.groups![0];
    const handlers = internals.renderGroup(group, 0).values.filter((value): value is () => void => typeof value === "function");
    handlers[0]();
    expect(internals.dialog).toBe("group:0");
    expect(internals.render().values).toContain("--group-columns:1");
    expect(internals.render().values.some((value) => typeof value === "string" && value.includes("--machine-accent:#ffd27a"))).toBe(true);
  });

  it("hides optional labels while keeping the whole group area available for details", () => {
    const card = new SwitchesCard();
    card.setConfig({ type: "custom:auralis-switches-card", name: "Prises", switches: ["switch.prise"],
      show_header: false, show_group_label: false });
    card.hass = { states: { "switch.prise": state("switch.prise", "off") }, callService: vi.fn(async () => undefined) };
    const rendered = (card as unknown as { render(): { values: unknown[] } }).render();
    expect(rendered.values.filter((value) => typeof value === "object" && value !== null && "strings" in value)).toHaveLength(0);
    const group = card.config!.groups![0];
    const groupHtml = (card as unknown as { renderGroup(group: SwitchesGroupConfig, index: number): { strings: string[] } }).renderGroup(group, 0);
    expect(groupHtml.strings.join("")).toContain('class="group-open"');
    expect(groupHtml.strings.join("")).not.toContain("group-arrow");
  });
});
