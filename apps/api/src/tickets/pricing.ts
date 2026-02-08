export const RATE_PER_HOUR = 3800;
export const MINIMUM_30 = 1900;

export function roundUp100(x: number) {
  return Math.ceil(x / 100) * 100;
}

export function calcMinutes(startedAt: Date, endedAt: Date) {
  const diffMs = Math.max(0, endedAt.getTime() - startedAt.getTime());
  return Math.floor(diffMs / 60000);
}

export function calcRental(minutes: number) {
  if (minutes <= 30) return roundUp100(MINIMUM_30);
  const raw = (minutes * RATE_PER_HOUR) / 60;
  return roundUp100(raw);
}
