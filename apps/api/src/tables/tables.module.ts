import { Module } from "@nestjs/common";
import { TablesController } from "./tables.controller";
import { TicketsModule } from "../tickets/tickets.module";

@Module({
  imports: [TicketsModule], // ✅ CLAVE: trae TicketsService ya exportado
  controllers: [TablesController],
})
export class TablesModule {}


