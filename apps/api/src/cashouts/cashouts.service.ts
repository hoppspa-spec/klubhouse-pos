import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type Method = "CASH" | "DEBIT";

@Injectable()
export class CashoutsService {
  constructor(private prisma: PrismaService) {}

  private dayRangeUTC(now = new Date()) {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);

    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    return { from, to };
  }

  private parseRange(from?: string, to?: string) {
    const f = from ? new Date(from) : null;
    const t = to ? new Date(to) : null;

    const fromDate = f && !isNaN(f.getTime()) ? f : new Date(0);
    const toDate = t && !isNaN(t.getTime()) ? t : new Date();

    return { fromDate, toDate };
  }

  private summarize(payments: Array<{ method: Method; totalAmount: number }>) {
    const cash = payments.filter(p => p.method === "CASH").reduce((a, p) => a + Number(p.totalAmount || 0), 0);
    const debit = payments.filter(p => p.method === "DEBIT").reduce((a, p) => a + Number(p.totalAmount || 0), 0);
    const total = payments.reduce((a, p) => a + Number(p.totalAmount || 0), 0);
    return { count: payments.length, cash, debit, total };
  }

  // ✅ preview para el usuario (hoy)
  async previewForUser(userId: string) {
    const { from, to } = this.dayRangeUTC();
    const payments = await this.prisma.payment.findMany({
      where: { paidById: userId, paidAt: { gte: from, lte: to } },
      select: { method: true, totalAmount: true, paidAt: true, receiptNumber: true, ticketId: true },
      orderBy: { paidAt: "desc" },
    });

    const sum = this.summarize(payments as any);

    return {
      ok: true,
      userId,
      from: from.toISOString(),
      to: to.toISOString(),
      ...sum,
    };
  }

  // ✅ close para el usuario (V1 = mismo resumen; si después creas tabla Cashout, aquí se guarda)
  async closeForUser(userId: string) {
    // V1: misma lógica que preview (sin persistencia)
    const out = await this.previewForUser(userId);
    return { ...out, closed: true };
  }

  // ✅ listado global (manager/admin): detalle de pagos en rango
  async list(from?: string, to?: string) {
    const { fromDate, toDate } = this.parseRange(from, to);

    const rows = await this.prisma.payment.findMany({
      where: { paidAt: { gte: fromDate, lte: toDate } },
      select: {
        paidAt: true,
        receiptNumber: true,
        method: true,
        totalAmount: true,
        ticketId: true,
        ticket: {
          select: {
            kind: true,
            table: { select: { name: true } },
            openedBy: { select: { name: true, username: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
    });

    const mapped = rows.map((r) => ({
      paidAt: r.paidAt.toISOString(),
      receiptNumber: r.receiptNumber,
      method: r.method as any,
      totalAmount: Number(r.totalAmount || 0),
      ticketId: r.ticketId,
      kind: r.ticket?.kind ?? undefined,
      tableName: r.ticket?.table?.name ?? undefined,
      sellerName: r.ticket?.openedBy?.name || r.ticket?.openedBy?.username || undefined,
    }));

    const sum = this.summarize(mapped as any);

    return {
      ok: true,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      ...sum,
      rows: mapped,
    };
  }

  // ✅ CSV global
  async csv(from?: string, to?: string) {
    const data = await this.list(from, to);

    const header = [
      "paidAt",
      "receiptNumber",
      "method",
      "totalAmount",
      "ticketId",
      "kind",
      "tableName",
      "sellerName",
    ].join(",");

    const lines = (data.rows || []).map((r: any) => [
      safeCsv(r.paidAt),
      safeCsv(r.receiptNumber),
      safeCsv(r.method),
      safeCsv(r.totalAmount),
      safeCsv(r.ticketId),
      safeCsv(r.kind),
      safeCsv(r.tableName),
      safeCsv(r.sellerName),
    ].join(","));

    return [header, ...lines].join("\n");
  }
}

function safeCsv(v: any) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // si tiene coma/quotes/salto, escapamos
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
