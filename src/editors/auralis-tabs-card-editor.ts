import { css, html, LitElement, nothing, type TemplateResult } from "lit";
import type { HomeAssistant, LovelaceCardConfig } from "../types/home-assistant";
import type { TabConfig, TabsCardConfig } from "../cards/auralis-tabs-card";

/**
 * Éditeur visuel de la carte Onglets.
 *
 * Chaque onglet reçoit ses cartes comme une pile de Home Assistant : sélecteur de cartes
 * (`hui-card-picker`) pour en ajouter une, éditeur de la carte choisie (`hui-card-element-editor`)
 * pour la modifier, en formulaire ou en YAML. Ces éléments appartiennent à Home Assistant et ne
 * sont chargés qu'à la demande ; sans eux, les cartes de l'onglet restent modifiables en YAML.
 */

export const TABS_EDITOR_TAG = "auralis-tabs-card-editor";

export interface EditorForm {
  schema: Array<Record<string, unknown>>;
  computeLabel: (schema: { name: string }) => string;
}

interface CardElementEditor extends HTMLElement {
  toggleMode?: () => void;
}

interface CardHelpers {
  createCardElement(config: LovelaceCardConfig): HTMLElement;
}

type ConfigChangedEvent = CustomEvent<{ config?: LovelaceCardConfig; guiModeAvailable?: boolean }>;
type ValueChangedEvent = CustomEvent<{ value?: Record<string, unknown> }>;

const TAB_SCHEMA = [
  { name: "label", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "badge_entity", selector: { entity: {} } },
  { name: "columns", selector: { number: { min: 1, max: 4, step: 1, mode: "box" } } },
];

const TAB_LABELS: Record<string, string> = {
  label: "Nom de l'onglet",
  icon: "Icône",
  badge_entity: "Entité de la pastille",
  columns: "Colonnes (1 à 4)",
  cards: "Cartes de l'onglet (YAML)",
};

/* ---------- Opérations sur la configuration (pures, testées) ---------- */

/** Cartes d'un onglet, quelle que soit la forme choisie (`cards` ou `card`). */
export function cardsOf(tab: TabConfig | undefined): LovelaceCardConfig[] {
  if (!tab) return [];
  if (Array.isArray(tab.cards)) return tab.cards;
  return tab.card ? [tab.card] : [];
}

/** Déplace un élément d'une liste sans la modifier ; une position hors de la liste ne change rien. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const copy = [...list];
  if (from < 0 || from >= copy.length || to < 0 || to >= copy.length || from === to) return copy;
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/** Remplace les cartes d'un onglet : la forme `cards` est toujours écrite, `card` est retirée. */
export function withTabCards(config: TabsCardConfig, index: number, cards: LovelaceCardConfig[]): TabsCardConfig {
  return {
    ...config,
    tabs: config.tabs.map((tab, position) => {
      if (position !== index) return tab;
      const { card: _single, ...rest } = tab;
      return { ...rest, cards };
    }),
  };
}

/** Applique les champs du formulaire d'un onglet ; un champ vidé disparaît de la configuration. */
export function withTabFields(config: TabsCardConfig, index: number, fields: Record<string, unknown>): TabsCardConfig {
  return {
    ...config,
    tabs: config.tabs.map((tab, position) => {
      if (position !== index) return tab;
      const next: Record<string, unknown> = { ...tab };
      for (const key of ["label", "icon", "badge_entity", "columns"]) {
        if (!(key in fields)) continue;
        const value = fields[key];
        if (value === undefined || value === null || value === "") delete next[key];
        else next[key] = value;
      }
      // Le formulaire écrit `label` : l'alias `name` ferait doublon.
      if ("label" in fields) delete next.name;
      return next as TabConfig;
    }),
  };
}

/** Ajoute un onglet vide à la fin. Il n'est valide qu'une fois une carte ajoutée. */
export function withNewTab(config: TabsCardConfig): TabsCardConfig {
  return { ...config, tabs: [...config.tabs, { label: `Onglet ${config.tabs.length + 1}`, cards: [] }] };
}

/** Retire un onglet ; le dernier onglet restant ne peut pas être retiré. */
export function withoutTab(config: TabsCardConfig, index: number): TabsCardConfig {
  if (config.tabs.length <= 1) return config;
  return { ...config, tabs: config.tabs.filter((_tab, position) => position !== index) };
}

/** Options de la carte seules, sans la liste des onglets. */
export function cardOptions(config: TabsCardConfig): Record<string, unknown> {
  const { tabs: _tabs, ...options } = config;
  return options;
}

/** Nom court d'une carte pour les pastilles de l'éditeur : nom déclaré, sinon son type. */
export function cardTitle(card: LovelaceCardConfig | undefined, registry: Array<Record<string, unknown>> = []): string {
  const type = typeof card?.type === "string" ? card.type : "";
  if (!type) return "Carte";
  const tag = type.startsWith("custom:") ? type.slice(7) : type;
  const declared = registry.find((entry) => entry.type === tag)?.name;
  if (typeof declared === "string" && declared.trim()) return declared.replace(/^Auralis\s*·\s*/, "").trim();
  const words = tag.replace(/-card$/, "").replace(/^auralis-/, "").split(/[-_]/).filter(Boolean);
  const text = words.join(" ");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Carte";
}

/* ---------- Chargement des éditeurs de Home Assistant ---------- */

let haEditorsPromise: Promise<boolean> | undefined;

const haEditorsReady = (): boolean =>
  typeof customElements !== "undefined" &&
  Boolean(customElements.get("hui-card-picker") && customElements.get("hui-card-element-editor"));

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | undefined> =>
  Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(resolve, ms))]);

/**
 * `hui-card-picker` et `hui-card-element-editor` sont définis par l'éditeur de la pile verticale :
 * le demander les charge, comme le fait Home Assistant pour ses propres piles.
 *
 * Sur une vue sans pile, `createCardElement` crée l'élément avant que sa classe soit chargée :
 * il faut attendre sa définition pour trouver `getConfigElement`.
 */
export function loadHaCardEditors(): Promise<boolean> {
  if (haEditorsReady()) return Promise.resolve(true);
  haEditorsPromise ??= (async () => {
    const loader = (window as unknown as { loadCardHelpers?: () => Promise<CardHelpers> }).loadCardHelpers;
    if (!loader) return false;
    try {
      const helpers = await loader();
      helpers.createCardElement({ type: "vertical-stack", cards: [] });
      const ctor = (await withTimeout(customElements.whenDefined("hui-vertical-stack-card"), 5000)) as
        | { getConfigElement?: () => Promise<HTMLElement> | HTMLElement }
        | undefined;
      await ctor?.getConfigElement?.();
      await withTimeout(
        Promise.all([customElements.whenDefined("hui-card-picker"), customElements.whenDefined("hui-card-element-editor")]),
        5000,
      );
    } catch {
      // Éditeurs indisponibles : l'éditeur YAML des cartes prend le relais.
    }
    const ready = haEditorsReady();
    // Un échec n'est pas mémorisé : la prochaine ouverture de l'éditeur réessaie.
    if (!ready) haEditorsPromise = undefined;
    return ready;
  })();
  return haEditorsPromise;
}

/* ---------- Élément ---------- */

export class AuralisTabsCardEditor extends LitElement {
  static properties = {
    hass: { attribute: false },
    lovelace: { attribute: false },
    optionsForm: { attribute: false },
    config: { state: true },
    selectedTab: { state: true },
    selectedCard: { state: true },
    editorsReady: { state: true },
    guiModeAvailable: { state: true },
    guiMode: { state: true },
  };

  static styles = css`
    :host {
      display: grid;
      gap: 16px;
    }

    /* Une colonne qui ne s'élargit pas au contenu : l'éditeur d'une carte large ne déborde pas. */
    :host,
    .section,
    .panel {
      grid-template-columns: minmax(0, 1fr);
    }

    .section {
      display: grid;
      gap: 10px;
      padding-top: 4px;
    }

    .section-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--primary-text-color);
    }

    .hint {
      margin: 0;
      color: var(--secondary-text-color);
      font-size: 13px;
      line-height: 1.4;
    }

    .bar {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      max-width: 100%;
      min-height: 36px;
      padding: 0 12px;
      border: 1px solid var(--divider-color);
      border-radius: 18px;
      background: var(--card-background-color, transparent);
      color: var(--primary-text-color);
      font: inherit;
      font-size: 14px;
      cursor: pointer;
    }

    .chip span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chip ha-icon {
      --mdc-icon-size: 18px;
      flex: none;
    }

    .chip.active {
      border-color: var(--primary-color);
      background: color-mix(in srgb, var(--primary-color) 14%, transparent);
      font-weight: 600;
    }

    .chip.add {
      padding: 0 10px;
      color: var(--primary-color);
      border-style: dashed;
    }

    .chip:focus-visible,
    .tool:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    .panel {
      display: grid;
      gap: 12px;
      padding: 12px;
      border: 1px solid var(--divider-color);
      border-radius: 12px;
    }

    .tools {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
      justify-content: flex-end;
    }

    .tools .label {
      margin-right: auto;
      color: var(--secondary-text-color);
      font-size: 13px;
    }

    .tool {
      display: inline-grid;
      width: 36px;
      height: 36px;
      place-items: center;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--primary-text-color);
      cursor: pointer;
    }

    .tool:hover:not([disabled]) {
      background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
    }

    .tool[disabled] {
      opacity: 0.35;
      cursor: default;
    }

    .tool.danger {
      color: var(--error-color, #db4437);
    }

    .tool ha-icon {
      --mdc-icon-size: 20px;
    }

    .empty {
      padding: 12px;
      border: 1px dashed var(--divider-color);
      border-radius: 10px;
      color: var(--secondary-text-color);
      font-size: 13px;
      text-align: center;
    }
  `;

  public hass?: HomeAssistant;
  public lovelace?: unknown;
  public optionsForm?: EditorForm;
  protected config?: TabsCardConfig;
  protected selectedTab = 0;
  /** Index de la carte modifiée ; égal au nombre de cartes : le sélecteur d'ajout est affiché. */
  protected selectedCard = 0;
  protected editorsReady = false;
  protected guiModeAvailable = true;
  protected guiMode = true;

  public setConfig(config: TabsCardConfig): void {
    const tabs = Array.isArray(config?.tabs) && config.tabs.length ? config.tabs : [{ label: "Onglet 1", cards: [] }];
    this.config = { ...config, tabs };
    this.selectedTab = Math.min(this.selectedTab, tabs.length - 1);
    this.selectedCard = Math.min(this.selectedCard, cardsOf(tabs[this.selectedTab]).length);
  }

  connectedCallback(): void {
    super.connectedCallback();
    void loadHaCardEditors().then((ready) => {
      this.editorsReady = ready;
    });
  }

  private commit(config: TabsCardConfig): void {
    this.config = config;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  private selectTab(index: number): void {
    this.selectedTab = index;
    // Première carte de l'onglet ; un onglet vide ouvre directement le sélecteur (index 0 = nombre de cartes).
    this.selectedCard = 0;
    this.guiMode = true;
    this.guiModeAvailable = true;
  }

  private selectCard(index: number): void {
    this.selectedCard = index;
    this.guiMode = true;
    this.guiModeAvailable = true;
  }

  private cardsOfSelected(): LovelaceCardConfig[] {
    return cardsOf(this.config?.tabs[this.selectedTab]);
  }

  private setCards(cards: LovelaceCardConfig[], selected = this.selectedCard): void {
    if (!this.config) return;
    this.selectedCard = Math.max(0, Math.min(selected, cards.length));
    this.commit(withTabCards(this.config, this.selectedTab, cards));
  }

  /* ----- Options de la carte ----- */

  private onOptionsChanged(event: ValueChangedEvent): void {
    event.stopPropagation();
    if (!this.config) return;
    const value = { ...(event.detail.value ?? {}) };
    delete value.tabs;
    this.commit({ ...(value as Partial<TabsCardConfig>), type: this.config.type, tabs: this.config.tabs } as TabsCardConfig);
  }

  /* ----- Onglets ----- */

  private addTab(): void {
    if (!this.config) return;
    const next = withNewTab(this.config);
    this.selectedTab = next.tabs.length - 1;
    this.selectedCard = 0;
    this.commit(next);
  }

  private moveTab(offset: number): void {
    if (!this.config) return;
    const target = this.selectedTab + offset;
    if (target < 0 || target >= this.config.tabs.length) return;
    this.selectedTab = target;
    this.commit({ ...this.config, tabs: moveItem(this.config.tabs, target - offset, target) });
  }

  private removeTab(): void {
    if (!this.config || this.config.tabs.length <= 1) return;
    const next = withoutTab(this.config, this.selectedTab);
    this.selectedTab = Math.min(this.selectedTab, next.tabs.length - 1);
    this.selectedCard = 0;
    this.commit(next);
  }

  private onTabFieldsChanged(event: ValueChangedEvent): void {
    event.stopPropagation();
    if (!this.config) return;
    this.commit(withTabFields(this.config, this.selectedTab, event.detail.value ?? {}));
  }

  /* ----- Cartes de l'onglet ----- */

  private onCardPicked(event: ConfigChangedEvent): void {
    event.stopPropagation();
    const card = event.detail.config;
    if (!card) return;
    const cards = [...this.cardsOfSelected(), card];
    this.setCards(cards, cards.length - 1);
  }

  private onCardChanged(event: ConfigChangedEvent): void {
    event.stopPropagation();
    const card = event.detail.config;
    if (!card) return;
    if (typeof event.detail.guiModeAvailable === "boolean") this.guiModeAvailable = event.detail.guiModeAvailable;
    const cards = [...this.cardsOfSelected()];
    if (this.selectedCard >= cards.length) return;
    cards[this.selectedCard] = card;
    this.setCards(cards);
  }

  private onGuiModeChanged(event: CustomEvent<{ guiMode?: boolean; guiModeAvailable?: boolean }>): void {
    event.stopPropagation();
    if (typeof event.detail.guiMode === "boolean") this.guiMode = event.detail.guiMode;
    if (typeof event.detail.guiModeAvailable === "boolean") this.guiModeAvailable = event.detail.guiModeAvailable;
  }

  private toggleCardMode(): void {
    this.renderRoot.querySelector<CardElementEditor>("hui-card-element-editor")?.toggleMode?.();
  }

  private moveCard(offset: number): void {
    const target = this.selectedCard + offset;
    const cards = this.cardsOfSelected();
    if (target < 0 || target >= cards.length) return;
    this.setCards(moveItem(cards, this.selectedCard, target), target);
  }

  private copyCard(): void {
    const cards = [...this.cardsOfSelected()];
    const card = cards[this.selectedCard];
    if (!card) return;
    cards.splice(this.selectedCard + 1, 0, structuredClone(card));
    this.setCards(cards, this.selectedCard + 1);
  }

  private removeCard(): void {
    const cards = this.cardsOfSelected().filter((_card, index) => index !== this.selectedCard);
    this.setCards(cards, Math.min(this.selectedCard, Math.max(0, cards.length - 1)));
  }

  /** Repli sans les éditeurs de Home Assistant : les cartes de l'onglet en YAML. */
  private onYamlCardsChanged(event: ValueChangedEvent): void {
    event.stopPropagation();
    const value = event.detail.value?.cards;
    if (!Array.isArray(value)) return;
    this.setCards(value.filter((card): card is LovelaceCardConfig => Boolean(card) && typeof card === "object" && typeof (card as LovelaceCardConfig).type === "string"));
  }

  /* ----- Rendu ----- */

  private tool(icon: string, label: string, action: () => void, disabled = false, danger = false): TemplateResult {
    return html`<button class=${danger ? "tool danger" : "tool"} type="button" title=${label} aria-label=${label}
      ?disabled=${disabled} @click=${action}><ha-icon .icon=${icon}></ha-icon></button>`;
  }

  private renderCardOptions(): TemplateResult | typeof nothing {
    if (!this.config || !this.optionsForm) return nothing;
    const schema = [{ name: "", type: "expandable", flatten: true, title: "Apparence et comportement", icon: "mdi:palette-outline", schema: this.optionsForm.schema }];
    return html`<ha-form .hass=${this.hass} .data=${cardOptions(this.config)} .schema=${schema}
      .computeLabel=${this.optionsForm.computeLabel} @value-changed=${this.onOptionsChanged}></ha-form>`;
  }

  private renderTabs(): TemplateResult {
    const tabs = this.config?.tabs ?? [];
    const tab = tabs[this.selectedTab];
    const count = tabs.length;
    return html`<div class="section">
      <div class="section-title">Onglets</div>
      <div class="bar" role="tablist" aria-label="Onglets de la carte">
        ${tabs.map((item, index) => html`<button class=${index === this.selectedTab ? "chip active" : "chip"} type="button" role="tab"
          aria-selected=${index === this.selectedTab ? "true" : "false"} @click=${() => this.selectTab(index)}>
          ${item.icon ? html`<ha-icon .icon=${item.icon}></ha-icon>` : nothing}
          <span>${(item.label ?? item.name)?.trim() || `Onglet ${index + 1}`}</span>
        </button>`)}
        <button class="chip add" type="button" title="Ajouter un onglet" aria-label="Ajouter un onglet" @click=${this.addTab}>
          <ha-icon icon="mdi:plus"></ha-icon><span>Onglet</span>
        </button>
      </div>
      ${tab ? html`<div class="panel">
        <div class="tools">
          <span class="label">Onglet ${this.selectedTab + 1} sur ${count}</span>
          ${this.tool("mdi:arrow-left", "Déplacer l'onglet à gauche", () => this.moveTab(-1), this.selectedTab === 0)}
          ${this.tool("mdi:arrow-right", "Déplacer l'onglet à droite", () => this.moveTab(1), this.selectedTab >= count - 1)}
          ${this.tool("mdi:delete-outline", "Supprimer l'onglet", () => this.removeTab(), count <= 1, true)}
        </div>
        <ha-form .hass=${this.hass} .data=${{ ...tab, label: tab.label ?? tab.name }} .schema=${TAB_SCHEMA}
          .computeLabel=${(schema: { name: string }) => TAB_LABELS[schema.name] ?? schema.name}
          @value-changed=${this.onTabFieldsChanged}></ha-form>
        ${this.renderCards()}
      </div>` : nothing}
    </div>`;
  }

  private renderCards(): TemplateResult {
    const cards = this.cardsOfSelected();
    const registry = (typeof window !== "undefined" ? window.customCards : undefined) ?? [];
    const picking = this.selectedCard >= cards.length;
    if (!this.editorsReady) {
      return html`<div class="section">
        <div class="section-title">Cartes de l'onglet</div>
        <p class="hint">Le sélecteur de cartes de Home Assistant n'est pas disponible ici : les cartes de l'onglet se modifient en YAML.</p>
        <ha-form .hass=${this.hass} .data=${{ cards }} .schema=${[{ name: "cards", selector: { object: {} } }]}
          .computeLabel=${(schema: { name: string }) => TAB_LABELS[schema.name] ?? schema.name}
          @value-changed=${this.onYamlCardsChanged}></ha-form>
      </div>`;
    }
    return html`<div class="section">
      <div class="section-title">Cartes de l'onglet</div>
      <div class="bar" role="tablist" aria-label="Cartes de l'onglet">
        ${cards.map((card, index) => html`<button class=${index === this.selectedCard ? "chip active" : "chip"} type="button" role="tab"
          aria-selected=${index === this.selectedCard ? "true" : "false"} @click=${() => this.selectCard(index)}>
          <span>${index + 1} · ${cardTitle(card, registry)}</span>
        </button>`)}
        <button class=${picking ? "chip add active" : "chip add"} type="button" title="Ajouter une carte" aria-label="Ajouter une carte"
          @click=${() => this.selectCard(cards.length)}>
          <ha-icon icon="mdi:plus"></ha-icon><span>Carte</span>
        </button>
      </div>
      ${picking
        ? html`${cards.length ? nothing : html`<div class="empty">Cet onglet n'a pas encore de carte : choisissez-en une ci-dessous.</div>`}
          <hui-card-picker .hass=${this.hass} .lovelace=${this.lovelace} @config-changed=${this.onCardPicked}></hui-card-picker>`
        : html`<div class="tools">
            <span class="label">Carte ${this.selectedCard + 1} sur ${cards.length}</span>
            ${this.tool(this.guiMode ? "mdi:code-braces" : "mdi:list-box-outline", this.guiMode ? "Modifier en YAML" : "Revenir au formulaire",
              () => this.toggleCardMode(), !this.guiModeAvailable && this.guiMode)}
            ${this.tool("mdi:arrow-left", "Déplacer la carte avant", () => this.moveCard(-1), this.selectedCard === 0)}
            ${this.tool("mdi:arrow-right", "Déplacer la carte après", () => this.moveCard(1), this.selectedCard >= cards.length - 1)}
            ${this.tool("mdi:content-copy", "Dupliquer la carte", () => this.copyCard())}
            ${this.tool("mdi:delete-outline", "Supprimer la carte", () => this.removeCard(), false, true)}
          </div>
          <hui-card-element-editor .hass=${this.hass} .lovelace=${this.lovelace} .value=${cards[this.selectedCard]}
            .GUImode=${this.guiMode} @config-changed=${this.onCardChanged} @GUImode-changed=${this.onGuiModeChanged}></hui-card-element-editor>`}
    </div>`;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.config) return nothing;
    return html`${this.renderCardOptions()}${this.renderTabs()}`;
  }
}

/** Définit l'élément de l'éditeur à la première demande de Home Assistant. */
export function defineTabsEditor(): void {
  if (typeof customElements !== "undefined" && !customElements.get(TABS_EDITOR_TAG)) {
    customElements.define(TABS_EDITOR_TAG, AuralisTabsCardEditor);
  }
}
