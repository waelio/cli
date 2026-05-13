import { Controller, Get } from "@nestjs/common";
import { SeoService } from "./seo.service.js";

@Controller("seo")
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get()
  get() {
    return this.seoService.getSeo();
  }
}
