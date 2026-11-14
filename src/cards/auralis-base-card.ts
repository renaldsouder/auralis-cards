import { LitElement, html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from "lit";
import type { BaseCardConfig, AuralisTheme } from "../types/config";
import type { HomeAssistant } from "../types/home-assistant";
import { sharedStyles } from "../styles/shared";
import { setAuralisDialogOpen } from "../utils/dialog-visibility";
import { activateEntity, fireMoreInfo } from "../utils/actions";
import { entity, isCommandable } from "../utils/entities";
import { collectEntityIds, hassChangeMatters } from "../utils/watch";
import { CONFIRM_TIMEOUT, expectedChanges, isConfirmed, shownState, type PendingExpectation } from "../utils/optimistic";
import { alertLevel, severity, severityClass } from "../utils/severity";

/** Durée pendant laquelle un réveil demandé reste affiché « en cours ». */
export const WAKE_WINDOW = 180_000;

const UNSAFE_CSS = /[;{}]/;

/** `accent_color` configuré, si on peut l'injecter dans une déclaration CSS. */
export function configuredAccent(config?: BaseCardConfig): string | undefined {
  const accent = config?.accent_color?.trim();
  return accent && !UNSAFE_CSS.test(accent) ? accent : undefined;
}

/** Fond `card_background` configuré : le dégradé en mode `gradient`, sinon la couleur. */
export function configuredBackground(config?: BaseCardConfig): string | undefined {
  const background = config?.card_background?.mode === "gradient"
    ? config.card_background.gradient
    : config?.card_background?.color;
  const value = background?.trim();
  return value && !UNSAFE_CSS.test(value) ? value : undefined;
}

/** Durée d'affichage d'un message de retour (échec ou confirmation d'une commande). */
export const FEEDBACK_DURATION = 6_000;

export interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => Promise<unknown> | void;
  /** `false` pour un bouton de confirmation neutre ; rouge par défaut. */
  danger?: boolean;
}

export interface ActionFeedback {
  tone: "error" | "success";
  message: string;
}

/** Message lisible d'une erreur Home Assistant ou JavaScript. */
export function actionErrorMessage(error: unknown, fallback = "La commande a échoué."): string {
  const message = typeof error === "object" && error && "message" in error ? (error as { message?: unknown }).message : undefined;
  return typeof message === "string" && message.trim() ? `${fallback} ${message.trim()}` : fallback;
}

/** Élément actif réel, y compris à l'intérieur des shadow roots. */
function deepActiveElement(): HTMLElement | undefined {
  if (typeof document === "undefined") return undefined;
  let active = document.activeElement as HTMLElement | null;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement as HTMLElement;
  return active ?? undefined;
}

export abstract class AuralisBaseCard<TConfig extends BaseCardConfig> extends LitElement {
  static properties = {
    // Accesseur écrit à la main : la carte voit l'état visé par ses commandes en attente.
    hass: { attribute: false, noAccessor: true },
    config: { state: true },
    dialog: { state: true },
    confirmState: { state: true },
    wakeRequestedAt: { state: true },
    pendingActions: { state: true },
    feedback: { state: true },
    expectations: { state: true },
  };

  static styles: CSSResultGroup = sharedStyles;

  config?: TConfig;
  protected dialog: string | null = null;
  protected confirmState: ConfirmState | null = null;
  protected wakeRequestedAt?: number;
  /** Commandes en cours, par clé (`power`, `light.salon`, `vm:231`…). */
  protected pendingActions: ReadonlySet<string> = new Set();
  /** Dernier retour d'une commande, affiché quelques secondes en haut de l'écran. */
  protected feedback?: ActionFeedback;
  private wakeTimer?: number;
  private feedbackTimer?: number;
  private feedbackNode?: HTMLElement;
  private watched?: { config: TConfig | undefined; ids: Set<string> };
  private shownDialog: string | null = null;
  private dialogOpener?: HTMLElement;
  private confirmShown = false;
  private confirmOpener?: HTMLElement;
  /** `hass` reçu de Home Assistant, et celui montré à la carte (états visés, appels suivis). */
  private realHass?: HomeAssistant;
  private shownHass?: HomeAssistant;
  /** Commandes envoyées dont l'appareil n'a pas encore confirmé l'effet, par entité. */
  protected expectations: ReadonlyMap<string, PendingExpectation> = new Map();
  /** Clé de la commande en cours d'envoi, rattachée aux états attendus qu'elle produit. */
  private commandKey?: string;
  private expectationTimer?: number;

  /**
   * `hass` vu par la carte : l'état réel de la maison, où chaque commande en attente affiche
   * déjà l'état visé (lampe allumée, curseur à sa nouvelle valeur), et dont `callService`
   * enregistre l'état attendu de chaque appel.
   */
  get hass(): HomeAssistant | undefined {
    return this.shownHass;
  }

  set hass(value: HomeAssistant | undefined) {
    const old = this.shownHass;
    // Un `hass` déjà montré par cette carte, renvoyé tel quel : on garde le vrai `callService`.
    if (value && value.callService === this.trackedCallService) {
      value = { ...value, callService: this.realHass?.callService ?? (() => Promise.reject(new Error("Home Assistant n'est pas disponible."))) };
    }
    this.realHass = value;
    this.settleExpectations();
    this.shownHass = this.buildShownHass();
    this.requestUpdate("hass", old);
  }

  private buildShownHass(): HomeAssistant | undefined {
    const real = this.realHass;
    if (!real) return undefined;
    let states = real.states;
    if (this.expectations.size) {
      states = { ...real.states };
      for (const [id, pending] of this.expectations) {
        const shown = shownState(pending, real.states[id]);
        if (shown) states[id] = shown;
      }
    }
    return { ...real, states, callService: this.trackedCallService };
  }

  private refreshShownHass(): void {
    const old = this.shownHass;
    this.shownHass = this.buildShownHass();
    this.requestUpdate("hass", old);
  }

  /** Appel de service suivi : l'état visé s'affiche aussitôt et attend la confirmation de l'appareil. */
  private trackedCallService = (...args: Parameters<HomeAssistant["callService"]>): Promise<unknown> => {
    const real = this.realHass;
    if (!real) return Promise.reject(new Error("Home Assistant n'est pas disponible."));
    const [domain, service, data, target] = args;
    const ids = expectedChanges(real, domain, service, data, target);
    const touched = new Set([...ids.map((item) => item.entityId), ...this.targetsOf(data, target)]);
    // Une nouvelle commande remplace l'attente précédente des mêmes entités.
    const next = new Map([...this.expectations].filter(([id]) => !touched.has(id)));
    const deadline = Date.now() + CONFIRM_TIMEOUT;
    const created: PendingExpectation[] = ids.map((item) => ({ ...item, key: this.commandKey, sent: real.states[item.entityId], deadline }));
    for (const item of created) next.set(item.entityId, item);
    if (created.length || next.size !== this.expectations.size) {
      this.expectations = next;
      this.scheduleExpectationCheck();
      this.refreshShownHass();
    }
    const result = real.callService(...args);
    // Refusée par Home Assistant : l'état réel revient tout de suite. L'appelant reçoit l'erreur
    // par la promesse d'origine, sans délai supplémentaire.
    Promise.resolve(result).catch(() => {
      const remaining = new Map([...this.expectations].filter(([, item]) => !created.includes(item)));
      if (remaining.size !== this.expectations.size) {
        this.expectations = remaining;
        this.refreshShownHass();
      }
    });
    return result;
  };

  private targetsOf(data?: Record<string, unknown>, target?: Record<string, unknown>): string[] {
    const raw = target?.entity_id ?? data?.entity_id;
    return (Array.isArray(raw) ? raw : [raw]).filter((id): id is string => typeof id === "string");
  }

  /** Retire les attentes confirmées ; celles restées sans réponse reviennent à l'état réel, avec un message. */
  private settleExpectations(now = Date.now()): void {
    if (!this.expectations.size) return;
    const states = this.realHass?.states ?? {};
    const next = new Map<string, PendingExpectation>();
    const late: string[] = [];
    for (const [id, pending] of this.expectations) {
      if (isConfirmed(pending, states[id])) continue;
      if (now >= pending.deadline) {
        late.push(id);
        continue;
      }
      next.set(id, pending);
    }
    if (next.size === this.expectations.size) return;
    this.expectations = next;
    this.scheduleExpectationCheck();
    if (late.length) {
      const names = late.map((id) => {
        const name = states[id]?.attributes.friendly_name;
        return `« ${typeof name === "string" && name ? name : id} »`;
      });
      this.showFeedback("error", late.length === 1
        ? `${names[0]} n’a pas confirmé la commande.`
        : `${names.join(", ")} n’ont pas confirmé la commande.`);
    }
  }

  private scheduleExpectationCheck(): void {
    if (typeof window === "undefined") return;
    window.clearTimeout(this.expectationTimer);
    if (!this.expectations.size) return;
    const next = Math.min(...[...this.expectations.values()].map((item) => item.deadline));
    this.expectationTimer = window.setTimeout(() => {
      this.settleExpectations();
      this.refreshShownHass();
    }, Math.max(0, next - Date.now()) + 50);
  }

  /** Vrai pendant qu'une entité attend la confirmation d'une commande. */
  protected isAwaiting(entityId: string): boolean {
    return this.expectations.has(entityId);
  }

  /** Vrai si l'une des entités attend la confirmation d'un marche/arrêt (vers `state` s'il est donné). */
  protected awaitingAny(ids: string[], state?: string): boolean {
    return ids.some((id) => {
      const wanted = this.expectations.get(id)?.state;
      return wanted !== undefined && (state === undefined || wanted === state);
    });
  }

  /**
   * Ne redessine la carte que si une entité qu'elle cite a changé. Home Assistant envoie un
   * nouvel objet `hass` à chaque changement d'état de la maison : sans ce filtre, toutes les
   * cartes se redessinent plusieurs fois par seconde sur une tablette murale.
   */
  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!changed.has("hass") || changed.size > 1) return true;
    return hassChangeMatters(changed.get("hass") as HomeAssistant | undefined, this.hass, this.watchedEntityIds());
  }

  /** Entités suivies : toutes celles de la configuration, plus `extraWatchedEntities()`. */
  protected watchedEntityIds(): Set<string> {
    if (this.watched?.config !== this.config) {
      const ids = collectEntityIds(this.config);
      for (const id of this.extraWatchedEntities()) ids.add(id);
      this.watched = { config: this.config, ids };
    }
    return this.watched!.ids;
  }

  /** Entités lues par la carte sans figurer dans sa configuration (ex. `sun.sun` par défaut). */
  protected extraWatchedEntities(): string[] {
    return [];
  }

  /**
   * Commande en cours d'envoi, ou marche/arrêt envoyé et pas encore confirmé par l'appareil : un
   * second appui est ignoré. Un réglage (intensité, position, volume) reste modifiable aussitôt.
   */
  protected isPending(key: string): boolean {
    if (this.pendingActions.has(key)) return true;
    for (const item of this.expectations.values()) if (item.key === key && item.state !== undefined) return true;
    return false;
  }

  /**
   * Lance une commande avec un état « en cours » et un message visible en cas d'échec.
   * Une même clé ne peut pas être relancée tant que la précédente n'a pas répondu.
   * Retourne `true` si la commande a réussi.
   */
  protected async runCommand(
    key: string,
    action: () => Promise<unknown> | unknown,
    options: { errorMessage?: string; successMessage?: string } = {},
  ): Promise<boolean> {
    if (this.pendingActions.has(key)) return false;
    this.pendingActions = new Set([...this.pendingActions, key]);
    try {
      // Les appels de service lancés ici rattachent leur état attendu à cette commande.
      const previousKey = this.commandKey;
      this.commandKey = key;
      let running: Promise<unknown> | unknown;
      try {
        running = action();
      } finally {
        this.commandKey = previousKey;
      }
      await running;
      if (options.successMessage) this.showFeedback("success", options.successMessage);
      return true;
    } catch (error) {
      console.warn("Auralis : échec de la commande", key, error);
      this.showFeedback("error", actionErrorMessage(error, options.errorMessage));
      return false;
    } finally {
      const next = new Set(this.pendingActions);
      next.delete(key);
      this.pendingActions = next;
    }
  }

  protected showFeedback(tone: ActionFeedback["tone"], message: string): void {
    this.feedback = { tone, message };
    window.clearTimeout(this.feedbackTimer);
    this.feedbackTimer = window.setTimeout(() => { this.feedback = undefined; }, FEEDBACK_DURATION);
  }

  /** Ouvre la fiche Home Assistant d'une entité. */
  protected moreInfo(entityId?: string): void {
    fireMoreInfo(this, entityId);
  }

  /**
   * Message de retour posé hors du rendu Lit, à la fin de la shadow root : chaque carte en
   * profite sans modifier son gabarit. Lit ne touche qu'à ses propres nœuds.
   */
  private syncFeedbackNode(): void {
    const root = this.renderRoot;
    if (!root || typeof document === "undefined") return;
    if (!this.feedback) {
      this.feedbackNode?.toggleAttribute("hidden", true);
      return;
    }
    if (!this.feedbackNode) {
      this.feedbackNode = document.createElement("div");
      this.feedbackNode.className = "auralis-feedback";
      this.feedbackNode.setAttribute("role", "status");
      this.feedbackNode.setAttribute("aria-live", "polite");
    }
    if (this.feedbackNode.parentNode !== root) root.appendChild(this.feedbackNode);
    this.feedbackNode.dataset.tone = this.feedback.tone;
    this.feedbackNode.textContent = this.feedback.message;
    this.feedbackNode.toggleAttribute("hidden", false);
  }

  /**
   * Focus sur la fenêtre (ou la confirmation) à l'ouverture, retour à l'élément d'origine à la
   * fermeture. Une confirmation ouverte depuis une fenêtre rend ensuite le focus à cette fenêtre.
   */
  private syncDialogFocus(): void {
    if (this.dialog !== this.shownDialog) {
      const opened = this.shownDialog === null && this.dialog !== null;
      const closed = this.shownDialog !== null && this.dialog === null;
      this.shownDialog = this.dialog;
      if (opened) {
        this.dialogOpener = deepActiveElement();
        this.renderRoot.querySelector<HTMLElement>(".dialog:not(.confirm-dialog) [data-dialog-close], .dialog:not(.confirm-dialog) [aria-label='Fermer']")
          ?.focus({ preventScroll: true });
      } else if (closed) {
        const opener = this.dialogOpener;
        this.dialogOpener = undefined;
        if (opener?.isConnected) opener.focus({ preventScroll: true });
      }
    }
    const confirmShown = this.confirmState !== null;
    if (confirmShown === this.confirmShown) return;
    this.confirmShown = confirmShown;
    if (confirmShown) {
      this.confirmOpener = deepActiveElement();
      this.renderRoot.querySelector<HTMLElement>(".confirm-dialog [data-dialog-close]")?.focus({ preventScroll: true });
    } else {
      const opener = this.confirmOpener;
      this.confirmOpener = undefined;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    }
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || (this.dialog === null && this.confirmState === null)) return;
    event.stopPropagation();
    if (this.confirmState) this.confirmState = null;
    else this.closeDialog();
  };

  protected get theme(): Exclude<AuralisTheme, "auto"> {
    const configured = this.config?.theme || "auto";
    if (configured !== "auto") return configured;
    return this.hass?.themes?.darkMode ? "carbon" : "halo";
  }

  protected syncTheme(): void {
    this.dataset.theme = this.theme;
    this.applyHostPalette();
  }

  protected machineStyle(defaultAccent: string): string {
    const image = this.config?.background_image?.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    const accent = configuredAccent(this.config) ?? defaultAccent;
    const configuredPosition = this.config?.background_position?.trim();
    const position = configuredPosition && /^[\w\s.%+-]+$/.test(configuredPosition) ? configuredPosition : "center";
    const brightness = Math.min(100, Math.max(30, Number(this.config?.image_brightness ?? 72))) / 100;
    const configuredOpacity = Number(this.config?.image_opacity ?? 100);
    const imageOpacity = Number.isFinite(configuredOpacity)
      ? Math.min(100, Math.max(0, configuredOpacity)) / 100
      : 1;
    const glass = Math.min(0.96, Math.max(0.45, Number(this.config?.glass_opacity ?? 0.84)));
    const backgroundMode = this.config?.card_background?.mode;
    const baseBackground = configuredBackground(this.config) || (backgroundMode === "solid" || backgroundMode === "grid"
      ? "#090d12"
      : "radial-gradient(circle at 70% 38%, #27354a, #111924 44%, #080c11 75%)");

    return [
      image ? `--machine-image:url("${image}")` : "",
      `--machine-accent:${accent}`,
      `--machine-image-position:${position}`,
      `--machine-image-brightness:${brightness}`,
      `--machine-image-opacity:${imageOpacity}`,
      `--machine-glass-alpha:${glass}`,
      `--machine-base-background:${baseBackground}`,
    ]
      .filter(Boolean)
      .join(";");
  }

  /**
   * Cartes à thème (Lumières, Volets, Énergie) : pose sur l'hôte `--auralis-card-accent`
   * et `--auralis-card-background`, avec les attributs `data-accent` / `data-background`,
   * seulement quand ils sont configurés, pour garder l'apparence par défaut sinon.
   */
  protected applyHostPalette(): void {
    if (!this.style) return;
    const accent = configuredAccent(this.config);
    const background = configuredBackground(this.config);
    for (const [name, attribute, value] of [
      ["--auralis-card-accent", "data-accent", accent],
      ["--auralis-card-background", "data-background", background],
    ] as const) {
      if (value) this.style.setProperty(name, value);
      else this.style.removeProperty(name);
      this.toggleAttribute(attribute, Boolean(value));
    }
  }

  protected machineGridClass(): string {
    const defaultGrid = this.config?.card_background?.mode === "grid";
    return (this.config?.show_grid ?? defaultGrid) ? "show-grid" : "";
  }

  /** Cadrans CPU et RAM, colorés en ambre puis en rouge au-delà des seuils `alert_levels`. */
  protected renderResourceGauges(cpu?: number, memory?: number): TemplateResult {
    const metrics = [
      { label: "CPU", value: cpu, metric: "cpu" as const },
      { label: "RAM", value: memory, metric: "memory" as const },
    ].filter((item): item is { label: string; value: number; metric: "cpu" | "memory" } =>
      item.value !== undefined && Number.isFinite(item.value));
    if (!metrics.length) return html``;
    return html`<div class="machine-resource-gauges">
      ${metrics.map(({ label, value, metric }) => html`<div
        class="machine-gauge ${severityClass(severity(value, alertLevel(this.config?.alert_levels, metric)))}"
        style=${`--value:${Math.min(100, Math.max(0, value))}`}
        role="meter" aria-label=${label} aria-valuemin="0" aria-valuemax="100" aria-valuenow=${value}>
        <div class="machine-gauge-content"><strong>${Math.round(value)}%</strong><small>${label}</small></div>
      </div>`)}
    </div>`;
  }

  protected updated(): void {
    this.syncTheme();
    setAuralisDialogOpen(this, this.dialog !== null && this.isConnected, this.closeDialogOnBack);
    this.syncDialogFocus();
    this.syncFeedbackNode();
  }

  private readonly closeDialogOnBack = (): void => this.closeDialog();

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("keydown", this.handleKeydown);
    if (this.dialog !== null) setAuralisDialogOpen(this, true, this.closeDialogOnBack);
  }

  public disconnectedCallback(): void {
    window.removeEventListener("keydown", this.handleKeydown);
    setAuralisDialogOpen(this, false);
    window.clearTimeout(this.wakeTimer);
    window.clearTimeout(this.feedbackTimer);
    window.clearTimeout(this.expectationTimer);
    super.disconnectedCallback();
  }

  /** Réveil d'une machine éteinte : script, bouton Wake-on-LAN ou interrupteur. */
  protected async requestWake(entityId?: string): Promise<void> {
    if (!this.hass || !entityId) return;
    this.wakeRequestedAt = Date.now();
    window.clearTimeout(this.wakeTimer);
    this.wakeTimer = window.setTimeout(() => { this.wakeRequestedAt = undefined; }, WAKE_WINDOW);
    const hass = this.hass;
    const ok = await this.runCommand(`wake:${entityId}`, () => activateEntity(hass, entityId), {
      errorMessage: "Le réveil a échoué.",
    });
    if (!ok) {
      window.clearTimeout(this.wakeTimer);
      this.wakeRequestedAt = undefined;
    }
  }

  /** Bouton de réveil, affiché seulement quand la machine n'est pas en ligne. */
  protected renderWakeButton(online: boolean, entityId: string | undefined, label: string, className = "machine-wake"): TemplateResult | typeof nothing {
    if (online || !entityId) return nothing;
    const state = entity(this.hass, entityId);
    // Un bouton jamais utilisé est « unknown » : il reste utilisable.
    const usable = isCommandable(state);
    const pending = this.wakeRequestedAt !== undefined && Date.now() - this.wakeRequestedAt < WAKE_WINDOW;
    return html`<button class=${className} type="button" ?disabled=${!usable || pending} @click=${() => this.requestWake(entityId)}>
      <ha-icon .icon=${pending ? "mdi:timer-sand" : "mdi:power"}></ha-icon>${pending ? "Démarrage demandé…" : label}</button>`;
  }

  protected openDialog(name: string): void {
    this.dialog = name;
  }

  protected closeDialog(): void {
    this.dialog = null;
    this.confirmState = null;
  }

  protected askConfirmation(confirmState: ConfirmState): void {
    this.confirmState = confirmState;
  }

  /** Lance l'action confirmée ; une erreur est affichée au lieu d'être ignorée. */
  protected async runConfirmation(): Promise<void> {
    const current = this.confirmState;
    this.confirmState = null;
    if (current) await this.runCommand(`confirm:${current.title}`, () => current.action());
  }

  protected renderDialog(title: string, icon: string, content: TemplateResult, dialogClass = ""): TemplateResult {
    return html`
      <div class="dialog-backdrop" @click=${(event: MouseEvent) => event.target === event.currentTarget && this.closeDialog()}
        @touchstart=${(event: TouchEvent) => event.stopPropagation()}
        @touchmove=${(event: TouchEvent) => event.stopPropagation()}>
        <section class="dialog ${dialogClass}" role="dialog" aria-modal="true" aria-label=${title}>
          <header class="dialog-header">
            <span class="tile-icon"><ha-icon .icon=${icon}></ha-icon></span>
            <div class="title-wrap"><h2>${title}</h2></div>
            <button class="icon-button" aria-label="Fermer" data-dialog-close @click=${this.closeDialog}>
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
          </header>
          ${content}
        </section>
        ${this.confirmState ? this.renderConfirmation() : null}
      </div>
    `;
  }

  /**
   * Confirmation affichée sur la carte elle-même, hors fenêtre de détail (tuile, rail
   * de commandes). Les cartes l'ajoutent à leur rendu quand `confirmState` est posé.
   */
  protected renderStandaloneConfirmation(): TemplateResult | typeof nothing {
    if (!this.confirmState || this.dialog !== null) return nothing;
    return html`<div class="dialog-backdrop" @click=${(event: MouseEvent) => event.target === event.currentTarget && (this.confirmState = null)}>
      ${this.renderConfirmation()}
    </div>`;
  }

  private renderConfirmation(): TemplateResult {
    const state = this.confirmState!;
    return html`
      <section class="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-label=${state.title}>
        <header class="dialog-header"><h2>${state.title}</h2></header>
        <div class="dialog-body">
          <p class="confirm-message">${state.message}</p>
          <div class="actions confirm-actions">
            <button class="action" type="button" data-dialog-close @click=${() => (this.confirmState = null)}>Annuler</button>
            <button class="action ${state.danger === false ? "primary" : "danger"}" type="button" @click=${this.runConfirmation}>${state.confirmLabel}</button>
          </div>
        </div>
      </section>
    `;
  }

  public getCardSize(): number {
    return 6;
  }

  public getGridOptions(): Record<string, number | string> {
    return { rows: 6, min_rows: 4, columns: 6, min_columns: 3 };
  }
}
