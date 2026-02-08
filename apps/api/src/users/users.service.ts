import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs"; // ✅ igual que AuthService

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, name: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
  }

  private ensureCanManage(actorRole: Role, targetRole: Role) {
    if (actorRole === Role.MASTER) return;
    if (actorRole === Role.SLAVE && targetRole === Role.SELLER) return;
    throw new ForbiddenException("No tienes permisos para esta acción");
  }

  async createUser(actorRole: Role, body: { username: string; name: string; password: string; role: Role }) {
    const { username, name, password, role } = body;

    if (!username || !name || !password || !role) throw new BadRequestException("Datos incompletos");
    if (password.length < 6) throw new BadRequestException("Password muy corta (mín 6)");

    this.ensureCanManage(actorRole, role);

    const exists = await this.prisma.user.findUnique({ where: { username } });
    if (exists) throw new BadRequestException("Username ya existe");

    const passwordHash = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: { username, name, passwordHash, role, isActive: true },
      select: { id: true, username: true, name: true, role: true, isActive: true, createdAt: true },
    });
  }

  async setActive(actorRole: Role, id: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("Usuario no existe");

    this.ensureCanManage(actorRole, user.role);

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !!isActive },
      select: { id: true, username: true, name: true, role: true, isActive: true, updatedAt: true },
    });
  }

  async setPassword(actorRole: Role, id: string, password: string) {
    if (!password || password.length < 6) throw new BadRequestException("Password inválida (mín 6)");

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("Usuario no existe");

    this.ensureCanManage(actorRole, user.role);

    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { ok: true };
  }
}

