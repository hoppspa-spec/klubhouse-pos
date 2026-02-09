import { Module } from "@nestjs/common";
import { TablesController } from "./tables.controller";
import { TicketsModule } from "../tickets/tickets.module";

@Module({
  imports: [TicketsModule], // ✅ trae TicketsService exportado
  controllers: [TablesController],
})
export class TablesModule {}
