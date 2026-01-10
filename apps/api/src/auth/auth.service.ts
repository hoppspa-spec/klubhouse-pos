import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'; // o bcryptjs
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });

    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    if (!user.isActive) throw new ForbiddenException('Usuario inactivo');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const payload = { sub: user.id, role: user.role, username: user.username };

    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    };
  }
}
