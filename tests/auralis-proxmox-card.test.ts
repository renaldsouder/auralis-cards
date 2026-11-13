import { beforeAll, describe, expect, it, vi } from "vitest";
import type { ProxmoxCardConfig, ProxmoxStorage, ManagedProxmoxWorkload } from "../src/types/config";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";

type ProxmoxCardModule = typeof import("../src/cards/auralis-proxmox-card");

let proxmoxCard: ProxmoxCardModule;

const state = (entityId: string, value: string): HassEntity => ({
  entity_id: entityId,
  state: value,
  attributes: {},
});

const config = (overrides: Partial<ProxmoxCardConfig> = {}): ProxmoxCardConfig => ({
  type: "custom:auralis-proxmox-card",
  status_entity: "binary_sensor.proxmox_online",
  ...overrides,
});

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  proxmoxCard = await import("../src/cards/auralis-proxmox-card");
});

describe("Proxmox isolated popups and configurable storage", () => {
  const vm = { name: "Machine test", entity: "switch.vm" };
  const lxc = { name: "Conteneur test", entity: "switch.lxc" };
  const makeCard = (overrides: Partial<ProxmoxCardConfig> = {}) => {
    const card = new proxmoxCard.AuralisProxmoxCard();
    card.setConfig(config({ vms: [vm], containers: [lxc], ...overrides }));
    card.hass = {
      states: {
        "binary_sensor.proxmox_online": state("binary_sensor.proxmox_online", "on"),
        "switch.vm": state("switch.vm", "off"),
        "switch.lxc": state("switch.lxc", "off"),
      },
      callService: vi.fn(async () => undefined),
    };
    return card;
  };

  it("clears selections across popups and cannot start the other workload type", async () => {
    const card = makeCard();
    const internals = card as unknown as {
      openWorkloads(tab: "vm" | "container"): void;
      selected: Map<string, string>;
      workloadItems(): ManagedProxmoxWorkload[];
      startSelected(): Promise<void>;
    };
    internals.openWorkloads("vm");
    internals.selected.set(vm.entity, "stopped");
    internals.openWorkloads("container");
    expect(internals.selected.size).toBe(0);
    expect(internals.workloadItems()).toEqual([lxc]);
    // A stale selection from the other popup must not dispatch a command.
    internals.selected = new Map([[vm.entity, "stopped"], [lxc.entity, "stopped"]]);
    await internals.startSelected();
    expect(card.hass!.callService).toHaveBeenCalledTimes(1);
    expect(card.hass!.callService).toHaveBeenCalledWith("homeassistant", "turn_on", {}, { entity_id: lxc.entity });
  });

  it("rechecks running and unavailable states before a selected start command", async () => {
    const card = makeCard();
    const internals = card as unknown as {
      openWorkloads(tab: "vm"): void;
      selected: Map<string, string>;
      startSelected(): Promise<void>;
    };
    internals.openWorkloads("vm");
    for (const current of ["on", "paused", "unavailable"]) {
      internals.selected = new Map([[vm.entity, "stopped"]]);
      card.hass!.states[vm.entity] = state(vm.entity, current);
      await internals.startSelected();
    }
    expect(card.hass!.callService).not.toHaveBeenCalled();
  });

  it("does not send turn_on to a read-only status sensor", async () => {
    const item = { name: "Lecture seule", entity: "binary_sensor.read_only" };
    const card = makeCard({ vms: [item] });
    card.hass!.states[item.entity] = state(item.entity, "off");
    const internals = card as unknown as { runWorkloadAction(item: ManagedProxmoxWorkload, action: "start"): Promise<void> };
    await internals.runWorkloadAction(item, "start");
    expect(card.hass!.callService).not.toHaveBeenCalled();
  });

  it("keeps any number of named storages and preserves legacy fallback", () => {
    const storages = Array.from({ length: 32 }, (_, i) => ({ name: "Volume " + i, usage_entity: "sensor.volume_" + i }));
    const card = makeCard({ storages, storage_entity: "sensor.legacy" });
    const internals = card as unknown as { storageItems(): ProxmoxStorage[] };
    expect(internals.storageItems()).toEqual(storages);
    card.setConfig(config({ storage_entity: "sensor.legacy", storage_label_entity: "sensor.capacity" }));
    expect(internals.storageItems()).toEqual([{ name: "Stockage", usage_entity: "sensor.legacy", capacity_entity: "sensor.capacity" }]);
    card.setConfig(config({ storages: [], storage_entity: "sensor.legacy" }));
    expect(internals.storageItems()).toEqual([]);
  });
});

describe("Proxmox cluster nodes", () => {
  it("confirms a node restart only while that node is online", async () => {
    const callService = vi.fn(async () => undefined);
    const node = { name: "pve2", status_entity: "binary_sensor.pve2", restart_entity: "button.pve2_reboot" };
    const card = new proxmoxCard.AuralisProxmoxCard();
    card.setConfig(config({ nodes: [node] }));
    card.hass = {
      states: {
        "binary_sensor.proxmox_online": state("binary_sensor.proxmox_online", "on"),
        "binary_sensor.pve2": state("binary_sensor.pve2", "off"),
        "button.pve2_reboot": state("button.pve2_reboot", "unknown"),
      },
      callService,
    };
    const internals = card as unknown as {
      confirmNodeAction(node: unknown, action: "restart" | "shutdown"): void;
      confirmState: { title: string; action(): Promise<void> } | null;
    };
    internals.confirmNodeAction(node, "restart");
    expect(internals.confirmState).toBeNull();
    card.hass.states["binary_sensor.pve2"] = state("binary_sensor.pve2", "on");
    internals.confirmNodeAction(node, "restart");
    expect(internals.confirmState?.title).toBe("Redémarrer pve2 ?");
    await internals.confirmState?.action();
    expect(callService).toHaveBeenCalledWith("button", "press", {}, { entity_id: "button.pve2_reboot" });
  });
});

describe("AuralisProxmoxCard configuration and guarded actions", () => {
  it("requires the status entity, applies defaults and exposes the summary fields", () => {
    const card = new proxmoxCard.AuralisProxmoxCard();

    expect(() => card.setConfig(config({ status_entity: "" }))).toThrow("status_entity est obligatoire.");
    card.setConfig(config());

    const configured = card as unknown as { config: ProxmoxCardConfig };
    expect(configured.config.name).toBe("Proxmox");
    expect(configured.config.theme).toBe("auto");

    const form = proxmoxCard.AuralisProxmoxCard.getConfigForm() as {
      schema: Array<{ name: string }>;
    };
    const fields = form.schema.map(({ name }) => name);
    expect(fields).toEqual(expect.arrayContaining([
      "memory_label_entity",
      "storage_label_entity",
      "ceph_entity",
      "backup_entity",
      "alerts_entity",
      "image_opacity",
      "card_background",
      "show_grid",
    ]));
  });

  it("does not prepare a cluster confirmation while its action entity is unavailable", () => {
    const card = new proxmoxCard.AuralisProxmoxCard();
    card.setConfig(config({ shutdown_entity: "button.cluster_shutdown" }));
    card.hass = {
      states: {
        "binary_sensor.proxmox_online": state("binary_sensor.proxmox_online", "on"),
        "button.cluster_shutdown": state("button.cluster_shutdown", "unavailable"),
      },
      callService: vi.fn(async () => undefined),
    };

    const internals = card as unknown as {
      confirmClusterAction(action: "restart" | "shutdown"): void;
      confirmState: unknown;
    };
    internals.confirmClusterAction("shutdown");

    expect(internals.confirmState).toBeNull();
  });

  it("keeps cluster shutdown behind confirmation before calling Home Assistant", async () => {
    const callService = vi.fn(async () => undefined);
    const card = new proxmoxCard.AuralisProxmoxCard();
    card.setConfig(config({ shutdown_entity: "button.cluster_shutdown" }));
    card.hass = {
      states: {
        "binary_sensor.proxmox_online": state("binary_sensor.proxmox_online", "on"),
        "button.cluster_shutdown": state("button.cluster_shutdown", "2026-10-05T08:30:00+02:00"),
      },
      callService,
    };

    const internals = card as unknown as {
      confirmClusterAction(action: "restart" | "shutdown"): void;
      confirmState: { action(): Promise<void> } | null;
    };
    internals.confirmClusterAction("shutdown");

    expect(callService).not.toHaveBeenCalled();
    expect(internals.confirmState).not.toBeNull();
    await internals.confirmState?.action();
    expect(callService).toHaveBeenCalledWith(
      "button",
      "press",
      {},
      { entity_id: "button.cluster_shutdown" },
    );
  });
});

describe("Proxmox workload commands", () => {
  const running = (entityId: string) => state(entityId, "running");
  const vm: ManagedProxmoxWorkload = {
    name: "Home Assistant",
    entity: "sensor.hass_statut",
    start_entity: "button.hass_start",
    stop_entity: "button.hass_stop",
    restart_entity: "button.hass_restart",
    pause_entity: "button.hass_pause",
    resume_entity: "button.hass_resume",
  };
  const makeCard = (item: ManagedProxmoxWorkload, itemState: string) => {
    const callService = vi.fn(async () => undefined);
    const card = new proxmoxCard.AuralisProxmoxCard();
    card.setConfig(config({ vms: [item] }));
    const states: Record<string, HassEntity> = {
      "binary_sensor.proxmox_online": state("binary_sensor.proxmox_online", "on"),
      [item.entity]: itemState === "running" ? running(item.entity) : state(item.entity, itemState),
    };
    for (const id of [item.start_entity, item.stop_entity, item.restart_entity, item.pause_entity, item.resume_entity]) {
      if (id) states[id] = state(id, "2026-11-01T08:30:00+01:00");
    }
    card.hass = { states, callService };
    return { card, callService };
  };
  type Internals = {
    runWorkloadAction(item: ManagedProxmoxWorkload, action: "stop" | "restart" | "pause" | "resume"): Promise<void>;
    confirmWorkloadAction(item: ManagedProxmoxWorkload, action: "stop" | "restart"): void;
    confirmState: { title: string; action(): Promise<void> } | null;
    dialog: string | null;
  };

  it("keeps stop and restart behind a confirmation, then presses the configured button", async () => {
    const { card, callService } = makeCard(vm, "running");
    const internals = card as unknown as Internals;
    internals.confirmWorkloadAction(vm, "stop");
    expect(callService).not.toHaveBeenCalled();
    expect(internals.confirmState?.title).toBe("Éteindre Home Assistant ?");
    expect(internals.dialog).toBe("workloads");
    await internals.confirmState?.action();
    expect(callService).toHaveBeenCalledWith("button", "press", {}, { entity_id: "button.hass_stop" });
  });

  it("pauses and resumes with their own buttons", async () => {
    const { card, callService } = makeCard(vm, "running");
    const internals = card as unknown as Internals;
    await internals.runWorkloadAction(vm, "pause");
    await internals.runWorkloadAction(vm, "resume");
    expect(callService).toHaveBeenNthCalledWith(1, "button", "press", {}, { entity_id: "button.hass_pause" });
    expect(callService).toHaveBeenNthCalledWith(2, "button", "press", {}, { entity_id: "button.hass_resume" });
  });

  it("turns off a switch workload without stop_entity instead of toggling it on", async () => {
    const lxc = { name: "Mosquitto", entity: "switch.lxc_mosquitto" };
    const { card, callService } = makeCard(lxc, "on");
    await (card as unknown as Internals).runWorkloadAction(lxc, "stop");
    expect(callService).toHaveBeenCalledWith("homeassistant", "turn_off", {}, { entity_id: "switch.lxc_mosquitto" });
  });

  it("counts and filters an unavailable workload apart from stopped ones", () => {
    const { card } = makeCard(vm, "unavailable");
    const internals = card as unknown as {
      openWorkloads(tab: "vm"): void;
      workloadFilter: string;
      workloadItems(): ManagedProxmoxWorkload[];
    };
    internals.openWorkloads("vm");
    internals.workloadFilter = "stopped";
    expect(internals.workloadItems()).toEqual([]);
    internals.workloadFilter = "unavailable";
    expect(internals.workloadItems()).toEqual([vm]);
  });

  it("accepts never-pressed buttons (state unknown) as commands", async () => {
    const { card, callService } = makeCard(vm, "running");
    card.hass!.states["button.hass_pause"] = state("button.hass_pause", "unknown");
    await (card as unknown as Internals).runWorkloadAction(vm, "pause");
    expect(callService).toHaveBeenCalledWith("button", "press", {}, { entity_id: "button.hass_pause" });
  });

  it("sends nothing when the workload itself is unavailable", async () => {
    const { card, callService } = makeCard(vm, "unavailable");
    await (card as unknown as Internals).runWorkloadAction(vm, "stop");
    expect(callService).not.toHaveBeenCalled();
  });
});
