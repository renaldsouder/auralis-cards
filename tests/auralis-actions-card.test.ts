import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";
import type { ActionsCardConfig } from "../src/cards/auralis-actions-card";

let actions: typeof import("../src/cards/auralis-actions-card");
const state = (id: string, value: string, attributes: Record<string, unknown> = {}): HassEntity =>
  ({ entity_id: id, state: value, attributes });
const NOW = Date.parse("2026-11-12T15:00:00Z");
const ago = (seconds: number): string => new Date(NOW - seconds * 1000).toISOString();
// Intl insère des espaces insécables : on les compare comme des espaces simples.
const plain = (text: string): string => text.replace(/\s/g, " ");

type Internals = {
  status: Map<number, string>;
  dialog: string | null;
  confirming?: number;
  press(index: number): void;
  run(index: number): Promise<void>;
  confirm(): Promise<void>;
};

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  vi.stubGlobal("window", { setTimeout, clearTimeout, setInterval, clearInterval });
  actions = await import("../src/cards/auralis-actions-card");
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("Auralis actions card", () => {
  it("validates actions and normalises options", () => {
    const card = new actions.AuralisActionsCard();
    card.setConfig({ type: "custom:auralis-actions-card", columns: 9, layout: "grille" as never, actions: [
      { entity: "script.reveil", color: "red;background:url(x)" },
      { service: "notify.mobile_app", data: { message: "Coucou" } },
      { navigation_path: "/dashboard-auralis/cameras", name: "Caméras" },
    ] });
    expect(card.config).toMatchObject({ theme: "carbon", layout: "tiles", columns: 6 });
    expect(card.config?.actions[0].color).toBeUndefined();
    const invalid: ActionsCardConfig["actions"][] = [
      [],
      [{ name: "Rien à faire" }],
      [{ entity: "Script Réveil" }],
      [{ service: "notify" }],
      [{ navigation_path: "cameras" }],
      [{ entity: "script.a", data: ["x"] as never }],
    ];
    for (const list of invalid) {
      expect(() => card.setConfig({ type: "custom:auralis-actions-card", actions: list })).toThrow();
    }
  });

  it("resolves the default action of each domain", () => {
    const service = (entity: string, current?: HassEntity) => {
      const action = actions.resolveAction({ entity }, current);
      return action?.kind === "service" ? `${action.domain}.${action.service}` : action?.kind;
    };
    expect(service("button.reboot_freebox")).toBe("button.press");
    expect(service("input_button.sonnette")).toBe("input_button.press");
    expect(service("script.wake_skynet")).toBe("script.turn_on");
    expect(service("scene.salon_cinema")).toBe("scene.turn_on");
    expect(service("automation.volets_soir")).toBe("automation.trigger");
    expect(service("switch.prise")).toBe("switch.toggle");
    expect(service("cover.garage")).toBe("cover.toggle");
    expect(service("lock.porte", state("lock.porte", "locked"))).toBe("lock.unlock");
    expect(service("lock.porte", state("lock.porte", "unlocked"))).toBe("lock.lock");
    expect(service("sensor.temperature")).toBe("more-info");
    expect(actions.resolveAction({ entity: "script.a", service: "script.turn_on", data: { variables: { pc: "skynet" } } })).toEqual({
      kind: "service", domain: "script", service: "turn_on", data: { variables: { pc: "skynet" } }, target: { entity_id: "script.a" },
    });
    expect(actions.resolveAction({ service: "notify.mobile", target: { device_id: "abc" } })).toMatchObject({ target: { device_id: "abc" } });
    expect(actions.resolveAction({ navigation_path: "/vue" })).toEqual({ kind: "navigate", path: "/vue" });
  });

  it("describes elapsed time in short French", () => {
    expect(plain(actions.relativeTime(NOW - 10_000, NOW))).toBe("à l’instant");
    expect(plain(actions.relativeTime(NOW - 5 * 60_000, NOW))).toBe("il y a 5 min");
    expect(plain(actions.relativeTime(NOW - 3 * 3_600_000, NOW))).toBe("il y a 3 h");
    expect(plain(actions.relativeTime(NOW - 86_400_000, NOW))).toBe("hier");
  });

  it("captions tiles from the entity state", () => {
    const caption = (id: string, value: string, attributes: Record<string, unknown> = {}) => plain(actions.stateCaption(state(id, value, attributes), NOW));
    expect(caption("button.reboot_freebox", "unknown")).toBe("Jamais utilisé");
    expect(caption("button.reboot_freebox", ago(300))).toBe("Utilisé il y a 5 min");
    expect(caption("button.reboot_freebox", "unavailable")).toBe("Indisponible");
    expect(caption("scene.cinema", ago(86_400))).toBe("Activée hier");
    expect(caption("script.wake_skynet", "on")).toBe("En cours");
    expect(caption("script.wake_skynet", "off", { last_triggered: ago(7_200) })).toBe("Lancé il y a 2 h");
    expect(caption("script.wake_skynet", "off")).toBe("Prêt");
    expect(caption("automation.volets", "off")).toBe("Désactivée");
    expect(caption("switch.prise", "on")).toBe("Allumé");
    expect(caption("switch.prise", "unavailable")).toBe("Indisponible");
    expect(caption("lock.porte", "locked")).toBe("Verrouillé");
    expect(actions.isOn(state("binary_sensor.skynet", "on"))).toBe(true);
    expect(actions.isOn(state("lock.porte", "locked"))).toBe(false);
    expect(actions.isOn(state("automation.volets", "on"))).toBe(false);
    expect(actions.isOn(state("script.wake_skynet", "on"))).toBe(true);
  });

  it("asks for confirmation, then calls the service and reports the result", async () => {
    const callService = vi.fn(async () => undefined);
    const card = new actions.AuralisActionsCard();
    const internals = card as unknown as Internals;
    card.setConfig({ type: "custom:auralis-actions-card", actions: [
      { entity: "button.reboot_freebox", confirm: "Redémarrer la Freebox ?", danger: true },
      { entity: "script.wake_skynet" },
    ] });
    card.hass = {
      states: {
        "button.reboot_freebox": state("button.reboot_freebox", "unknown"),
        "script.wake_skynet": state("script.wake_skynet", "off"),
      },
      callService,
    } as HomeAssistant;

    internals.press(0);
    expect(callService).not.toHaveBeenCalled();
    expect(internals.dialog).toBe("confirm");
    expect(internals.confirming).toBe(0);
    await internals.confirm();
    expect(internals.dialog).toBeNull();
    expect(callService).toHaveBeenCalledWith("button", "press", {}, { entity_id: "button.reboot_freebox" });
    expect(internals.status.get(0)).toBe("done");

    callService.mockRejectedValueOnce(new Error("refusé"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await internals.run(1);
    expect(callService).toHaveBeenLastCalledWith("script", "turn_on", {}, { entity_id: "script.wake_skynet" });
    expect(internals.status.get(1)).toBe("error");
    warn.mockRestore();
  });
});
