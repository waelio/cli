import { Module } from "@nestjs/common";
import { BrandAssetsController } from "./brand-assets.controller.js";
import { BrandAssetsService } from "./brand-assets.service.js";

@Module({
  controllers: [BrandAssetsController],
  providers: [BrandAssetsService],
})
export class BrandAssetsModule {}
