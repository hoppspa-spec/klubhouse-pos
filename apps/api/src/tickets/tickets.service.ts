import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { TicketKind, TicketStatus } from "@prisma/client";
import { calcMinutes, calcRental, roundUp100 } from "./pricing";
import { renderReceipt } from "./receipt";

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async getTablesState() {
    const tables = await this.prisma.table.findMany({ orderBy: { id: "asc" } });
    const open = await this.prisma.ticket.findMany({
      where: { status: { in: [TicketStatus.OPEN, TicketStatus.CHECKOUT] } },
      include: { items: { include: { product: true } } }
    });

    const map = new Map(open.map(t => [t.tableId, t]));
    return tables.map(t => ({
      id: t.id,
      name: t.name,
      type: t.type,
      ticket: map.get(t.id) || null
    }));
  }

  async openTicket(tableId: number, userId: string) {
    const table = await this.prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new NotFoundException("Mesa no existe");

    const existing = await this.prisma.ticket.findFirst({
      where: { tableId, status: { in: [TicketStatus.OPEN, TicketStatus.CHECKOUT] } }
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
        startedAt: startedAt ?? undefined
      }
    });
  }

  async addItem(ticketId: string, productId: string, qtyDelta: number) {
    if (!Number.isInteger(qtyDelta) || qtyDelta === 0) throw new BadRequestException("qtyDelta inválido");

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
          lineTotal: product.price * qtyDelta
        }
      });
    }

    const newQty = existing.qty + qtyDelta;
    if (newQty <= 0) {
      await this.prisma.ticketItem.delete({ where: { id: existing.id } });
      return { ok: true };
    }

    return this.prisma.ticketItem.update({
      where: { id: existing.id },
      data: { qty: newQty, unitPrice: existing.unitPrice, lineTotal: existing.unitPrice * newQty }
    });
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
        status: TicketStatus.CHECKOUT
      }
    });
  }

  async checkout(ticketId: string, userId: string, method: "CASH" | "DEBIT") {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { items: { include: { product: true } }, table: true, openedBy: true }
    });
    if (!ticket) throw new NotFoundException("Ticket no existe");
    if (ticket.status !== TicketStatus.CHECKOUT && ticket.kind !== "BAR") {
    // BAR puede ir directo a checkout sin "close"
    if (ticket.kind === TicketKind.BAR && ticket.status === TicketStatus.OPEN) {
    await this.prisma.ticket.update({ ... });
     } else {
    throw new BadRequestException("Ticket no listo para cobro");
     }
    }
    if (ticket.status === TicketStatus.PAID) throw new BadRequestException("Ya pagado");

    // Recalcular totals SIEMPRE
    const consumos = ticket.items.reduce((a, it) => a + it.lineTotal, 0);
    const rental = ticket.kind === TicketKind.RENTAL ? (ticket.rentalAmount ?? 0) : 0;
    const total = roundUp100(rental + consumos);

    // Validar stock (se descuenta al pagar)
    for (const it of ticket.items) {
      if (it.product.stock < it.qty) {
        throw new BadRequestException(`Stock insuficiente: ${it.product.name}`);
      }
    }

    const paid = await this.prisma.$transaction(async (tx) => {
      // Descontar stock + movimiento
      for (const it of ticket.items) {
        await tx.product.update({
          where: { id: it.productId },
          data: { stock: { decrement: it.qty } }
        });
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            type: "OUT",
            qty: it.qty,
            reason: `Venta ticket ${ticket.id}`,
            createdById: userId
          }
        });
      }

      const payment = await tx.payment.create({
        data: {
          ticketId: ticket.id,
          method: method as any,
          totalAmount: total,
          paidById: userId
        }
      });

      await tx.ticket.update({ where: { id: ticket.id }, data: { status: "PAID" } });
      return payment;
    });

    return { ok: true, receiptNumber: paid.receiptNumber, total };
  }

  async receiptHtml(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        table: true,
        items: { include: { product: true } },
        payment: true,
        openedBy: true
      }
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
      items: ticket.items.map(i => ({
        name: i.product.name,
        qty: i.qty,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal
      })),
      total: ticket.payment.totalAmount,
      method: ticket.payment.method
    });
  }
}



