import { Injectable, UnauthorizedException, InternalServerErrorException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma.service";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(username: string, password: string) {
    // 1) Buscar usuario
    const user = await this.prisma.user.findUnique({ where: { username } });

    if (!user) throw new UnauthorizedException("Usuario o clave incorrecta");
    if (!user.isActive) throw new UnauthorizedException("Usuario inactivo");

    // 2) Validar password
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Usuario o clave incorrecta");

    // 3) Validar envs (si faltan, mejor error claro)
    const jwtSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.REFRESH_SECRET;
    if (!jwtSecret || !refreshSecret) {
      throw new InternalServerErrorException("Faltan JWT_SECRET / REFRESH_SECRET en el servidor");
    }

    // 4) Tokens
    const payload = { sub: user.id, role: user.role, username: user.username };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: jwtSecret,
      expiresIn: "1h",
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: "30d",
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, role: user.role },
    };
  }
}

