import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Response, Request } from "express";
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

  @Post("tickets/:id/items")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  addItem(@Param("id") id: string, @Body() body: { productId: string; qtyDelta: number }) {
    return this.svc.addItem(id, body.productId, body.qtyDelta);
  }

  @Post("tickets/:id/close")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  close(@Param("id") id: string) {
    return this.svc.closeRental(id);
  }

  @Post("tickets/:id/checkout")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  checkout(@Req() req: any, @Param("id") id: string, @Body() body: { method: "CASH" | "DEBIT" }) {
    return this.svc.checkout(id, req.user.sub, body.method);
  }

  @Get("tickets/:id/receipt")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  async receipt(@Param("id") id: string, @Res() res: Response) {
    const html = await this.svc.receiptHtml(id);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  }
}
