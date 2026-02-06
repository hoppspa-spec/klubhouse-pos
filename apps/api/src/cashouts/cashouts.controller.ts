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

  // ✅ seller ve su preview (por defecto desde último cierre o desde hoy 00:00)
  @Get("preview")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  preview(@Req() req: any) {
    return this.svc.previewForUser(req.user.sub);
  }

  // ✅ seller cierra su caja (crea registro)
  @Post("close")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  close(@Req() req: any) {
    return this.svc.closeForUser(req.user.sub);
  }

  // ✅ admin/manager: listado de cierres
  @Get()
  @Roles(Role.MASTER, Role.SLAVE)
  list(@Query("from") from?: string, @Query("to") to?: string) {
    return this.svc.list(from, to);
  }

  // ✅ admin/manager: descarga CSV
  @Get("csv")
  @Roles(Role.MASTER, Role.SLAVE)
  async csv(@Res() res: Response, @Query("from") from?: string, @Query("to") to?: string) {
    const csv = await this.svc.csv(from, to);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="cashouts.csv"`);
    return res.send(csv);
  }
}
