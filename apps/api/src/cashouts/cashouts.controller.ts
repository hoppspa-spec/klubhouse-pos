import { Controller, Get, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { CashoutsService } from "./cashouts.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller("cashouts")
@UseGuards(AuthGuard, RolesGuard)
export class CashoutsController {
  constructor(private svc: CashoutsService) {}

  // SELLER: preview mi turno
  @Get("me/preview")
  @Roles(Role.SELLER)
  previewForUser(@Req() req: any) {
    return this.svc.previewForUser(req.user.sub);
  }

  // SELLER: cerrar mi turno
  @Post("me/close")
  @Roles(Role.SELLER)
  closeForUser(@Req() req: any) {
    return this.svc.closeForUser(req.user.sub);
  }

  // MASTER/SLAVE: listar cierres
  @Get()
  @Roles(Role.MASTER, Role.SLAVE)
  list(@Query("from") from?: string, @Query("to") to?: string) {
    return this.svc.list(from, to);
  }

  // MASTER/SLAVE: CSV
  @Get("csv")
  @Roles(Role.MASTER, Role.SLAVE)
  async csv(@Query("from") from: string | undefined, @Query("to") to: string | undefined, @Res() res: Response) {
    const csv = await this.svc.csv(from, to);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="cashouts.csv"');
    return res.send(csv);
  }
}
