import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller("reports")
@UseGuards(AuthGuard, RolesGuard)
export class ReportsController {
  constructor(private svc: ReportsService) {}

  // ✅ Solo manager/admin (MASTER/SLAVE)
  @Get("sales")
  @Roles(Role.MASTER, Role.SLAVE)
  sales(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("groupBy") groupBy?: "day" | "week" | "month"
  ) {
    return this.svc.salesReport({
      from,
      to,
      groupBy: groupBy ?? "day",
    });
  }
}