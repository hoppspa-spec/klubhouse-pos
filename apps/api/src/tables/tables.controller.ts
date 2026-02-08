import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";
import { TicketsService } from "../tickets/tickets.service";

@Controller("tables")
@UseGuards(AuthGuard, RolesGuard)
export class TablesController {
  constructor(private tickets: TicketsService) {}

  @Get()
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  async list() {
    // ✅ DEVUELVE ARRAY directo (lo que la web espera)
    return this.tickets.getTablesState();
  }
}
