/** Niveau d'alerte d'une mesure : couleur normale, avertissement (ambre) ou critique (rouge). */
export type Severity = "normal" | "warning" | "critical";

export interface AlertLevel {
  /** Seuil d'avertissement. */
  warning?: number;
  /** Seuil critique. */
  critical?: number;
}

export type AlertMetric = "cpu" | "memory" | "disk" | "temperature";

/** Seuils par défaut des cartes machines, en % ou en °C. */
export const DEFAULT_ALERT_LEVELS: Record<AlertMetric, Required<AlertLevel>> = {
  cpu: { warning: 80, critical: 95 },
  memory: { warning: 85, critical: 95 },
  disk: { warning: 85, critical: 95 },
  temperature: { warning: 70, critical: 85 },
};

const finite = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/**
 * Niveau d'une valeur. `direction: "above"` alerte quand la valeur monte (CPU, disque),
 * `"below"` quand elle descend (batterie, autonomie).
 */
export function severity(
  value: number | undefined,
  level: AlertLevel | undefined,
  direction: "above" | "below" = "above",
): Severity {
  if (value === undefined || !Number.isFinite(value) || !level) return "normal";
  const warning = finite(level.warning);
  const critical = finite(level.critical);
  const crossed = (limit?: number): boolean =>
    limit !== undefined && (direction === "above" ? value >= limit : value <= limit);
  if (crossed(critical)) return "critical";
  if (crossed(warning)) return "warning";
  return "normal";
}

/** Seuils d'une mesure : ceux de la configuration, complétés par les valeurs par défaut. */
export function alertLevel(
  configured: Partial<Record<AlertMetric, AlertLevel>> | undefined,
  metric: AlertMetric,
): Required<AlertLevel> {
  const own = configured?.[metric];
  const defaults = DEFAULT_ALERT_LEVELS[metric];
  return {
    warning: finite(own?.warning) ?? defaults.warning,
    critical: finite(own?.critical) ?? defaults.critical,
  };
}

/** Classe CSS d'un niveau : `sev-warning`, `sev-critical`, ou rien. */
export function severityClass(level: Severity): string {
  return level === "normal" ? "" : `sev-${level}`;
}
