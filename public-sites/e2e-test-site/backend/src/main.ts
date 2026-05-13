import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port);
  console.log(`backend listening on http://localhost:${port}`);
  console.log("modules:", ["Health","Projects","Generation","Database","Auth","Users","Roles","Content","Media","Accounts","SEO","Dashboard","Reports","Search","Products","Orders","Payments","Profiles","Publishing","Brand Assets","Permissions"]);
}
bootstrap();
