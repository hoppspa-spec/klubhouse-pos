import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TicketsController, TicketsPublicController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  imports: [
    JwtModule.register({
      // ✅ MISMO SECRET que usas para los access tokens
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "1d" }, // da lo mismo, para receipt hacemos expiresIn corto igual
    }),
  ],
  controllers: [TicketsController, TicketsPublicController],
  providers: [TicketsService, PrismaService],
})
export class TicketsModule {}




