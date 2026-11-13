import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";
import type { CamerasCardConfig } from "../src/cards/auralis-cameras-card";

let cameras: typeof import("../src/cards/auralis-cameras-card");
const state = (id: string, value: string, attributes: Record<string, unknown> = {}): HassEntity =>
  ({ entity_id: id, state: value, attributes });
const plain = (text: string): string => text.replace(/\s/g, " ");
const config: CamerasCardConfig = {
  type: "custom:auralis-cameras-card",
  cameras: [
    { entity: "camera.portail", name: "Portail", motion_entity: "binary_sensor.portail_mouvement",
      actions: [{ entity: "light.projecteur", name: "Projecteur" }, { entity: "button.sirene", name: "Sirène", confirm: true }] },
    { entity: "camera.jardin" },
    { entity: "camera.garage" },
  ],
};

type Internals = {
  selected?: number;
  dialog: string | null;
  confirmState: { danger?: boolean; action(): Promise<void> | void } | null;
  actionStatus: ReadonlyMap<string, string>;
  loader: InstanceType<typeof cameras.SnapshotLoader>;
  view(camera: CamerasCardConfig["cameras"][number], index: number): Record<string, unknown>;
  step(delta: number): void;
  pressAction(camera: number, action: number, item: unknown, label: string): void;
  runAction(camera: number, action: number): Promise<void>;
};

/** Image factice : le test décide quand elle arrive ou échoue. */
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";
}

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  vi.stubGlobal("window", { setTimeout, clearTimeout, setInterval, clearInterval });
  cameras = await import("../src/cards/auralis-cameras-card");
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("Auralis cameras card", () => {
  it("validates cameras and bounds options", () => {
    const card = new cameras.AuralisCamerasCard();
    card.setConfig({ ...config, columns: 9, refresh_interval: 1, layout: "mur" as never });
    expect(card.config).toMatchObject({ theme: "carbon", columns: 4, refresh_interval: 2, layout: "grid" });
    card.setConfig(config);
    expect(card.config).toMatchObject({ columns: undefined, refresh_interval: 10 });
    expect(() => card.setConfig({ type: "custom:auralis-cameras-card", cameras: [] })).toThrow();
    expect(() => card.setConfig({ type: "custom:auralis-cameras-card", cameras: [{ entity: "image.portail" }] })).toThrow();
    expect(() => card.setConfig({ type: "custom:auralis-cameras-card", cameras: [{ entity: "camera.a", motion_entity: "sensor.b" }] })).toThrow();
  });

  it("parses aspect ratios, snapshot urls, statuses and ages", () => {
    expect(cameras.parseAspectRatio("16:9")).toBeCloseTo(0.5625);
    expect(cameras.parseAspectRatio("4/3")).toBeCloseTo(0.75);
    expect(cameras.parseAspectRatio("9:16")).toBeCloseTo(1.7778, 3);
    expect(cameras.parseAspectRatio("n'importe quoi")).toBeCloseTo(0.5625);
    expect(cameras.parseAspectRatio(2)).toBe(0.5);
    expect(cameras.snapshotUrl("/api/camera_proxy/camera.a?token=x", 1234.9)).toBe("/api/camera_proxy/camera.a?token=x&t=1234");
    expect(cameras.snapshotUrl("/local/a.jpg", 5)).toBe("/local/a.jpg?t=5");
    expect(cameras.snapshotUrl("/api/camera_proxy/camera.a?token=x", 7, 480)).toBe("/api/camera_proxy/camera.a?token=x&width=480&t=7");
    expect(cameras.snapshotUrl("/local/a.jpg", 7, 480)).toBe("/local/a.jpg?t=7");
    expect(cameras.snapshotWidth(300, 2)).toBe(640);
    expect(cameras.snapshotWidth(320, 1)).toBe(320);
    expect(cameras.snapshotWidth(321, 1)).toBe(480);
    expect(cameras.snapshotWidth(4000, 3)).toBe(3840);
    expect(cameras.snapshotWidth(0, 2)).toBeUndefined();
    expect(cameras.snapshotWidth(undefined)).toBeUndefined();
    expect(cameras.snapshotUrl(undefined, 5)).toBeUndefined();
    expect(cameras.cameraStatus(state("camera.a", "streaming"))).toBe("Diffusion active");
    expect(cameras.cameraStatus(state("camera.a", "unavailable"))).toBe("Indisponible");
    expect(cameras.cameraStatus(undefined)).toBe("Indisponible");
    expect(cameras.ageLabel(1_000, 9_400)).toBe("il y a 8 s");
    expect(plain(cameras.ageLabel(0, 600_000))).toBe("il y a 10 min");
    expect(cameras.ageLabel(undefined, 0)).toBe("");
    expect([cameras.wrapIndex(0, -1, 3), cameras.wrapIndex(2, 1, 3), cameras.wrapIndex(1, 1, 0)]).toEqual([2, 0, 0]);
  });

  it("builds camera views with motion, availability and refreshed snapshots", () => {
    const card = new cameras.AuralisCamerasCard();
    const internals = card as unknown as Internals;
    card.setConfig(config);
    card.hass = {
      states: {
        "camera.portail": state("camera.portail", "idle", { friendly_name: "Caméra portail", entity_picture: "/api/camera_proxy/camera.portail?token=abc" }),
        "binary_sensor.portail_mouvement": state("binary_sensor.portail_mouvement", "on"),
        "camera.jardin": state("camera.jardin", "unavailable", { friendly_name: "Jardin", entity_picture: "/api/camera_proxy/camera.jardin?token=def" }),
      },
      callService: vi.fn(async () => undefined),
    } as HomeAssistant;
    // Avant la première image, rien n'est affiché ; la tuile montre ensuite la dernière image arrivée.
    expect(internals.view(config.cameras[0], 0)).toMatchObject({ label: "Portail", available: true, motion: true, url: undefined, error: false, stale: false });
    const image = new FakeImage();
    (internals as unknown as { loader: unknown }).loader = new cameras.SnapshotLoader(() => undefined, () => image);
    internals.loader.load("camera.portail", "/api/camera_proxy/camera.portail?token=abc&t=42", 42);
    image.onload!();
    expect(internals.view(config.cameras[0], 0)).toMatchObject({ url: "/api/camera_proxy/camera.portail?token=abc&t=42", error: false });
    expect(internals.view(config.cameras[1], 1)).toMatchObject({ label: "Jardin", available: false, motion: false, url: undefined });
    expect(internals.view(config.cameras[2], 2)).toMatchObject({ label: "camera.garage", available: false });
  });

  it("asks for the next image only after the previous one, and never faster than the interval", () => {
    expect(cameras.snapshotDue(undefined, 0, 10_000)).toBe(true);
    expect(cameras.snapshotDue({ error: false, loading: true, startedAt: 0 }, 9_000, 2_000)).toBe(false);
    // Chargement bloqué : abandonné après le délai de garde, puis relancé.
    expect(cameras.snapshotDue({ error: false, loading: true, startedAt: 0 }, 20_000, 2_000)).toBe(true);
    expect(cameras.snapshotDue({ error: false, loading: false, startedAt: 0 }, 9_999, 10_000)).toBe(false);
    expect(cameras.snapshotDue({ error: false, loading: false, startedAt: 0 }, 10_000, 10_000)).toBe(true);

    const images: FakeImage[] = [];
    const changes = vi.fn();
    let clock = 1_000;
    const loader = new cameras.SnapshotLoader(changes, () => {
      const image = new FakeImage();
      images.push(image);
      return image;
    }, () => clock);

    loader.load("camera.a", "/a?t=1", 0);
    expect(loader.slot("camera.a")).toMatchObject({ loading: true });
    expect(loader.slot("camera.a")?.url).toBeUndefined();
    expect(loader.due("camera.a", 5_000, 2_000)).toBe(false);
    images[0].onload!();
    expect(loader.slot("camera.a")).toMatchObject({ loading: false, url: "/a?t=1", loadedAt: 1_000, error: false });
    expect(changes).toHaveBeenCalledOnce();

    // Image suivante lente : l'ancienne reste affichée pendant le chargement (double tampon).
    clock = 3_000;
    loader.load("camera.a", "/a?t=2", 2_000);
    expect(loader.slot("camera.a")?.url).toBe("/a?t=1");
    images[1].onerror!();
    expect(loader.slot("camera.a")).toMatchObject({ url: "/a?t=1", error: true, loading: false });

    // Une image abandonnée qui arrive en retard est ignorée.
    loader.load("camera.a", "/a?t=3", 4_000);
    loader.abort("camera.a");
    expect(images[2].src).toBe("");
    images[2].onload?.();
    expect(loader.slot("camera.a")?.url).toBe("/a?t=1");
  });

  it("features the camera in motion unless one was chosen", () => {
    expect(cameras.featuredIndex([{ motion: false }, { motion: true }, { motion: true }])).toBe(1);
    expect(cameras.featuredIndex([{ motion: false }, { motion: false }])).toBe(0);
    expect(cameras.featuredIndex([{ motion: false }, { motion: true }], 0)).toBe(0);
    expect(cameras.featuredIndex([{ motion: false }, { motion: true }], 5)).toBe(1);
  });

  it("closes the dialog before opening another view and keeps the actions card confirm colours", async () => {
    const pushState = vi.fn();
    vi.stubGlobal("window", {
      setTimeout, clearTimeout, setInterval, clearInterval, pushState,
      history: { pushState, replaceState: vi.fn() }, dispatchEvent: vi.fn(),
    });
    const card = new cameras.AuralisCamerasCard();
    const internals = card as unknown as Internals;
    card.setConfig({ ...config, cameras: [{ entity: "camera.portail", actions: [
      { navigation_path: "/auralis/portail", name: "Vue portail" },
      { entity: "cover.portail", confirm: true },
      { entity: "siren.alarme", confirm: "Déclencher ?", danger: true },
    ] }] });
    card.hass = { states: { "camera.portail": state("camera.portail", "idle"), "cover.portail": state("cover.portail", "closed"), "siren.alarme": state("siren.alarme", "off") }, callService: vi.fn(async () => undefined) } as HomeAssistant;
    internals.selected = 0;
    internals.dialog = "camera";
    await internals.runAction(0, 0);
    expect(internals.dialog).toBeNull();
    expect(pushState).toHaveBeenCalledWith(null, "", "/auralis/portail");

    internals.pressAction(0, 1, card.config!.cameras[0].actions![1], "Portail");
    expect(internals.confirmState?.danger).toBe(false);
    internals.pressAction(0, 2, card.config!.cameras[0].actions![2], "Alarme");
    expect(internals.confirmState?.danger).toBe(true);
    vi.stubGlobal("window", { setTimeout, clearTimeout, setInterval, clearInterval });
  });

  it("navigates between cameras and runs dialog actions with confirmation", async () => {
    const callService = vi.fn(async () => undefined);
    const card = new cameras.AuralisCamerasCard();
    const internals = card as unknown as Internals;
    card.setConfig(config);
    card.hass = {
      states: {
        "camera.portail": state("camera.portail", "idle"),
        "light.projecteur": state("light.projecteur", "off"),
        "button.sirene": state("button.sirene", "unknown"),
      },
      callService,
    } as HomeAssistant;
    internals.selected = 0;
    internals.step(-1);
    expect(internals.selected).toBe(2);
    internals.step(1);
    expect(internals.selected).toBe(0);

    await internals.runAction(0, 0);
    expect(callService).toHaveBeenCalledWith("light", "toggle", {}, { entity_id: "light.projecteur" });
    expect(internals.actionStatus.get("0:0")).toBe("done");

    internals.pressAction(0, 1, config.cameras[0].actions![1], "Sirène");
    expect(callService).toHaveBeenCalledTimes(1);
    expect(internals.confirmState).not.toBeNull();
    await internals.confirmState!.action();
    expect(callService).toHaveBeenLastCalledWith("button", "press", {}, { entity_id: "button.sirene" });
  });
});
