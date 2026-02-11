import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { TicketsService } from "./tickets.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class TicketsController {
  constructor(private svc: TicketsService) {}

  @Post("tickets/open")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  open(@Req() req: any, @Body() body: { tableId: number }) {
    return this.svc.openTicket(body.tableId, req.user.sub);
  }

  @Post("tickets/:id/items")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  addItem(@Param("id") id: string, @Body() body: { productId: string; qtyDelta: number }) {
    return this.svc.addItem(id, body.productId, body.qtyDelta);
  }

  // ✅ mover ticket de mesa (arrastra consumos + tiempo)
  // Reglas: misma "type" (POOL->POOL / BAR->BAR), y mesa destino debe estar libre
  @Post("tickets/:id/move")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER) // todos pueden mover mesa + consumo
  move(@Param("id") id: string, @Body() body: { toTableId: number }) {
   return this.svc.moveTicket(id, body.toTableId);
}


  // ✅ SOLO MANAGER/ADMIN (manual)
  @Post("tickets/:id/close")
  @Roles(Role.MASTER, Role.SLAVE)
  close(@Param("id") id: string) {
    return this.svc.closeRental(id);
  }

  @Post("tickets/:id/checkout")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  checkout(@Req() req: any, @Param("id") id: string, @Body() body: { method: "CASH" | "DEBIT" }) {
    return this.svc.checkout(id, req.user.sub, body.method, req.user.role as Role);
  }

  @Get("tickets/:id")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  getOne(@Param("id") id: string) {
    return this.svc.getTicketWithTotals(id);
  }
}

// ✅ Público (voucher)
@Controller()
export class TicketsPublicController {
  constructor(private svc: TicketsService) {}

  @Get("tickets/:id/receipt")
  async receipt(@Param("id") id: string, @Query("token") token: string, @Res() res: Response) {
    const html = await this.svc.receiptHtmlWithToken(id, token);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  }
}
