import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentMethod } from "@prisma/client";

type Preview = {
  from: Date;
  to: Date;
  orders: number;
  totalCash: number;
  totalDebit: number;
  total: number;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toCSV(rows: any[]) {
  const header = ["id", "userId", "from", "to", "orders", "totalCash", "totalDebit", "total", "createdAt"];
  const esc = (v: any) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [header.join(","), ...rows.map((r) => header.map((k) => esc(r[k])).join(","))].join("\n");
}

@Injectable()
export class CashoutsService {
  constructor(private prisma: PrismaService) {}

  // último cierre del usuario
  async getLastForUser(userId: string) {
    return this.prisma.cashout.findFirst({
      where: { userId },
      orderBy: { to: "desc" },
    });
  }

  // Calcula el rango "desde último cierre" -> ahora
  async previewForUser(userId: string): Promise<Preview> {
    const now = new Date();

    const last = await this.getLastForUser(userId);
    const from = last?.to ? new Date(last.to) : startOfDay(now);
    const to = now;

    if (to <= from) {
      throw new BadRequestException("Rango inválido para cierre");
    }

    const pays = await this.prisma.payment.findMany({
      where: {
        paidById: userId,
        paidAt: { gte: from, lt: to },
      },
      select: { method: true, totalAmount: true },
    });

    let totalCash = 0;
    let totalDebit = 0;

    for (const p of pays) {
      const amt = Number(p.totalAmount || 0);
      if (p.method === (PaymentMethod as any).CASH || p.method === ("CASH" as any)) totalCash += amt;
      if (p.method === (PaymentMethod as any).DEBIT || p.method === ("DEBIT" as any)) totalDebit += amt;
    }

    const orders = pays.length;
    const total = totalCash + totalDebit;

    return { from, to, orders, totalCash, totalDebit, total };
  }

  async closeForUser(userId: string) {
    const prev = await this.previewForUser(userId);

    // anti-doble-click: si ya existe un cierre con mismo "to" muy cercano, frena
    const last = await this.getLastForUser(userId);
    if (last?.to && new Date(last.to).getTime() >= prev.to.getTime() - 5_000) {
      throw new BadRequestException("Ya cerraste hace muy poco (evitar doble cierre).");
    }

    const created = await this.prisma.cashout.create({
      data: {
        userId,
        from: prev.from,
        to: prev.to,
        orders: prev.orders,
        totalCash: prev.totalCash,
        totalDebit: prev.totalDebit,
        total: prev.total,
      },
    });

    return { ok: true, cashout: created };
  }

  // admin/manager list por rango (por createdAt o por to; aquí uso to)
  async list(from?: string, to?: string) {
    const where: any = {};
    if (from || to) {
      where.to = {};
      if (from) where.to.gte = new Date(from);
      if (to) where.to.lte = new Date(to);
    }

    return this.prisma.cashout.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, username: true, name: true, role: true } } },
    });
  }

  async csv(from?: string, to?: string) {
    const rows = await this.list(from, to);
    const flat = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      from: r.from.toISOString(),
      to: r.to.toISOString(),
      orders: r.orders,
      totalCash: r.totalCash,
      totalDebit: r.totalDebit,
      total: r.total,
      createdAt: r.createdAt.toISOString(),
    }));
    return toCSV(flat);
  }
}
