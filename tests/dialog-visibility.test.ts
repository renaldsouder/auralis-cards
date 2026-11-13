import { afterEach, describe, expect, it, vi } from "vitest";
import { dialogHistorySettled, hasOpenAuralisDialog, setAuralisDialogOpen } from "../src/utils/dialog-visibility";

function mockHistory(options: { asyncBack?: boolean } = {}): { position: () => number; length: () => number; flushBack: () => void } {
  let pendingBack = 0;
  const entries = [
    { url: "http://homeassistant.local/accueil", state: { view: "accueil" } },
    { url: "http://homeassistant.local/salon", state: { view: "salon" } },
  ];
  let index = 1;
  const listeners = new Set<() => void>();
  vi.stubGlobal("window", {
    location: { get href() { return entries[index].url; } },
    history: {
      get state() { return entries[index].state; },
      pushState(state: typeof entries[number]["state"], _title: string, url: string) {
        entries.splice(index + 1);
        entries.push({ url, state });
        index++;
      },
      back() {
        // Un vrai navigateur traite history.back() plus tard : le mode asynchrone le reproduit.
        if (options.asyncBack) { pendingBack++; return; }
        index--;
        listeners.forEach((listener) => listener());
      },
    },
    setTimeout: (fn: () => void, ms: number) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id: number) => globalThis.clearTimeout(id),
    addEventListener(_type: string, listener: () => void) { listeners.add(listener); },
    removeEventListener(_type: string, listener: () => void) { listeners.delete(listener); },
  });
  return {
    position: () => index,
    length: () => entries.length,
    flushBack: () => {
      while (pendingBack > 0) {
        pendingBack--;
        index--;
        listeners.forEach((listener) => listener());
      }
    },
  };
}

describe("Auralis dialog and navbar visibility", () => {
  const first = {} as HTMLElement;
  const second = {} as HTMLElement;

  afterEach(() => {
    setAuralisDialogOpen(first, false);
    setAuralisDialogOpen(second, false);
    vi.unstubAllGlobals();
  });

  it("keeps the navbar hidden until the last dialog closes", () => {
    const navbar = { toggleAttribute: vi.fn() };
    vi.stubGlobal("document", { querySelectorAll: () => [navbar] });

    setAuralisDialogOpen(first, true);
    setAuralisDialogOpen(second, true);
    setAuralisDialogOpen(first, false);
    expect(hasOpenAuralisDialog()).toBe(true);
    expect(navbar.toggleAttribute).toHaveBeenCalledTimes(1);
    expect(navbar.toggleAttribute).toHaveBeenCalledWith("data-dialog-open", true);

    setAuralisDialogOpen(second, false);
    expect(hasOpenAuralisDialog()).toBe(false);
    expect(navbar.toggleAttribute).toHaveBeenLastCalledWith("data-dialog-open", false);
  });

  it("uses the first back gesture to close the dialog and the next to navigate", () => {
    const history = mockHistory();
    const close = vi.fn(() => setAuralisDialogOpen(first, false));

    setAuralisDialogOpen(first, true, close);
    setAuralisDialogOpen(first, true, close);
    expect(history.length()).toBe(3);
    window.history.back();

    expect(close).toHaveBeenCalledOnce();
    expect(hasOpenAuralisDialog()).toBe(false);
    expect(history.position()).toBe(1);
    expect(window.location.href).toBe("http://homeassistant.local/salon");

    window.history.back();
    expect(window.location.href).toBe("http://homeassistant.local/accueil");
  });

  it("removes the temporary history step when the close button is used", () => {
    const history = mockHistory();
    setAuralisDialogOpen(first, true, vi.fn());

    setAuralisDialogOpen(first, false);
    expect(history.position()).toBe(1);
    expect(window.location.href).toBe("http://homeassistant.local/salon");

    window.history.back();
    expect(window.location.href).toBe("http://homeassistant.local/accueil");
  });

  it("waits for the dialog history step to be removed before navigating", async () => {
    const history = mockHistory();
    const listeners: Array<() => void> = [];
    // history.back() asynchrone, comme dans un vrai navigateur.
    const back = window.history.back.bind(window.history);
    (window.history as { back: () => void }).back = () => { listeners.push(back); };
    (window as unknown as { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout }).setTimeout = setTimeout;
    (window as unknown as { clearTimeout: typeof clearTimeout }).clearTimeout = clearTimeout;
    await expect(dialogHistorySettled()).resolves.toBeUndefined();

    setAuralisDialogOpen(first, true, vi.fn());
    setAuralisDialogOpen(first, false);
    let settled = false;
    const waiting = dialogHistorySettled().then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    listeners.shift()!();
    await waiting;
    expect(settled).toBe(true);
    expect(history.position()).toBe(1);
  });

  it("closes one dialog per back gesture when several are open", () => {
    mockHistory();
    const closeFirst = vi.fn(() => setAuralisDialogOpen(first, false));
    const closeSecond = vi.fn(() => setAuralisDialogOpen(second, false));
    setAuralisDialogOpen(first, true, closeFirst);
    setAuralisDialogOpen(second, true, closeSecond);

    window.history.back();
    expect(closeSecond).toHaveBeenCalledOnce();
    expect(closeFirst).not.toHaveBeenCalled();
    expect(hasOpenAuralisDialog()).toBe(true);

    window.history.back();
    expect(closeFirst).toHaveBeenCalledOnce();
    expect(hasOpenAuralisDialog()).toBe(false);
  });

  it("keeps a dialog opened while the previous one is still leaving the history", async () => {
    const history = mockHistory({ asyncBack: true });
    const closeSecond = vi.fn(() => setAuralisDialogOpen(second, false));
    setAuralisDialogOpen(first, true, vi.fn());

    // Fermeture d'une fenêtre et ouverture d'une autre dans le même instant.
    setAuralisDialogOpen(first, false);
    setAuralisDialogOpen(second, true, closeSecond);
    history.flushBack();
    await dialogHistorySettled();
    await Promise.resolve();

    expect(closeSecond).not.toHaveBeenCalled();
    expect(hasOpenAuralisDialog()).toBe(true);
    expect(history.position()).toBe(2);

    // Le geste retour ferme ensuite bien la seconde fenêtre.
    window.history.back();
    history.flushBack();
    expect(closeSecond).toHaveBeenCalledOnce();
    expect(history.position()).toBe(1);
  });
});
