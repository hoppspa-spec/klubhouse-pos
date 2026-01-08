import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { AuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [
    JwtModule.register({
      // Puedes dejarlo vacío si usas process.env.JWT_SECRET dentro del guard/service,
      // pero lo ideal es setearlo aquí:
      // secret: process.env.JWT_SECRET,
      // signOptions: { expiresIn: "7d" },
    }),
  ],
  providers: [AuthGuard, RolesGuard],
  exports: [JwtModule, AuthGuard, RolesGuard], // <-- CLAVE
})
export class AuthModule {}
