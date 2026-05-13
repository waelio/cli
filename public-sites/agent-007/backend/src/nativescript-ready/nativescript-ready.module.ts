import { Module } from "@nestjs/common";
import { NativescriptReadyController } from "./nativescript-ready.controller.js";
import { NativescriptReadyService } from "./nativescript-ready.service.js";

@Module({
  controllers: [NativescriptReadyController],
  providers: [NativescriptReadyService],
})
export class NativescriptReadyModule {}
