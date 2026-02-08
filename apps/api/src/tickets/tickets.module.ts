import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../prisma/prisma.module";
import { TicketsController, TicketsPublicController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";

@Module({
  imports: [
    PrismaModule,
    JwtModule, // si ya tienes JwtGlobalModule global, igual no molesta
  ],
  controllers: [TicketsController, TicketsPublicController],
  providers: [TicketsService],
  exports: [TicketsService], // ✅ para que TablesModule lo pueda inyectar
})
export class TicketsModule {}

