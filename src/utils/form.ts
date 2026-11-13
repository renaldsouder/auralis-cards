/**
 * Sélecteurs des éditeurs visuels (`getConfigForm`).
 *
 * Les listes d'objets utilisent le sélecteur `object` de Home Assistant avec `fields` et
 * `multiple` : chaque élément s'ajoute, se modifie, se déplace et se supprime dans une fenêtre,
 * avec de vrais sélecteurs d'entités. Les clés d'un élément absentes de `fields` sont conservées.
 */
export type FormSelector = Record<string, unknown>;

export interface FormListField {
  label: string;
  selector: FormSelector;
  required?: boolean;
}

export interface FormListOptions {
  /** Champ affiché comme titre de chaque élément (le premier champ sinon). */
  label?: string;
  /** Champ affiché sous le titre. */
  description?: string;
}

export const TEXT: FormSelector = { text: {} };
export const ICON: FormSelector = { icon: {} };
export const BOOLEAN: FormSelector = { boolean: {} };
/** Éditeur YAML : options libres (dictionnaires, listes d'objets imbriquées). */
export const YAML: FormSelector = { object: {} };
/** Liste de textes (motifs, horaires, chemins…). */
export const TEXT_LIST: FormSelector = { text: { multiple: true } };

/** Entités qu'une commande peut déclencher : bouton, script, scène ou interrupteur. */
export const COMMAND_DOMAINS = ["button", "input_button", "script", "switch", "scene"];

/** Sélecteur d'entité, filtré par domaine et, au besoin, par classe d'appareil. */
export function entitySelector(
  domain?: string | string[],
  options: { deviceClass?: string | string[]; multiple?: boolean } = {},
): FormSelector {
  const filter: Record<string, unknown> = {};
  if (domain) filter.domain = domain;
  if (options.deviceClass) filter.device_class = options.deviceClass;
  return {
    entity: {
      ...(options.multiple ? { multiple: true } : {}),
      ...(Object.keys(filter).length ? { filter } : {}),
    },
  };
}

export const ENTITY: FormSelector = entitySelector();
export const SENSOR: FormSelector = entitySelector("sensor");
export const TEMPERATURE: FormSelector = entitySelector("sensor", { deviceClass: "temperature" });
export const COMMAND: FormSelector = entitySelector(COMMAND_DOMAINS);

export function numberSelector(min: number, max: number, step = 1, unit?: string): FormSelector {
  return { number: { min, max, step, mode: "box", ...(unit ? { unit_of_measurement: unit } : {}) } };
}

/** Liste d'objets éditable élément par élément. */
export function listSelector(fields: Record<string, FormListField>, options: FormListOptions = {}): FormSelector {
  return {
    object: {
      multiple: true,
      ...(options.label ? { label_field: options.label } : {}),
      ...(options.description ? { description_field: options.description } : {}),
      fields,
    },
  };
}
