import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { TicketsModule } from "./tickets/tickets.module";
import { TablesModule } from "./tables/tables.module";
import { ProductsModule } from "./products/products.module";
import { UsersModule } from "./users/users.module";
import { ReportsModule } from "./reports/reports.module";
import { CashoutsModule } from "./cashouts/cashouts.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TicketsModule,
    TablesModule,   // ✅ importante
    ProductsModule,
    UsersModule,
    ReportsModule,
    CashoutsModule,
  ],
})
export class AppModule {}




