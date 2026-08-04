export function calculateTrackProgressPercent(completedMissions: number, totalMissions: number) {
  if (totalMissions <= 0) {
    return 0;
  }

  return Math.round((completedMissions / totalMissions) * 100);
}
