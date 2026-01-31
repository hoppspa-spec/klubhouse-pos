async checkout(
  ticketId: string,
  userId: string,
  method: "CASH" | "DEBIT"
) {
  const ticket = await this.prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      items: { include: { product: true } },
      table: true,
      openedBy: true,
    },
  });

  if (!ticket) throw new NotFoundException("Ticket no existe");
  if (ticket.status === TicketStatus.PAID) {
    throw new BadRequestException("Ticket ya pagado");
  }

  // ✅ reglas de estado
  if (ticket.kind === TicketKind.RENTAL && ticket.status !== TicketStatus.CHECKOUT) {
    throw new BadRequestException("Debes cerrar arriendo antes de cobrar");
  }

  if (
    ticket.kind === TicketKind.BAR &&
    ![TicketStatus.OPEN, TicketStatus.CHECKOUT].includes(ticket.status)
  ) {
    throw new BadRequestException("Ticket no listo para cobro");
  }

  // ✅ totals
  const consumos = ticket.items.reduce((a, it) => a + it.lineTotal, 0);
  const rental = ticket.kind === TicketKind.RENTAL ? (ticket.rentalAmount ?? 0) : 0;
  const total = roundUp100(consumos + rental);

  // ✅ validar stock antes
  for (const it of ticket.items) {
    if (it.product.stock < it.qty) {
      throw new BadRequestException(`Stock insuficiente: ${it.product.name}`);
    }
  }

  // ✅ transacción atómica
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

  // ✅ token SOLO para voucher (no auth)
  let receiptToken: string;
  try {
    receiptToken = this.jwt.sign(
      { type: "receipt", ticketId: ticket.id },
      { expiresIn: "10m" }
    );
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

