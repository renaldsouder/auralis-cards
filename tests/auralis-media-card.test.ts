import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";
import type { MediaCardConfig } from "../src/cards/auralis-media-card";

let media: typeof import("../src/cards/auralis-media-card");
const state = (id: string, value: string, attributes: Record<string, unknown> = {}): HassEntity =>
  ({ entity_id: id, state: value, attributes });

// Ampli Onkyo : volume, sourdine, sources, modes sonores, marche/arrêt, lecture seule.
const ONKYO = 4 | 8 | 1024 | 2048 | 128 | 256 | 16384 | 65536;
const config: MediaCardConfig = {
  type: "custom:auralis-media-card",
  players: [
    { entity: "media_player.ampli", name: "Ampli", max_volume: 60, volume_step: 5, volume_scale: 80,
      sources: ["tv", { source: "bluetooth", name: "Téléphone" }] },
    { entity: "media_player.salon" },
  ],
};

type View = Record<string, unknown> & { id: string; volume?: number; maxVolume: number; step: number };
type Internals = {
  chosen?: number;
  now: number;
  view(player: MediaCardConfig["players"] extends (infer P)[] | undefined ? P : never, index: number): View;
  views(): View[];
  currentView(): View | undefined;
  stepVolume(view: View, direction: 1 | -1): Promise<boolean>;
  playPause(view: View): Promise<boolean>;
  selectSource(view: View, source: string): Promise<boolean>;
  togglePower(view: View): Promise<boolean>;
};

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  vi.stubGlobal("window", { setTimeout, clearTimeout, setInterval, clearInterval });
  media = await import("../src/cards/auralis-media-card");
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("Auralis media card", () => {
  it("accepts a single entity or a player list and bounds volume options", () => {
    const card = new media.AuralisMediaCard();
    card.setConfig({ type: "custom:auralis-media-card", entity: "media_player.tx_nr686", device_class: "receiver", max_volume: 300, volume_step: 0 });
    expect(card.config?.players).toEqual([expect.objectContaining({ entity: "media_player.tx_nr686", device_class: "receiver", max_volume: 100, volume_step: 1 })]);
    card.setConfig(config);
    expect(card.config?.players?.[0]).toMatchObject({ max_volume: 60, volume_step: 5, volume_scale: 80 });
    expect(card.config?.players?.[1]).toMatchObject({ max_volume: 100, volume_step: 2, volume_scale: undefined });
    expect(() => card.setConfig({ type: "custom:auralis-media-card" })).toThrow();
    expect(() => card.setConfig({ type: "custom:auralis-media-card", entity: "light.salon" })).toThrow();
    expect(() => card.setConfig({ type: "custom:auralis-media-card", players: [{ entity: "media_player.a", sources: "tv" as never }] })).toThrow();
  });

  it("formats playback, volume, sources and supported features", () => {
    expect(media.formatDuration(187)).toBe("3:07");
    expect(media.formatDuration(3723)).toBe("1:02:03");
    expect(media.nextVolume(0.34, 5, 100)).toBe(0.39);
    expect(media.nextVolume(0.58, 5, 60)).toBe(0.6);
    expect(media.nextVolume(0.01, -5)).toBe(0);
    expect(media.volumeLabel(0.5)).toBe("50 %");
    expect(media.volumeLabel(0.5, 80)).toBe("40");
    expect(media.sourceIcon("tv")).toBe("mdi:television");
    expect(media.sourceIcon("bd-dvd")).toBe("mdi:disc-player");
    expect(media.sourceIcon("cbl-sat")).toBe("mdi:set-top-box");
    expect(media.sourceIcon("Spotify")).toBe("mdi:spotify");
    expect(media.sourceIcon("aux1")).toBe("mdi:audio-input-stereo-minijack");
    expect(media.sourceIcon("phono")).toBe("mdi:album");
    expect(media.sourceIcon("inconnu")).toBe("mdi:import");
    expect(media.normalizeSources(undefined, ["tv", "game", 3])).toEqual([
      { source: "tv", name: "tv", icon: "mdi:television" }, { source: "game", name: "game", icon: "mdi:gamepad-variant-outline" },
    ]);
    expect(media.normalizeSources([{ source: "bluetooth", name: "Téléphone", icon: "mdi:cellphone" }], ["tv"])).toEqual([
      { source: "bluetooth", name: "Téléphone", icon: "mdi:cellphone" },
    ]);
    const amp = state("media_player.ampli", "on", { supported_features: ONKYO, sound_mode_list: ["stereo"] });
    expect(media.supports(amp, media.FEATURE.SELECT_SOURCE)).toBe(true);
    expect(media.supports(amp, media.FEATURE.NEXT)).toBe(false);
    expect(media.supports(state("media_player.x", "on"), media.FEATURE.NEXT)).toBe(true);
    expect(media.playerKind({ entity: "media_player.ampli" }, amp)).toBe("receiver");
    expect(media.playerKind({ entity: "media_player.tv" }, state("media_player.tv", "on", { device_class: "tv" }))).toBe("tv");
    expect(media.playerKind({ entity: "media_player.x", device_class: "tv" }, amp)).toBe("tv");
    expect(media.playerKind({ entity: "media_player.x" }, undefined)).toBe("speaker");
  });

  it("describes what is playing, falling back to the source and sound mode", () => {
    expect(media.nowPlaying(state("media_player.a", "playing", { media_title: "So What", media_artist: "Miles Davis", media_album_name: "Kind of Blue" }), "Salon"))
      .toEqual({ title: "So What", subtitle: "Miles Davis · Kind of Blue" });
    expect(media.nowPlaying(state("media_player.a", "on", { source: "tv", sound_mode: "Dolby Surround" }), "Ampli"))
      .toEqual({ title: "tv", subtitle: "Dolby Surround" });
    expect(media.nowPlaying(state("media_player.a", "off", { source: "tv" }), "Ampli")).toEqual({ title: "Ampli", subtitle: "Éteint" });
    expect(media.nowPlaying(undefined, "Ampli")).toEqual({ title: "Ampli", subtitle: "Introuvable" });
    const playing = state("media_player.a", "playing", { media_duration: 200, media_position: 50, media_position_updated_at: new Date(10_000).toISOString() });
    expect(media.mediaPosition(playing, 40_000)).toBe(80);
    expect(media.mediaPosition({ ...playing, state: "paused" }, 40_000)).toBe(50);
    expect(media.mediaPosition(playing, 10_000_000)).toBe(200);
    expect(media.mediaPosition(state("media_player.a", "on"), 0)).toBeUndefined();
    expect(media.pickPlayer([{ playing: false, powered: false }, { playing: false, powered: true }, { playing: true, powered: true }])).toBe(2);
    expect(media.pickPlayer([{ playing: false, powered: false }, { playing: false, powered: true }])).toBe(1);
    expect(media.pickPlayer([{ playing: false, powered: false }])).toBe(0);
  });

  it("drives volume within the configured maximum, sources and playback", async () => {
    const callService = vi.fn(async () => undefined);
    const card = new media.AuralisMediaCard();
    const internals = card as unknown as Internals;
    card.setConfig(config);
    card.hass = {
      states: {
        "media_player.ampli": state("media_player.ampli", "on", { supported_features: ONKYO, volume_level: 0.58, source: "tv", source_list: ["tv", "bluetooth", "game"], sound_mode: "stereo", sound_mode_list: ["stereo", "direct"] }),
        "media_player.salon": state("media_player.salon", "playing", { media_title: "Jazz", volume_level: 0.3, supported_features: 1 | 4 | 16 | 32 | 16384 }),
      },
      callService,
    } as HomeAssistant;

    expect(internals.currentView()?.id).toBe("media_player.salon");
    internals.chosen = 0;
    const amp = internals.currentView()!;
    expect(amp).toMatchObject({ id: "media_player.ampli", kind: "receiver", label: "Ampli", title: "tv", subtitle: "stereo", powered: true, maxVolume: 60, step: 5 });

    await internals.stepVolume(amp, 1);
    expect(callService).toHaveBeenLastCalledWith("media_player", "volume_set", { volume_level: 0.6 }, { entity_id: "media_player.ampli" });
    expect(internals.currentView()?.volume).toBe(0.6);

    await internals.selectSource(amp, "bluetooth");
    expect(callService).toHaveBeenLastCalledWith("media_player", "select_source", { source: "bluetooth" }, { entity_id: "media_player.ampli" });

    await internals.togglePower(amp);
    expect(callService).toHaveBeenLastCalledWith("media_player", "turn_off", {}, { entity_id: "media_player.ampli" });

    const salon = internals.views()[1];
    await internals.playPause(salon);
    expect(callService).toHaveBeenLastCalledWith("media_player", "media_pause", {}, { entity_id: "media_player.salon" });

    // Sans réglage direct du volume : commandes − et + de l'appareil.
    card.hass = { ...card.hass, states: { ...card.hass.states, "media_player.salon": state("media_player.salon", "on", { supported_features: 1024 }) } } as HomeAssistant;
    await internals.stepVolume(internals.views()[1], -1);
    expect(callService).toHaveBeenLastCalledWith("media_player", "volume_down", {}, { entity_id: "media_player.salon" });
  });

  it("flags the control whose service failed, whatever service it called", async () => {
    const callService = vi.fn(async () => undefined);
    const card = new media.AuralisMediaCard();
    const internals = card as unknown as Internals & { failed?: string; feedback?: { tone: string; message: string } };
    card.setConfig({ type: "custom:auralis-media-card", entity: "media_player.salon" });
    // Lecture sans pause possible : la carte appelle media_stop, et c'est le bouton Lecture qui doit clignoter.
    card.hass = { states: { "media_player.salon": state("media_player.salon", "playing", { supported_features: 4096 | 16384 }) }, callService } as HomeAssistant;
    callService.mockRejectedValueOnce(new Error("refusé"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await internals.playPause(internals.views()[0]);
    expect(callService).toHaveBeenLastCalledWith("media_player", "media_stop", {}, { entity_id: "media_player.salon" });
    expect(internals.failed).toBe("media_player.salon:play");
    expect(internals.feedback).toMatchObject({ tone: "error" });
    expect(internals.feedback?.message).toContain("Lecture/pause");

    callService.mockRejectedValueOnce(new Error("refusé"));
    await internals.selectSource(internals.views()[0], "tv");
    expect(internals.failed).toBe("media_player.salon:source");
    warn.mockRestore();
  });

  it("keeps a dragged slider value until release, with a maximum hold", () => {
    vi.useFakeTimers();
    const changes = vi.fn();
    const held = new media.HeldValue(changes, 1_500, 10_000);
    held.drag("media_player.a", 42);
    expect(held.get("media_player.a")).toBe(42);
    expect(held.get("media_player.b")).toBeUndefined();
    // Le défilement de la lecture ne ramène pas le curseur pendant le glissement.
    vi.advanceTimersByTime(5_000);
    expect(held.get("media_player.a")).toBe(42);
    // Doigt levé sans « change » : on rend la main après le délai de confirmation.
    held.release();
    vi.advanceTimersByTime(1_500);
    expect(held.get("media_player.a")).toBeUndefined();
    // Glissement abandonné sans aucun relâchement : libéré au bout de la durée maximale.
    held.drag("media_player.a", 10);
    vi.advanceTimersByTime(10_000);
    expect(held.dragging).toBe(false);
    held.hold("media_player.a", 0.5);
    vi.advanceTimersByTime(1_499);
    expect(held.get("media_player.a")).toBe(0.5);
    vi.advanceTimersByTime(1);
    expect(held.get("media_player.a")).toBeUndefined();
    vi.useRealTimers();
  });

  it("does not switch players under the finger and releases a choice that turned off", () => {
    const off = { playing: false, powered: false };
    const on = { playing: false, powered: true };
    const playing = { playing: true, powered: true };
    expect(media.resolvePlayer([on, playing], { pinned: false })).toBe(1);
    // Fenêtre ouverte ou action récente : le lecteur affiché reste celui de l'utilisateur.
    expect(media.resolvePlayer([on, playing], { shown: 0, pinned: true })).toBe(0);
    expect(media.resolvePlayer([on, playing], { shown: 0, pinned: false })).toBe(1);
    expect(media.resolvePlayer([on, playing], { chosen: 0, pinned: false })).toBe(0);
    // Le lecteur choisi s'éteint pendant qu'un autre joue : le choix tombe.
    expect(media.releasesChoice([off, playing], 0)).toBe(true);
    expect(media.releasesChoice([off, on], 0)).toBe(false);
    expect(media.resolvePlayer([off, playing], { chosen: 0, pinned: false })).toBe(1);
    expect(media.resolvePlayer([off, playing], { chosen: 0, shown: 0, pinned: true })).toBe(0);
  });

  it("words the off panel like the state label", () => {
    expect(media.offLabel("receiver", state("media_player.a", "off"))).toBe("Ampli éteint.");
    expect(media.offLabel("speaker", state("media_player.a", "standby"))).toBe("Enceinte en veille.");
    expect(media.offLabel("tv", state("media_player.a", "unknown"))).toBe("Télévision : état inconnu.");
    expect(media.offLabel("tv", state("media_player.a", "unavailable"))).toBe("Lecteur indisponible.");
    expect(media.offLabel("tv", undefined)).toBe("Entité introuvable.");
  });
});
