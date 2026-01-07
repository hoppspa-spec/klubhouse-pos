import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "./prisma.service";

import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { TicketsModule } from "./tickets/tickets.module";
import { ProductsModule } from "./products/products.module";

@Module({
  imports: [
    JwtModule.register({}),
    AuthModule,
    UsersModule,
    TicketsModule,
    ProductsModule
  ],
  providers: [PrismaService],
})
export class AppModule {}
