// ✅ voucher público con token en query (receiptToken)
async receiptHtmlWithToken(ticketId: string, token: string) {
  if (!token) throw new UnauthorizedException("Missing token");

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Si esto pasa, Render NO tiene la env var en el servicio API
    throw new InternalServerErrorException("JWT_SECRET no configurado en el servidor");
  }

  let payload: any;
  try {
    payload = await this.jwt.verifyAsync(token, { secret });
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

async checkout(ticketId: string, userId: string, method: "CASH" | "DEBIT") {
  const ticket = await this.prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { items: { include: { product: true } }, table: true, openedBy: true },
  });

  if (!ticket) throw new NotFoundException("Ticket no existe");
  if (ticket.status === TicketStatus.PAID) throw new BadRequestException("Ticket ya pagado");

  // ✅ reglas de estado
  if (ticket.kind === TicketKind.RENTAL && ticket.status !== TicketStatus.CHECKOUT) {
    throw new BadRequestException("Debes cerrar arriendo antes de cobrar");
  }

  if (
    ticket.kind === TicketKind.BAR &&
    ticket.status !== TicketStatus.OPEN &&
    ticket.status !== TicketStatus.CHECKOUT
  ) {
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

  // ✅ BLINDAJE: firmar con secret explícito (evita 500 aunque JwtService venga "vacío")
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // OJO: aquí NO conviene tirar 500 si ya se pagó; pero como quieres voucher sí o sí:
    throw new InternalServerErrorException("Pago OK pero JWT_SECRET no está configurado (no se puede emitir voucher)");
  }

  let receiptToken = "";
  try {
    receiptToken = this.jwt.sign(
      { type: "receipt", ticketId: ticket.id },
      { expiresIn: "10m", secret }
    );
  } catch (e) {
    console.error("❌ Error generando receiptToken", e);
    throw new InternalServerErrorException("Pago OK pero no se pudo generar voucher");
  }

  return { ok: true, receiptNumber: payment.receiptNumber, total, receiptToken };
}
