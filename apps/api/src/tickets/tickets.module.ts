import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../prisma/prisma.module";
import { TicketsController, TicketsPublicController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "dev-secret",
    }),
  ],
  controllers: [TicketsController, TicketsPublicController],
  providers: [TicketsService],
})
export class TicketsModule {}




