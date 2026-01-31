import { Module } from "@nestjs/common";
import { TicketsController, TicketsPublicController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TicketsController, TicketsPublicController],
  providers: [TicketsService],
})
export class TicketsModule {}
