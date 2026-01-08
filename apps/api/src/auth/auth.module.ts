import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { AuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [
    JwtModule.register({
      global: true,               // ✅ CLAVE
      secret: process.env.JWT_SECRET,
    }),
  ],
  providers: [AuthGuard, RolesGuard],
  exports: [AuthGuard, RolesGuard],
})
export class AuthModule {}
