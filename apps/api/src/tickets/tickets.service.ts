import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { TicketKind, TicketStatus, Role } from "@prisma/client";
import { calcMinutes, calcRental, roundUp100 } from "./pricing";
import { renderReceipt } from "./receipt";

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  // =========================
  // TABLES (para /tables)
  // =========================
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

  // =========================
  // RECEIPT (PUBLIC)
  // =========================
  async receiptHtmlWithToken(ticketId: string, token: string) {
    if (!token) throw new UnauthorizedException("Missing token");

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new InternalServerErrorException("JWT_SECRET missing");

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token, { secret });
    } catch {
      throw new UnauthorizedException("Invalid token");
    }

    if (payload?.type !== "receipt" || payload?.ticketId !== ticketId) {
      throw new UnauthorizedException("Invalid token");
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        table: true,
        items: { include: { product: true } },
        payment: true,
        openedBy: true,
      },
    });

    if (!ticket?.payment) throw new NotFoundException("No hay pago");

    return renderReceipt({
      receiptNumber: ticket.payment.receiptNumber,
      title: "KLUB HOUSE",
      when: ticket.payment.paidAt,
      seller: ticket.openedBy?.name || ticket.openedBy?.username || "—",
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

  // =========================
  // OPEN
  // =========================
  async openTicket(tableId: number, userId: string) {
    const table = await this.prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new NotFoundException("Mesa no existe");

    const existing = await this.prisma.ticket.findFirst({
      where: { tableId, status: { in: [TicketStatus.OPEN, TicketStatus.CHECKOUT] } },
    });
    if (existing) throw new BadRequestException("Mesa ocupada");

    const kind = table.type === "BAR" ? TicketKind.BAR : TicketKind.RENTAL;

    return this.prisma.ticket.create({
      data: {
        tableId,
        kind,
        status: TicketStatus.OPEN,
        openedById: userId,
        startedAt: kind === TicketKind.RENTAL ? new Date() : null,
      },
    });
  }

  // =========================
  // ITEMS
  // =========================
  async addItem(ticketId: string, productId: string, qtyDelta: number) {
    if (!Number.isInteger(qtyDelta) || qtyDelta === 0) {
      throw new BadRequestException("qtyDelta inválido");
    }

    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket no existe");
    if (ticket.status === TicketStatus.PAID) throw new BadRequestException("Ticket pagado");

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
        lineTotal: existing.unitPrice * newQty,
      },
    });
  }

  // =========================
  // TOTALS
  // =========================
  async getTicketWithTotals(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { table: true, items: { include: { product: true } } },
    });
    if (!ticket) throw new NotFoundException("Ticket no existe");

    const consumos = ticket.items.reduce((a, i) => a + Number(i.lineTotal), 0);
    const rental = Number(ticket.rentalAmount ?? 0);
    return { ticket, totals: { consumos, rental, total: consumos + rental } };
  }

  // =========================
  // CLOSE RENTAL (manual: lo controla el controller por Roles)
  // =========================
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

  // =========================
  // CHECKOUT
  // =========================
  async checkout(ticketId: string, userId: string, method: "CASH" | "DEBIT", role: Role) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { items: { include: { product: true } }, table: true, openedBy: true },
    });

    if (!ticket) throw new NotFoundException("Ticket no existe");
    if (ticket.status === TicketStatus.PAID) throw new BadRequestException("Ticket ya pagado");

    // RENTAL: seller puede cobrar en OPEN => auto-cierra
    if (ticket.kind === TicketKind.RENTAL) {
      if (ticket.status === TicketStatus.OPEN) {
        if (role === Role.SELLER) {
          if (!ticket.startedAt) throw new BadRequestException("Ticket sin inicio");

          const endedAt = new Date();
          const minutes = calcMinutes(ticket.startedAt, endedAt);
          const rental = calcRental(minutes);

          await this.prisma.ticket.update({
            where: { id: ticket.id },
            data: { endedAt, minutesPlayed: minutes, rentalAmount: rental, status: TicketStatus.CHECKOUT },
          });

          ticket.status = TicketStatus.CHECKOUT;
          ticket.minutesPlayed = minutes;
          ticket.rentalAmount = rental;
        } else {
          throw new BadRequestException("Debes cerrar arriendo antes de cobrar");
        }
      }

      if (ticket.status !== TicketStatus.CHECKOUT) {
        throw new BadRequestException("Ticket no listo para cobro");
      }
    }

    // BAR: OPEN o CHECKOUT
    if (
      ticket.kind === TicketKind.BAR &&
      !([TicketStatus.OPEN, TicketStatus.CHECKOUT] as TicketStatus[]).includes(ticket.status)
    ) {
      throw new BadRequestException("Ticket no listo para cobro");
    }  

    const consumos = ticket.items.reduce((a, it) => a + Number(it.lineTotal), 0);
    const rental = ticket.kind === TicketKind.RENTAL ? Number(ticket.rentalAmount ?? 0) : 0;
    const total = roundUp100(consumos + rental);

    for (const it of ticket.items) {
      if (it.product.stock < it.qty) throw new BadRequestException(`Stock insuficiente: ${it.product.name}`);
    }

    const payment = await this.prisma.$transaction(async (tx) => {
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

      await tx.ticket.update({ where: { id: ticket.id }, data: { status: TicketStatus.PAID } });
      return p;
    });

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new InternalServerErrorException("JWT_SECRET no configurado");

    const receiptToken = this.jwt.sign({ type: "receipt", ticketId: ticket.id }, { expiresIn: "10m", secret });

    return { ok: true, receiptNumber: payment.receiptNumber, total, receiptToken };
  }

  // =========================
  // MOVE (si lo usas después)
  // =========================
  async moveTicket(ticketId: string, toTableId: number) {
    await this.prisma.ticket.update({ where: { id: ticketId }, data: { tableId: toTableId } });
    return { ok: true };
  }
}
