import { Controller, Get, UseGuards } from "@nestjs/common";
import { TicketsService } from "../tickets/tickets.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller("tables")
@UseGuards(AuthGuard, RolesGuard)
export class TablesController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  getTables() {
    return this.tickets.getTablesState();
  }
}