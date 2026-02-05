import { Module } from "@nestjs/common";
import { JwtGlobalModule } from "./auth/jwt-global.module";
import { AuthModule } from "./auth/auth.module";
import { TablesModule } from "./tables/tables.module";
import { TicketsModule } from "./tickets/tickets.module";
import { ProductsModule } from "./products/products.module";
import { ReportsModule } from "./reports/reports.module";

@Module({
  imports: [
    JwtGlobalModule, // 👈 CLAVE
    AuthModule,
    TablesModule,
    TicketsModule,
    ProductsModule,
    ReportsModule,
  ],
})
export class AppModule {}



