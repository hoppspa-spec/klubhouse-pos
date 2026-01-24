import { Module } from "@nestjs/common";
import { JwtGlobalModule } from "./auth/jwt-global.module";
import { AuthModule } from "./auth/auth.module";
import { TablesModule } from "./tables/tables.module";
import { TicketsModule } from "./tickets/tickets.module";
import { ProductsModule } from "./products/products.module";

@Module({
  imports: [
    JwtGlobalModule, // 👈 CLAVE
    AuthModule,
    TablesModule,
    TicketsModule,
    ProductsModule,
  ],
})
export class AppModule {}



