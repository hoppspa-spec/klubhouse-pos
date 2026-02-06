import { Module } from "@nestjs/common";
import { CashoutsController } from "./cashouts.controller";
import { CashoutsService } from "./cashouts.service";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  controllers: [CashoutsController],
  providers: [CashoutsService, PrismaService],
})
export class CashoutsModule {}
