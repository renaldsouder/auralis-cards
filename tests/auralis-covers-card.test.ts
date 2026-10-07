import { beforeAll, describe, expect, it, vi } from "vitest";
import type { CoversCardConfig } from "../src/types/config";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";

type CoversCardModule = typeof import("../src/cards/auralis-covers-card");
let module: CoversCardModule;

const state = (entity_id: string, value: string): HassEntity => ({
  entity_id,
  state: value,
  attributes: {},
});

const config: CoversCardConfig = {
  type: "custom:auralis-covers-card",
  groups: [{ name: "Salon", covers: ["cover.baie", "cover.fenetre", "cover.absent", "cover.baie"] }],
};

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  module = await import("../src/cards/auralis-covers-card");
});

describe("Auralis covers groups", () => {
  it("counts unique covers and excludes unavailable entities from group commands", () => {
    const card = new module.AuralisCoversCard();
    card.setConfig(config);
    card.hass = {
      states: {
        "cover.baie": state("cover.baie", "open"),
        "cover.fenetre": state("cover.fenetre", "closing"),
        "cover.absent": state("cover.absent", "unavailable"),
      },
      callService: vi.fn(async () => undefined),
    } satisfies HomeAssistant;
    const internals = card as unknown as {
      groupStats(group: CoversCardConfig["groups"][number]): {
        total: number;
        open: number;
        closed: number;
        opening: number;
        closing: number;
        available: number;
        moving: number;
        availableIds: string[];
      };
    };

    expect(internals.groupStats(config.groups[0])).toEqual({
      total: 3,
      open: 1,
      closed: 0,
      opening: 0,
      closing: 1,
      available: 2,
      moving: 1,
      availableIds: ["cover.baie", "cover.fenetre"],
    });
  });

  it("shows the group state and runs direct commands without opening the popup", async () => {
    const card = new module.AuralisCoversCard();
    card.setConfig(config);
    const callService = vi.fn(async () => undefined);
    card.hass = {
      states: {
        "cover.baie": state("cover.baie", "open"),
        "cover.fenetre": state("cover.fenetre", "closed"),
        "cover.absent": state("cover.absent", "unavailable"),
      },
      callService,
    } satisfies HomeAssistant;
    const internals = card as unknown as {
      renderGroup(group: CoversCardConfig["groups"][number], index: number): {
        strings: readonly string[];
        values: unknown[];
      };
      dialog: string | null;
    };
    const template = internals.renderGroup(config.groups[0], 0);
    const markup = template.strings.join("");
    expect(markup).toContain("Monter");
    expect(markup).toContain("Stop");
    expect(markup).toContain("Descendre");
    expect(markup).toContain("group-topline");
    expect(markup).toContain("group-bottomline");
    expect(markup).not.toContain("group-subtitle");
    expect(template.values).toContain("1/3 ouverts");

    const handlers = template.values.filter((value): value is () => Promise<void> => typeof value === "function");
    expect(handlers).toHaveLength(4);
    await handlers[1]();
    await handlers[2]();
    await handlers[3]();
    expect(callService).toHaveBeenNthCalledWith(1, "cover", "open_cover", {}, { entity_id: ["cover.baie", "cover.fenetre"] });
    expect(callService).toHaveBeenNthCalledWith(2, "cover", "stop_cover", {}, { entity_id: ["cover.baie", "cover.fenetre"] });
    expect(callService).toHaveBeenNthCalledWith(3, "cover", "close_cover", {}, { entity_id: ["cover.baie", "cover.fenetre"] });
    expect(internals.dialog).toBeNull();
  });

  it("updates the group label for movement and fully closed covers", () => {
    const card = new module.AuralisCoversCard();
    card.setConfig(config);
    card.hass = {
      states: {
        "cover.baie": state("cover.baie", "opening"),
        "cover.fenetre": state("cover.fenetre", "closed"),
        "cover.absent": state("cover.absent", "unavailable"),
      },
      callService: vi.fn(async () => undefined),
    } satisfies HomeAssistant;
    const internals = card as unknown as {
      groupStats(group: CoversCardConfig["groups"][number]): unknown;
      groupStatus(stats: unknown): { label: string; tone: string };
    };
    expect(internals.groupStatus(internals.groupStats(config.groups[0]))).toEqual({
      label: "Ouverture en cours", tone: "moving",
    });

    card.hass.states["cover.baie"] = state("cover.baie", "closed");
    expect(internals.groupStatus(internals.groupStats(config.groups[0]))).toEqual({
      label: "0/3 ouverts", tone: "",
    });
    card.hass.states["cover.absent"] = state("cover.absent", "closed");
    expect(internals.groupStatus(internals.groupStats(config.groups[0]))).toEqual({
      label: "Tous fermés", tone: "",
    });
  });

  it("rejects groups that are missing or contain non-cover entities", () => {
    const card = new module.AuralisCoversCard();
    expect(() => card.setConfig({ ...config, groups: [] })).toThrow("au moins un groupe");
    expect(() => card.setConfig({
      ...config,
      groups: [{ name: "Salon", covers: ["light.salon"] }],
    })).toThrow("uniquement des entités cover");
  });
});
