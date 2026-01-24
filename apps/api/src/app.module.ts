import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { TablesModule } from "./tables/tables.module";
import { TicketsModule } from "./tickets/tickets.module";
import { ProductsModule } from "./products/products.module";

@Module({
  imports: [
    AuthModule,
    TablesModule,
    TicketsModule,
    ProductsModule, // 👈 ESTE ES EL QUE FALTABA
  ],
})
export class AppModule {}


