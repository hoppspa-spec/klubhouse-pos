import { Controller, Get, Param, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { TicketsService } from "./tickets.service";

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
