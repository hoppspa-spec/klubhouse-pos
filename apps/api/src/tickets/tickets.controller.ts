// apps/api/src/tickets/tickets.controller.ts

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

  @Get("tables")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  tables() {
    return this.svc.getTablesState();
  }

  @Post("tickets/open")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  open(@Req() req: any, @Body() body: { tableId: number }) {
    return this.svc.openTicket(body.tableId, req.user.sub);
  }

  @Get("tickets/:id")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  getOne(@Param("id") id: string) {
    return this.svc.getTicketWithTotals(id);
  }

  @Post("tickets/:id/items")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  addItem(@Param("id") id: string, @Body() body: { productId: string; qtyDelta: number }) {
    return this.svc.addItem(id, body.productId, body.qtyDelta);
  }

  // ✅ SOLO MANAGER/ADMIN cierra arriendo manual
  @Post("tickets/:id/close")
  @Roles(Role.MASTER, Role.SLAVE)
  close(@Param("id") id: string) {
    return this.svc.closeRental(id);
  }

  // ✅ SELLER también puede mover (por práctica real)
  @Post("tickets/:id/move")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  move(@Param("id") id: string, @Body() body: { toTableId: number }) {
    return this.svc.moveTicket(id, body.toTableId);
  }

  @Post("tickets/:id/checkout")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  checkout(@Req() req: any, @Param("id") id: string, @Body() body: { method: "CASH" | "DEBIT" }) {
    return this.svc.checkout(id, req.user.sub, body.method, req.user.role as Role);
  }
}

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
