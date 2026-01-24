import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || "dev_secret_123",
    }),
  ],
  exports: [JwtModule],
})
export class JwtGlobalModule {}

