export function calculateProgressPercent(completedItems: number, totalItems: number) {
  if (totalItems <= 0) {
    return 0;
  }

  return Math.round((completedItems / totalItems) * 100);
}
