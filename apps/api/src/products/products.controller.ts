import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller("products")
@UseGuards(AuthGuard, RolesGuard)
export class ProductsController {
  constructor(private svc: ProductsService) {}

  // ✅ SELLER puede leer (para buscar y vender)
  @Get()
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  list() {
    return this.svc.list();
  }

  // ✅ solo MASTER/SLAVE crean productos
  @Post()
  @Roles(Role.MASTER, Role.SLAVE)
  create(
    @Body()
    body: {
      name: string;
      category: string;
      price: number;
      stock?: number;
      stockCritical?: number;
    }
  ) {
    return this.svc.create(body);
  }

  // ✅ editar campos (precio/categoría/nombre/stockCritical)
  @Patch(":id")
  @Roles(Role.MASTER, Role.SLAVE)
  update(
    @Param("id") id: string,
    @Body()
    body: Partial<{
      name: string;
      category: string;
      price: number;
      stockCritical: number;
    }>
  ) {
    return this.svc.update(id, body);
  }

  // ✅ activar/desactivar
  @Patch(":id/active")
  @Roles(Role.MASTER, Role.SLAVE)
  setActive(@Param("id") id: string, @Body() body: { isActive: boolean }) {
    return this.svc.setActive(id, body.isActive);
  }

  // ✅ ajuste de stock (IN/OUT/ADJUST)
  @Patch(":id/stock")
  @Roles(Role.MASTER, Role.SLAVE)
  adjustStock(
    @Param("id") id: string,
    @Body() body: { delta: number; reason?: string; createdById?: string }
  ) {
    return this.svc.adjustStock(id, body.delta, body.reason);
  }
}


