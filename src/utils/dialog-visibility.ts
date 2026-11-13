const openDialogs = new Set<HTMLElement>();
const HISTORY_KEY = "__auralis_dialog";
const historyFrames: Array<{ card: HTMLElement; token: string; url: string; close: () => void; open: boolean }> = [];
let nextDialogId = 0;
/** Retours arrière demandés par la fermeture d'une fenêtre, pas encore traités par le navigateur. */
let pendingBacks = 0;
let settledWaiters: Array<() => void> = [];
const SETTLE_TIMEOUT = 600;

function historyToken(): string | undefined {
  const state = window.history.state;
  return state && typeof state === "object" ? state[HISTORY_KEY] : undefined;
}

function resolveSettled(): void {
  if (pendingBacks > 0) return;
  const waiters = settledWaiters;
  settledWaiters = [];
  waiters.forEach((resolve) => resolve());
}

function handlePopState(): void {
  if (pendingBacks > 0) pendingBacks--;
  const current = historyToken();
  while (historyFrames.length && historyFrames[historyFrames.length - 1].token !== current) {
    const frame = historyFrames.pop()!;
    if (frame.open) {
      frame.open = false;
      frame.close();
    }
  }
  if (!historyFrames.length) window.removeEventListener("popstate", handlePopState);
  resolveSettled();
}

function addHistoryFrame(card: HTMLElement, close: () => void): void {
  if (typeof window === "undefined" || !window.history?.pushState) return;
  if (pendingBacks > 0) {
    // Une fenêtre vient de se fermer et son retour arrière n'a pas encore eu lieu : ajouter
    // l'étape maintenant la ferait retirer par ce retour arrière, qui fermerait la nouvelle
    // fenêtre. On attend qu'il soit passé, si la fenêtre est toujours ouverte.
    void dialogHistorySettled().then(() => {
      if (openDialogs.has(card) && !historyFrames.some((frame) => frame.card === card && frame.open)) {
        pushHistoryFrame(card, close);
      }
    });
    return;
  }
  pushHistoryFrame(card, close);
}

function pushHistoryFrame(card: HTMLElement, close: () => void): void {
  const token = `auralis-${Date.now()}-${++nextDialogId}`;
  const url = window.location.href;
  const state = window.history.state;
  try {
    window.history.pushState({ ...(state && typeof state === "object" ? state : {}), [HISTORY_KEY]: token }, "", url);
  } catch {
    return;
  }
  historyFrames.push({ card, token, url, close, open: true });
  window.addEventListener("popstate", handlePopState);
}

function removeHistoryFrame(card: HTMLElement): void {
  let index = historyFrames.length - 1;
  while (index >= 0 && (historyFrames[index].card !== card || !historyFrames[index].open)) index--;
  if (index < 0) return;
  const frame = historyFrames[index];
  frame.open = false;
  if (typeof window !== "undefined" && historyToken() === frame.token && window.location.href === frame.url) {
    pendingBacks++;
    window.history.back();
  } else {
    historyFrames.splice(index, 1);
    if (!historyFrames.length) window.removeEventListener("popstate", handlePopState);
  }
}

/**
 * Attend que le navigateur ait retiré l'étape d'historique d'une fenêtre qu'on vient de fermer.
 * `history.back()` est asynchrone : naviguer avant son `popstate` ferait revenir en arrière
 * depuis la nouvelle vue au lieu de retirer l'étape de la fenêtre.
 */
export function dialogHistorySettled(timeout = SETTLE_TIMEOUT): Promise<void> {
  if (pendingBacks <= 0 || typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      // Le navigateur n'a pas répondu : on ne bloque pas la navigation pour autant.
      pendingBacks = 0;
      resolveSettled();
    }, timeout);
    settledWaiters.push(() => {
      window.clearTimeout(timer);
      resolve();
    });
  });
}

export function hasOpenAuralisDialog(): boolean {
  return openDialogs.size > 0;
}

export function setAuralisDialogOpen(card: HTMLElement, open: boolean, close?: () => void): void {
  const wasOpen = hasOpenAuralisDialog();
  const cardWasOpen = openDialogs.has(card);
  if (open && !cardWasOpen) {
    openDialogs.add(card);
    if (close) addHistoryFrame(card, close);
  } else if (!open && cardWasOpen) {
    openDialogs.delete(card);
    removeHistoryFrame(card);
  }
  if (wasOpen === hasOpenAuralisDialog() || typeof document === "undefined") return;

  document.querySelectorAll<HTMLElement>("auralis-navbar-card[data-portal]").forEach((navbar) => {
    navbar.toggleAttribute("data-dialog-open", hasOpenAuralisDialog());
  });
}
