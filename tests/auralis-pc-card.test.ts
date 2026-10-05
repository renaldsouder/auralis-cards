import { beforeAll, describe, expect, it, vi } from "vitest";
import type { PcCardConfig } from "../src/types/config";
import type { HassEntity, HomeAssistant } from "../src/types/home-assistant";

type PcCardModule = typeof import("../src/cards/auralis-pc-card");

let pcCard: PcCardModule;

const state = (entityId: string, value: string, attributes: HassEntity["attributes"] = {}): HassEntity => ({
  entity_id: entityId,
  state: value,
  attributes,
});

const config = (overrides: Partial<PcCardConfig> = {}): PcCardConfig => ({
  type: "custom:auralis-pc-card",
  online_entity: "binary_sensor.pc_online",
  ...overrides,
});

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  pcCard = await import("../src/cards/auralis-pc-card");
});

describe("PC card helpers", () => {
  it("distinguishes online, offline and unavailable states", () => {
    expect(pcCard.pcAvailability(state("binary_sensor.pc_online", "on"))).toBe("online");
    expect(pcCard.pcAvailability(state("binary_sensor.pc_online", "off"))).toBe("offline");
    expect(pcCard.pcAvailability(state("binary_sensor.pc_online", "unknown"))).toBe("unavailable");
    expect(pcCard.pcAvailability(state("binary_sensor.pc_online", "unavailable"))).toBe("unavailable");
    expect(pcCard.pcAvailability(state("sensor.pc_cpu", "6"))).toBe("online");
    expect(pcCard.pcAvailability()).toBe("unavailable");
  });

  it("only exposes a power action for a known machine state", () => {
    expect(pcCard.pcPowerAction("online")).toBe("shutdown");
    expect(pcCard.pcPowerAction("offline")).toBe("wake");
    expect(pcCard.pcPowerAction("unavailable")).toBeNull();
  });

  it("keeps absent metrics unavailable instead of converting them to zero", () => {
    expect(pcCard.pcPercentage()).toBeUndefined();
    expect(pcCard.pcPercentage(state("sensor.cpu", "unknown"))).toBeUndefined();
    expect(pcCard.pcPercentage(state("sensor.cpu", "invalid"))).toBeUndefined();
    expect(pcCard.pcPercentage(state("sensor.cpu", "42,5"))).toBe(42.5);
    expect(pcCard.pcPercentage(state("sensor.cpu", "120"))).toBe(100);
  });

  it("hides missing, unavailable and zero temperature sensors", () => {
    expect(pcCard.pcTemperature()).toBeUndefined();
    expect(pcCard.pcTemperature(state("sensor.cpu_temp", "unavailable"))).toBeUndefined();
    expect(pcCard.pcTemperature(state("sensor.cpu_temp", "0"))).toBeUndefined();
    expect(pcCard.pcTemperature(state("sensor.cpu_temp", "52.5"))).toBe(52.5);
  });

  it("reads HASS.Agent drive attributes and formats their capacity", () => {
    const drive = state("sensor.pc_storage_c", "C", {
      UsedSpacePercentage: "72.5",
      UsedSpaceMB: 256000,
      TotalSizeMB: 512000,
    });

    expect(pcCard.pcDriveUsage(drive)).toBe(72.5);
    expect(pcCard.pcDriveSummary(drive)).toBe("250 Go / 500 Go");
    expect(pcCard.pcDriveUsage(state("sensor.pc_storage", "130"))).toBe(100);
  });

  it("derives a compact uptime and translates the session state", () => {
    const boot = state("sensor.pc_last_boot", "2026-10-04T16:22:48+00:00");
    const now = Date.parse("2026-10-05T18:52:48+00:00");

    expect(pcCard.pcUptimeLabel(boot, now)).toBe("1 j 2 h 30 min");
    expect(pcCard.pcSessionLabel(state("sensor.pc_session", "Unlocked"))).toBe("Déverrouillée");
  });

  it("requires an available Home Assistant entity before enabling an action", () => {
    const hass: HomeAssistant = {
      states: {
        "button.available": state("button.available", "2026-10-05T08:30:00+02:00"),
        "button.unavailable": state("button.unavailable", "unavailable"),
      },
      callService: vi.fn(async () => undefined),
    };

    expect(pcCard.pcActionAvailable(hass, "button.available")).toBe(true);
    expect(pcCard.pcActionAvailable(hass, "button.unavailable")).toBe(false);
    expect(pcCard.pcActionAvailable(hass, "button.missing")).toBe(false);
    expect(pcCard.pcActionAvailable(hass)).toBe(false);
  });
});

describe("AuralisPcCard configuration and guarded actions", () => {
  it("requires the online entity and applies defaults", () => {
    const card = new pcCard.AuralisPcCard();

    expect(() => card.setConfig(config({ online_entity: "" }))).toThrow("online_entity est obligatoire.");
    card.setConfig(config());

    const configured = card as unknown as { config: PcCardConfig };
    expect(configured.config.name).toBe("PC Bureau");
    expect(configured.config.theme).toBe("auto");
  });

  it("includes every rendered storage and network field in the visual editor", () => {
    const form = pcCard.AuralisPcCard.getConfigForm() as {
      schema: Array<{ name: string }>;
    };
    const fields = form.schema.map(({ name }) => name);

    expect(fields).toEqual(expect.arrayContaining([
      "storage_label_entity",
      "network_down_entity",
      "network_up_entity",
      "image_opacity",
      "card_background",
      "show_grid",
      "drives",
      "network_interfaces",
      "battery_percentage_entity",
      "audio_output_entity",
      "last_boot_entity",
    ]));
  });

  it("applies and clamps the background image opacity without affecting the content", () => {
    const card = new pcCard.AuralisPcCard();
    const internals = card as unknown as {
      machineStyle(defaultAccent: string): string;
    };

    card.setConfig(config({ background_image: "/local/pc.jpg", image_opacity: 35 }));
    expect(internals.machineStyle("#7898ff")).toContain("--machine-image-opacity:0.35");

    card.setConfig(config({ image_opacity: 140 }));
    expect(internals.machineStyle("#7898ff")).toContain("--machine-image-opacity:1");

    card.setConfig(config({ image_opacity: -20 }));
    expect(internals.machineStyle("#7898ff")).toContain("--machine-image-opacity:0");
  });

  it("does not prepare a shutdown confirmation for an unavailable action entity", () => {
    const card = new pcCard.AuralisPcCard();
    card.setConfig(config({ shutdown_entity: "button.pc_shutdown" }));
    card.hass = {
      states: {
        "button.pc_shutdown": state("button.pc_shutdown", "unavailable"),
      },
      callService: vi.fn(async () => undefined),
    };

    const internals = card as unknown as {
      confirmShutdown(): void;
      confirmState: unknown;
    };
    internals.confirmShutdown();

    expect(internals.confirmState).toBeNull();
  });

  it("keeps shutdown behind confirmation before calling Home Assistant", async () => {
    const callService = vi.fn(async () => undefined);
    const card = new pcCard.AuralisPcCard();
    card.setConfig(config({ shutdown_entity: "button.pc_shutdown" }));
    card.hass = {
      states: {
        "button.pc_shutdown": state("button.pc_shutdown", "2026-10-05T08:30:00+02:00"),
      },
      callService,
    };

    const internals = card as unknown as {
      confirmShutdown(): void;
      confirmState: { action(): Promise<void> } | null;
    };
    internals.confirmShutdown();

    expect(callService).not.toHaveBeenCalled();
    expect(internals.confirmState).not.toBeNull();
    await internals.confirmState?.action();
    expect(callService).toHaveBeenCalledWith(
      "button",
      "press",
      {},
      { entity_id: "button.pc_shutdown" },
    );
  });
});
