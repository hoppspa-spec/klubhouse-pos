import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller("users")
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get()
  @Roles(Role.MASTER, Role.SLAVE)
  list() {
    return this.svc.list();
  }

  @Post()
  @Roles(Role.MASTER, Role.SLAVE)
  create(@Req() req: any, @Body() body: { username: string; name: string; password: string; role: Role }) {
    return this.svc.createUser(req.user.role as Role, body);
  }

  @Patch(":id/active")
  @Roles(Role.MASTER, Role.SLAVE)
  setActive(@Req() req: any, @Param("id") id: string, @Body() body: { isActive: boolean }) {
    return this.svc.setActive(req.user.role as Role, id, body.isActive);
  }

  @Patch(":id/password")
  @Roles(Role.MASTER, Role.SLAVE)
  setPassword(@Req() req: any, @Param("id") id: string, @Body() body: { password: string }) {
    return this.svc.setPassword(req.user.role as Role, id, body.password);
  }
}

