import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../prisma/prisma.module";
import { TicketsController, TicketsPublicController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";

@Module({
  imports: [
    PrismaModule,
    JwtModule, // si usas JwtGlobalModule, igual no molesta; si ya está global, puedes sacarlo
  ],
  controllers: [TicketsController, TicketsPublicController],
  providers: [TicketsService],
  exports: [TicketsService], // ✅ CLAVE para que otros módulos lo puedan inyectar
})
export class TicketsModule {}
