import { css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import type { BaseCardConfig } from "../types/config";
import type { HomeAssistant, LovelaceCardConfig } from "../types/home-assistant";
import { AuralisBaseCard } from "./auralis-base-card";
import { sharedStyles } from "../styles/shared";
import { entity } from "../utils/entities";

export interface TabConfig {
  /** Nom de l'onglet. `name` est accepté comme alias. */
  label?: string;
  name?: string;
  icon?: string;
  /** Entité dont l'état s'affiche en pastille sur l'onglet (nombre, ou point si « on »). */
  badge_entity?: string;
  /** Cartes de l'onglet, empilées. `card` accepte une carte seule. */
  cards?: LovelaceCardConfig[];
  card?: LovelaceCardConfig;
  /** Nombre de colonnes des cartes de l'onglet (1 à 4). Une seule colonne sur un écran étroit. */
  columns?: number;
}

export interface TabsCardConfig extends BaseCardConfig {
  type: "custom:auralis-tabs-card";
  tabs: TabConfig[];
  /** Onglet ouvert au chargement, à partir de 1. */
  default_tab?: number;
  /** Rouvre le dernier onglet choisi sur cet appareil. */
  remember_tab?: boolean;
  /** Identifiant de mémorisation, utile quand deux cartes Onglets ont les mêmes noms. */
  id?: string;
  /** `pills` (pastilles, par défaut) ou `underline` (soulignés). */
  tab_style?: "pills" | "underline";
  show_labels?: boolean;
  /** Entoure les onglets et leur contenu d'un cadre Auralis. */
  framed?: boolean;
  /** Glisser horizontalement sur le contenu pour changer d'onglet. */
  swipe?: boolean;
}

interface CardHelpers {
  createCardElement(config: LovelaceCardConfig): HTMLElement;
}

type CardElement = HTMLElement & {
  hass?: HomeAssistant;
  setConfig?: (config: LovelaceCardConfig) => void;
  getCardSize?: () => number | Promise<number>;
};

declare global {
  interface Window {
    loadCardHelpers?: () => Promise<CardHelpers>;
  }
}

const SWIPE_DISTANCE = 60;
let helpersPromise: Promise<CardHelpers | undefined> | undefined;

function cardHelpers(): Promise<CardHelpers | undefined> {
  if (typeof window === "undefined" || !window.loadCardHelpers) return Promise.resolve(undefined);
  helpersPromise ??= window.loadCardHelpers().catch(() => undefined);
  return helpersPromise;
}

/** Nom affiché d'un onglet. */
export function tabLabel(tab: TabConfig, index: number): string {
  return (tab.label ?? tab.name)?.trim() || `Onglet ${index + 1}`;
}

/** Cartes d'un onglet, quelle que soit la forme choisie (`cards` ou `card`). */
export function tabCards(tab: TabConfig): LovelaceCardConfig[] {
  if (Array.isArray(tab.cards)) return tab.cards;
  return tab.card ? [tab.card] : [];
}

/** Pastille d'un onglet : nombre (99+ au-delà), point pour un état actif, rien sinon. */
export function tabBadge(state?: string): string | undefined {
  if (!state || state === "unavailable" || state === "unknown") return undefined;
  const count = Number(state);
  if (Number.isFinite(count)) return count > 0 ? (count > 99 ? "99+" : String(Math.round(count))) : undefined;
  return ["on", "open", "home", "playing", "problem", "detected"].includes(state) ? "•" : undefined;
}

/** Index de départ : onglet mémorisé s'il existe encore, sinon `default_tab` (à partir de 1). */
export function initialTab(config: Pick<TabsCardConfig, "tabs" | "default_tab">, remembered?: number): number {
  const count = config.tabs.length;
  if (remembered !== undefined && Number.isInteger(remembered) && remembered >= 0 && remembered < count) return remembered;
  const wanted = Math.round(Number(config.default_tab ?? 1)) - 1;
  return Number.isFinite(wanted) ? Math.min(count - 1, Math.max(0, wanted)) : 0;
}

/** Onglet suivant pour les flèches du clavier ou un glissement, en boucle. */
export function nextTab(current: number, count: number, key: string): number | undefined {
  if (count < 1) return undefined;
  if (key === "ArrowRight" || key === "ArrowDown") return (current + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (current - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return undefined;
}

/** Carte Home Assistant ou personnalisée, créée comme le ferait une pile de cartes. */
async function createCard(config: LovelaceCardConfig): Promise<CardElement> {
  const helpers = await cardHelpers();
  if (helpers) return helpers.createCardElement(config) as CardElement;
  // Hors de Home Assistant (démonstration, tests) : seules les cartes personnalisées existent.
  const tag = typeof config.type === "string" && config.type.startsWith("custom:") ? config.type.slice(7) : undefined;
  const element = document.createElement(tag && customElements.get(tag) ? tag : "div") as CardElement;
  if (element.setConfig) element.setConfig(config);
  else element.textContent = `Carte « ${config.type} » indisponible ici.`;
  return element;
}

export class AuralisTabsCard extends AuralisBaseCard<TabsCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    active: { state: true },
  };

  static styles = [
    sharedStyles,
    css`
      :host {
        --tabs-accent: var(--auralis-card-accent, var(--auralis-info));
        background: transparent;
      }

      .tabs-root {
        display: grid;
        gap: 12px;
      }

      .tabs-root.framed {
        padding: 14px;
        border: 1px solid var(--auralis-border);
        border-radius: var(--auralis-radius-xl);
        background: var(--auralis-card-background, var(--auralis-bg));
        box-shadow: var(--auralis-shadow);
      }

      .tab-bar {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding: 5px;
        border: 1px solid var(--auralis-border);
        border-radius: 999px;
        background: color-mix(in srgb, var(--auralis-card) 88%, transparent);
        backdrop-filter: blur(14px);
        scrollbar-width: none;
      }

      .tab-bar::-webkit-scrollbar {
        display: none;
      }

      .tab {
        position: relative;
        display: inline-flex;
        min-height: var(--auralis-target);
        flex: 1 0 auto;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 16px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: var(--auralis-muted);
        cursor: pointer;
        font-size: var(--auralis-text-md);
        font-weight: 680;
        white-space: nowrap;
        transition: background 160ms ease, color 160ms ease;
      }

      .tab ha-icon {
        --mdc-icon-size: 20px;
      }

      .tab:hover {
        color: var(--auralis-text);
      }

      .tab[aria-selected="true"] {
        background: color-mix(in srgb, var(--tabs-accent) 18%, var(--auralis-layer));
        color: var(--auralis-text);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tabs-accent) 42%, transparent);
      }

      .tab[aria-selected="true"] ha-icon {
        color: var(--tabs-accent);
      }

      .underline .tab-bar {
        padding: 0;
        border: 0;
        border-bottom: 1px solid var(--auralis-border);
        border-radius: 0;
        background: transparent;
        backdrop-filter: none;
      }

      .underline .tab {
        border-radius: 0;
      }

      .underline .tab[aria-selected="true"] {
        background: transparent;
        box-shadow: inset 0 -3px 0 var(--tabs-accent);
      }

      .badge {
        display: inline-grid;
        min-width: 20px;
        height: 20px;
        place-items: center;
        padding: 0 6px;
        border-radius: 999px;
        background: var(--auralis-danger);
        color: #fff;
        font-size: var(--auralis-text-xs);
        font-weight: 760;
      }

      .badge.dot {
        min-width: 10px;
        height: 10px;
        padding: 0;
        background: var(--tabs-accent);
        font-size: 0;
      }

      .tab-panel {
        display: grid;
        grid-template-columns: repeat(var(--tab-columns, 1), minmax(0, 1fr));
        gap: var(--tabs-gap, 12px);
        container-type: inline-size;
        animation: tab-in 160ms ease-out;
      }

      .tab-panel:focus-visible {
        outline: 2px solid var(--tabs-accent);
        outline-offset: 4px;
        border-radius: var(--auralis-radius-lg);
      }

      .loading {
        padding: 24px;
        color: var(--auralis-muted);
        font-size: var(--auralis-text-md);
        text-align: center;
      }

      @keyframes tab-in {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: none; }
      }

      @media (max-width: 640px) {
        .tab-panel {
          grid-template-columns: minmax(0, 1fr);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .tab-panel {
          animation: none;
        }
      }
    `,
  ];

  protected active = 0;
  private readonly created = new Map<number, CardElement[]>();
  private readonly creating = new Set<number>();
  private swipeStart?: { x: number; y: number };

  public setConfig(config: TabsCardConfig): void {
    if (!Array.isArray(config?.tabs) || !config.tabs.length) {
      throw new Error("tabs doit contenir au moins un onglet.");
    }
    config.tabs.forEach((tab, index) => {
      if (!tab || typeof tab !== "object") throw new Error(`L'onglet ${index + 1} est invalide.`);
      const cards = tabCards(tab);
      if (!cards.length) throw new Error(`L'onglet « ${tabLabel(tab, index)} » ne contient aucune carte.`);
      if (cards.some((card) => !card || typeof card.type !== "string")) {
        throw new Error(`L'onglet « ${tabLabel(tab, index)} » contient une carte sans type.`);
      }
    });
    if (config.tab_style && !["pills", "underline"].includes(config.tab_style)) {
      throw new Error("tab_style doit être pills ou underline.");
    }
    const previous = this.config;
    this.config = { theme: "auto", show_labels: true, ...config };
    // Une nouvelle configuration recrée les cartes, l'onglet ouvert reste le même si possible.
    if (previous) this.created.clear();
    this.active = initialTab(this.config, previous ? this.active : this.rememberedTab());
  }

  public static getStubConfig(): Partial<TabsCardConfig> {
    return {
      type: "custom:auralis-tabs-card",
      tabs: [
        { label: "Maison", icon: "mdi:home-outline", cards: [{ type: "markdown", content: "Ajoutez ici les cartes du premier onglet." }] },
        { label: "Énergie", icon: "mdi:lightning-bolt-outline", cards: [{ type: "markdown", content: "Puis celles du deuxième." }] },
      ],
    };
  }

  public static getConfigForm(): Record<string, unknown> {
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "default_tab", selector: { number: { min: 1, max: 20, mode: "box" } } },
        { name: "remember_tab", selector: { boolean: {} } },
        { name: "tab_style", selector: { select: { options: [
          { value: "pills", label: "Pastilles" },
          { value: "underline", label: "Soulignés" },
        ], mode: "dropdown" } } },
        { name: "show_labels", selector: { boolean: {} } },
        { name: "framed", selector: { boolean: {} } },
        { name: "swipe", selector: { boolean: {} } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        { name: "accent_color", selector: { text: {} } },
        { name: "tabs", selector: { object: {} } },
      ],
      computeLabel: (schema: { name: string }) => ({
        name: "Nom (lecteurs d'écran)",
        default_tab: "Onglet ouvert au chargement",
        remember_tab: "Mémoriser le dernier onglet",
        tab_style: "Style des onglets",
        show_labels: "Afficher les noms",
        framed: "Cadre autour des onglets",
        swipe: "Glisser pour changer d'onglet",
        theme: "Thème",
        accent_color: "Couleur d'accent",
        tabs: "Onglets et cartes (YAML)",
      } as Record<string, string>)[schema.name] ?? schema.name,
    };
  }

  public getGridOptions(): Record<string, number | string> {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  public getCardSize(): number {
    const sizes = (this.created.get(this.active) ?? []).map((card) => {
      const size = card.getCardSize?.();
      return typeof size === "number" && Number.isFinite(size) ? size : 3;
    });
    return 1 + (sizes.length ? sizes.reduce((sum, size) => sum + size, 0) : 3);
  }

  /** Les cartes des onglets reçoivent chaque `hass`, même quand les onglets n'ont pas à se redessiner. */
  protected shouldUpdate(changed: PropertyValues): boolean {
    if (changed.has("hass")) {
      for (const cards of this.created.values()) for (const card of cards) card.hass = this.hass;
    }
    return super.shouldUpdate(changed);
  }

  /** Seules les pastilles des onglets concernent la barre ; les cartes suivent leurs propres entités. */
  protected watchedEntityIds(): Set<string> {
    return new Set((this.config?.tabs ?? []).map((tab) => tab.badge_entity).filter((id): id is string => Boolean(id)));
  }

  protected updated(): void {
    super.updated();
    void this.ensureTab(this.active);
  }

  private storageKey(): string | undefined {
    if (!this.config?.remember_tab) return undefined;
    const id = this.config.id?.trim() || `${typeof location === "undefined" ? "" : location.pathname}:${this.config.tabs.map(tabLabel).join("|")}`;
    return `auralis-tabs:${id}`;
  }

  private rememberedTab(): number | undefined {
    const key = this.storageKey();
    if (!key) return undefined;
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? undefined : Number(value);
    } catch {
      return undefined;
    }
  }

  private selectTab(index: number, focus = false): void {
    if (!this.config || index === this.active || index < 0 || index >= this.config.tabs.length) return;
    this.active = index;
    const key = this.storageKey();
    if (key) {
      try { window.localStorage.setItem(key, String(index)); } catch { /* stockage indisponible : sans mémorisation */ }
    }
    if (focus) {
      void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement>(`#tab-${index}`)?.focus());
    }
  }

  /** Crée les cartes d'un onglet à sa première ouverture, puis les garde pour ne pas perdre leur état. */
  private async ensureTab(index: number): Promise<void> {
    const tab = this.config?.tabs[index];
    if (!tab || this.created.has(index) || this.creating.has(index)) return;
    const config = this.config;
    this.creating.add(index);
    try {
      const cards = await Promise.all(tabCards(tab).map((card) => this.buildCard(card)));
      if (this.config !== config) return;
      this.created.set(index, cards);
      this.requestUpdate();
    } finally {
      this.creating.delete(index);
    }
  }

  private async buildCard(config: LovelaceCardConfig): Promise<CardElement> {
    const card = await createCard(config);
    card.hass = this.hass;
    // Une carte personnalisée chargée après coup demande à être recréée.
    card.addEventListener("ll-rebuild", (event) => {
      event.stopPropagation();
      void this.rebuildCard(card, config);
    }, { once: true });
    return card;
  }

  private async rebuildCard(old: CardElement, config: LovelaceCardConfig): Promise<void> {
    const fresh = await this.buildCard(config);
    for (const [index, cards] of this.created) {
      const position = cards.indexOf(old);
      if (position >= 0) {
        cards[position] = fresh;
        this.created.set(index, [...cards]);
        this.requestUpdate();
        return;
      }
    }
  }

  private onKeydown(event: KeyboardEvent): void {
    const next = nextTab(this.active, this.config?.tabs.length ?? 0, event.key);
    if (next === undefined) return;
    event.preventDefault();
    this.selectTab(next, true);
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.config?.swipe || event.pointerType === "mouse") return;
    this.swipeStart = { x: event.clientX, y: event.clientY };
  }

  private onPointerUp(event: PointerEvent): void {
    const start = this.swipeStart;
    this.swipeStart = undefined;
    if (!start || !this.config) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const next = nextTab(this.active, this.config.tabs.length, dx < 0 ? "ArrowRight" : "ArrowLeft");
    if (next !== undefined) this.selectTab(next);
  }

  private renderTab(tab: TabConfig, index: number): TemplateResult {
    const selected = index === this.active;
    const label = tabLabel(tab, index);
    const badge = tabBadge(entity(this.hass, tab.badge_entity)?.state);
    const showLabel = this.config?.show_labels !== false || !tab.icon;
    return html`<button class="tab" type="button" role="tab" id=${`tab-${index}`}
      aria-selected=${selected ? "true" : "false"} aria-controls="tab-panel" tabindex=${selected ? "0" : "-1"}
      aria-label=${showLabel ? nothing : label} title=${showLabel ? nothing : label}
      @click=${() => this.selectTab(index)}>
      ${tab.icon ? html`<ha-icon .icon=${tab.icon}></ha-icon>` : nothing}
      ${showLabel ? html`<span>${label}</span>` : nothing}
      ${badge === "•"
        ? html`<span class="badge dot" aria-label="Actif"></span>`
        : badge ? html`<span class="badge" aria-label=${`${badge} alerte${badge === "1" ? "" : "s"}`}>${badge}</span>` : nothing}
    </button>`;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.config) return nothing;
    const tab = this.config.tabs[this.active];
    const cards = this.created.get(this.active);
    const columns = Math.min(4, Math.max(1, Math.round(Number(tab?.columns ?? 1)) || 1));
    const classes = [
      "tabs-root",
      this.config.framed ? "framed" : "",
      this.config.tab_style === "underline" ? "underline" : "",
    ].filter(Boolean).join(" ");
    return html`<div class=${classes}>
      <div class="tab-bar" role="tablist" aria-label=${this.config.name || "Onglets"} @keydown=${this.onKeydown}>
        ${this.config.tabs.map((item, index) => this.renderTab(item, index))}
      </div>
      <div class="tab-panel" id="tab-panel" role="tabpanel" aria-labelledby=${`tab-${this.active}`} tabindex="0"
        style=${`--tab-columns:${columns}`}
        @pointerdown=${this.onPointerDown} @pointerup=${this.onPointerUp} @pointercancel=${() => (this.swipeStart = undefined)}>
        ${cards ?? html`<div class="loading">Chargement…</div>`}
      </div>
    </div>`;
  }
}
