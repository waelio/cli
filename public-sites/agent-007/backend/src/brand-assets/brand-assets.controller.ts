import { Controller, Get } from "@nestjs/common";
import { BrandAssetsService } from "./brand-assets.service.js";

@Controller("brand-assets")
export class BrandAssetsController {
  constructor(private readonly brandAssetsService: BrandAssetsService) {}

  @Get()
  get() {
    return this.brandAssetsService.getBrandAssets();
  }
}
