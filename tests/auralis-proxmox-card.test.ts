import { beforeAll, describe, expect, it, vi } from "vitest";
import type { ProxmoxCardConfig } from "../src/types/config";
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

describe("AuralisProxmoxCard configuration and guarded actions", () => {
  it("requires the status entity, applies defaults and exposes the summary fields", () => {
    const card = new proxmoxCard.AuralisProxmoxCard();

    expect(() => card.setConfig(config({ status_entity: "" }))).toThrow("status_entity est obligatoire.");
    card.setConfig(config());

    const configured = card as unknown as { config: ProxmoxCardConfig };
    expect(configured.config.name).toBe("Cluster Proxmox");
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
