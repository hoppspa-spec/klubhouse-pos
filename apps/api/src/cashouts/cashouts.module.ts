import { Module } from "@nestjs/common";
import { CashoutsController } from "./cashouts.controller";
import { CashoutsService } from "./cashouts.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [CashoutsController],
  providers: [CashoutsService],
})
export class CashoutsModule {}
