import { Body, Controller, Get, Patch, Post, Param, UseGuards } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller("products")
@UseGuards(AuthGuard, RolesGuard)
export class ProductsController {
  constructor(private svc: ProductsService) {}

  @Get()
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  list() {
    return this.svc.list();
  }

  // ✅ solo dueño/gerente
  @Post()
  @Roles(Role.MASTER, Role.SLAVE)
  create(@Body() body: { name: string; category: string; price: number; stock?: number }) {
    return this.svc.create(body);
  }

  // ✅ editar precio/stock/activo (dueño/gerente)
  @Patch(":id")
  @Roles(Role.MASTER, Role.SLAVE)
  update(
    @Param("id") id: string,
    @Body() body: { name?: string; category?: string; price?: number; stock?: number; isActive?: boolean }
  ) {
    return this.svc.update(id, body);
  }
}

