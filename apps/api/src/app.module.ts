import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { TablesModule } from "./tables/tables.module";
import { TicketsModule } from "./tickets/tickets.module";

@Module({
  imports: [AuthModule, TablesModule, TicketsModule],
})
export class AppModule {}

