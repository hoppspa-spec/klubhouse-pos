import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class ProductsController {
  constructor(private svc: ProductsService) {}

  @Get("products")
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  list() {
    return this.svc.list();
  }

  @Post("products")
  @Roles(Role.MASTER, Role.SLAVE)
  create(
    @Body()
    body: {
      name: string;
      category: string;
      price: number;
      stock: number;
      stockCritical: number;
    }
  ) {
    return this.svc.create(body);
  }

  // ✅ con esto ya puedes editar nombre y categoría también
  @Patch("products/:id")
  @Roles(Role.MASTER, Role.SLAVE)
  update(
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      category?: string;
      price?: number;
      stock?: number;
      stockCritical?: number;
      isActive?: boolean;
    }
  ) {
    return this.svc.update(id, body);
  }
}
