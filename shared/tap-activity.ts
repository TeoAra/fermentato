export interface TapActivityState {
  beerId: number;
  isActive?: boolean | null;
}

/** Only a new serving, a different beer, or a reactivated serving is an attachment. */
export function isTapAttachment(
  previous: TapActivityState | null | undefined,
  current: TapActivityState | null | undefined,
): boolean {
  if (!current || current.isActive === false) return false;
  return !previous || current.beerId !== previous.beerId || previous.isActive === false;
}

export function formatTapAttachmentMessage(
  pubName: string,
  beerName: string,
  breweryName?: string | null,
): string {
  const brewery = breweryName?.trim();
  return `${pubName} ha attaccato "${beerName}"${brewery ? ` di "${brewery}"` : ""}.`;
}
