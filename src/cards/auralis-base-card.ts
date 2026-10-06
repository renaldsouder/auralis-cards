import { LitElement, html, type CSSResultGroup, type TemplateResult } from "lit";
import type { BaseCardConfig, AuralisTheme } from "../types/config";
import type { HomeAssistant } from "../types/home-assistant";
import { sharedStyles } from "../styles/shared";

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => Promise<void> | void;
}

export abstract class AuralisBaseCard<TConfig extends BaseCardConfig> extends LitElement {
  static properties = {
    hass: { attribute: false },
    config: { state: true },
    dialog: { state: true },
    confirmState: { state: true },
  };

  static styles: CSSResultGroup = sharedStyles;

  hass?: HomeAssistant;
  config?: TConfig;
  protected dialog: string | null = null;
  protected confirmState: ConfirmState | null = null;

  protected get theme(): Exclude<AuralisTheme, "auto"> {
    const configured = this.config?.theme || "auto";
    if (configured !== "auto") return configured;
    return this.hass?.themes?.darkMode ? "carbon" : "halo";
  }

  protected syncTheme(): void {
    this.dataset.theme = this.theme;
  }

  protected machineStyle(defaultAccent: string): string {
    const image = this.config?.background_image?.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    const configuredAccent = this.config?.accent_color?.trim();
    const accent = configuredAccent && !/[;{}]/.test(configuredAccent) ? configuredAccent : defaultAccent;
    const configuredPosition = this.config?.background_position?.trim();
    const position = configuredPosition && /^[\w\s.%+-]+$/.test(configuredPosition) ? configuredPosition : "center";
    const brightness = Math.min(100, Math.max(30, Number(this.config?.image_brightness ?? 72))) / 100;
    const configuredOpacity = Number(this.config?.image_opacity ?? 100);
    const imageOpacity = Number.isFinite(configuredOpacity)
      ? Math.min(100, Math.max(0, configuredOpacity)) / 100
      : 1;
    const glass = Math.min(0.96, Math.max(0.45, Number(this.config?.glass_opacity ?? 0.84)));
    const backgroundMode = this.config?.card_background?.mode;
    const configuredBackground = backgroundMode === "gradient"
      ? this.config?.card_background?.gradient
      : this.config?.card_background?.color;
    const background = configuredBackground?.trim();
    const safeBackground = background && !/[;{}]/.test(background) ? background : undefined;
    const baseBackground = safeBackground || (backgroundMode === "solid" || backgroundMode === "grid"
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

  protected machineGridClass(): string {
    const defaultGrid = this.config?.card_background?.mode === "grid";
    return (this.config?.show_grid ?? defaultGrid) ? "show-grid" : "";
  }

  protected renderResourceGauges(cpu?: number, memory?: number): TemplateResult {
    const metrics = [{ label: "CPU", value: cpu }, { label: "RAM", value: memory }]
      .filter((metric): metric is { label: string; value: number } =>
        metric.value !== undefined && Number.isFinite(metric.value));
    if (!metrics.length) return html``;
    return html`<div class="machine-resource-gauges">
      ${metrics.map(({ label, value }) => html`<div class="machine-gauge"
        style=${`--value:${Math.min(100, Math.max(0, value))}`}
        role="meter" aria-label=${label} aria-valuemin="0" aria-valuemax="100" aria-valuenow=${value}>
        <div class="machine-gauge-content"><strong>${Math.round(value)}%</strong><small>${label}</small></div>
      </div>`)}
    </div>`;
  }

  protected updated(): void {
    this.syncTheme();
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

  protected async runConfirmation(): Promise<void> {
    const current = this.confirmState;
    this.confirmState = null;
    if (current) await current.action();
  }

  protected renderDialog(title: string, icon: string, content: TemplateResult, dialogClass = ""): TemplateResult {
    return html`
      <div class="dialog-backdrop" @click=${(event: MouseEvent) => event.target === event.currentTarget && this.closeDialog()}>
        <section class="dialog ${dialogClass}" role="dialog" aria-modal="true" aria-label=${title}>
          <header class="dialog-header">
            <span class="tile-icon"><ha-icon .icon=${icon}></ha-icon></span>
            <div class="title-wrap"><h2>${title}</h2></div>
            <button class="icon-button" aria-label="Fermer" @click=${this.closeDialog}>
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
          </header>
          ${content}
        </section>
        ${this.confirmState ? this.renderConfirmation() : null}
      </div>
    `;
  }

  private renderConfirmation(): TemplateResult {
    const state = this.confirmState!;
    return html`
      <section class="dialog" role="alertdialog" aria-modal="true" style="position:fixed;max-width:430px;">
        <header class="dialog-header"><h2>${state.title}</h2></header>
        <div class="dialog-body">
          <p class="muted" style="font-size:14px;line-height:1.5;">${state.message}</p>
          <div class="actions" style="margin-top:18px;grid-template-columns:1fr 1fr;">
            <button class="action" @click=${() => (this.confirmState = null)}>Annuler</button>
            <button class="action danger" @click=${this.runConfirmation}>${state.confirmLabel}</button>
          </div>
        </div>
      </section>
    `;
  }

  public getCardSize(): number {
    return 6;
  }

  public getGridOptions(): Record<string, number> {
    return { rows: 6, min_rows: 4, columns: 6, min_columns: 3 };
  }
}
