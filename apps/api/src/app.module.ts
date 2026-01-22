import { Module } from "@nestjs/common";
import { TablesModule } from "./tables/tables.module";

// Si tienes AuthModule en tu proyecto (seguro, porque el login te funcionaba),
// descomenta esta línea y agrégalo en imports.
// import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [
    // AuthModule,
    TablesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}