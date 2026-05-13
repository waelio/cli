import { Controller, Get } from "@nestjs/common";
import { PublishingService } from "./publishing.service.js";

@Controller("publishing")
export class PublishingController {
  constructor(private readonly publishingService: PublishingService) {}

  @Get()
  get() {
    return this.publishingService.getPublishing();
  }
}
