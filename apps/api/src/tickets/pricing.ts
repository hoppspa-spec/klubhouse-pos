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
export function calcRental(minutes: number, endedAt: Date): number {
  const MIN_BLOCK_MINUTES = 30;
  const MIN_BLOCK_PRICE = 1900;

  if (!minutes || minutes <= 0) return 0;

  // 🔥 mínimo obligatorio
  if (minutes <= MIN_BLOCK_MINUTES) {
    return MIN_BLOCK_PRICE;
  }

  // 👇 aquí tu lógica normal después de 30 min
  // ejemplo simple por minuto:
  const pricePerMinute = 63; // ajusta si usas otro valor

  return minutes * pricePerMinute;
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
