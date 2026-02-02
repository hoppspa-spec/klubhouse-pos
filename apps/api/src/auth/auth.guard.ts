import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers?.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token || token === "undefined") {
      throw new UnauthorizedException("Missing token");
    }

    try {
      // ✅ NO PASAR SECRET ACÁ
      // usa el JwtGlobalModule
      const payload = this.jwt.verify(token);

      // payload = { sub, username, role, name, iat, exp }
      req.user = payload;

      return true;
    } catch (e) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}

