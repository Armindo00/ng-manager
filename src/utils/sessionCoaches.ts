const SECONDARY_PREFIX = "SECONDARY_COACH=";

export function stripSecondaryCoachNotes(notes?: string) {
  return (notes || "")
    .split("\n")
    .filter((line) => !line.startsWith(SECONDARY_PREFIX))
    .join("\n")
    .trim();
}

export function encodeCoachNotes(
  notes: string | undefined,
  secondaryCoachName?: string
) {
  const cleanNotes = stripSecondaryCoachNotes(notes);

  if (!secondaryCoachName?.trim()) {
    return cleanNotes;
  }

  const secondaryLine = `${SECONDARY_PREFIX}${secondaryCoachName.trim()}`;
  return cleanNotes ? `${secondaryLine}\n${cleanNotes}` : secondaryLine;
}

export function parseSecondaryCoachName(notes?: string) {
  if (!notes) return "";

  const line = notes
    .split("\n")
    .find((item) => item.startsWith(SECONDARY_PREFIX));

  return line ? line.slice(SECONDARY_PREFIX.length).trim() : "";
}

export function formatSessionCoaches(
  primaryName: string,
  secondaryName?: string
) {
  if (!secondaryName?.trim()) return primaryName;
  return `${primaryName} + ${secondaryName.trim()}`;
}
