import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma.service";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive) throw new UnauthorizedException("Usuario inválido");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Clave inválida");

    const payload = { sub: user.id, username: user.username, role: user.role, name: user.name };
    const accessToken = await this.jwt.signAsync(payload, { secret: process.env.JWT_SECRET, expiresIn: "8h" });
    return { accessToken, user: { id: user.id, name: user.name, role: user.role, username: user.username } };
  }
}
