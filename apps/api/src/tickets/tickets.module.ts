import { Module } from "@nestjs/common";
import { TicketsController, TicketsPublicController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    // 👇 importa JwtModule SIN register (usa el global)
    JwtModule,
  ],
  controllers: [TicketsController, TicketsPublicController],
  providers: [TicketsService, PrismaService],
})
export class TicketsModule {}



