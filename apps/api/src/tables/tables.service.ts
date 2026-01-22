import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.table.findMany({
      orderBy: { id: "asc" },
    });
  }
}
