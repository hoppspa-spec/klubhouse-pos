import { Module } from "@nestjs/common";

import { PrismaModule } from "./prisma/prisma.module";
import { JwtGlobalModule } from "./auth/jwt-global.module";
import { AuthModule } from "./auth/auth.module";

import { UsersModule } from "./users/users.module";
import { ProductsModule } from "./products/products.module";
import { TicketsModule } from "./tickets/tickets.module";
import { TablesModule } from "./tables/tables.module";

import { ReportsModule } from "./reports/reports.module";
import { CashoutsModule } from "./cashouts/cashouts.module";

@Module({
  imports: [
    PrismaModule,
    JwtGlobalModule,
    AuthModule,

    UsersModule,
    ProductsModule,
    TicketsModule,
    TablesModule, // ✅ CLAVE

    ReportsModule,
    CashoutsModule,
  ],
})
export class AppModule {}
