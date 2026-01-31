import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { TicketKind, TicketStatus } from "@prisma/client";
import { calcMinutes, calcRental, roundUp100 } from "./pricing";
import { renderReceipt } from "./receipt";

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  // ✅ usado por /tables
  async getTablesState() {
    const tables = await this.prisma.table.findMany({ orderBy: { id: "asc" } });

    const open = await this.prisma.ticket.findMany({
      where: { status: { in: [TicketStatus.OPEN, TicketStatus.CHECKOUT] } },
      include: { items: { include: { product: true } }, table: true },
    });

    const map = new Map(open.map((t) => [t.tableId, t]));
    return tables.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      ticket: map.get(t.id) || null,
    }));
  }

  async openTicket(tableId: number, userId: string) {
    const table = await this.prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new NotFoundException("Mesa no existe");

    const existing = await this.prisma.ticket.findFirst({
      where: { tableId, status: { in: [TicketStatus.OPEN, TicketStatus.CHECKOUT] } },
    });
    if (existing) throw new BadRequestException("Ya existe un ticket activo en esta mesa/barra");

    const kind = table.type === "BAR" ? TicketKind.BAR : TicketKind.RENTAL;
    const startedAt = kind === TicketKind.RENTAL ? new Date() : null;

    return this.prisma.ticket.create({
      data: {
        tableId,
        kind,
        status: TicketStatus.OPEN,
        openedById: userId,
        startedAt: startedAt ?? undefined,
      },
    });
  }

  async addItem(ticketId: string, productId: string, qtyDelta: number) {
    if (!Number.isInteger(qtyDelta) || qtyDelta === 0) {
      throw new BadRequestException("qtyDelta inválido");
    }

    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket no existe");
    if (ticket.status === TicketStatus.PAID) throw new BadRequestException("Ticket ya pagado");

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) throw new BadRequestException("Producto inválido");

    const existing = await this.prisma.ticketItem.findFirst({ where: { ticketId, productId } });
    if (!existing && qtyDelta < 0) return { ok: true };

    if (!existing) {
      return this.prisma.ticketItem.create({
        data: {
          ticketId,
          productId,
          qty: qtyDelta,
          unitPrice: product.price,
          lineTotal: product.price * qtyDelta,
        },
      });
    }

    const newQty = existing.qty + qtyDelta;
    if (newQty <= 0) {
      await this.prisma.ticketItem.delete({ where: { id: existing.id } });
      return { ok: true };
    }

    return this.prisma.ticketItem.update({
      where: { id: existing.id },
      data: {
        qty: newQty,
        unitPrice: existing.unitPrice,
        lineTotal: existing.unitPrice * newQty,
      },
    });
  }

  async getTicketWithTotals(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { table: true, items: { include: { product: true } } },
    });
    if (!ticket) throw new NotFoundException("Ticket no existe");

    const consumos = ticket.items.reduce((acc, it) => acc + Number(it.lineTotal), 0);
    const rental = Number(ticket.rentalAmount ?? 0);
    const total = consumos + rental;

    return { ticket, totals: { consumos, rental, total } };
  }

  async closeRental(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket no existe");
    if (ticket.kind !== TicketKind.RENTAL) throw new BadRequestException("Barra no se cierra por tiempo");
    if (!ticket.startedAt) throw new BadRequestException("Ticket sin inicio");
    if (ticket.status !== TicketStatus.OPEN) throw new BadRequestException("Estado inválido");

    const endedAt = new Date();
    const minutes = calcMinutes(ticket.startedAt, endedAt);
    const rental = calcRental(minutes);

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        endedAt,
        minutesPlayed: minutes,
        rentalAmount: rental,
        status: TicketStatus.CHECKOUT,
      },
    });
  }

  async checkout(ticketId: string, userId: string, method: "CASH" | "DEBIT") {
  const ticket = await this.prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      items: { include: { product: true } },
      table: true,
      openedBy: true,
      payment: true, // ✅ IMPORTANTÍSIMO
    },
  });

  if (!ticket) throw new NotFoundException("Ticket no existe");

  // ✅ Si ya existe pago, NO vuelvas a cobrar → solo entrega voucher (idempotente)
  if (ticket.payment) {
    // por si quedó status raro, lo alineamos
    if (ticket.status !== TicketStatus.PAID) {
      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.PAID },
      });
    }

    const receiptToken = this.jwt.sign(
      { type: "receipt", ticketId: ticket.id },
      { expiresIn: "10m" }
    );

    return {
      ok: true,
      receiptNumber: ticket.payment.receiptNumber,
      total: ticket.payment.totalAmount,
      receiptToken,
      alreadyPaid: true,
    };
  }

  // ✅ reglas de estado
  if (ticket.kind === TicketKind.RENTAL && ticket.status !== TicketStatus.CHECKOUT) {
    throw new BadRequestException("Debes cerrar arriendo antes de cobrar");
  }

  if (ticket.kind === TicketKind.BAR && ![TicketStatus.OPEN, TicketStatus.CHECKOUT].includes(ticket.status as any)) {
    throw new BadRequestException("Ticket no listo para cobro");
  }

  // ✅ totals
  const consumos = ticket.items.reduce((a, it) => a + Number(it.lineTotal), 0);
  const rental = ticket.kind === TicketKind.RENTAL ? Number(ticket.rentalAmount ?? 0) : 0;
  const total = roundUp100(consumos + rental);

  // ✅ validar stock antes
  for (const it of ticket.items) {
    if (it.product.stock < it.qty) {
      throw new BadRequestException(`Stock insuficiente: ${it.product.name}`);
    }
  }

  try {
    const payment = await this.prisma.$transaction(async (tx) => {
      // (opcional) BAR: si está OPEN, pasarlo a CHECKOUT antes de pagar
      if (ticket.kind === TicketKind.BAR && ticket.status === TicketStatus.OPEN) {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { status: TicketStatus.CHECKOUT },
        });
      }

      for (const it of ticket.items) {
        await tx.product.update({
          where: { id: it.productId },
          data: { stock: { decrement: it.qty } },
        });

        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            type: "OUT",
            qty: it.qty,
            reason: `Venta ticket ${ticket.id}`,
            createdById: userId,
          },
        });
      }

      const p = await tx.payment.create({
        data: {
          ticketId: ticket.id,
          method: method as any,
          totalAmount: total,
          paidById: userId,
        },
      });

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.PAID },
      });

      return p;
    });

    const receiptToken = this.jwt.sign(
      { type: "receipt", ticketId: ticket.id },
      { expiresIn: "10m" }
    );

    return {
      ok: true,
      receiptNumber: payment.receiptNumber,
      total,
      receiptToken,
    };
  } catch (e: any) {
    // ✅ Si fue doble-cobro / race condition, devolvemos el pago existente
    const existing = await this.prisma.payment.findUnique({
      where: { ticketId: ticket.id },
    });

    if (existing) {
      const receiptToken = this.jwt.sign(
        { type: "receipt", ticketId: ticket.id },
        { expiresIn: "10m" }
      );

      return {
        ok: true,
        receiptNumber: existing.receiptNumber,
        total: existing.totalAmount,
        receiptToken,
        alreadyPaid: true,
      };
    }

    console.error("❌ checkout failed", e);
    throw new InternalServerErrorException("Error al cobrar (server)");
  }
}


  // ✅ voucher público con token en query
  async receiptHtmlWithToken(ticketId: string, token: string) {
    if (!token) throw new UnauthorizedException("Missing token");

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException("Invalid token");
    }

    if (payload?.type !== "receipt") throw new UnauthorizedException("Invalid token");
    if (payload?.ticketId !== ticketId) throw new UnauthorizedException("Token inválido para este ticket");

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        table: true,
        items: { include: { product: true } },
        payment: true,
        openedBy: true,
      },
    });

    if (!ticket?.payment) throw new NotFoundException("No hay pago / voucher");

    return renderReceipt({
      receiptNumber: ticket.payment.receiptNumber,
      title: "KLUB HOUSE",
      when: ticket.payment.paidAt,
      seller: ticket.openedBy.name,
      tableName: ticket.table.name,
      startedAt: ticket.startedAt,
      endedAt: ticket.endedAt,
      minutes: ticket.minutesPlayed,
      rentalAmount: ticket.rentalAmount,
      items: ticket.items.map((i) => ({
        name: i.product.name,
        qty: i.qty,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
      })),
      total: ticket.payment.totalAmount,
      method: ticket.payment.method,
    });
  }

  // ✅ mover ticket a otra mesa (mantiene tiempo y consumos)
  async moveTicket(ticketId: string, toTableId: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { table: true },
    });
    if (!ticket) throw new NotFoundException("Ticket no existe");
    if (ticket.status === TicketStatus.PAID || ticket.status === TicketStatus.CANCELED) {
      throw new BadRequestException("No se puede mover un ticket pagado/anulado");
    }

    const toTable = await this.prisma.table.findUnique({ where: { id: toTableId } });
    if (!toTable) throw new NotFoundException("Mesa destino no existe");

    const existing = await this.prisma.ticket.findFirst({
      where: { tableId: toTableId, status: { in: [TicketStatus.OPEN, TicketStatus.CHECKOUT] } },
    });
    if (existing) throw new BadRequestException("Mesa destino ocupada");

    if (ticket.table.type !== toTable.type) {
      throw new BadRequestException("No puedes mover entre BARRA y MESA");
    }

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { tableId: toTableId },
    });

    return { ok: true };
  }
}
