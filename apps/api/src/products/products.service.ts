import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.product.findMany({ where: { isActive: true }, orderBy: { category: "asc" } });
  }

  create(body: { name: string; category: string; price: number; stock?: number }) {
    if (!body.name || !body.category) throw new BadRequestException("name/category requeridos");
    if (!Number.isFinite(body.price) || body.price <= 0) throw new BadRequestException("price inválido");

    return this.prisma.product.create({
      data: {
        name: body.name,
        category: body.category,
        price: Math.trunc(body.price),
        stock: Math.trunc(body.stock ?? 999),
        isActive: true,
      },
    });
  }

  update(id: string, body: { name?: string; category?: string; price?: number; stock?: number; isActive?: boolean }) {
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.category !== undefined) data.category = body.category;
    if (body.price !== undefined) {
      if (!Number.isFinite(body.price) || body.price <= 0) throw new BadRequestException("price inválido");
      data.price = Math.trunc(body.price);
    }
    if (body.stock !== undefined) data.stock = Math.trunc(body.stock);
    if (body.isActive !== undefined) data.isActive = !!body.isActive;

    return this.prisma.product.update({ where: { id }, data });
  }
}
