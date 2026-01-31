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

  // ✅ voucher público con token en query (receiptToken)
  async receiptHtmlWithToken(ticketId: string, token: string) {
    if (!token) throw new UnauthorizedException("Missing token");

    let payload: any;
    try {
      // ✅ NO pasamos secret acá: usa el mismo secreto/config del JwtModule
      payload = await this.jwt.verifyAsync(token);
    } catch (e) {
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

    if (!ticket) throw new NotFoundException("Ticket no existe");
    if (!ticket.payment) throw new NotFoundException("No hay pago / voucher");

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

  async checkout(ticketId: string, userId: string, method: "CASH" | "DEBIT") {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        items: { include: { product: true } },
        table: true,
        openedBy: true,
        payment: true,
      },
    });

    if (!ticket) throw new NotFoundException("Ticket no existe");

    // ✅ Idempotente: si ya hay pago, devolvemos voucher de nuevo
    if (ticket.payment) {
      let receiptToken: string;
      try {
        receiptToken = this.jwt.sign({ type: "receipt", ticketId: ticket.id }, { expiresIn: "10m" });
      } catch (e) {
        console.error("❌ Error generando receiptToken (idempotent)", e);
        throw new InternalServerErrorException("Pago OK pero no se pudo generar voucher");
      }

      if (ticket.status !== TicketStatus.PAID) {
        await this.prisma.ticket.update({ where: { id: ticket.id }, data: { status: TicketStatus.PAID } });
      }

      return {
        ok: true,
        receiptNumber: ticket.payment.receiptNumber,
        total: ticket.payment.totalAmount,
        receiptToken,
      };
    }

    if (ticket.status === TicketStatus.PAID) throw new BadRequestException("Ticket ya pagado");

    // ✅ reglas de estado
    if (ticket.kind === TicketKind.RENTAL && ticket.status !== TicketStatus.CHECKOUT) {
      throw new BadRequestException("Debes cerrar arriendo antes de cobrar");
    }
    if (ticket.kind === TicketKind.BAR && ticket.status !== TicketStatus.OPEN && ticket.status !== TicketStatus.CHECKOUT) {
      throw new BadRequestException("Ticket no listo para cobro");
    }

    const consumos = ticket.items.reduce((a, it) => a + it.lineTotal, 0);
    const rental = ticket.kind === TicketKind.RENTAL ? (ticket.rentalAmount ?? 0) : 0;
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

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.PAID },
      });

      return p;
    });

    // ✅ firmar voucher con el mismo secreto/config del JwtModule
    let receiptToken: string;
    try {
      receiptToken = this.jwt.sign({ type: "receipt", ticketId: ticket.id }, { expiresIn: "10m" });
    } catch (e) {
      console.error("❌ Error generando receiptToken", e);
      throw new InternalServerErrorException("Pago OK pero no se pudo generar voucher");
    }

    return {
      ok: true,
      receiptNumber: payment.receiptNumber,
      total,
      receiptToken,
    };
  }
}
