import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { TablesModule } from "./tables/tables.module";
import { TicketsModule } from "./tickets/tickets.module";
import { ProductsModule } from "./products/products.module";

@Module({
  imports: [AuthModule, TablesModule, TicketsModule, ProductsModule],
  controllers: [AppController],
})
export class AppModule {}


