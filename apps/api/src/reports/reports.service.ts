import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TicketKind, TicketStatus } from "@prisma/client";

function parseRange(from?: string, to?: string) {
  const now = new Date();

  const toDate = to ? new Date(to) : now;
  if (Number.isNaN(toDate.getTime())) throw new BadRequestException("Query 'to' inválida (ISO date)");

  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(fromDate.getTime())) throw new BadRequestException("Query 'from' inválida (ISO date)");

  // normaliza si vienen invertidas
  if (fromDate > toDate) return { fromDate: toDate, toDate: fromDate };
  return { fromDate, toDate };
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ✅ Resumen general (ventas + arriendos) basado en pagos (paidAt)
  async summary(from?: string, to?: string) {
    const { fromDate, toDate } = parseRange(from, to);

    const payments = await this.prisma.payment.findMany({
      where: { paidAt: { gte: fromDate, lte: toDate } },
      include: {
        ticket: {
          include: {
            table: true,
            items: { include: { product: true } },
          },
        },
      },
      orderBy: { paidAt: "asc" },
    });

    const totalSales = payments.reduce((a, p) => a + Number(p.totalAmount || 0), 0);

    const rentalsPaid = payments.filter((p) => p.ticket?.kind === TicketKind.RENTAL);
    const rentalAmountTotal = rentalsPaid.reduce((a, p) => a + Number(p.ticket?.rentalAmount || 0), 0);

    const barPaid = payments.filter((p) => p.ticket?.kind === TicketKind.BAR);
    const barAmountTotal = barPaid.reduce((a, p) => a + Number(p.totalAmount || 0), 0);

    const byMethod = payments.reduce(
      (acc: any, p: any) => {
        const m = String(p.method || "UNKNOWN");
        acc[m] = (acc[m] || 0) + Number(p.totalAmount || 0);
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      countPayments: payments.length,
      totalSales,
      rentalAmountTotal,
      barAmountTotal,
      byMethod,
    };
  }

  // ✅ Top productos: qty y monto (desde items de tickets pagados dentro del rango)
  async topProducts(from?: string, to?: string) {
    const { fromDate, toDate } = parseRange(from, to);

    const payments = await this.prisma.payment.findMany({
      where: { paidAt: { gte: fromDate, lte: toDate } },
      include: {
        ticket: { include: { items: { include: { product: true } } } },
      },
    });

    const map = new Map<
      string,
      { productId: string; name: string; category: string; qty: number; amount: number }
    >();

    for (const p of payments) {
      const items = p.ticket?.items || [];
      for (const it of items) {
        const key = it.productId;
        const prev = map.get(key) || {
          productId: it.productId,
          name: it.product?.name ?? "SIN_NOMBRE",
          category: it.product?.category ?? "SIN_CAT",
          qty: 0,
          amount: 0,
        };

        prev.qty += Number(it.qty || 0);
        prev.amount += Number(it.lineTotal || 0);
        map.set(key, prev);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }

  // ✅ Arriendos (tickets RENTAL pagados en el rango)
  async rentals(from?: string, to?: string) {
    const { fromDate, toDate } = parseRange(from, to);

    const payments = await this.prisma.payment.findMany({
      where: { paidAt: { gte: fromDate, lte: toDate } },
      include: {
        ticket: { include: { table: true, openedBy: true } },
      },
      orderBy: { paidAt: "asc" },
    });

    const rentals = payments
      .filter((p) => p.ticket?.kind === TicketKind.RENTAL)
      .map((p) => ({
        paidAt: p.paidAt,
        method: p.method,
        receiptNumber: p.receiptNumber,
        ticketId: p.ticketId,
        table: p.ticket?.table?.name,
        minutesPlayed: p.ticket?.minutesPlayed ?? null,
        rentalAmount: p.ticket?.rentalAmount ?? 0,
        totalAmount: p.totalAmount,
        openedBy: p.ticket?.openedBy?.name ?? null,
      }));

    // resumen por mesa (cuánto se arrendó)
    const byTable = rentals.reduce((acc: any, r: any) => {
      const k = r.table || "SIN_MESA";
      acc[k] = (acc[k] || 0) + Number(r.rentalAmount || 0);
      return acc;
    }, {} as Record<string, number>);

    return {
      range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      count: rentals.length,
      byTable,
      rows: rentals,
    };
  }

  // CSV simple: pagos + tipo ticket + mesa
  async csv(from?: string, to?: string) {
    const { fromDate, toDate } = parseRange(from, to);

    const payments = await this.prisma.payment.findMany({
      where: { paidAt: { gte: fromDate, lte: toDate } },
      include: { ticket: { include: { table: true } } },
      orderBy: { paidAt: "asc" },
    });

    const header = [
      "paidAt",
      "receiptNumber",
      "method",
      "totalAmount",
      "ticketId",
      "ticketKind",
      "ticketStatus",
      "table",
      "rentalAmount",
      "minutesPlayed",
    ].join(",");

    const lines = payments.map((p) => {
      const t: any = p.ticket || {};
      const row = [
        new Date(p.paidAt).toISOString(),
        p.receiptNumber ?? "",
        p.method ?? "",
        Number(p.totalAmount ?? 0),
        p.ticketId,
        t.kind ?? "",
        t.status ?? "",
        t.table?.name ?? "",
        Number(t.rentalAmount ?? 0),
        t.minutesPlayed ?? "",
      ];
      // escapa comillas
      return row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    return [header, ...lines].join("\n");
  }
}
