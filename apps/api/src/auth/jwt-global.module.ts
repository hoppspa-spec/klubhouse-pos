import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // Si esto aparece en logs, el problema es 100% Render env / nombre variable
  console.error("❌ JWT_SECRET is missing in environment variables");
}

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET || "MISSING_JWT_SECRET_DO_NOT_USE",
      signOptions: { expiresIn: "7d" },
    }),
  ],
  exports: [JwtModule],
})
export class JwtGlobalModule {}
