// apps/api/src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma.service";
import bcrypt from "bcryptjs";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(username: string, password: string) {
  try {
    const user = await this.prisma.user.findUnique({ where: { username } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Usuario o clave incorrecta");
    }

    // 👇 esto evita el 500 si está NULL
    if (!user.passwordHash) {
      throw new UnauthorizedException("Usuario o clave incorrecta");
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Usuario o clave incorrecta");
    }

    const payload = { sub: user.id, username: user.username, role: user.role };

    const access_token = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: "15m",
    });

    return {
      accessToken: access_token,
      user: { id: user.id, username: user.username, role: user.role },
    };
  } catch (e) {
    console.error("AUTH LOGIN ERROR =>", e);
    throw e;
  }
}
