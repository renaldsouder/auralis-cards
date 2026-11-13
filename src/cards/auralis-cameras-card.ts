import { css, html, nothing, type TemplateResult } from "lit";
import { AuralisBaseCard, configuredAccent } from "./auralis-base-card";
import {
  actionConfirmation, actionIcon, actionLabel, actionTone, actionUnavailable, cardHeaderStyles, isOn, isValidActionItem,
  LongPress, normalizeActionItem, runActionItem, StatusFlash, type ActionHost, type ActionItemConfig,
} from "./auralis-actions-card";
import type { BaseCardConfig } from "../types/config";
import type { HassEntity } from "../types/home-assistant";
import { dialogHistorySettled } from "../utils/dialog-visibility";
import { entity, friendlyName, isAvailable } from "../utils/entities";
import { clockTime, relativeTime } from "../utils/format";
import { navigate } from "../utils/navigation";
import { bounded } from "../utils/validate";

export interface CameraConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Détecteur de mouvement (binary_sensor.*) : tuile mise en avant tant qu'il est actif. */
  motion_entity?: string;
  /** Commandes proposées dans la fenêtre de la caméra (projecteur, sirène, portail…), comme sur la carte Actions. */
  actions?: ActionItemConfig[];
}

export interface CamerasCardConfig extends BaseCardConfig {
  cameras: CameraConfig[];
  layout?: "grid" | "featured";
  columns?: number;
  aspect_ratio?: string;
  /** Intervalle minimal entre deux images des tuiles, en secondes. */
  refresh_interval?: number;
  /** Flux vidéo en direct dans la fenêtre (sinon, images rafraîchies en continu). */
  live?: boolean;
  show_header?: boolean;
}

const CAMERA_ID = /^camera\.[a-z0-9_]+$/;
const BINARY_ID = /^binary_sensor\.[a-z0-9_]+$/;
/** Intervalle minimal entre deux images dans la fenêtre. */
const DIALOG_REFRESH = 1_500;
/** Fréquence à laquelle la carte vérifie si une nouvelle image peut être demandée. */
const PUMP_INTERVAL = 500;
/** Au-delà, un chargement est considéré comme bloqué : on l'abandonne et on relance. */
const STALL_TIMEOUT = 20_000;
/** Pas de largeur des images demandées à Home Assistant, en pixels. */
const WIDTH_STEP = 160;
const MAX_WIDTH = 3_840;

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

/**
 * Largeur d'image à demander : largeur affichée × densité de l'écran, arrondie au palier de
 * 160 px supérieur (les tuiles d'une même taille partagent ainsi la même image en cache).
 */
export function snapshotWidth(cssWidth: number | undefined, devicePixelRatio = 1): number | undefined {
  if (!cssWidth || !(cssWidth > 0)) return undefined;
  const pixels = cssWidth * Math.max(1, Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1);
  return Math.min(MAX_WIDTH, Math.ceil(pixels / WIDTH_STEP) * WIDTH_STEP);
}

/**
 * Adresse de l'image avec un paramètre qui change à chaque demande, pour contourner le cache.
 * Le proxy caméra de Home Assistant redimensionne l'image si on lui donne `width`.
 */
export function snapshotUrl(picture: unknown, tick: number, width?: number): string | undefined {
  if (typeof picture !== "string" || !picture.trim()) return undefined;
  const sized = width && picture.includes("/api/camera_proxy") ? `width=${width}&` : "";
  return `${picture}${picture.includes("?") ? "&" : "?"}${sized}t=${Math.floor(tick)}`;
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

/** Caméra mise en grand : celle choisie, sinon la première qui détecte un mouvement, sinon la première. */
export function featuredIndex(views: Array<{ motion: boolean }>, chosen?: number): number {
  if (chosen !== undefined && chosen >= 0 && chosen < views.length) return chosen;
  const motion = views.findIndex((view) => view.motion);
  return motion >= 0 ? motion : 0;
}

/** Image d'une caméra : la dernière bonne image, et l'état du chargement suivant. */
export interface SnapshotSlot {
  /** Dernière image chargée avec succès : c'est elle qui est affichée. */
  url?: string;
  loadedAt?: number;
  /** La dernière tentative a échoué. */
  error: boolean;
  /** Début du chargement en cours, ou du dernier. */
  startedAt?: number;
  loading: boolean;
}

export interface ImageLike {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
}

/**
 * Vrai si une nouvelle image peut être demandée : jamais pendant un chargement (sauf s'il est
 * bloqué depuis `timeout`), et pas plus souvent que `interval` depuis le début du précédent.
 */
export function snapshotDue(slot: SnapshotSlot | undefined, now: number, interval: number, timeout = STALL_TIMEOUT): boolean {
  if (!slot || slot.startedAt === undefined) return true;
  if (slot.loading) return now - slot.startedAt >= Math.max(timeout, interval);
  return now - slot.startedAt >= interval;
}

/**
 * Chargement des images en double tampon : l'image suivante est chargée hors de la page et ne
 * remplace l'image affichée qu'une fois arrivée. Une caméra lente n'est jamais interrompue en
 * plein chargement, et l'écran ne clignote pas.
 */
export class SnapshotLoader {
  private readonly slots = new Map<string, SnapshotSlot>();
  private readonly images = new Map<string, ImageLike>();

  constructor(
    private readonly onChange: () => void,
    private readonly createImage: () => ImageLike = () => new Image() as unknown as ImageLike,
    private readonly clock: () => number = Date.now,
  ) {}

  slot(key: string): SnapshotSlot | undefined {
    return this.slots.get(key);
  }

  due(key: string, now: number, interval: number): boolean {
    return snapshotDue(this.slots.get(key), now, interval);
  }

  load(key: string, url: string, now = this.clock()): void {
    this.abort(key);
    const previous = this.slots.get(key) ?? { error: false, loading: false };
    this.slots.set(key, { ...previous, startedAt: now, loading: true });
    const image = this.createImage();
    this.images.set(key, image);
    const finish = (ok: boolean): void => {
      if (this.images.get(key) !== image) return;
      this.images.delete(key);
      image.onload = null;
      image.onerror = null;
      const current = this.slots.get(key) ?? { error: false, loading: false };
      this.slots.set(key, ok
        ? { ...current, url, loadedAt: this.clock(), error: false, loading: false }
        : { ...current, error: true, loading: false });
      this.onChange();
    };
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = url;
  }

  /** Abandonne le chargement en cours ; l'image déjà affichée reste. */
  abort(key: string): void {
    const image = this.images.get(key);
    if (image) {
      image.onload = null;
      image.onerror = null;
      image.src = "";
      this.images.delete(key);
    }
    const slot = this.slots.get(key);
    if (slot?.loading) this.slots.set(key, { ...slot, loading: false });
  }

  abortAll(filter: (key: string) => boolean = () => true): void {
    for (const key of [...this.images.keys()]) if (filter(key)) this.abort(key);
  }
}

interface CameraView {
  index: number;
  camera: CameraConfig;
  state?: HassEntity;
  label: string;
  icon: string;
  available: boolean;
  motion: boolean;
  /** Dernière image chargée, affichée telle quelle. */
  url?: string;
  loaded?: number;
  stale: boolean;
  error: boolean;
}

export class AuralisCamerasCard extends AuralisBaseCard<CamerasCardConfig> {
  static properties = {
    ...AuralisBaseCard.properties,
    selected: { state: true },
    featured: { state: true },
    liveReady: { state: true },
    actionStatus: { state: true },
  };

  static styles = [AuralisBaseCard.styles, cardHeaderStyles, css`
    :host { --motion:#ff6b74; }
    .cam-shell, .cam-content { min-height:0; }
    .cam-shell { padding:16px; --header-badge-bg:rgba(12,19,27,.72); --header-badge-border:rgba(255,255,255,.2); --header-muted:#c7d0dc; }
    .header .status-line.motion { color:var(--motion); }
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
    .cam-empty { position:absolute; inset:0; display:grid; place-content:center; justify-items:center; gap:6px; color:#7f8d9e; font-size:var(--auralis-text-sm); }
    .cam-empty ha-icon { --mdc-icon-size:30px; }
    .cam-top, .cam-bottom { position:absolute; z-index:1; inset-inline:10px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .cam-top { top:9px; }
    .cam-bottom { bottom:8px; color:#c9d4e0; font-size:var(--auralis-text-xs); }
    .cam-name { display:flex; min-width:0; align-items:center; gap:6px; font-size:var(--auralis-text-md); font-weight:720; text-shadow:0 1px 4px #000; }
    .cam-name span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cam-name ha-icon { --mdc-icon-size:16px; flex:0 0 auto; color:var(--machine-accent); }
    .cam.thumb .cam-name { font-size:var(--auralis-text-xs); }
    .cam.thumb .cam-bottom { display:none; }
    .tag { display:inline-flex; flex:0 0 auto; align-items:center; gap:5px; padding:3px 8px; border-radius:999px; background:rgba(5,9,14,.72); font-size:var(--auralis-text-xs); font-weight:750; backdrop-filter:blur(8px); }
    .tag::before { width:6px; height:6px; border-radius:50%; background:currentColor; content:""; }
    .tag.motion { background:color-mix(in srgb,var(--motion) 85%,#000); color:#fff; }
    .tag.stale { color:var(--auralis-active,#ffc45f); }
    .tag.ok { color:var(--auralis-healthy,#5bd69b); }
    .tag.ok::before { animation:blink 2s ease-in-out infinite; }
    @media (min-width:481px) { .dialog.cam-dialog { width:min(980px,calc(100vw - 24px)); } }
    .media { position:relative; overflow:hidden; border-radius:20px; background:#000; aspect-ratio:var(--cam-ratio-css,16 / 9); }
    .media img, .media ha-camera-stream { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
    .media .cam-empty { color:#9aa8b9; }
    .nav { position:absolute; z-index:2; top:50%; display:grid; width:var(--auralis-target); height:var(--auralis-target); place-items:center; border:1px solid rgba(255,255,255,.2); border-radius:50%; background:rgba(5,9,14,.62); color:#fff; cursor:pointer; transform:translateY(-50%); backdrop-filter:blur(8px); }
    .nav.prev { left:10px; }
    .nav.next { right:10px; }
    .nav ha-icon { --mdc-icon-size:22px; }
    .media-tags { position:absolute; z-index:2; top:10px; left:10px; display:flex; gap:6px; }
    .info { display:flex; flex-wrap:wrap; align-items:center; gap:8px 16px; margin:12px 2px 0; color:var(--auralis-muted); font-size:var(--auralis-text-sm); }
    .info strong { color:var(--auralis-text); font-weight:650; }
    .info .motion { color:var(--motion); }
    .retry-live { display:inline-flex; min-height:var(--auralis-target); align-items:center; gap:6px; padding:0 12px; border:1px solid var(--auralis-border); border-radius:999px; background:var(--auralis-layer); color:var(--auralis-text); cursor:pointer; font-size:var(--auralis-text-sm); font-weight:650; }
    .retry-live ha-icon { --mdc-icon-size:16px; }
    .action.cam-act { --tone:var(--auralis-info); border-color:color-mix(in srgb,var(--tone) 32%,var(--auralis-border)); touch-action:manipulation; user-select:none; -webkit-user-select:none; }
    .action.cam-act ha-icon { color:var(--tone); }
    .action.cam-act.on { border-color:color-mix(in srgb,var(--tone) 65%,transparent); background:color-mix(in srgb,var(--tone) 18%,var(--auralis-layer)); }
    .action.cam-act.done { --tone:var(--auralis-healthy); color:var(--auralis-healthy); }
    .action.cam-act.failed { --tone:var(--auralis-danger); color:var(--auralis-danger); }
    .action.cam-act[aria-disabled="true"] { cursor:not-allowed; opacity:.45; }
    @keyframes pulse { 0%, 100% { box-shadow:0 0 0 0 color-mix(in srgb,var(--motion) 0%,transparent); } 50% { box-shadow:0 0 0 4px color-mix(in srgb,var(--motion) 45%,transparent); } }
    @keyframes blink { 0%, 100% { opacity:1; } 50% { opacity:.35; } }
    @media (prefers-reduced-motion: reduce) { .cam.motion, .tag.ok::before { animation:none; } }
    @container (max-width:520px) { .cam-grid, .cam-grid.fixed { grid-template-columns:1fr; } }
  `];

  private selected?: number;
  /** Caméra mise en grand choisie à la main ; sinon celle en mouvement. */
  private featured?: number;
  private liveReady?: boolean;
  private livePreparing = false;
  private actionStatus: ReadonlyMap<string, "done" | "error"> = new Map();
  private readonly flash = new StatusFlash((status) => { this.actionStatus = status; });
  private readonly hold = new LongPress();
  private readonly loader = new SnapshotLoader(() => this.requestUpdate());
  private pumpTimer?: number;
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
      columns: "Colonnes (vide = automatique)", aspect_ratio: "Format des images", refresh_interval: "Rafraîchissement minimal (secondes)",
      live: "Flux en direct dans la fenêtre", show_header: "Afficher l’en-tête (par défaut si un titre est saisi)", theme: "Thème",
      accent_color: "Couleur d’accent", card_background: "Fond de la carte",
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
    if (cameras.some((camera) => camera.actions?.some((item) => !isValidActionItem(item)))) {
      throw new Error("Chaque commande d’une caméra s’écrit comme sur la carte Actions : entity, service (domaine.service) ou navigation_path (/chemin).");
    }
    const columns = bounded(config.columns, 1, 4);
    this.config = {
      ...config,
      theme: config.theme || "carbon",
      cameras: cameras.map((camera) => (camera.actions ? { ...camera, actions: camera.actions.map(normalizeActionItem) } : camera)),
      layout: config.layout === "featured" ? "featured" : "grid",
      columns: columns === undefined ? undefined : Math.round(columns),
      refresh_interval: Math.round(bounded(config.refresh_interval, 2, 300) ?? 10),
    };
    if (this.featured !== undefined && this.featured >= cameras.length) this.featured = undefined;
    if (this.selected !== undefined && this.selected >= cameras.length) this.closeDialog();
    this.flash.clear();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("keydown", this.onKey);
    window.clearInterval(this.pumpTimer);
    // Une seule horloge pour les tuiles et la fenêtre : elle sert aussi une fenêtre restée ouverte
    // quand Home Assistant rattache la carte (changement de vue, retour sur l'onglet).
    this.pumpTimer = window.setInterval(() => this.pump(), PUMP_INTERVAL);
    if (this.dialog === "camera") void this.prepareLive();
    if (typeof IntersectionObserver !== "undefined") {
      this.observer = new IntersectionObserver((entries) => {
        const wasVisible = this.visible;
        this.visible = entries.some((item) => item.isIntersecting);
        if (this.visible && !wasVisible) this.pump();
      });
      this.observer.observe(this);
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this.pumpTimer);
    this.pumpTimer = undefined;
    window.removeEventListener("keydown", this.onKey);
    this.observer?.disconnect();
    this.observer = undefined;
    this.loader.abortAll();
    this.hold.cancel();
  }

  protected updated(): void {
    super.updated();
    // Premières images dès que les tuiles sont dessinées (et mesurées).
    this.pump();
  }

  protected closeDialog(): void {
    super.closeDialog();
    this.selected = undefined;
    this.loader.abortAll((key) => key.startsWith("dialog:"));
  }

  private showingLive(camera: CameraConfig): boolean {
    const state = entity(this.hass, camera.entity);
    return this.config?.live !== false && this.liveReady === true && Boolean(state) && state!.state !== "unavailable";
  }

  /** Largeur affichée la plus grande parmi les éléments qui montrent une caméra. */
  private measure(selector: string): number | undefined {
    const elements = this.renderRoot?.querySelectorAll?.<HTMLElement>(selector);
    if (!elements?.length) return undefined;
    return Math.max(...[...elements].map((element) => element.clientWidth || 0)) || undefined;
  }

  private request(key: string, camera: CameraConfig, now: number, interval: number, cssWidth?: number): void {
    const state = entity(this.hass, camera.entity);
    if (!state || state.state === "unavailable" || !this.loader.due(key, now, interval)) return;
    const ratio = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    const url = snapshotUrl(state.attributes.entity_picture, now, snapshotWidth(cssWidth, ratio));
    if (url) this.loader.load(key, url, now);
  }

  /**
   * Demande les images dues. L'image suivante n'est demandée qu'une fois la précédente arrivée
   * (ou en échec), et jamais plus souvent que l'intervalle. Les tuiles sont en pause derrière
   * la fenêtre, quand la carte est hors de l'écran ou quand l'onglet est masqué.
   */
  private pump(): void {
    const config = this.config;
    if (!config || !this.hass || !this.isConnected) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    const now = Date.now();
    if (this.dialog === "camera") {
      const camera = this.selected === undefined ? undefined : config.cameras[this.selected];
      if (camera && !this.showingLive(camera)) {
        this.request(`dialog:${camera.entity}`, camera, now, DIALOG_REFRESH, this.measure(".media"));
      }
      return;
    }
    if (!this.visible) return;
    const interval = (config.refresh_interval ?? 10) * 1000;
    for (const camera of config.cameras) {
      this.request(camera.entity, camera, now, interval, this.measure(`[data-camera="${camera.entity}"]`));
    }
  }

  private openCamera(index: number): void {
    this.selected = index;
    this.openDialog("camera");
    // Un direct qui avait échoué est retenté à chaque ouverture.
    if (this.liveReady === false) this.liveReady = undefined;
    void this.prepareLive();
  }

  private retryLive(): void {
    this.liveReady = undefined;
    void this.prepareLive();
  }

  private step(delta: number): void {
    const count = this.config?.cameras.length ?? 0;
    if (this.selected === undefined || count < 2) return;
    this.loader.abortAll((key) => key.startsWith("dialog:"));
    this.selected = wrapIndex(this.selected, delta, count);
  }

  /**
   * Le lecteur vidéo de Home Assistant (ha-camera-stream) n'est chargé qu'à la demande.
   * Créer une carte image native en mode live le charge ; à défaut, la fenêtre garde les images rafraîchies.
   */
  private async prepareLive(): Promise<void> {
    if (this.config?.live === false || this.liveReady !== undefined || this.livePreparing) return;
    if (typeof customElements !== "undefined" && customElements.get("ha-camera-stream")) {
      this.liveReady = true;
      return;
    }
    const loader = (window as unknown as { loadCardHelpers?: () => Promise<{ createCardElement(config: Record<string, unknown>): HTMLElement }> }).loadCardHelpers;
    if (!loader || typeof customElements === "undefined") {
      this.liveReady = false;
      return;
    }
    this.livePreparing = true;
    try {
      const helpers = await loader();
      helpers.createCardElement({ type: "picture-entity", entity: this.config!.cameras[0].entity, camera_view: "live" });
      await Promise.race([
        customElements.whenDefined("ha-camera-stream"),
        new Promise((resolve) => window.setTimeout(resolve, 4_000)),
      ]);
    } catch {
      // Lecteur introuvable : la fenêtre reste en images rafraîchies.
    } finally {
      this.livePreparing = false;
    }
    this.liveReady = Boolean(customElements.get("ha-camera-stream"));
  }

  private view(camera: CameraConfig, index: number, slotKey = camera.entity): CameraView {
    const state = entity(this.hass, camera.entity);
    const available = isAvailable(state) || state?.state === "unknown";
    const slot = this.loader.slot(slotKey);
    const interval = (this.config?.refresh_interval ?? 10) * 1000;
    const loaded = slot?.loadedAt;
    return {
      index,
      camera,
      state,
      label: camera.name?.trim() || friendlyName(state, camera.entity),
      icon: camera.icon || "mdi:cctv",
      available: Boolean(state) && state!.state !== "unavailable" && available,
      motion: entity(this.hass, camera.motion_entity)?.state === "on",
      url: state && state.state !== "unavailable" ? slot?.url : undefined,
      loaded,
      stale: loaded !== undefined && Date.now() - loaded > Math.max(30_000, interval * 3),
      error: slot?.error ?? false,
    };
  }

  /** Heure de la dernière image reçue, dans le fuseau de Home Assistant. */
  private clock(time: number): string {
    return clockTime(time, this.hass?.config?.time_zone, true);
  }

  private renderImage(view: CameraView): TemplateResult {
    if (!view.available) {
      return html`<span class="cam-empty"><ha-icon icon="mdi:cctv-off"></ha-icon>${view.state ? "Caméra indisponible" : "Caméra introuvable"}</span>`;
    }
    if (!view.url) {
      return view.error
        ? html`<span class="cam-empty"><ha-icon icon="mdi:image-off-outline"></ha-icon>Image indisponible</span>`
        : html`<span class="cam-empty" role="status"><ha-icon icon="mdi:cctv"></ha-icon>Chargement…</span>`;
    }
    return html`<img src=${view.url} alt="" decoding="async" />`;
  }

  private tag(view: CameraView): TemplateResult | typeof nothing {
    if (view.motion) return html`<span class="tag motion">Mouvement</span>`;
    if (!view.available) return nothing;
    if (view.stale || view.error) return html`<span class="tag stale">${view.error ? "Erreur" : "Image figée"}</span>`;
    return view.state?.state === "recording" ? html`<span class="tag motion">REC</span>` : html`<span class="tag ok">Actif</span>`;
  }

  private renderTile(view: CameraView, variant: "tile" | "thumb" = "tile", current = false, onClick = () => this.openCamera(view.index)): TemplateResult {
    const description = [view.label, view.motion ? "mouvement détecté" : cameraStatus(view.state)].join(", ");
    return html`<button type="button" data-camera=${view.camera.entity} class="cam ${variant === "thumb" ? "thumb" : ""} ${view.motion ? "motion" : ""} ${current ? "current" : ""}"
      aria-label=${variant === "thumb" ? `Afficher ${view.label} en grand` : `${description}. Ouvrir la caméra`} @click=${onClick}>
      ${this.renderImage(view)}
      <span class="cam-top"><span class="cam-name"><ha-icon .icon=${view.icon}></ha-icon><span>${view.label}</span></span>${this.tag(view)}</span>
      <span class="cam-bottom"><span>${cameraStatus(view.state)}</span><span>${view.loaded === undefined ? "" : this.clock(view.loaded)}</span></span>
    </button>`;
  }

  /** Accès de la carte pour le lanceur d'actions partagé avec la carte Actions. */
  private actionHost(): ActionHost {
    return {
      hass: this.hass,
      moreInfo: (id) => this.moreInfo(id),
      navigate: (path) => this.navigateFromDialog(path),
      isPending: (key) => this.isPending(key),
      runCommand: (key, action, options) => this.runCommand(key, action, options),
    };
  }

  /**
   * Ouvrir une vue depuis la fenêtre : on la ferme d'abord et on attend que son étape
   * d'historique soit retirée, sinon le bouton Retour mènerait à une étape morte.
   */
  private async navigateFromDialog(path: string): Promise<void> {
    if (this.dialog !== null) {
      this.closeDialog();
      // Le rendu qui suit retire l'étape d'historique de la fenêtre (history.back, asynchrone).
      if (this.isConnected) await this.updateComplete;
      await dialogHistorySettled();
    }
    navigate(path);
  }

  private async runAction(cameraIndex: number, actionIndex: number): Promise<void> {
    const item = this.config?.cameras[cameraIndex]?.actions?.[actionIndex];
    if (!item) return;
    const key = `${cameraIndex}:${actionIndex}`;
    const result = await runActionItem(this.actionHost(), `camera-action:${key}`, item, actionLabel(item, this.hass));
    if (result) this.flash.set(key, result);
  }

  private pressAction(cameraIndex: number, actionIndex: number, item: ActionItemConfig, label: string): void {
    if (this.hold.consumeClick()) return;
    if (actionUnavailable(item, this.hass) || this.isPending(`camera-action:${cameraIndex}:${actionIndex}`)) return;
    if (!item.confirm) {
      void this.runAction(cameraIndex, actionIndex);
      return;
    }
    this.askConfirmation(actionConfirmation(item, label, () => this.runAction(cameraIndex, actionIndex)));
  }

  private renderDialogActions(view: CameraView): TemplateResult {
    const items = view.camera.actions ?? [];
    const accent = configuredAccent(this.config);
    return html`<div class="actions">
      ${items.map((item, index) => {
        const key = `${view.index}:${index}`;
        const pending = this.isPending(`camera-action:${key}`);
        const status = this.actionStatus.get(key);
        const label = actionLabel(item, this.hass);
        const unavailable = actionUnavailable(item, this.hass);
        const holdId = item.state_entity || item.entity;
        const on = isOn(entity(this.hass, holdId)) && !status && !pending;
        const icon = status === "done" ? "mdi:check" : status === "error" ? "mdi:alert-outline" : actionIcon(item, this.hass);
        return html`<button class="action cam-act ${on ? "on" : ""} ${status === "done" ? "done" : status === "error" ? "failed" : ""}" type="button"
          style=${`--tone:${actionTone(item, accent)}`} aria-disabled=${unavailable ? "true" : "false"} aria-busy=${pending ? "true" : "false"}
          aria-label=${`${label}${unavailable ? ", indisponible" : ""}${item.confirm ? ", demande une confirmation" : ""}`}
          @click=${() => this.pressAction(view.index, index, item, label)}
          @pointerdown=${() => { if (holdId) this.hold.start(() => this.moreInfo(holdId)); }}
          @pointerup=${() => this.hold.cancel()} @pointerleave=${() => this.hold.cancel()} @pointercancel=${() => this.hold.cancel()}
          @contextmenu=${(event: Event) => {
            if (!holdId) return;
            event.preventDefault();
            this.hold.cancel();
            this.moreInfo(holdId);
          }}>
          <ha-icon .icon=${icon}></ha-icon>${pending ? "En cours…" : label}</button>`;
      })}
      ${view.camera.motion_entity ? html`<button class="action" type="button" @click=${() => this.moreInfo(view.camera.motion_entity)}><ha-icon icon="mdi:motion-sensor"></ha-icon>Mouvements</button>` : nothing}
      <button class="action" type="button" @click=${() => this.moreInfo(view.camera.entity)}><ha-icon icon="mdi:information-outline"></ha-icon>Fiche</button>
    </div>`;
  }

  private renderCameraDialog(view: CameraView): TemplateResult {
    const count = this.config?.cameras.length ?? 1;
    const live = this.showingLive(view.camera) && view.available;
    const dialogView = this.view(view.camera, view.index, `dialog:${view.camera.entity}`);
    // Avant la première image de la fenêtre, on garde celle de la tuile.
    const still = dialogView.url ? dialogView : { ...dialogView, url: view.url, loaded: view.loaded, error: dialogView.error && !view.url };
    const motionState = entity(this.hass, view.camera.motion_entity);
    const lastMotion = motionState?.last_changed ? Date.parse(motionState.last_changed) : Number.NaN;
    const liveFailed = this.config?.live !== false && this.liveReady === false;
    const mode = live ? "Flux en direct" : this.config?.live === false || this.liveReady === false ? "Images rafraîchies en continu" : "Préparation du direct…";
    return this.renderDialog(view.label, view.icon, html`<div class="dialog-body">
      <div class="media">
        ${live
          ? html`<ha-camera-stream .hass=${this.hass} .stateObj=${view.state} .controls=${true} .muted=${true} .allowExoPlayer=${true}></ha-camera-stream>`
          : this.renderImage(still)}
        <span class="media-tags">${this.tag(live ? view : still)}</span>
        ${count > 1 ? html`
          <button class="nav prev" type="button" aria-label="Caméra précédente" @click=${() => this.step(-1)}><ha-icon icon="mdi:chevron-left"></ha-icon></button>
          <button class="nav next" type="button" aria-label="Caméra suivante" @click=${() => this.step(1)}><ha-icon icon="mdi:chevron-right"></ha-icon></button>` : nothing}
      </div>
      <div class="info">
        <span><strong>${cameraStatus(view.state)}</strong> · ${mode}</span>
        ${!live && still.loaded !== undefined ? html`<span>Image ${ageLabel(still.loaded, Date.now())}</span>` : nothing}
        ${motionState ? html`<span class=${view.motion ? "motion" : ""}>${view.motion ? "Mouvement en cours" : Number.isFinite(lastMotion) ? `Dernier mouvement ${relativeTime(lastMotion, Date.now())}` : "Aucun mouvement"}</span>` : nothing}
        ${count > 1 ? html`<span>${view.index + 1} / ${count}</span>` : nothing}
        ${liveFailed && view.available ? html`<button class="retry-live" type="button" @click=${() => this.retryLive()}><ha-icon icon="mdi:refresh"></ha-icon>Réessayer le direct</button>` : nothing}
      </div>
      ${this.renderDialogActions(view)}
    </div>`, "cam-dialog");
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this.config;
    if (!config) return nothing;
    const views = config.cameras.map((camera, index) => this.view(camera, index));
    const motion = views.filter((view) => view.motion).length;
    const unavailable = views.filter((view) => !view.available).length;
    const ratio = parseAspectRatio(config.aspect_ratio);
    const ratioCss = `--cam-ratio-css:1 / ${Math.round(ratio * 10_000) / 10_000}`;
    const showHeader = config.show_header ?? Boolean(config.name);
    const summary = [
      `${views.length} caméra${views.length > 1 ? "s" : ""}`,
      motion ? `${motion} mouvement${motion > 1 ? "s" : ""}` : undefined,
      unavailable ? `${unavailable} indisponible${unavailable > 1 ? "s" : ""}` : undefined,
    ].filter(Boolean).join(" · ");
    const featured = views[featuredIndex(views, this.featured)] ?? views[0];
    const selected = this.dialog === "camera" && this.selected !== undefined ? views[this.selected] : undefined;
    return html`<ha-card><div class="machine-shell cam-shell ${this.machineGridClass()}" style=${`${this.machineStyle("#79d6f2")};${ratioCss}`}>
      <div class="machine-content cam-content">
        ${showHeader ? html`<header class="header">
          <span class="badge"><ha-icon .icon=${config.icon || "mdi:cctv"}></ha-icon></span>
          <div class="title-wrap"><h2>${config.name || "Caméras"}</h2>
            <div class="status-line ${motion ? "motion" : ""}"><span class="dot ${motion ? "danger" : unavailable ? "warning" : "healthy"}"></span>${summary}</div></div>
        </header>` : nothing}
        ${config.layout === "featured" && views.length > 1
          ? html`${this.renderTile(featured)}
              <div class="thumbs">${views.map((view) => this.renderTile(view, "thumb", view.index === featured.index, () => { this.featured = view.index; }))}</div>`
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
