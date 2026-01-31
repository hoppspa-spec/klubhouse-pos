import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [
    PrismaModule,

    // ✅ JWT CONFIG
    JwtModule.register({
      secret: process.env.JWT_SECRET || "dev-secret-change-me",
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule], // ✅ export JwtModule para que otros módulos (Tickets) lo usen
})
export class AuthModule {}
