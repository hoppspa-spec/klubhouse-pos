export const RATE_PER_HOUR = 3800;
export const MINIMUM_30 = 1900;

export function roundUp100(x: number) {
  return Math.ceil(x / 100) * 100;
}

export function calcMinutes(startedAt: Date, endedAt: Date) {
  const diffMs = Math.max(0, endedAt.getTime() - startedAt.getTime());
  return Math.floor(diffMs / 60000);
}

const RATE_DAY = 3800;
const RATE_NIGHT = 4800;

// Chile timezone (America/Santiago)
function getChileHour(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  return Number(hh);
}

// ✅ V1 simple: decide tarifa por la hora de "endedAt" (momento de cobro/cierre)
export function calcRental(minutes: number, endedAt: Date = new Date()) {
  const hours = Math.max(1, Math.ceil(minutes / 60));
  const h = getChileHour(endedAt);
  const rate = h >= 0 && h < 6 ? RATE_NIGHT : RATE_DAY;
  return hours * rate;
}

