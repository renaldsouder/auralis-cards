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
  it("distinguishes active, stopped, paused and unavailable workloads", () => {
    expect(unraidCard.unraidWorkloadState(state("switch.service", "on"))).toBe("active");
    expect(unraidCard.unraidWorkloadState(state("switch.service", "off"))).toBe("stopped");
    expect(unraidCard.unraidWorkloadState(state("sensor.vm", "paused"))).toBe("paused");
    expect(unraidCard.unraidWorkloadState(state("switch.service", "unknown"))).toBe("unavailable");
    expect(unraidCard.unraidWorkloadState(state("switch.service", "unavailable"))).toBe("unavailable");
    expect(unraidCard.unraidWorkloadState()).toBe("unavailable");
  });

  it("keeps absent percentages unavailable instead of converting them to zero", () => {
    expect(unraidCard.unraidPercentage()).toBeUndefined();
    expect(unraidCard.unraidPercentage(state("sensor.usage", "unknown"))).toBeUndefined();
    expect(unraidCard.unraidPercentage(state("sensor.usage", "invalid"))).toBeUndefined();
    expect(unraidCard.unraidPercentage(state("sensor.usage", "42,5"))).toBe(42.5);
    expect(unraidCard.unraidPercentage(state("sensor.usage", "120"))).toBe(100);
  });

  it("supports inverted health binary sensors used by the UNRAID integration", () => {
    expect(unraidCard.unraidStateIsHealthy(state("binary_sensor.disk", "on"))).toBe(true);
    expect(unraidCard.unraidStateIsHealthy(state("binary_sensor.disk", "off"), "off")).toBe(true);
    expect(unraidCard.unraidStateIsHealthy(state("binary_sensor.disk", "on"), "off")).toBe(false);
    expect(unraidCard.unraidStateIsHealthy(state("binary_sensor.disk", "unknown"), "off")).toBe(false);
  });

  it("uses dedicated commands first and only falls back to a switch entity", () => {
    const configured: ManagedService = {
      name: "Plex",
      entity: "switch.plex",
      start_entity: "button.plex_start",
      stop_entity: "button.plex_stop",
      restart_entity: "button.plex_restart",
    };
    expect(unraidCard.unraidActionEntity(configured, "start")).toBe("button.plex_start");
    expect(unraidCard.unraidActionEntity(configured, "stop")).toBe("button.plex_stop");
    expect(unraidCard.unraidActionEntity(configured, "restart")).toBe("button.plex_restart");

    const vm: ManagedVm = {
      name: "HomeLab",
      entity: "switch.homelab",
      pause_entity: "button.homelab_pause",
      resume_entity: "button.homelab_resume",
    };
    expect(unraidCard.unraidActionEntity(vm, "pause")).toBe("button.homelab_pause");
    expect(unraidCard.unraidActionEntity(vm, "resume")).toBe("button.homelab_resume");

    const switchOnly: ManagedService = { name: "Grafana", entity: "switch.grafana" };
    expect(unraidCard.unraidActionEntity(switchOnly, "start")).toBe("switch.grafana");
    expect(unraidCard.unraidActionEntity(switchOnly, "stop")).toBe("switch.grafana");
    expect(unraidCard.unraidActionEntity({ name: "Lecture", entity: "sensor.read_only" }, "start")).toBeUndefined();
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
      "card_background",
      "show_grid",
    ]));
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
