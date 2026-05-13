import { Controller, Get } from "@nestjs/common";
import { NativescriptReadyService } from "./nativescript-ready.service.js";

@Controller("nativescript-ready")
export class NativescriptReadyController {
  constructor(private readonly nativescriptReadyService: NativescriptReadyService) {}

  @Get()
  get() {
    return this.nativescriptReadyService.getNativescriptReady();
  }
}
