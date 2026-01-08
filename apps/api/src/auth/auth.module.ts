import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { AuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // ✅ usa el env var
    }),
  ],
  providers: [AuthGuard, RolesGuard],
  exports: [JwtModule, AuthGuard, RolesGuard], // ✅ CLAVE
})
export class AuthModule {}
