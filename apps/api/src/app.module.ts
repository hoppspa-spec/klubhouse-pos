import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "./prisma.service";

import { AuthModule } from "./auth/auth.module";
import { TicketsModule } from "./tickets/tickets.module";

@Module({
  imports: [
    JwtModule.register({}),
    AuthModule,
    TicketsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
