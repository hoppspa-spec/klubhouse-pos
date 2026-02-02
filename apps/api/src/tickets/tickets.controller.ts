import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { TicketsService } from "./tickets.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";

@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class TicketsController {
  constructor(private svc: TicketsService) {}

  // ✅ MESAS + ESTADO (SELLER sí puede)
  @Get("tables")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  tables() {
    return this.svc.getTablesState();
  }

  // ✅ Abrir ticket (SELLER sí puede)
  @Post("tickets/open")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  open(@Req() req: any, @Body() body: { tableId: number }) {
    return this.svc.openTicket(body.tableId, req.user.sub);
  }

  // ✅ Agregar/quitar items (SELLER sí puede)
  @Post("tickets/:id/items")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  addItem(
    @Param("id") id: string,
    @Body() body: { productId: string; qtyDelta: number }
  ) {
    return this.svc.addItem(id, body.productId, body.qtyDelta);
  }

  // ✅ Ver ticket + totales (SELLER sí puede)
  @Get("tickets/:id")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  getOne(@Param("id") id: string) {
    return this.svc.getTicketWithTotals(id);
  }

  // ✅ Cerrar arriendo (SOLO ADMIN/MANAGER)
  @Post("tickets/:id/close")
  @Roles(Role.MASTER, Role.SLAVE)
  close(@Param("id") id: string) {
    return this.svc.closeRental(id);
  }

  // ✅ Checkout / Cobrar (SOLO ADMIN/MANAGER)
  @Post("tickets/:id/checkout")
  @Roles(Role.MASTER, Role.SLAVE)
  checkout(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { method: "CASH" | "DEBIT" }
  ) {
    return this.svc.checkout(id, req.user.sub, body.method);
  }

  // ✅ Mover ticket (SOLO ADMIN/MANAGER)
  @Post("tickets/:id/move")
  @Roles(Role.MASTER, Role.SLAVE)
  move(@Param("id") id: string, @Body() body: { toTableId: number }) {
    return this.svc.moveTicket(id, body.toTableId);
  }
}

// ✅ Controller público SOLO para voucher (sin guards)
@Controller()
export class TicketsPublicController {
  constructor(private svc: TicketsService) {}

  @Get("tickets/:id/receipt")
  async receipt(
    @Param("id") id: string,
    @Query("token") token: string,
    @Res() res: Response
  ) {
    const html = await this.svc.receiptHtmlWithToken(id, token);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  }
}
