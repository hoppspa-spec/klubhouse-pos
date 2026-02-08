import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TicketsController, TicketsPublicController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";

@Module({
  imports: [
    PrismaModule,
    // OJO: si JwtGlobalModule ya es GLOBAL, no necesitas importar JwtModule aquí.
    // Si TicketsService usa JwtService y NO tienes global, importa JwtModule.register(...) en tu JwtGlobalModule.
  ],
  controllers: [TicketsController, TicketsPublicController],
  providers: [TicketsService],
  exports: [TicketsService], // ✅ CLAVE
})
export class TicketsModule {}
