import { Controller, Get, UseGuards } from "@nestjs/common";
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
}
