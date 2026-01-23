import { Controller, Get, UseGuards } from "@nestjs/common";
import { TablesService } from "./tables.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller("tables")
@UseGuards(AuthGuard, RolesGuard)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  // Lista simple de mesas (sin estado/ticket)
  @Get("catalog")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  async catalog() {
    return this.tablesService.list();
  }
}
