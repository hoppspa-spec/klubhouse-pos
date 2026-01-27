import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { PrismaService } from "../prisma/prisma.service";
import { TicketsController, TicketsPublicController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>("JWT_SECRET") || "dev-secret",
        signOptions: { expiresIn: "7d" },
      }),
    }),
  ],
  controllers: [TicketsController, TicketsPublicController],
  providers: [TicketsService, PrismaService],
})
export class TicketsModule {}



