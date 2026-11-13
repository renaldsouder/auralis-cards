import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard } from "./auralis-base-card";
import { relativeTime, resolveAction, type ActionItemConfig } from "./auralis-actions-card";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity } from "../types/home-assistant";
import { fireMoreInfo } from "../utils/actions";
import { entity, friendlyName, isAvailable } from "../utils/entities";

export interface CameraConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Détecteur de mouvement (binary_sensor.*) : tuile mise en avant tant qu'il est actif. */
  motion_entity?: string;
  /** Commandes proposées dans la fenêtre de la caméra (projecteur, sirène, portail…). */
  actions?: ActionItemConfig[];
}

export interface CamerasCardConfig extends BaseCardConfig {
  cameras: CameraConfig[];
  layout?: "grid" | "featured";
  columns?: number;
  aspect_ratio?: string;
  /** Intervalle de rafraîchissement des images des tuiles, en secondes. */
  refresh_interval?: number;
  /** Flux vidéo en direct dans la fenêtre (sinon, images rafraîchies chaque seconde). */
  live?: boolean;
  show_header?: boolean;
}

type RunStatus = "pending" | "done" | "error";

const CAMERA_ID = /^camera\.[a-z0-9_]+$/;
const BINARY_ID = /^binary_sensor\.[a-z0-9_]+$/;
const DIALOG_REFRESH = 1_500;

/** Rapport hauteur / largeur à partir de « 16:9 », « 4/3 », « 1:1 » ou d'un nombre largeur/hauteur. */
export function parseAspectRatio(input: unknown): number {
  if (typeof input === "number" && input > 0) return 1 / input;
  const match = typeof input === "string" ? /^\s*(\d+(?:[.,]\d+)?)\s*[:/x]\s*(\d+(?:[.,]\d+)?)\s*$/i.exec(input) : null;
  if (!match) return 9 / 16;
  const width = Number.parseFloat(match[1].replace(",", "."));
  const height = Number.parseFloat(match[2].replace(",", "."));
  const ratio = height / width;
  return Number.isFinite(ratio) && ratio > 0.2 && ratio < 5 ? ratio : 9 / 16;
}

/** Adresse de l'image avec un paramètre qui change à chaque rafraîchissement, pour contourner le cache. */
export function snapshotUrl(picture: unknown, tick: number): string | undefined {
  if (typeof picture !== "string" || !picture.trim()) return undefined;
  return `${picture}${picture.includes("?") ? "&" : "?"}t=${Math.floor(tick)}`;
}

export function cameraStatus(state?: HassEntity): string {
  if (!state || state.state === "unavailable") return "Indisponible";
  const labels: Record<string, string> = { streaming: "Diffusion active", recording: "Enregistrement", idle: "En veille", unknown: "État inconnu" };
  return labels[state.state] ?? state.state;
}

/** Âge d'une image : secondes sous la minute, puis durée relative. */
export function ageLabel(time: number | undefined, now: number): string {
  if (time === undefined) return "";
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  return seconds < 60 ? `il y a ${seconds} s` : relativeTime(time, now);
}

export function wrapIndex(index: number, delta: number, length: number): number {
  return length ? (((index + delta) % length) + length) % length : 0;
}

interface CameraView {
  index: number;
  camera: CameraConfig;
  state?: HassEntity;
  label: string;
  icon: string;
  available: boolean;
  motion: boolean;
  url?: string;
  loaded?: number;
  stale: boolean;
  error: boolean;
}

export class AuralisCamerasCard extends AuralisBaseCard<CamerasCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    tick: { state: true },
    dialogTick: { state: true },
    selected: { state: true },
    featured: { state: true },
    loaded: { state: true },
    errors: { state: true },
    liveReady: { state: true },
    actionStatus: { state: true },
  };

  static styles = [AuralisBaseCard.styles, css`
    :host { --motion:#ff6b74; }
    .cam-shell, .cam-content { min-height:0; }
    .cam-shell { padding:16px; }
    .cam-header { display:flex; align-items:center; gap:11px; margin-bottom:14px; }
    .cam-header .badge { display:grid; width:39px; height:39px; flex:0 0 auto; place-items:center; border:1px solid rgba(255,255,255,.2); border-radius:14px; background:rgba(12,19,27,.72); color:var(--machine-accent); }
    .cam-header .badge ha-icon { --mdc-icon-size:22px; }
    .cam-header h2 { overflow:hidden; font-size:19px; text-overflow:ellipsis; white-space:nowrap; }
    .cam-header .machine-status { margin-top:4px; }
    .cam-header .machine-status.motion { color:var(--motion); }
    .cam-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:10px; }
    .cam-grid.fixed { grid-template-columns:repeat(var(--cam-columns),minmax(0,1fr)); }
    .thumbs { display:grid; grid-auto-columns:minmax(120px,1fr); grid-auto-flow:column; gap:8px; margin-top:10px; padding-bottom:2px; overflow-x:auto; scrollbar-width:thin; }
    .cam { position:relative; display:block; width:100%; min-width:0; padding:0; overflow:hidden; border:1px solid rgba(195,211,229,.16); border-radius:18px; background:#05080c; color:#fff; cursor:pointer; text-align:start; aspect-ratio:var(--cam-ratio-css,16 / 9); }
    .cam:hover { border-color:color-mix(in srgb,var(--machine-accent) 65%,transparent); }
    .cam:focus-visible { outline:2px solid var(--machine-accent); outline-offset:2px; }
    .cam.thumb { border-radius:13px; }
    .cam.thumb.current { border-color:var(--machine-accent); box-shadow:0 0 0 1px var(--machine-accent); }
    .cam img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
    .cam::after { position:absolute; inset:0; background:linear-gradient(180deg,rgba(3,6,10,.6),transparent 30%,transparent 62%,rgba(3,6,10,.78)); content:""; pointer-events:none; }
    .cam.motion { border-color:var(--motion); animation:pulse 1.6s ease-in-out infinite; }
    .cam-empty { position:absolute; inset:0; display:grid; place-content:center; justify-items:center; gap:6px; color:#7f8d9e; font-size:12px; }
    .cam-empty ha-icon { --mdc-icon-size:30px; }
    .cam-top, .cam-bottom { position:absolute; z-index:1; inset-inline:10px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .cam-top { top:9px; }
    .cam-bottom { bottom:8px; color:#c9d4e0; font-size:10.5px; }
    .cam-name { display:flex; min-width:0; align-items:center; gap:6px; font-size:13px; font-weight:720; text-shadow:0 1px 4px #000; }
    .cam-name span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cam-name ha-icon { --mdc-icon-size:16px; flex:0 0 auto; color:var(--machine-accent); }
    .cam.thumb .cam-name { font-size:11px; }
    .cam.thumb .cam-bottom { display:none; }
    .tag { display:inline-flex; flex:0 0 auto; align-items:center; gap:5px; padding:3px 8px; border-radius:999px; background:rgba(5,9,14,.72); font-size:10px; font-weight:750; backdrop-filter:blur(8px); }
    .tag::before { width:6px; height:6px; border-radius:50%; background:currentColor; content:""; }
    .tag.motion { background:color-mix(in srgb,var(--motion) 85%,#000); color:#fff; }
    .tag.stale { color:var(--auralis-active,#ffc45f); }
    .tag.ok { color:#5bd69b; }
    .tag.ok::before { animation:blink 2s ease-in-out infinite; }
    @media (min-width:481px) { .dialog.cam-dialog { width:min(980px,calc(100vw - 24px)); } }
    .media { position:relative; overflow:hidden; border-radius:20px; background:#000; aspect-ratio:var(--cam-ratio-css,16 / 9); }
    .media img, .media ha-camera-stream { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
    .media .cam-empty { color:#9aa8b9; }
    .nav { position:absolute; z-index:2; top:50%; display:grid; width:40px; height:40px; place-items:center; border:1px solid rgba(255,255,255,.2); border-radius:50%; background:rgba(5,9,14,.62); color:#fff; cursor:pointer; transform:translateY(-50%); backdrop-filter:blur(8px); }
    .nav.prev { left:10px; }
    .nav.next { right:10px; }
    .nav ha-icon { --mdc-icon-size:22px; }
    .media-tags { position:absolute; z-index:2; top:10px; left:10px; display:flex; gap:6px; }
    .info { display:flex; flex-wrap:wrap; gap:8px 16px; margin:12px 2px 0; color:var(--auralis-muted); font-size:12px; }
    .info strong { color:var(--auralis-text); font-weight:650; }
    .info .motion { color:var(--motion); }
    .action.done { border-color:color-mix(in srgb,var(--auralis-healthy) 45%,transparent); color:var(--auralis-healthy); }
    .action.failed { border-color:color-mix(in srgb,var(--auralis-danger) 45%,transparent); color:var(--auralis-danger); }
    @keyframes pulse { 0%, 100% { box-shadow:0 0 0 0 color-mix(in srgb,var(--motion) 0%,transparent); } 50% { box-shadow:0 0 0 4px color-mix(in srgb,var(--motion) 45%,transparent); } }
    @keyframes blink { 0%, 100% { opacity:1; } 50% { opacity:.35; } }
    @media (prefers-reduced-motion: reduce) { .cam.motion, .tag.ok::before { animation:none; } }
    @container (max-width:520px) { .cam-grid, .cam-grid.fixed { grid-template-columns:1fr; } }
  `];

  private tick = Date.now();
  private dialogTick = Date.now();
  private selected?: number;
  private featured = 0;
  private loaded = new Map<string, number>();
  private errors = new Set<string>();
  private liveReady?: boolean;
  private actionStatus = new Map<string, RunStatus>();
  private refreshTimer?: number;
  private dialogTimer?: number;
  private observer?: IntersectionObserver;
  private visible = true;
  private readonly onKey = (event: KeyboardEvent): void => {
    if (this.dialog !== "camera" || this.confirmState) return;
    if (event.key === "ArrowLeft") this.step(-1);
    if (event.key === "ArrowRight") this.step(1);
  };

  static getStubConfig(hass?: { states?: Record<string, unknown> }): Partial<CamerasCardConfig> {
    const ids = Object.keys(hass?.states ?? {}).filter((id) => id.startsWith("camera.")).slice(0, 4);
    return { theme: "carbon", cameras: (ids.length ? ids : ["camera.entree"]).map((id) => ({ entity: id })) };
  }

  static getConfigForm(): Record<string, unknown> {
    const labels: Record<string, string> = {
      name: "Titre", icon: "Icône", cameras: "Caméras (entity, name, motion_entity, actions)", layout: "Présentation",
      columns: "Colonnes (vide = automatique)", aspect_ratio: "Format des images", refresh_interval: "Rafraîchissement (secondes)",
      live: "Flux en direct dans la fenêtre", show_header: "Afficher l’en-tête", theme: "Thème", accent_color: "Couleur d’accent",
      card_background: "Fond de la carte",
    };
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "cameras", required: true, selector: { object: {} } },
        { name: "layout", selector: { select: { options: [{ value: "grid", label: "Mosaïque" }, { value: "featured", label: "Une grande et des vignettes" }] } } },
        { name: "columns", selector: { number: { min: 1, max: 4, step: 1, mode: "box" } } },
        { name: "aspect_ratio", selector: { select: { options: ["16:9", "4:3", "1:1", "9:16"], custom_value: true } } },
        { name: "refresh_interval", selector: { number: { min: 2, max: 300, step: 1, mode: "box", unit_of_measurement: "s" } } },
        { name: "live", selector: { boolean: {} } },
        { name: "show_header", selector: { boolean: {} } },
        { name: "theme", selector: { select: { options: ["auto", "halo", "carbon", "mono", "aurora"] } } },
        { name: "accent_color", selector: { text: {} } },
        { name: "card_background", selector: { object: {} } },
      ],
      computeLabel: ({ name }: { name: string }) => labels[name],
    };
  }

  public setConfig(config: CamerasCardConfig): void {
    const cameras = Array.isArray(config?.cameras) ? config.cameras : [];
    const invalid = cameras.find((camera) => !camera || typeof camera.entity !== "string" || !CAMERA_ID.test(camera.entity)
      || (camera.motion_entity !== undefined && camera.motion_entity !== "" && !(typeof camera.motion_entity === "string" && BINARY_ID.test(camera.motion_entity)))
      || (camera.actions !== undefined && !Array.isArray(camera.actions)));
    if (!cameras.length || invalid) {
      throw new Error("Configurez au moins une caméra : cameras: - entity: camera.xxx (motion_entity en binary_sensor.* facultatif).");
    }
    const bounded = (value: unknown, min: number, max: number): number | undefined => {
      const number = Number(value);
      return value !== undefined && value !== null && value !== "" && Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : undefined;
    };
    const columns = bounded(config.columns, 1, 4);
    this.config = {
      ...config,
      theme: config.theme || "carbon",
      cameras,
      layout: config.layout === "featured" ? "featured" : "grid",
      columns: columns === undefined ? undefined : Math.round(columns),
      refresh_interval: Math.round(bounded(config.refresh_interval, 2, 300) ?? 10),
    };
    if (this.featured >= cameras.length) this.featured = 0;
    if (this.selected !== undefined && this.selected >= cameras.length) this.closeDialog();
    if (this.isConnected) this.startRefresh();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.tick = Date.now();
    this.startRefresh();
    window.addEventListener("keydown", this.onKey);
    if (typeof IntersectionObserver !== "undefined") {
      this.observer = new IntersectionObserver((entries) => {
        const wasVisible = this.visible;
        this.visible = entries.some((item) => item.isIntersecting);
        if (this.visible && !wasVisible) this.tick = Date.now();
      });
      this.observer.observe(this);
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this.refreshTimer);
    window.clearInterval(this.dialogTimer);
    window.removeEventListener("keydown", this.onKey);
    this.observer?.disconnect();
    this.observer = undefined;
  }

  protected closeDialog(): void {
    super.closeDialog();
    this.selected = undefined;
    window.clearInterval(this.dialogTimer);
    this.dialogTimer = undefined;
  }

  /** Images des tuiles : rafraîchies seulement quand la carte est à l'écran et l'onglet visible. */
  private startRefresh(): void {
    window.clearInterval(this.refreshTimer);
    const seconds = this.config?.refresh_interval ?? 10;
    this.refreshTimer = window.setInterval(() => {
      if (!this.visible || (typeof document !== "undefined" && document.visibilityState === "hidden")) return;
      this.tick = Date.now();
    }, seconds * 1000);
  }

  private openCamera(index: number): void {
    this.selected = index;
    this.dialogTick = Date.now();
    this.openDialog("camera");
    void this.prepareLive();
    window.clearInterval(this.dialogTimer);
    this.dialogTimer = window.setInterval(() => {
      if (this.liveReady !== true || this.config?.live === false) this.dialogTick = Date.now();
    }, DIALOG_REFRESH);
  }

  private step(delta: number): void {
    const count = this.config?.cameras.length ?? 0;
    if (this.selected === undefined || count < 2) return;
    this.selected = wrapIndex(this.selected, delta, count);
    this.dialogTick = Date.now();
  }

  /**
   * Le lecteur vidéo de Home Assistant (ha-camera-stream) n'est chargé qu'à la demande.
   * Créer une carte image native en mode live le charge ; à défaut, la fenêtre garde les images rafraîchies.
   */
  private async prepareLive(): Promise<void> {
    if (this.config?.live === false || this.liveReady !== undefined) return;
    if (customElements.get("ha-camera-stream")) {
      this.liveReady = true;
      return;
    }
    const loader = (window as unknown as { loadCardHelpers?: () => Promise<{ createCardElement(config: Record<string, unknown>): HTMLElement }> }).loadCardHelpers;
    if (!loader) {
      this.liveReady = false;
      return;
    }
    try {
      const helpers = await loader();
      helpers.createCardElement({ type: "picture-entity", entity: this.config!.cameras[0].entity, camera_view: "live" });
      await Promise.race([
        customElements.whenDefined("ha-camera-stream"),
        new Promise((resolve) => window.setTimeout(resolve, 4_000)),
      ]);
    } catch {
      // Lecteur introuvable : la fenêtre reste en images rafraîchies.
    }
    this.liveReady = Boolean(customElements.get("ha-camera-stream"));
  }

  private view(camera: CameraConfig, index: number, tick: number): CameraView {
    const state = entity(this.hass, camera.entity);
    const available = isAvailable(state) || state?.state === "unknown";
    const loaded = this.loaded.get(camera.entity);
    const interval = (this.config?.refresh_interval ?? 10) * 1000;
    return {
      index,
      camera,
      state,
      label: camera.name?.trim() || friendlyName(state, camera.entity),
      icon: camera.icon || "mdi:cctv",
      available: Boolean(state) && state!.state !== "unavailable" && available,
      motion: entity(this.hass, camera.motion_entity)?.state === "on",
      url: state && state.state !== "unavailable" ? snapshotUrl(state.attributes.entity_picture, tick) : undefined,
      loaded,
      stale: loaded !== undefined && Date.now() - loaded > Math.max(30_000, interval * 3),
      error: this.errors.has(camera.entity),
    };
  }

  private markLoaded(id: string): void {
    this.loaded = new Map(this.loaded).set(id, Date.now());
    if (this.errors.has(id)) {
      const errors = new Set(this.errors);
      errors.delete(id);
      this.errors = errors;
    }
  }

  private markError(id: string): void {
    if (!this.errors.has(id)) this.errors = new Set(this.errors).add(id);
  }

  /** Heure de la dernière image reçue, dans le fuseau de Home Assistant. */
  private clock(time: number): string {
    const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", second: "2-digit" };
    try {
      return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: this.hass?.config?.time_zone }).format(time);
    } catch {
      return new Intl.DateTimeFormat("fr-FR", options).format(time);
    }
  }

  private renderImage(view: CameraView): TemplateResult {
    if (!view.available || !view.url) {
      return html`<span class="cam-empty"><ha-icon icon="mdi:cctv-off"></ha-icon>${view.state ? "Caméra indisponible" : "Caméra introuvable"}</span>`;
    }
    return html`<img src=${view.url} alt="" decoding="async" @load=${() => this.markLoaded(view.camera.entity)} @error=${() => this.markError(view.camera.entity)} />
      ${view.error && view.loaded === undefined ? html`<span class="cam-empty"><ha-icon icon="mdi:image-off-outline"></ha-icon>Image indisponible</span>` : nothing}`;
  }

  private tag(view: CameraView): TemplateResult | typeof nothing {
    if (view.motion) return html`<span class="tag motion">Mouvement</span>`;
    if (!view.available) return nothing;
    if (view.stale || view.error) return html`<span class="tag stale">${view.error ? "Erreur" : "Image figée"}</span>`;
    return view.state?.state === "recording" ? html`<span class="tag motion">REC</span>` : html`<span class="tag ok">Actif</span>`;
  }

  private renderTile(view: CameraView, variant: "tile" | "thumb" = "tile", onClick = () => this.openCamera(view.index)): TemplateResult {
    const description = [view.label, view.motion ? "mouvement détecté" : cameraStatus(view.state)].join(", ");
    return html`<button type="button" class="cam ${variant === "thumb" ? "thumb" : ""} ${view.motion ? "motion" : ""} ${variant === "thumb" && view.index === this.featured ? "current" : ""}"
      aria-label=${variant === "thumb" ? `Afficher ${view.label} en grand` : `${description}. Ouvrir la caméra`} @click=${onClick}>
      ${this.renderImage(view)}
      <span class="cam-top"><span class="cam-name"><ha-icon .icon=${view.icon}></ha-icon><span>${view.label}</span></span>${this.tag(view)}</span>
      <span class="cam-bottom"><span>${cameraStatus(view.state)}</span><span>${view.loaded === undefined ? "" : this.clock(view.loaded)}</span></span>
    </button>`;
  }

  private async runAction(cameraIndex: number, actionIndex: number): Promise<void> {
    const item = this.config?.cameras[cameraIndex]?.actions?.[actionIndex];
    if (!item || !this.hass) return;
    const action = resolveAction(item, entity(this.hass, item.entity));
    if (!action) return;
    if (action.kind === "more-info") {
      fireMoreInfo(this, action.entity);
      return;
    }
    if (action.kind === "navigate") {
      window.history.pushState(null, "", action.path);
      window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
      return;
    }
    const key = `${cameraIndex}:${actionIndex}`;
    const setStatus = (status?: RunStatus) => {
      const next = new Map(this.actionStatus);
      if (status) next.set(key, status);
      else next.delete(key);
      this.actionStatus = next;
    };
    setStatus("pending");
    try {
      await this.hass.callService(action.domain, action.service, action.data, action.target);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      console.warn("Auralis Caméras : échec de l’action", action, error);
    }
    window.setTimeout(() => setStatus(undefined), 2_500);
  }

  private pressAction(cameraIndex: number, actionIndex: number, item: ActionItemConfig, label: string): void {
    if (!item.confirm) {
      void this.runAction(cameraIndex, actionIndex);
      return;
    }
    this.askConfirmation({
      title: label,
      message: typeof item.confirm === "string" && item.confirm.trim() ? item.confirm.trim() : `Lancer « ${label} » ?`,
      confirmLabel: "Confirmer",
      action: () => this.runAction(cameraIndex, actionIndex),
    });
  }

  private renderDialogActions(view: CameraView): TemplateResult {
    const items = view.camera.actions ?? [];
    return html`<div class="actions">
      ${items.map((item, index) => {
        const status = this.actionStatus.get(`${view.index}:${index}`);
        const state = entity(this.hass, item.entity);
        const label = item.name?.trim() || (item.entity ? friendlyName(state, item.entity) : "Action");
        const on = state ? ["on", "open", "unlocked"].includes(state.state) : false;
        const icon = status === "done" ? "mdi:check" : status === "error" ? "mdi:alert-outline"
          : item.icon || (typeof state?.attributes.icon === "string" ? state.attributes.icon : "mdi:gesture-tap");
        return html`<button class="action ${on ? "primary" : ""} ${status === "done" ? "done" : status === "error" ? "failed" : ""}" type="button"
          ?disabled=${status === "pending" || (Boolean(item.entity) && (!state || state.state === "unavailable"))}
          @click=${() => this.pressAction(view.index, index, item, label)}>
          <ha-icon .icon=${icon}></ha-icon>${status === "pending" ? "En cours…" : label}</button>`;
      })}
      ${view.camera.motion_entity ? html`<button class="action" type="button" @click=${() => fireMoreInfo(this, view.camera.motion_entity)}><ha-icon icon="mdi:motion-sensor"></ha-icon>Mouvements</button>` : nothing}
      <button class="action" type="button" @click=${() => fireMoreInfo(this, view.camera.entity)}><ha-icon icon="mdi:information-outline"></ha-icon>Fiche</button>
    </div>`;
  }

  private renderCameraDialog(view: CameraView): TemplateResult {
    const count = this.config?.cameras.length ?? 1;
    const live = this.config?.live !== false && this.liveReady === true && view.available && view.state;
    const motionState = entity(this.hass, view.camera.motion_entity);
    const lastMotion = motionState?.last_changed ? Date.parse(motionState.last_changed) : Number.NaN;
    const mode = live ? "Flux en direct" : this.config?.live === false || this.liveReady === false ? "Images rafraîchies en continu" : "Préparation du direct…";
    return this.renderDialog(view.label, view.icon, html`<div class="dialog-body">
      <div class="media">
        ${live
          ? html`<ha-camera-stream .hass=${this.hass} .stateObj=${view.state} .controls=${true} .muted=${true} .allowExoPlayer=${true}></ha-camera-stream>`
          : this.renderImage({ ...view, url: view.available ? snapshotUrl(view.state?.attributes.entity_picture, this.dialogTick) : undefined })}
        <span class="media-tags">${this.tag(view)}</span>
        ${count > 1 ? html`
          <button class="nav prev" type="button" aria-label="Caméra précédente" @click=${() => this.step(-1)}><ha-icon icon="mdi:chevron-left"></ha-icon></button>
          <button class="nav next" type="button" aria-label="Caméra suivante" @click=${() => this.step(1)}><ha-icon icon="mdi:chevron-right"></ha-icon></button>` : nothing}
      </div>
      <div class="info">
        <span><strong>${cameraStatus(view.state)}</strong> · ${mode}</span>
        ${!live && view.loaded !== undefined ? html`<span>Image ${ageLabel(view.loaded, Date.now())}</span>` : nothing}
        ${motionState ? html`<span class=${view.motion ? "motion" : ""}>${view.motion ? "Mouvement en cours" : Number.isFinite(lastMotion) ? `Dernier mouvement ${relativeTime(lastMotion, Date.now())}` : "Aucun mouvement"}</span>` : nothing}
        ${count > 1 ? html`<span>${view.index + 1} / ${count}</span>` : nothing}
      </div>
      ${this.renderDialogActions(view)}
    </div>`, "cam-dialog");
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this.config;
    if (!config) return nothing;
    const views = config.cameras.map((camera, index) => this.view(camera, index, this.tick));
    const motion = views.filter((view) => view.motion).length;
    const unavailable = views.filter((view) => !view.available).length;
    const ratio = parseAspectRatio(config.aspect_ratio);
    const ratioCss = `--cam-ratio-css:1 / ${Math.round(ratio * 10_000) / 10_000}`;
    const showHeader = config.show_header ?? true;
    const summary = [
      `${views.length} caméra${views.length > 1 ? "s" : ""}`,
      motion ? `${motion} mouvement${motion > 1 ? "s" : ""}` : undefined,
      unavailable ? `${unavailable} indisponible${unavailable > 1 ? "s" : ""}` : undefined,
    ].filter(Boolean).join(" · ");
    const featured = views[this.featured] ?? views[0];
    const selected = this.dialog === "camera" && this.selected !== undefined ? views[this.selected] : undefined;
    return html`<ha-card><div class="machine-shell cam-shell ${this.machineGridClass()}" style=${`${this.machineStyle("#79d6f2")};${ratioCss}`}>
      <div class="machine-content cam-content">
        ${showHeader ? html`<header class="cam-header">
          <span class="badge"><ha-icon .icon=${config.icon || "mdi:cctv"}></ha-icon></span>
          <div class="title-wrap"><h2>${config.name || "Caméras"}</h2>
            <div class="machine-status ${motion ? "motion" : ""}"><span class="dot ${motion ? "danger" : unavailable ? "warning" : "healthy"}"></span>${summary}</div></div>
        </header>` : nothing}
        ${config.layout === "featured" && views.length > 1
          ? html`${this.renderTile(featured)}
              <div class="thumbs">${views.map((view) => this.renderTile(view, "thumb", () => { this.featured = view.index; }))}</div>`
          : html`<div class="cam-grid ${config.columns ? "fixed" : ""}" style=${config.columns ? `--cam-columns:${config.columns}` : ""}>
              ${views.map((view) => this.renderTile(view))}</div>`}
      </div>
    </div></ha-card>
    ${selected ? html`<div style=${ratioCss}>${this.renderCameraDialog(selected)}</div>` : nothing}`;
  }

  public getCardSize(): number {
    const count = this.config?.cameras.length ?? 1;
    return this.config?.layout === "featured" ? 7 : 1 + Math.ceil(count / 2) * 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 12, min_columns: 6 };
  }
}

