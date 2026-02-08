import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] as string | undefined;

    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');

    const token = auth.slice('Bearer '.length);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
      req.user = payload; // { sub, role, username, iat, exp }
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}