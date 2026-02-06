import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "@prisma/client";

@Injectable()
export class CashoutsService {
  constructor(private prisma: PrismaService) {}

  /**
   * V1: Cerrar caja del usuario actual.
   * - SELLER: resumen de sus pagos del día (00:00 -> ahora)
   * - MANAGER/ADMIN: igual (por ahora). Luego lo ampliamos.
   */
  async closeForUser(userId: string, role: Role) {
    if (!userId) throw new BadRequestException("Missing userId");

    // rango "diario" (timezone del server). V1 suficiente.
    const now = new Date();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);

    // trae pagos del usuario en el rango
    const payments = await this.prisma.payment.findMany({
      where: {
        paidById: userId,
        paidAt: { gte: from, lte: now },
      },
      select: {
        method: true,
        totalAmount: true,
      },
      orderBy: { paidAt: "asc" },
    });

    const cashTotal = payments
      .filter((p) => p.method === "CASH")
      .reduce((a, p) => a + Number(p.totalAmount), 0);

    const debitTotal = payments
      .filter((p) => p.method === "DEBIT")
      .reduce((a, p) => a + Number(p.totalAmount), 0);

    const total = cashTotal + debitTotal;

    return {
      ok: true,
      role,
      from: from.toISOString(),
      to: now.toISOString(),
      count: payments.length,
      cashTotal,
      debitTotal,
      total,
    };
  }
}
