import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.product.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  async create(data: {
    name: string;
    category: string;
    price: number;
    stock: number;
    stockCritical: number;
  }) {
    const name = (data.name || "").trim();
    const category = (data.category || "").trim();

    if (!name) throw new BadRequestException("Nombre requerido");
    if (!category) throw new BadRequestException("Categoría requerida");

    // normaliza números
    const price = Number(data.price);
    const stock = Number(data.stock);
    const stockCritical = Number(data.stockCritical);

    if (!Number.isFinite(price) || price < 0) throw new BadRequestException("Precio inválido");
    if (!Number.isFinite(stock) || stock < 0) throw new BadRequestException("Stock inválido");
    if (!Number.isFinite(stockCritical) || stockCritical < 0) throw new BadRequestException("Stock crítico inválido");

    return this.prisma.product.create({
      data: {
        name,
        category,
        price: Math.round(price),
        stock: Math.round(stock),
        stockCritical: Math.round(stockCritical),
        isActive: true,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      category?: string;
      price?: number;
      stock?: number;
      stockCritical?: number;
      isActive?: boolean;
    }
  ) {
    const exists = await this.prisma.product.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Producto no existe");

    const patch: Prisma.ProductUpdateInput = {};

    if (data.name !== undefined) {
      const v = String(data.name).trim();
      if (!v) throw new BadRequestException("Nombre inválido");
      patch.name = v;
    }

    if (data.category !== undefined) {
      const v = String(data.category).trim();
      if (!v) throw new BadRequestException("Categoría inválida");
      patch.category = v;
    }

    if (data.price !== undefined) {
      const v = Number(data.price);
      if (!Number.isFinite(v) || v < 0) throw new BadRequestException("Precio inválido");
      patch.price = Math.round(v);
    }

    if (data.stock !== undefined) {
      const v = Number(data.stock);
      if (!Number.isFinite(v) || v < 0) throw new BadRequestException("Stock inválido");
      patch.stock = Math.round(v);
    }

    if (data.stockCritical !== undefined) {
      const v = Number(data.stockCritical);
      if (!Number.isFinite(v) || v < 0) throw new BadRequestException("Stock crítico inválido");
      patch.stockCritical = Math.round(v);
    }

    if (data.isActive !== undefined) {
      patch.isActive = Boolean(data.isActive);
    }

    return this.prisma.product.update({
      where: { id },
      data: patch,
    });
  }
}
