export function calculateLevel(totalXp: number) {
  if (totalXp <= 0) {
    return 1;
  }

  return Math.floor(totalXp / 250) + 1;
}

export function buildXpDedupeKey(userId: string, reason: string, referenceId: string) {
  return `${userId}:${reason}:${referenceId}`;
}

export function canGrantXp(existingDedupeKeys: Set<string>, dedupeKey: string) {
  return !existingDedupeKeys.has(dedupeKey);
}
