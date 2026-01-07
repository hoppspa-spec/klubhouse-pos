import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const origins = (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  app.enableCors({
    origin: origins.length ? origins : true,
    credentials: true
  });

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
