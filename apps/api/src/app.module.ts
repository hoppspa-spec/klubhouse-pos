import { Module } from "@nestjs/common";

import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { TablesModule } from "./tables/tables.module";
import { TicketsModule } from "./tickets/tickets.module";

@Module({
  imports: [PrismaModule, AuthModule, TablesModule, TicketsModule],
})
export class AppModule {}


