import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [PrismaModule], // ✅ CLAVE: habilita PrismaService en este módulo
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

