import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

import { AuthModule } from "./auth/auth.module";
import { TicketsModule } from "./tickets/tickets.module";

@Module({
  imports: [
    AuthModule,
    TicketsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}

