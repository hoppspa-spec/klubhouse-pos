import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto, UpdateProductDto } from "./dto";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.product.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  }

  async create(dto: CreateProductDto) {
    const name = dto.name?.trim();
    const category = dto.category?.trim();

    if (!name || !category) throw new BadRequestException("name y category son obligatorios");
    if (!Number.isInteger(dto.price) || dto.price < 0) throw new BadRequestException("price inválido");
    if (dto.stock != null && (!Number.isInteger(dto.stock) || dto.stock < 0)) throw new BadRequestException("stock inválido");
    if (dto.stockCritical != null && (!Number.isInteger(dto.stockCritical) || dto.stockCritical < 0))
      throw new BadRequestException("stockCritical inválido");

    try {
      return await this.prisma.product.create({
        data: {
          name,
          category,
          price: dto.price,
          stock: dto.stock ?? 0,
          stockCritical: dto.stockCritical ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (e: any) {
      // por unique name
      throw new BadRequestException("Ya existe un producto con ese nombre");
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    const exists = await this.prisma.product.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Producto no existe");

    if (dto.price != null && (!Number.isInteger(dto.price) || dto.price < 0)) throw new BadRequestException("price inválido");
    if (dto.stock != null && (!Number.isInteger(dto.stock) || dto.stock < 0)) throw new BadRequestException("stock inválido");
    if (dto.stockCritical != null && (!Number.isInteger(dto.stockCritical) || dto.stockCritical < 0))
      throw new BadRequestException("stockCritical inválido");

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name?.trim() ?? undefined,
        category: dto.category?.trim() ?? undefined,
        price: dto.price ?? undefined,
        stock: dto.stock ?? undefined,
        stockCritical: dto.stockCritical ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    });
  }
}
