import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { ProductsService } from "./products.service";
import { CreateProductDto, UpdateProductDto } from "./dto";

@Controller("products")
@UseGuards(AuthGuard, RolesGuard)
export class ProductsController {
  constructor(private svc: ProductsService) {}

  // SELLER también puede listar (para vender)
  @Get()
  @Roles(Role.MASTER, Role.SLAVE, Role.SELLER)
  list() {
    return this.svc.list();
  }

  // Solo dueño y gerente
  @Post()
  @Roles(Role.MASTER, Role.SLAVE)
  create(@Body() body: CreateProductDto) {
    return this.svc.create(body);
  }

  // Solo dueño y gerente
  @Patch(":id")
  @Roles(Role.MASTER, Role.SLAVE)
  update(@Param("id") id: string, @Body() body: UpdateProductDto) {
    return this.svc.update(id, body);
  }
}

