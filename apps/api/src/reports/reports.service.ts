import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type GroupBy = "day" | "week" | "month";

function parseDateOrThrow(s?: string, name?: string) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`Fecha inválida: ${name}`);
  return d;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async salesReport(input: { from?: string; to?: string; groupBy: GroupBy }) {
    const from = parseDateOrThrow(input.from, "from");
    const to = parseDateOrThrow(input.to, "to");
    const groupBy = input.groupBy;

    // default: últimos 30 días
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    const fromDate = from ?? defaultFrom;
    const toDate = to ?? now;

    // normaliza rango (evita errores)
    if (fromDate > toDate) throw new BadRequestException("from no puede ser mayor que to");

    // 1) Timeline (ventas agrupadas)
    const timeline = await this.prisma.$queryRaw<
      Array<{
        bucket: Date;
        orders: number;
        gross: number;
        cash: number;
        debit: number;
      }>
    >`
      SELECT
        date_trunc(${groupBy}, "paidAt") as bucket,
        COUNT(*)::int as orders,
        COALESCE(SUM("totalAmount"), 0)::int as gross,
        COALESCE(SUM(CASE WHEN "method" = 'CASH' THEN "totalAmount" ELSE 0 END), 0)::int as cash,
        COALESCE(SUM(CASE WHEN "method" = 'DEBIT' THEN "totalAmount" ELSE 0 END), 0)::int as debit
      FROM "Payment"
      WHERE "paidAt" >= ${fromDate} AND "paidAt" <= ${toDate}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    // 2) Totales del rango
    const totals = await this.prisma.payment.aggregate({
      where: { paidAt: { gte: fromDate, lte: toDate } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    });

    // 3) Top productos (por cantidad y por $)
    const topProducts = await this.prisma.$queryRaw<
      Array<{
        productId: string;
        name: string;
        category: string;
        qty: number;
        gross: number;
      }>
    >`
      SELECT
        p.id as "productId",
        p.name as "name",
        p.category as "category",
        COALESCE(SUM(ti.qty), 0)::int as qty,
        COALESCE(SUM(ti."lineTotal"), 0)::int as gross
      FROM "TicketItem" ti
      INNER JOIN "Ticket" t ON t.id = ti."ticketId"
      INNER JOIN "Payment" pay ON pay."ticketId" = t.id
      INNER JOIN "Product" p ON p.id = ti."productId"
      WHERE pay."paidAt" >= ${fromDate} AND pay."paidAt" <= ${toDate}
      GROUP BY p.id, p.name, p.category
      ORDER BY gross DESC
      LIMIT 15
    `;

    return {
      range: { from: fromDate.toISOString(), to: toDate.toISOString(), groupBy },
      totals: {
        orders: totals._count._all,
        gross: totals._sum.totalAmount ?? 0,
      },
      timeline: timeline.map((r) => ({
        bucket: r.bucket,
        orders: r.orders,
        gross: r.gross,
        cash: r.cash,
        debit: r.debit,
      })),
      topProducts,
    };
  }
}
