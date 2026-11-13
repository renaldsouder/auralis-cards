import { describe, expect, it, vi } from "vitest";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";
import {
  bulkAction,
  bulkStopConfirmation,
  commandAvailable,
  filterWorkloads,
  formLabels,
  groupWorkloads,
  hostConfirmation,
  machineAvailability,
  machinePercentage,
  machineStatusDot,
  machineStatusLabel,
  percentageLabel,
  pruneSelection,
  sendWorkloadCommand,
  workloadActionEntity,
  workloadConfirmation,
  workloadCounts,
  workloadSelectable,
  workloadState,
  worstSeverity,
  type WorkloadItem,
  type WorkloadState,
} from "../src/utils/machines";

const state = (entityId: string, value: string, attributes: HassEntity["attributes"] = {}): HassEntity => ({
  entity_id: entityId,
  state: value,
  attributes,
});

const hass = (states: Record<string, HassEntity>): HomeAssistant => ({
  states,
  callService: vi.fn(async () => undefined),
});

describe("machine availability and status line", () => {
  it("distinguishes online, offline and unavailable states", () => {
    expect(machineAvailability(state("binary_sensor.nas", "on"))).toBe("online");
    expect(machineAvailability(state("binary_sensor.nas", "off"))).toBe("offline");
    expect(machineAvailability(state("binary_sensor.nas", "unknown"))).toBe("unavailable");
    expect(machineAvailability(state("binary_sensor.nas", "unavailable"))).toBe("unavailable");
    expect(machineAvailability()).toBe("unavailable");
  });

  it("treats a publishing sensor as online only when asked to", () => {
    expect(machineAvailability(state("sensor.pc_cpu", "6"))).toBe("offline");
    expect(machineAvailability(state("sensor.pc_cpu", "6"), true)).toBe("online");
    expect(machineAvailability(state("sensor.pc_state", "offline"), true)).toBe("offline");
  });

  it("uses one wording and one colour per state", () => {
    expect(machineStatusLabel("online")).toBe("En ligne");
    expect(machineStatusLabel("offline", "UNRAID")).toBe("Hors ligne · UNRAID");
    expect(machineStatusLabel("unavailable")).toBe("Indisponible");
    expect(machineStatusDot("online")).toBe("healthy");
    expect(machineStatusDot("offline")).toBe("danger");
    expect(machineStatusDot("unavailable")).toBe("");
  });
});

describe("machine percentages", () => {
  it("keeps absent percentages unavailable instead of converting them to zero", () => {
    expect(machinePercentage()).toBeUndefined();
    expect(machinePercentage(state("sensor.usage", "unknown"))).toBeUndefined();
    expect(machinePercentage(state("sensor.usage", "invalid"))).toBeUndefined();
    expect(machinePercentage(state("sensor.usage", "42,5"))).toBe(42.5);
    expect(machinePercentage(state("sensor.usage", "120"))).toBe(100);
    expect(machinePercentage(state("sensor.usage", "42", { unit_of_measurement: "%" }))).toBe(42);
  });

  it("ignores a sensor expressed in another unit instead of clamping it to 100 %", () => {
    expect(machinePercentage(state("sensor.ram", "11.4", { unit_of_measurement: "GiB" }))).toBeUndefined();
    expect(machinePercentage(state("sensor.disk", "812", { unit_of_measurement: "GB" }))).toBeUndefined();
    expect(percentageLabel(undefined)).toBe("—");
    expect(percentageLabel(41.6)).toBe("42%");
  });

  it("keeps the worst alert level", () => {
    expect(worstSeverity()).toBe("normal");
    expect(worstSeverity("normal", "warning")).toBe("warning");
    expect(worstSeverity("critical", "warning", "normal")).toBe("critical");
  });
});

describe("command availability", () => {
  it("accepts a never-pressed button in the unknown state", () => {
    const states = hass({
      "button.restart": state("button.restart", "unknown"),
      "button.pressed": state("button.pressed", "2026-10-05T08:30:00+02:00"),
      "button.gone": state("button.gone", "unavailable"),
    });
    expect(commandAvailable(states, "button.restart")).toBe(true);
    expect(commandAvailable(states, "button.pressed")).toBe(true);
    expect(commandAvailable(states, "button.gone")).toBe(false);
    expect(commandAvailable(states, "button.missing")).toBe(false);
    expect(commandAvailable(states)).toBe(false);
  });

  it("builds host confirmations from one pattern", () => {
    expect(hostConfirmation("restart", "le serveur", "Message")).toEqual({ title: "Redémarrer le serveur ?", message: "Message", confirmLabel: "Redémarrer" });
    expect(hostConfirmation("shutdown", "pve", "Message", "Arrêter").title).toBe("Arrêter pve ?");
  });
});

describe("workloads", () => {
  it("classifies unknown and unavailable workloads apart from stopped ones", () => {
    expect(workloadState(state("switch.service", "on"))).toBe("active");
    expect(workloadState(state("sensor.vm", "running"))).toBe("active");
    expect(workloadState(state("switch.service", "off"))).toBe("stopped");
    expect(workloadState(state("sensor.vm", "paused"))).toBe("paused");
    expect(workloadState(state("sensor.vm", "suspended"))).toBe("paused");
    expect(workloadState(state("switch.service", "unknown"))).toBe("unavailable");
    expect(workloadState(state("switch.service", "unavailable"))).toBe("unavailable");
    expect(workloadState()).toBe("unavailable");
  });

  it("uses dedicated commands first and only falls back to a switch entity", () => {
    const configured: WorkloadItem = {
      name: "Plex",
      entity: "switch.plex",
      start_entity: "button.plex_start",
      stop_entity: "button.plex_stop",
      restart_entity: "button.plex_restart",
      pause_entity: "button.plex_pause",
      resume_entity: "button.plex_resume",
    };
    expect(workloadActionEntity(configured, "start")).toBe("button.plex_start");
    expect(workloadActionEntity(configured, "stop")).toBe("button.plex_stop");
    expect(workloadActionEntity(configured, "restart")).toBe("button.plex_restart");
    expect(workloadActionEntity(configured, "pause")).toBe("button.plex_pause");
    expect(workloadActionEntity(configured, "resume")).toBe("button.plex_resume");
    const switchOnly: WorkloadItem = { name: "Grafana", entity: "switch.grafana" };
    expect(workloadActionEntity(switchOnly, "start")).toBe("switch.grafana");
    expect(workloadActionEntity(switchOnly, "stop")).toBe("switch.grafana");
    expect(workloadActionEntity(switchOnly, "pause")).toBeUndefined();
    expect(workloadActionEntity({ name: "Lecture", entity: "sensor.read_only" }, "start")).toBeUndefined();
  });

  it("turns a switch off to stop it and presses dedicated buttons", async () => {
    const states = hass({});
    await sendWorkloadCommand(states, { name: "Plex", entity: "switch.plex" }, "stop");
    expect(states.callService).toHaveBeenLastCalledWith("homeassistant", "turn_off", {}, { entity_id: "switch.plex" });
    await sendWorkloadCommand(states, { name: "VM", entity: "sensor.vm", stop_entity: "button.vm_stop" }, "stop");
    expect(states.callService).toHaveBeenLastCalledWith("button", "press", {}, { entity_id: "button.vm_stop" });
  });

  it("selects only workloads whose bulk command is usable", () => {
    const states = hass({
      "button.vm_start": state("button.vm_start", "unknown"),
      "button.vm_stop": state("button.vm_stop", "unavailable"),
    });
    const item: WorkloadItem = { name: "VM", entity: "sensor.vm", start_entity: "button.vm_start", stop_entity: "button.vm_stop" };
    expect(bulkAction("stopped")).toBe("start");
    expect(bulkAction("paused")).toBe("stop");
    expect(bulkAction("unavailable")).toBeUndefined();
    expect(workloadSelectable(states, item, "stopped")).toBe(true);
    expect(workloadSelectable(states, item, "active")).toBe(false);
    expect(workloadSelectable(states, item, "unavailable")).toBe(false);
  });

  it("filters, counts and groups workloads", () => {
    const items: WorkloadItem[] = [
      { name: "Plex", entity: "switch.plex", group: "Média" },
      { name: "Nextcloud", entity: "switch.nextcloud", group: "Cloud" },
      { name: "Jellyfin", entity: "switch.jellyfin", group: "Média", node: "pve2" },
      { name: "Vaultwarden", entity: "switch.vault" },
    ];
    const states: Record<string, WorkloadState> = {
      "switch.plex": "active", "switch.nextcloud": "stopped", "switch.jellyfin": "unavailable", "switch.vault": "paused",
    };
    const stateOf = (item: WorkloadItem) => states[item.entity];
    expect(workloadCounts(items, stateOf)).toEqual({ active: 1, stopped: 1, paused: 1, unavailable: 1 });
    expect(filterWorkloads(items, "", "stopped", stateOf).map((item) => item.name)).toEqual(["Nextcloud"]);
    expect(filterWorkloads(items, "", "unavailable", stateOf).map((item) => item.name)).toEqual(["Jellyfin"]);
    expect(filterWorkloads(items, "média", "all", stateOf).map((item) => item.name)).toEqual(["Plex", "Jellyfin"]);
    expect(filterWorkloads(items, "PVE2", "all", stateOf).map((item) => item.name)).toEqual(["Jellyfin"]);
    const groups = groupWorkloads(items, (item) => item.group || "Services");
    expect([...groups.keys()]).toEqual(["Média", "Cloud", "Services"]);
  });

  it("drops a selected workload once its state changes", () => {
    const selected = new Map<string, WorkloadState>([["switch.plex", "stopped"], ["switch.vault", "active"]]);
    expect(pruneSelection(selected, () => undefined)?.size).toBe(0);
    expect(pruneSelection(selected, (id) => (id === "switch.plex" ? "stopped" : "active"))).toBeUndefined();
    expect([...pruneSelection(selected, (id) => (id === "switch.plex" ? "active" : "active"))!.keys()]).toEqual(["switch.vault"]);
  });

  it("keeps the workload confirmation wording", () => {
    expect(workloadConfirmation("Plex", "stop", "container")).toEqual({
      title: "Arrêter Plex ?",
      message: "Le conteneur et le service qu’il fournit deviendront indisponibles.",
      confirmLabel: "Arrêter",
    });
    expect(workloadConfirmation("HomeLab", "stop", "vm").title).toBe("Éteindre HomeLab ?");
    expect(workloadConfirmation("HomeLab", "restart", "vm").message).toBe("Le service sera brièvement indisponible pendant son redémarrage.");
    expect(bulkStopConfirmation(2, "vm").title).toBe("Arrêter 2 machines virtuelles ?");
    expect(bulkStopConfirmation(1, "container").title).toBe("Arrêter 1 élément ?");
  });
});

describe("visual editor labels", () => {
  it("prefers the card label, then the common label, then the key", () => {
    const label = formLabels({ parity_entity: "État de la parité" });
    expect(label({ name: "parity_entity" })).toBe("État de la parité");
    expect(label({ name: "theme" })).toBe("Thème");
    expect(label({ name: "custom_key" })).toBe("custom_key");
  });
});
