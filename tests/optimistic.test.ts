import { beforeAll, describe, expect, it, vi } from "vitest";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";
import { CONFIRM_TIMEOUT, expectedChanges, isConfirmed, shownState, stateMatches } from "../src/utils/optimistic";

const state = (entity_id: string, value: string, attributes: Record<string, unknown> = {}): HassEntity => ({ entity_id, state: value, attributes });

const house = (): HomeAssistant => ({
  states: {
    "light.plafond": state("light.plafond", "off"),
    "light.lampe": state("light.lampe", "on", { brightness: 128 }),
    "switch.prise": state("switch.prise", "on"),
    "switch.hs": state("switch.hs", "unavailable"),
    "cover.baie": state("cover.baie", "open", { current_position: 30 }),
    "media_player.salon": state("media_player.salon", "playing", { volume_level: 0.2 }),
    "lock.porte": state("lock.porte", "unlocked"),
    "scene.soiree": state("scene.soiree", "2026-11-14T18:00:00"),
  },
  callService: vi.fn(async () => undefined),
});

describe("Auralis optimistic display", () => {
  it("predicts the state requested by common services", () => {
    const hass = house();
    expect(expectedChanges(hass, "light", "turn_on", { brightness_pct: 60 }, { entity_id: ["light.plafond", "light.lampe"] })).toEqual([
      { entityId: "light.plafond", state: "on", attributes: { brightness: 153 } },
      { entityId: "light.lampe", state: "on", attributes: { brightness: 153 } },
    ]);
    expect(expectedChanges(hass, "homeassistant", "toggle", {}, { entity_id: ["switch.prise", "light.plafond"] })).toEqual([
      { entityId: "switch.prise", state: "off" },
      { entityId: "light.plafond", state: "on" },
    ]);
    expect(expectedChanges(hass, "cover", "set_cover_position", { position: 70 }, { entity_id: "cover.baie" }))
      .toEqual([{ entityId: "cover.baie", attributes: { current_position: 70 } }]);
    expect(expectedChanges(hass, "media_player", "volume_set", { volume_level: 0.5 }, { entity_id: "media_player.salon" }))
      .toEqual([{ entityId: "media_player.salon", attributes: { volume_level: 0.5 } }]);
    expect(expectedChanges(hass, "media_player", "media_play_pause", {}, { entity_id: "media_player.salon" }))
      .toEqual([{ entityId: "media_player.salon", state: "paused" }]);
    expect(expectedChanges(hass, "lock", "lock", {}, { entity_id: "lock.porte" })).toEqual([{ entityId: "lock.porte", state: "locked" }]);
  });

  it("expects nothing when nothing would change or the result cannot be predicted", () => {
    const hass = house();
    expect(expectedChanges(hass, "switch", "turn_on", {}, { entity_id: "switch.prise" })).toEqual([]);
    expect(expectedChanges(hass, "switch", "turn_on", {}, { entity_id: "switch.hs" })).toEqual([]);
    expect(expectedChanges(hass, "scene", "turn_on", {}, { entity_id: "scene.soiree" })).toEqual([]);
    expect(expectedChanges(hass, "cover", "open_cover", {}, { entity_id: "cover.baie" })).toEqual([]);
    expect(expectedChanges(hass, "cover", "set_cover_position", { position: 30 }, { entity_id: "cover.baie" })).toEqual([]);
  });

  it("waits for a device update that matches the requested state", () => {
    const hass = house();
    const sent = hass.states["light.plafond"];
    const pending = { entityId: "light.plafond", state: "on", sent, deadline: Date.now() + CONFIRM_TIMEOUT };
    expect(isConfirmed(pending, sent)).toBe(false);
    expect(isConfirmed(pending, state("light.plafond", "off", { color_mode: "brightness" }))).toBe(false);
    expect(isConfirmed(pending, state("light.plafond", "on"))).toBe(true);
    expect(isConfirmed(pending, state("light.plafond", "unavailable"))).toBe(true);
    // Une valeur seule est confirmée par la première mise à jour, même arrondie.
    const position = { entityId: "cover.baie", attributes: { current_position: 70 }, sent: hass.states["cover.baie"], deadline: 0 };
    expect(isConfirmed(position, state("cover.baie", "opening", { current_position: 45 }))).toBe(true);
    expect(stateMatches("media_player.tv", "on", "idle")).toBe(true);
    expect(stateMatches("media_player.tv", "off", "standby")).toBe(true);
    expect(stateMatches("number.consigne", "21", "21.0")).toBe(true);
  });

  it("shows the requested state on top of the real one, with a stable object", () => {
    const hass = house();
    const real = hass.states["light.lampe"];
    const pending = { entityId: "light.lampe", state: "on", attributes: { brightness: 200 }, deadline: 0 };
    const shown = shownState(pending, real);
    expect(shown).toEqual({ ...real, attributes: { brightness: 200 } });
    expect(shownState(pending, real)).toBe(shown);
  });
});

describe("Auralis base card tracking", () => {
  let SwitchesCard: typeof import("../src/cards/auralis-switches-card").AuralisSwitchesCard;

  beforeAll(async () => {
    vi.stubGlobal("HTMLElement", class {});
    ({ AuralisSwitchesCard: SwitchesCard } = await import("../src/cards/auralis-switches-card"));
  });

  it("shows the requested state at once, keeps the command busy until the device confirms, and reverts after the timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", globalThis);
    const callService = vi.fn(async () => undefined);
    const hass: HomeAssistant = { states: { "switch.tv": state("switch.tv", "off", { friendly_name: "Télé" }) }, callService };
    const card = new SwitchesCard();
    card.setConfig({ type: "custom:auralis-switches-card", switches: ["switch.tv"] });
    card.hass = hass;
    const internals = card as unknown as {
      runCommand(key: string, action: () => unknown): Promise<boolean>;
      isPending(key: string): boolean;
      isAwaiting(id: string): boolean;
      feedback?: { tone: string; message: string };
    };

    await internals.runCommand("tv", () => card.hass!.callService("switch", "turn_on", {}, { entity_id: "switch.tv" }));
    expect(callService).toHaveBeenCalledWith("switch", "turn_on", {}, { entity_id: "switch.tv" });
    expect(card.hass!.states["switch.tv"].state).toBe("on");
    expect(internals.isPending("tv")).toBe(true);
    expect(internals.isAwaiting("switch.tv")).toBe(true);

    card.hass = { ...hass, states: { "switch.tv": state("switch.tv", "on", { friendly_name: "Télé" }) } };
    expect(internals.isPending("tv")).toBe(false);
    expect(internals.isAwaiting("switch.tv")).toBe(false);

    await internals.runCommand("tv", () => card.hass!.callService("switch", "turn_off", {}, { entity_id: "switch.tv" }));
    expect(card.hass!.states["switch.tv"].state).toBe("off");
    await vi.advanceTimersByTimeAsync(CONFIRM_TIMEOUT + 100);
    expect(card.hass!.states["switch.tv"].state).toBe("on");
    expect(internals.feedback).toEqual({ tone: "error", message: "« Télé » n’a pas confirmé la commande." });
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.stubGlobal("HTMLElement", class {});
  });

  it("reverts at once when Home Assistant refuses the command", async () => {
    vi.stubGlobal("window", globalThis);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const callService = vi.fn(async () => { throw new Error("hors ligne"); });
    const card = new SwitchesCard();
    card.setConfig({ type: "custom:auralis-switches-card", switches: ["switch.tv"] });
    card.hass = { states: { "switch.tv": state("switch.tv", "off") }, callService };
    const internals = card as unknown as { runCommand(key: string, action: () => unknown): Promise<boolean> };
    expect(await internals.runCommand("tv", () => card.hass!.callService("switch", "turn_on", {}, { entity_id: "switch.tv" }))).toBe(false);
    expect(card.hass!.states["switch.tv"].state).toBe("off");
    vi.unstubAllGlobals();
    vi.stubGlobal("HTMLElement", class {});
  });
});
