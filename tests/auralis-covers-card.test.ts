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
        available: number;
        moving: number;
        availableIds: string[];
      };
    };

    expect(internals.groupStats(config.groups[0])).toEqual({
      total: 3,
      open: 1,
      available: 2,
      moving: 1,
      availableIds: ["cover.baie", "cover.fenetre"],
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