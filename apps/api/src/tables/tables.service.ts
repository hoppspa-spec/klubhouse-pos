import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    // Ajusta nombres si tu modelo se llama distinto en Prisma (Table vs PosTable vs Mesa, etc.)
    return this.prisma.table.findMany({
      orderBy: { id: "asc" },
    });
  }
}