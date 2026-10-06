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

describe("Proxmox card helpers", () => {
  it("distinguishes online, offline and unavailable cluster states", () => {
    expect(proxmoxCard.proxmoxAvailability(state("binary_sensor.cluster", "on"))).toBe("online");
    expect(proxmoxCard.proxmoxAvailability(state("binary_sensor.cluster", "off"))).toBe("offline");
    expect(proxmoxCard.proxmoxAvailability(state("binary_sensor.cluster", "unknown"))).toBe("unavailable");
    expect(proxmoxCard.proxmoxAvailability(state("binary_sensor.cluster", "unavailable"))).toBe("unavailable");
    expect(proxmoxCard.proxmoxAvailability()).toBe("unavailable");
  });

  it("keeps absent metrics unavailable instead of converting them to zero", () => {
    expect(proxmoxCard.proxmoxPercentage()).toBeUndefined();
    expect(proxmoxCard.proxmoxPercentage(state("sensor.cluster", "unknown"))).toBeUndefined();
    expect(proxmoxCard.proxmoxPercentage(state("sensor.cluster", "invalid"))).toBeUndefined();
    expect(proxmoxCard.proxmoxPercentage(state("sensor.cluster", "42,5"))).toBe(42.5);
    expect(proxmoxCard.proxmoxPercentage(state("sensor.cluster", "120"))).toBe(100);
    expect(proxmoxCard.proxmoxPercentage({ ...state("sensor.ram", "11.4"), attributes: { unit_of_measurement: "GiB" } })).toBeUndefined();
  });

  it("requires an available Home Assistant entity before enabling an action", () => {
    const hass: HomeAssistant = {
      states: {
        "button.available": state("button.available", "2026-10-05T08:30:00+02:00"),
        "button.unavailable": state("button.unavailable", "unavailable"),
      },
      callService: vi.fn(async () => undefined),
    };

    expect(proxmoxCard.proxmoxActionAvailable(hass, "button.available")).toBe(true);
    expect(proxmoxCard.proxmoxActionAvailable(hass, "button.unavailable")).toBe(false);
    expect(proxmoxCard.proxmoxActionAvailable(hass, "button.missing")).toBe(false);
    expect(proxmoxCard.proxmoxActionAvailable(hass)).toBe(false);
  });
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
      selected: Set<string>;
      workloadItems(): ManagedProxmoxWorkload[];
      startSelected(): Promise<void>;
    };
    internals.openWorkloads("vm");
    internals.selected.add(vm.entity);
    internals.openWorkloads("container");
    expect(internals.selected.size).toBe(0);
    expect(internals.workloadItems()).toEqual([lxc]);
    // A stale selection from the other popup must not dispatch a command.
    internals.selected = new Set([vm.entity, lxc.entity]);
    await internals.startSelected();
    expect(card.hass!.callService).toHaveBeenCalledTimes(1);
    expect(card.hass!.callService).toHaveBeenCalledWith("homeassistant", "turn_on", {}, { entity_id: lxc.entity });
  });

  it("rechecks running and unavailable states before a selected start command", async () => {
    const card = makeCard();
    const internals = card as unknown as {
      openWorkloads(tab: "vm"): void;
      selected: Set<string>;
      startSelected(): Promise<void>;
    };
    internals.openWorkloads("vm");
    for (const current of ["on", "paused", "unavailable"]) {
      internals.selected = new Set([vm.entity]);
      card.hass!.states[vm.entity] = state(vm.entity, current);
      await internals.startSelected();
    }
    expect(card.hass!.callService).not.toHaveBeenCalled();
  });

  it("does not send turn_on to a read-only status sensor", async () => {
    const item = { name: "Lecture seule", entity: "binary_sensor.read_only" };
    const card = makeCard({ vms: [item] });
    card.hass!.states[item.entity] = state(item.entity, "off");
    const internals = card as unknown as { startItem(item: ManagedProxmoxWorkload): Promise<void> };
    await internals.startItem(item);
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
