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
  tick: number;
  selected?: number;
  dialog: string | null;
  confirmState: { action(): Promise<void> | void } | null;
  actionStatus: Map<string, string>;
  view(camera: CamerasCardConfig["cameras"][number], index: number, tick: number): Record<string, unknown>;
  step(delta: number): void;
  pressAction(camera: number, action: number, item: unknown, label: string): void;
  runAction(camera: number, action: number): Promise<void>;
};

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
    expect(internals.view(config.cameras[0], 0, 42)).toMatchObject({
      label: "Portail", available: true, motion: true, url: "/api/camera_proxy/camera.portail?token=abc&t=42", error: false, stale: false,
    });
    expect(internals.view(config.cameras[1], 1, 42)).toMatchObject({ label: "Jardin", available: false, motion: false, url: undefined });
    expect(internals.view(config.cameras[2], 2, 42)).toMatchObject({ label: "camera.garage", available: false });
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
