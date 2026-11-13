import { beforeAll, describe, expect, it, vi } from "vitest";
import type { ManagedService, ManagedVm, UnraidCardConfig } from "../src/types/config";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";

type UnraidCardModule = typeof import("../src/cards/auralis-unraid-card");

let unraidCard: UnraidCardModule;

const state = (entityId: string, value: string): HassEntity => ({
  entity_id: entityId,
  state: value,
  attributes: {},
});

const config = (overrides: Partial<UnraidCardConfig> = {}): UnraidCardConfig => ({
  type: "custom:auralis-unraid-card",
  status_entity: "binary_sensor.unraid_online",
  ...overrides,
});

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  unraidCard = await import("../src/cards/auralis-unraid-card");
});

describe("UNRAID card helpers", () => {
  it("supports inverted health binary sensors used by the UNRAID integration", () => {
    expect(unraidCard.unraidStateIsHealthy(state("binary_sensor.disk", "on"))).toBe(true);
    expect(unraidCard.unraidStateIsHealthy(state("binary_sensor.disk", "off"), "off")).toBe(true);
    expect(unraidCard.unraidStateIsHealthy(state("binary_sensor.disk", "on"), "off")).toBe(false);
    expect(unraidCard.unraidStateIsHealthy(state("binary_sensor.disk", "unknown"), "off")).toBe(false);
  });

  it("allows Docker and VM group labels to be renamed independently", () => {
    expect(unraidCard.unraidGroupLabel("media", { media: "Multimédia" }, "Services")).toBe("Multimédia");
    expect(unraidCard.unraidGroupLabel(undefined, { default: "Applications" }, "Services")).toBe("Applications");
    expect(unraidCard.unraidGroupLabel("production", undefined, "Machines virtuelles")).toBe("production");
  });
});

describe("AuralisUnraidCard configuration and commands", () => {
  it("requires the status entity and exposes the new health fields", () => {
    const card = new unraidCard.AuralisUnraidCard();
    expect(() => card.setConfig(config({ status_entity: "" }))).toThrow("status_entity est obligatoire.");
    card.setConfig(config());

    const form = unraidCard.AuralisUnraidCard.getConfigForm() as {
      schema: Array<{ name: string }>;
    };
    const fields = form.schema.map(({ name }) => name);
    expect(fields).toEqual(expect.arrayContaining([
      "parity_age_entity",
      "parity_errors_entity",
      "disk_temperature_entity",
      "network_down_entity",
      "network_up_entity",
      "array_state_entity",
      "version_entity",
      "docker_cpu_entity",
      "docker_memory_entity",
      "updates_entity",
      "notifications_entity",
      "ups_status_entity",
      "server_url_entity",
      "docker_group_labels",
      "vm_group_labels",
      "card_background",
      "show_grid",
    ]));
  });

  it("keeps Docker and VM popups isolated", () => {
    const docker: ManagedService = { name: "Plex", entity: "switch.plex" };
    const vm: ManagedVm = { name: "HomeLab", entity: "switch.homelab" };
    const card = new unraidCard.AuralisUnraidCard();
    card.setConfig(config({ docker: [docker], vms: [vm] }));
    card.hass = {
      states: {
        "binary_sensor.unraid_online": state("binary_sensor.unraid_online", "on"),
        "switch.plex": state("switch.plex", "on"),
        "switch.homelab": state("switch.homelab", "off"),
      },
      callService: vi.fn(async () => undefined),
    };

    const internals = card as unknown as {
      openServices(tab: "docker" | "vm"): void;
      serviceItems(): Array<ManagedService | ManagedVm>;
      dialog: string | null;
    };
    internals.openServices("docker");
    expect(internals.dialog).toBe("services");
    expect(internals.serviceItems()).toEqual([docker]);

    internals.openServices("vm");
    expect(internals.serviceItems()).toEqual([vm]);
  });

  it("uses explicit disk selections for the main-card summary and preserves labels", () => {
    const card = new unraidCard.AuralisUnraidCard();
    card.setConfig(config({
      disks: [
        { name: "Array principal", usage_entity: "sensor.array", show_on_card: true },
        { name: "Cache NVMe", usage_entity: "sensor.cache", show_on_card: false },
      ],
    }));
    const internals = card as unknown as { featuredDisks(): Array<{ name: string }> };
    expect(internals.featuredDisks()).toEqual([
      expect.objectContaining({ name: "Array principal" }),
    ]);
  });

  it("starts and stops a switch-backed Docker container", async () => {
    const callService = vi.fn(async () => undefined);
    const item: ManagedService = { name: "Plex", entity: "switch.plex" };
    const card = new unraidCard.AuralisUnraidCard();
    card.setConfig(config({ docker: [item] }));
    card.hass = {
      states: {
        "binary_sensor.unraid_online": state("binary_sensor.unraid_online", "on"),
        "switch.plex": state("switch.plex", "on"),
      },
      callService,
    };

    const internals = card as unknown as {
      runItemAction(item: ManagedService, action: "start" | "stop"): Promise<void>;
    };
    await internals.runItemAction(item, "stop");
    expect(callService).toHaveBeenLastCalledWith(
      "homeassistant",
      "turn_off",
      {},
      { entity_id: "switch.plex" },
    );

    card.hass.states["switch.plex"] = state("switch.plex", "off");
    await internals.runItemAction(item, "start");
    expect(callService).toHaveBeenLastCalledWith(
      "homeassistant",
      "turn_on",
      {},
      { entity_id: "switch.plex" },
    );
  });

  it("keeps container stop behind confirmation and blocks unavailable commands", async () => {
    const callService = vi.fn(async () => undefined);
    const item: ManagedService = { name: "Plex", entity: "switch.plex" };
    const card = new unraidCard.AuralisUnraidCard();
    card.setConfig(config({ docker: [item] }));
    card.hass = {
      states: {
        "binary_sensor.unraid_online": state("binary_sensor.unraid_online", "on"),
        "switch.plex": state("switch.plex", "on"),
      },
      callService,
    };

    const internals = card as unknown as {
      confirmItemAction(item: ManagedService, action: "stop"): void;
      confirmState: { action(): Promise<void> } | null;
    };
    internals.confirmItemAction(item, "stop");
    expect(callService).not.toHaveBeenCalled();
    expect(internals.confirmState).not.toBeNull();
    await internals.confirmState?.action();
    expect(callService).toHaveBeenCalledWith(
      "homeassistant",
      "turn_off",
      {},
      { entity_id: "switch.plex" },
    );

    internals.confirmState = null;
    card.hass.states["switch.plex"] = state("switch.plex", "unavailable");
    internals.confirmItemAction(item, "stop");
    expect(internals.confirmState).toBeNull();
  });
});

describe("Wake button for a stopped server", () => {
  it("shows the wake button only when offline and starts the configured script once", async () => {
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    const { nothing } = await import("lit");
    const callService = vi.fn(async () => undefined);
    const card = new unraidCard.AuralisUnraidCard();
    card.setConfig(config({ wake_entity: "script.wake_skynet" }));
    card.hass = { states: { "script.wake_skynet": state("script.wake_skynet", "off") }, callService } as HomeAssistant;
    const internals = card as unknown as {
      wakeRequestedAt?: number;
      renderWakeButton(online: boolean, entityId: string | undefined, label: string): unknown;
      requestWake(entityId?: string): Promise<void>;
    };
    expect(internals.renderWakeButton(true, "script.wake_skynet", "Réveiller")).toBe(nothing);
    expect(internals.renderWakeButton(false, undefined, "Réveiller")).toBe(nothing);
    expect(internals.renderWakeButton(false, "script.wake_skynet", "Réveiller")).not.toBe(nothing);
    await internals.requestWake("script.wake_skynet");
    expect(callService).toHaveBeenCalledWith("script", "turn_on", {}, { entity_id: "script.wake_skynet" });
    expect(internals.wakeRequestedAt).toBeTypeOf("number");
    vi.unstubAllGlobals();
    vi.stubGlobal("HTMLElement", class {});
  });
});

describe("UNRAID selection, bulk commands and server actions", () => {
  const plex: ManagedService = { name: "Plex", entity: "switch.plex" };
  const grafana: ManagedService = { name: "Grafana", entity: "switch.grafana" };
  type Internals = {
    openServices(tab: "docker" | "vm"): void;
    selected: Map<string, string>;
    toggleSelected(entityId: string, state: string): void;
    willUpdate(changed: Map<string, unknown>): void;
    startSelected(): Promise<void>;
    stopSelected(): void;
    confirmServerAction(action: "restart" | "shutdown"): void;
    confirmState: { title: string; action(): Promise<void> } | null;
    feedback?: { tone: string; message: string };
  };
  const makeCard = (states: Record<string, string>, callService: HomeAssistant["callService"] = vi.fn(async () => undefined)) => {
    const card = new unraidCard.AuralisUnraidCard();
    card.setConfig(config({ docker: [plex, grafana], restart_entity: "button.unraid_reboot" }));
    card.hass = {
      states: Object.fromEntries(Object.entries(states).map(([id, value]) => [id, state(id, value)])),
      callService,
    };
    return { card, internals: card as unknown as Internals, callService };
  };

  it("drops a selected container from the selection once it starts", () => {
    const { card, internals } = makeCard({ "binary_sensor.unraid_online": "on", "switch.plex": "off", "switch.grafana": "off" });
    internals.openServices("docker");
    internals.toggleSelected(plex.entity, "stopped");
    internals.toggleSelected(grafana.entity, "stopped");
    card.hass!.states[plex.entity] = state(plex.entity, "on");
    internals.willUpdate(new Map([["hass", undefined]]));
    expect([...internals.selected.keys()]).toEqual([grafana.entity]);
  });

  it("starts every selected container, keeps failures selected and reports them", async () => {
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const callService = vi.fn(async (_domain: string, _service: string, _data?: unknown, target?: Record<string, unknown>) => {
      if (target?.entity_id === grafana.entity) throw new Error("timeout");
    });
    const { internals } = makeCard({ "binary_sensor.unraid_online": "on", "switch.plex": "off", "switch.grafana": "off" }, callService);
    internals.openServices("docker");
    internals.toggleSelected(plex.entity, "stopped");
    internals.toggleSelected(grafana.entity, "stopped");
    await internals.startSelected();
    expect(callService).toHaveBeenCalledTimes(2);
    expect([...internals.selected.keys()]).toEqual([grafana.entity]);
    expect(internals.feedback?.tone).toBe("error");
    expect(internals.feedback?.message).toContain("1 sur 2");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.stubGlobal("HTMLElement", class {});
  });

  it("stops running containers in bulk only after confirmation", async () => {
    const { internals, callService } = makeCard({ "binary_sensor.unraid_online": "on", "switch.plex": "on", "switch.grafana": "off" });
    internals.openServices("docker");
    internals.toggleSelected(plex.entity, "active");
    internals.toggleSelected(grafana.entity, "stopped");
    internals.stopSelected();
    expect(callService).not.toHaveBeenCalled();
    expect(internals.confirmState?.title).toBe("Arrêter 1 élément ?");
    await internals.confirmState?.action();
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith("homeassistant", "turn_off", {}, { entity_id: plex.entity });
  });

  it("only offers a server restart while the server is online, with a never-pressed button", () => {
    const { card, internals } = makeCard({ "binary_sensor.unraid_online": "off", "button.unraid_reboot": "unknown" });
    internals.confirmServerAction("restart");
    expect(internals.confirmState).toBeNull();
    card.hass!.states["binary_sensor.unraid_online"] = state("binary_sensor.unraid_online", "on");
    internals.confirmServerAction("restart");
    expect(internals.confirmState?.title).toBe("Redémarrer le serveur ?");
  });

  it("reads healthy and total disk counters", () => {
    expect(unraidCard.unraidDiskHealth(state("sensor.healthy", "5"), state("sensor.total", "6"))).toEqual({ healthy: 5, total: 6 });
    expect(unraidCard.unraidDiskHealth(state("sensor.healthy", "unavailable"))).toEqual({ healthy: undefined, total: undefined });
  });

  it("labels the visual editor in French", () => {
    const form = unraidCard.AuralisUnraidCard.getConfigForm() as { computeLabel(schema: { name: string }): string };
    expect(form.computeLabel({ name: "healthy_disks_entity" })).toBe("Nombre de disques sains");
    expect(form.computeLabel({ name: "background_image" })).toBe("Image de fond");
  });
});
