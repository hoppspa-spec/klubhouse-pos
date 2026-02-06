import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller("reports")
@UseGuards(AuthGuard, RolesGuard)
export class ReportsController {
  constructor(private svc: ReportsService) {}

  // ✅ MASTER/SLAVE ven reportes (SELLER no)
  @Get("summary")
  @Roles(Role.MASTER, Role.SLAVE)
  summary(@Query("from") from?: string, @Query("to") to?: string) {
    return this.svc.summary(from, to);
  }

  @Get("top-products")
  @Roles(Role.MASTER, Role.SLAVE)
  topProducts(@Query("from") from?: string, @Query("to") to?: string) {
    return this.svc.topProducts(from, to);
  }

  @Get("rentals")
  @Roles(Role.MASTER, Role.SLAVE)
  rentals(@Query("from") from?: string, @Query("to") to?: string) {
    return this.svc.rentals(from, to);
  }

  // CSV simple (para descargar desde web)
  @Get("csv")
  @Roles(Role.MASTER, Role.SLAVE)
  csv(@Query("from") from?: string, @Query("to") to?: string) {
    return this.svc.csv(from, to);
  }
}
