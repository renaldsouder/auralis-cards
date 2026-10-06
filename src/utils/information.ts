import type { InformationItem } from "../types/config";
import type { HassEntity, HomeAssistant } from "../types/home-assistant";
import { displayState, entity, isAvailable } from "./entities";

function valueOf(state: HassEntity | undefined, attribute?: string): unknown {
  return isAvailable(state) ? (attribute ? state?.attributes[attribute] : state?.state) : undefined;
}

function numberOf(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  const number = Number(typeof value === "string" ? value.replace(",", ".") : value);
  return Number.isFinite(number) ? number : undefined;
}

/** Undefined means unavailable, so the card can hide the entire tile. */
export function informationValue(hass: HomeAssistant | undefined, item: InformationItem): string | undefined {
  const active = entity(hass, item.active_entity);
  if (isAvailable(active) && active?.state === (item.active_state ?? "on")) {
    return item.active_text ?? "En cours";
  }
  const state = entity(hass, item.entity);
  const value = valueOf(state, item.attribute);
  if (value === undefined || value === null || value === "" || value === "unknown" || value === "unavailable") return undefined;
  const precision = Number.isFinite(item.precision) ? Math.max(0, Math.min(6, Math.round(item.precision!))) : 1;
  const formatNumber = (number: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: precision }).format(number);
  const unit = item.unit ?? (item.attribute ? "" : state?.attributes.unit_of_measurement ?? "");
  const suffix = unit ? ` ${unit}` : "";

  switch (item.format) {
    case "duration": {
      const numeric = numberOf(value);
      if (numeric === undefined || numeric < 0) return undefined;
      const units: Record<string, number> = { seconds: 1, s: 1, minutes: 60, min: 60, hours: 3600, h: 3600, days: 86400, d: 86400 };
      const factor = units[item.duration_unit ?? state?.attributes.unit_of_measurement ?? "seconds"];
      if (!factor) return undefined;
      const minutes = Math.floor(numeric * factor / 60);
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor(minutes % 1440 / 60);
      return days ? `${days} j ${hours} h` : hours ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
    }
    case "datetime": {
      // Require an ISO-like date; a clock time or a number is not a backup date.
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) return undefined;
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) return undefined;
      return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
    }
    case "ratio": {
      const used = numberOf(value);
      const total = numberOf(valueOf(entity(hass, item.total_entity), item.total_attribute));
      if (used === undefined || used < 0 || total === undefined || total <= 0) return undefined;
      return `${formatNumber(used)} / ${formatNumber(total)}${suffix}`;
    }
    default: {
      if (typeof value === "object") return undefined;
      if (!item.attribute && item.unit === undefined && item.precision === undefined) return displayState(hass, item.entity);
      const numeric = numberOf(value);
      return `${numeric === undefined ? String(value) : formatNumber(numeric)}${suffix}`;
    }
  }
}
