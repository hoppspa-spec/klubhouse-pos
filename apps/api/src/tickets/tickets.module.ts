import { Module } from "@nestjs/common";
import { TicketsController, TicketsPublicController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [TicketsController, TicketsPublicController],
  providers: [TicketsService],
  exports: [TicketsService], // ✅ CLAVE: para que otros módulos (Tables) lo puedan inyectar
})
export class TicketsModule {}
