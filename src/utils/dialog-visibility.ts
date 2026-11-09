const openDialogs = new Set<HTMLElement>();
const HISTORY_KEY = "__auralis_dialog";
const historyFrames: Array<{ card: HTMLElement; token: string; url: string; close: () => void; open: boolean }> = [];
let nextDialogId = 0;

function historyToken(): string | undefined {
  const state = window.history.state;
  return state && typeof state === "object" ? state[HISTORY_KEY] : undefined;
}

function handlePopState(): void {
  const current = historyToken();
  while (historyFrames.length && historyFrames[historyFrames.length - 1].token !== current) {
    const frame = historyFrames.pop()!;
    if (frame.open) {
      frame.open = false;
      frame.close();
    }
  }
  if (!historyFrames.length) window.removeEventListener("popstate", handlePopState);
}

function addHistoryFrame(card: HTMLElement, close: () => void): void {
  if (typeof window === "undefined" || !window.history?.pushState) return;
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
    window.history.back();
  } else {
    historyFrames.splice(index, 1);
    if (!historyFrames.length) window.removeEventListener("popstate", handlePopState);
  }
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
