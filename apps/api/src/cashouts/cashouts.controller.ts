import { Controller, Get, Post, Query, Req, UseGuards, ForbiddenException } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";
import { CashoutsService } from "./cashouts.service";

@Controller("cashouts")
@UseGuards(AuthGuard, RolesGuard)
export class CashoutsController {
  constructor(private svc: CashoutsService) {}

  // ✅ SELLER: ver resumen de su día (preview)
  @Get("preview")
  @Roles(Role.SELLER)
  preview(@Req() req: any) {
    return this.svc.previewForUser(req.user.sub);
  }

  // ✅ SELLER: cerrar caja diaria (V1)
  @Post("close")
  @Roles(Role.SELLER)
  close(@Req() req: any) {
    return this.svc.closeForUser(req.user.sub);
  }

  // ✅ MASTER/SLAVE: solo watch (listado global)
  @Get("list")
  @Roles(Role.MASTER, Role.SLAVE)
  list(@Query("from") from?: string, @Query("to") to?: string) {
    return this.svc.list(from, to);
  }

  // ✅ MASTER/SLAVE: CSV global
  @Get("csv")
  @Roles(Role.MASTER, Role.SLAVE)
  async csv(@Query("from") from?: string, @Query("to") to?: string) {
    const csv = await this.svc.csv(from, to);
    return csv; // el web lo baja como text/csv
  }
}
