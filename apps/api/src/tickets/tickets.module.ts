import { Module } from "@nestjs/common";
import { TicketsController, TicketsPublicController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  controllers: [TicketsController, TicketsPublicController],
  providers: [TicketsService, PrismaService],
})
export class TicketsModule {}
