import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { AuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [
    JwtModule.register({
      global: true, // ✅ CLAVE: JwtService disponible en TODOS los módulos
      secret: process.env.JWT_SECRET,
    }),
  ],
  providers: [AuthGuard, RolesGuard],
  exports: [AuthGuard, RolesGuard], // ✅ ya no necesitas exportar JwtModule si es global
})
export class AuthModule {}
