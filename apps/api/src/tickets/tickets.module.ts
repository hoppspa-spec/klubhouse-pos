import { Module } from "@nestjs/common";
import { TicketsService } from "./tickets.service";
import { TicketsController, TicketsPublicController } from "./tickets.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}), // usa JWT_SECRET desde env en JwtService.verifyAsync()
  ],
  controllers: [TicketsController, TicketsPublicController],
  providers: [TicketsService],
})
export class TicketsModule {}




