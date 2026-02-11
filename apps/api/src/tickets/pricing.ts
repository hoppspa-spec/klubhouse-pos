// apps/api/src/tickets/pricing.ts

export function calcMinutes(startedAt: Date, endedAt: Date) {
  const ms = endedAt.getTime() - startedAt.getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

// Redondeo a $100 hacia arriba (como ya venías usando)
export function roundUp100(n: number) {
  const x = Number(n) || 0;
  return Math.ceil(x / 100) * 100;
}

/**
 * Arriendo:
 * - Base: $3.800 por hora
 * - Nocturno: $4.800 por hora desde 00:00 hasta 06:00 (Chile)
 * - Se cobra por hora proporcional (por minuto), y al final redondeo a 100 (opcional aquí o en total)
 */
export function calcRental(minutes: number, endedAt: Date) {
  const m = Math.max(0, Number(minutes) || 0);

  // Hora local de Chile, sin depender del TZ del servidor
  const hourCL = getChileHour(endedAt);

  const isNight = hourCL >= 0 && hourCL < 6; // 00:00–05:59
  const ratePerHour = isNight ? 4800 : 3800;

  const raw = (ratePerHour * m) / 60;

  // puedes redondear acá o solo en total final.
  return roundUp100(raw);
}

function getChileHour(d: Date) {
  // "hour: '2-digit'" => "00".."23"
  const hh = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    hour12: false,
  }).format(d);

  const n = Number(hh);
  return Number.isFinite(n) ? n : d.getHours();
}
