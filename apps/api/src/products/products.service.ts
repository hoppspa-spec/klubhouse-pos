import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.product.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  async create(body: {
    name: string;
    category: string;
    price: number;
    stock?: number;
    stockCritical?: number;
  }) {
    const name = (body.name || "").trim();
    const category = (body.category || "").trim();
    const price = Number(body.price);

    if (!name) throw new BadRequestException("Nombre requerido");
    if (!category) throw new BadRequestException("Categoría requerida");
    if (!Number.isFinite(price) || price < 0) throw new BadRequestException("Precio inválido");

    const stock = body.stock != null ? Number(body.stock) : 0;
    const stockCritical = body.stockCritical != null ? Number(body.stockCritical) : 0;

    if (!Number.isFinite(stock) || stock < 0) throw new BadRequestException("Stock inválido");
    if (!Number.isFinite(stockCritical) || stockCritical < 0) throw new BadRequestException("Stock crítico inválido");

    try {
      return await this.prisma.product.create({
        data: {
          name,
          category,
          price: Math.round(price),
          stock: Math.round(stock),
          stockCritical: Math.round(stockCritical),
          isActive: true,
        },
      });
    } catch (e: any) {
      // nombre unique
      throw new BadRequestException("No pude crear producto (¿nombre duplicado?)");
    }
  }

  async update(
    id: string,
    data: {
      name?: string;
      category?: string;
      price?: number;
      stock?: number;
      isActive?: boolean;
  
   }
 ) { 
   return this.prisma.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.stock !== undefined && { stock: data.stock }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

  async setActive(id: string, isActive: boolean) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Producto no existe");

    return this.prisma.product.update({
      where: { id },
      data: { isActive: !!isActive },
    });
  }

  async adjustStock(id: string, delta: number, reason?: string) {
    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) throw new BadRequestException("Delta inválido");

    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException("Producto no existe");

    const newStock = p.stock + Math.round(d);
    if (newStock < 0) throw new BadRequestException("Stock no puede quedar negativo");

    // MVP: solo ajusta stock (después lo conectamos a StockMovement + createdById)
    return this.prisma.product.update({
      where: { id },
      data: { stock: newStock },
    });
  }
}

