import { LitElement, html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from "lit";
import type { BaseCardConfig, AuralisTheme } from "../types/config";
import type { HomeAssistant } from "../types/home-assistant";
import { sharedStyles } from "../styles/shared";
import { setAuralisDialogOpen } from "../utils/dialog-visibility";
import { activateEntity, fireMoreInfo } from "../utils/actions";
import { entity, isCommandable } from "../utils/entities";
import { collectEntityIds, hassChangeMatters } from "../utils/watch";
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
    hass: { attribute: false },
    config: { state: true },
    dialog: { state: true },
    confirmState: { state: true },
    wakeRequestedAt: { state: true },
    pendingActions: { state: true },
    feedback: { state: true },
  };

  static styles: CSSResultGroup = sharedStyles;

  hass?: HomeAssistant;
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

  protected isPending(key: string): boolean {
    return this.pendingActions.has(key);
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
      await action();
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

  /** Focus sur la fenêtre à l'ouverture, retour au bouton d'origine à la fermeture. */
  private syncDialogFocus(): void {
    if (this.dialog === this.shownDialog) return;
    const opened = this.shownDialog === null && this.dialog !== null;
    const closed = this.shownDialog !== null && this.dialog === null;
    this.shownDialog = this.dialog;
    if (opened) {
      this.dialogOpener = deepActiveElement();
      const target = this.renderRoot.querySelector<HTMLElement>(".dialog [data-dialog-close], .dialog [aria-label='Fermer']");
      target?.focus({ preventScroll: true });
    } else if (closed) {
      const opener = this.dialogOpener;
      this.dialogOpener = undefined;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    }
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || this.dialog === null) return;
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
