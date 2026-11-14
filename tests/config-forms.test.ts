import { beforeAll, describe, expect, it, vi } from "vitest";
import type { ActionItemConfig } from "../src/cards/auralis-actions-card";
import type { CameraConfig } from "../src/cards/auralis-cameras-card";
import type { ClimateRoomConfig, ClimateThreshold } from "../src/cards/auralis-climate-card";
import type { IrrigationZoneConfig } from "../src/cards/auralis-irrigation-card";
import type { LightsCardConfig } from "../src/cards/auralis-lights-card";
import type { MediaPlayerConfig } from "../src/cards/auralis-media-card";
import type { TabConfig } from "../src/cards/auralis-tabs-card";
import type {
  CoversGroupConfig, InformationItem, ManagedProxmoxWorkload, ManagedService, ManagedVm, NavbarItemConfig, PcDriveConfig,
  PcExtraSectionConfig, ProxmoxNode, ProxmoxStorage, SwitchesGroupConfig, UnraidDisk,
} from "../src/types/config";

interface FormField {
  name: string;
  required?: boolean;
  selector: Record<string, unknown>;
}

interface Form {
  schema: FormField[];
  computeLabel(schema: { name: string }): string | undefined;
}

interface ListField {
  label: string;
  required?: boolean;
  selector: Record<string, unknown>;
}

interface ObjectList {
  multiple?: boolean;
  label_field?: string;
  description_field?: string;
  fields?: Record<string, ListField>;
}

const forms: Record<string, Form> = {};

beforeAll(async () => {
  vi.stubGlobal("HTMLElement", class {});
  const cards = {
    actions: (await import("../src/cards/auralis-actions-card")).AuralisActionsCard,
    batteries: (await import("../src/cards/auralis-batteries-card")).AuralisBatteriesCard,
    cameras: (await import("../src/cards/auralis-cameras-card")).AuralisCamerasCard,
    climate: (await import("../src/cards/auralis-climate-card")).AuralisClimateCard,
    covers: (await import("../src/cards/auralis-covers-card")).AuralisCoversCard,
    fridge: (await import("../src/cards/auralis-fridge-card")).AuralisFridgeCard,
    irrigation: (await import("../src/cards/auralis-irrigation-card")).AuralisIrrigationCard,
    lights: (await import("../src/cards/auralis-lights-card")).AuralisLightsCard,
    media: (await import("../src/cards/auralis-media-card")).AuralisMediaCard,
    navbar: (await import("../src/cards/auralis-navbar-card")).AuralisNavbarCard,
    pc: (await import("../src/cards/auralis-pc-card")).AuralisPcCard,
    proxmox: (await import("../src/cards/auralis-proxmox-card")).AuralisProxmoxCard,
    screensaver: (await import("../src/cards/auralis-screensaver-card")).AuralisScreensaverCard,
    switches: (await import("../src/cards/auralis-switches-card")).AuralisSwitchesCard,
    tabs: (await import("../src/cards/auralis-tabs-card")).AuralisTabsCard,
    thermostat: (await import("../src/cards/auralis-thermostat-card")).AuralisThermostatCard,
    unraid: (await import("../src/cards/auralis-unraid-card")).AuralisUnraidCard,
    weather: (await import("../src/cards/auralis-weather-card")).AuralisWeatherCard,
  };
  for (const [name, card] of Object.entries(cards)) forms[name] = card.getConfigForm() as unknown as Form;
});

/** Listes éditées élément par élément, carte par carte. */
const STRUCTURED_LISTS: Record<string, string[]> = {
  actions: ["actions"],
  cameras: ["cameras"],
  climate: ["rooms", "thresholds", "outdoor_thresholds"],
  covers: ["groups"],
  irrigation: ["zones"],
  lights: ["groups", "scenes", "preset_colors"],
  media: ["players"],
  navbar: ["items"],
  pc: ["drives", "network_interfaces", "extra_sections"],
  proxmox: ["info_items", "storages", "disks", "nodes", "vms", "containers"],
  switches: ["groups"],
  tabs: ["tabs"],
  unraid: ["disks", "docker", "vms"],
  weather: ["thresholds"],
};

/** Seuls champs obligatoires du premier niveau : les autres restent facultatifs. */
const REQUIRED: Record<string, string[]> = {
  actions: ["actions"],
  cameras: ["cameras"],
  climate: ["rooms"],
  proxmox: ["status_entity"],
  unraid: ["status_entity"],
  weather: ["entity"],
};

const RAW_KEY = /^[a-z0-9_]+$/;

function field(card: string, name: string): FormField {
  const found = forms[card].schema.find((item) => item.name === name);
  if (!found) throw new Error(`${card} : champ ${name} absent`);
  return found;
}

function list(card: string, name: string): ObjectList {
  return (field(card, name).selector as { object?: ObjectList }).object ?? {};
}

function itemKeys(card: string, name: string): string[] {
  return Object.keys(list(card, name).fields ?? {});
}

describe("visual editors", () => {
  it("covers every card except Room and Energy", () => {
    expect(Object.keys(forms)).toHaveLength(18);
  });

  it("labels every field in French, without raw keys", () => {
    for (const [card, form] of Object.entries(forms)) {
      for (const { name } of form.schema) {
        const label = form.computeLabel({ name });
        expect(label, `${card}.${name}`).toBeTypeOf("string");
        expect(label, `${card}.${name}`).not.toMatch(RAW_KEY);
      }
    }
  });

  it("has no duplicate field names", () => {
    for (const [card, form] of Object.entries(forms)) {
      const names = form.schema.map(({ name }) => name);
      expect(new Set(names).size, card).toBe(names.length);
    }
  });

  it("keeps optional fields optional", () => {
    for (const [card, form] of Object.entries(forms)) {
      const required = form.schema.filter((item) => item.required).map(({ name }) => name);
      expect(required, card).toEqual(REQUIRED[card] ?? []);
    }
  });

  it("edits lists item by item with labelled fields", () => {
    for (const [card, names] of Object.entries(STRUCTURED_LISTS)) {
      for (const name of names) {
        const selector = list(card, name);
        const where = `${card}.${name}`;
        expect(selector.multiple, where).toBe(true);
        expect(Object.keys(selector.fields ?? {}).length, where).toBeGreaterThan(0);
        for (const [key, item] of Object.entries(selector.fields ?? {})) {
          expect(item.label, `${where}.${key}`).toBeTypeOf("string");
          expect(item.label, `${where}.${key}`).not.toMatch(RAW_KEY);
          expect(item.selector, `${where}.${key}`).toBeTypeOf("object");
        }
        for (const shown of [selector.label_field, selector.description_field]) {
          if (shown !== undefined) expect(selector.fields, where).toHaveProperty(shown);
        }
      }
    }
  });

  it("no longer edits these lists as raw YAML", () => {
    for (const [card, names] of Object.entries(STRUCTURED_LISTS)) {
      for (const name of names) expect(list(card, name), `${card}.${name}`).not.toEqual({});
    }
  });

  it("only uses keys the cards read", () => {
    const keys = <T>(record: Record<keyof T, true>): string[] => Object.keys(record);
    type LightsGroup = NonNullable<LightsCardConfig["groups"]>[number];
    const expectations: Array<[string, string, string[]]> = [
      ["covers", "groups", keys<CoversGroupConfig>({ name: true, covers: true, icon: true, background_image: true, background_position: true })],
      ["switches", "groups", keys<SwitchesGroupConfig>({ name: true, switches: true, icon: true, background_image: true, background_position: true })],
      ["lights", "groups", keys<LightsGroup>({ name: true, lights: true, icon: true, background_image: true, image: true, show_lights: true, scenes: true })],
      ["navbar", "items", keys<NavbarItemConfig>({
        label: true, icon: true, path: true, navigation_path: true, exact: true, active_paths: true, badge_entity: true,
      })],
      ["cameras", "cameras", keys<CameraConfig>({ entity: true, name: true, icon: true, motion_entity: true, actions: true })],
      ["climate", "rooms", keys<ClimateRoomConfig>({
        name: true, icon: true, temperature_entity: true, humidity_entity: true, battery_entity: true, outdoor: true, color: true,
      })],
      ["climate", "thresholds", keys<ClimateThreshold>({ below: true, color: true, label: true })],
      ["weather", "thresholds", keys<ClimateThreshold>({ below: true, color: true, label: true })],
      ["actions", "actions", keys<ActionItemConfig>({
        name: true, icon: true, color: true, entity: true, state_entity: true, service: true, data: true, target: true,
        navigation_path: true, confirm: true, danger: true,
      })],
      ["media", "players", keys<MediaPlayerConfig>({
        entity: true, name: true, icon: true, device_class: true, color: true, sources: true, volume_step: true, max_volume: true, volume_scale: true,
      })],
      ["tabs", "tabs", keys<TabConfig>({ label: true, name: true, icon: true, badge_entity: true, cards: true, card: true, columns: true })],
      ["irrigation", "zones", keys<IrrigationZoneConfig>({
        valve_entity: true, name: true, icon: true, countdown_entity: true, battery_entity: true, error_entity: true,
        schedule_entity: true, schedule: true, durations: true, max_duration: true, script_entity: true,
      })],
      ["pc", "drives", keys<PcDriveConfig>({ entity: true, label: true })],
      ["pc", "extra_sections", keys<PcExtraSectionConfig>({ title: true, entities: true })],
      ["unraid", "docker", keys<ManagedService>({
        name: true, entity: true, icon: true, group: true, cpu_entity: true, restart_entity: true, start_entity: true, stop_entity: true,
      })],
      ["unraid", "vms", keys<ManagedVm>({
        name: true, entity: true, icon: true, group: true, cpu_entity: true, restart_entity: true, start_entity: true, stop_entity: true,
        pause_entity: true, resume_entity: true, console_url: true, ip_entity: true, vcpus: true, memory: true, storage: true,
      })],
      ["unraid", "disks", keys<UnraidDisk>({
        name: true, group: true, show_on_card: true, usage_entity: true, capacity_entity: true, temperature_entity: true,
        status_entity: true, healthy_state: true,
      })],
      ["proxmox", "storages", keys<ProxmoxStorage>({
        name: true, usage_entity: true, capacity_entity: true, status_entity: true, temperature_entity: true, show_on_card: true,
      })],
      ["proxmox", "nodes", keys<ProxmoxNode>({
        name: true, status_entity: true, icon: true, cpu_entity: true, memory_entity: true, temperature_entity: true,
        restart_entity: true, shutdown_entity: true,
      })],
      ["proxmox", "containers", keys<ManagedProxmoxWorkload>({
        name: true, entity: true, icon: true, group: true, cpu_entity: true, restart_entity: true, start_entity: true, stop_entity: true,
        pause_entity: true, resume_entity: true, console_url: true, ip_entity: true, vcpus: true, memory: true, storage: true, node: true,
      })],
      ["proxmox", "info_items", keys<InformationItem>({
        entity: true, label: true, icon: true, attribute: true, format: true, unit: true, precision: true, duration_unit: true,
        total_entity: true, total_attribute: true, active_entity: true, active_state: true, active_text: true, show: true,
        hide_unavailable: true,
      })],
    ];
    for (const [card, name, allowed] of expectations) {
      for (const key of itemKeys(card, name)) expect(allowed, `${card}.${name}.${key}`).toContain(key);
    }
  });

  it("picks entities with nested entity selectors and keeps nested object lists in YAML", () => {
    const groups = list("covers", "groups").fields!;
    expect(groups.covers.selector).toEqual({ entity: { multiple: true, filter: { domain: "cover" } } });
    expect(list("lights", "groups").fields!.lights.selector).toEqual({ entity: { multiple: true, filter: { domain: ["light", "switch"] } } });
    expect(list("cameras", "cameras").fields!.actions.selector).toEqual({ object: {} });
    expect(list("tabs", "tabs").fields!.cards.selector).toEqual({ object: {} });
    expect(list("pc", "extra_sections").fields!.entities.selector).toEqual({ object: {} });
  });

  it("filters single entities by domain where the card expects one", () => {
    expect(field("climate", "rooms")).toBeDefined();
    expect(list("climate", "rooms").fields!.temperature_entity.selector)
      .toEqual({ entity: { filter: { domain: "sensor", device_class: "temperature" } } });
    expect(field("unraid", "cpu_temperature_entity").selector).toEqual({ entity: { filter: { domain: "sensor", device_class: "temperature" } } });
    expect(field("proxmox", "shutdown_entity").selector).toMatchObject({ entity: { filter: { domain: expect.arrayContaining(["button", "script"]) } } });
    expect(field("fridge", "door_entity").selector).toEqual({ entity: { filter: { domain: "binary_sensor" } } });
    expect(field("media", "entity").selector).toEqual({ entity: { filter: { domain: "media_player" } } });
  });

  it("keeps colours as hexadecimal text", () => {
    for (const [card, form] of Object.entries(forms)) {
      const accent = form.schema.find(({ name }) => name === "accent_color");
      if (accent) expect(accent.selector, card).toEqual({ text: {} });
    }
    expect(list("lights", "preset_colors").fields!.color.selector).toEqual({ text: {} });
  });
});
