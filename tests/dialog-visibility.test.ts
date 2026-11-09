import { afterEach, describe, expect, it, vi } from "vitest";
import { hasOpenAuralisDialog, setAuralisDialogOpen } from "../src/utils/dialog-visibility";

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
});
