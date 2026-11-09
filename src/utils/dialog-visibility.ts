const openDialogs = new Set<HTMLElement>();

export function hasOpenAuralisDialog(): boolean {
  return openDialogs.size > 0;
}

export function setAuralisDialogOpen(card: HTMLElement, open: boolean): void {
  const wasOpen = hasOpenAuralisDialog();
  if (open) openDialogs.add(card);
  else openDialogs.delete(card);
  if (wasOpen === hasOpenAuralisDialog() || typeof document === "undefined") return;

  document.querySelectorAll<HTMLElement>("auralis-navbar-card[data-portal]").forEach((navbar) => {
    navbar.toggleAttribute("data-dialog-open", hasOpenAuralisDialog());
  });
}
