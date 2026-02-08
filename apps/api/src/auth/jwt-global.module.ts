import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "7d" },
    }),
  ],
  exports: [JwtModule],
})
export class JwtGlobalModule {
  constructor() {
    if (!process.env.JWT_SECRET) {
      console.error("❌ FATAL: JWT_SECRET is missing in environment variables");
      throw new Error("JWT_SECRET missing");
    }
  }
}
