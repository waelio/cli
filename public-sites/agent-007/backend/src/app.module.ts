import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { SeoModule } from "./seo/seo.module.js";
import { AuthenticationModule } from "./authentication/authentication.module.js";
import { PublishingModule } from "./publishing/publishing.module.js";
import { BrandAssetsModule } from "./brand-assets/brand-assets.module.js";
import { CaslPermissionsModule } from "./casl-permissions/casl-permissions.module.js";
import { LocalDatabaseModule } from "./local-database/local-database.module.js";
import { NativescriptReadyModule } from "./nativescript-ready/nativescript-ready.module.js";

@Module({
  imports: [
    SeoModule,
    AuthenticationModule,
    PublishingModule,
    BrandAssetsModule,
    CaslPermissionsModule,
    LocalDatabaseModule,
    NativescriptReadyModule
  ],
  controllers: [HealthController],
})
export class AppModule {}
