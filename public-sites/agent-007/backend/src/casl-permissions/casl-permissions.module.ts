import { Module } from "@nestjs/common";
import { CaslPermissionsController } from "./casl-permissions.controller.js";
import { CaslPermissionsService } from "./casl-permissions.service.js";

@Module({
  controllers: [CaslPermissionsController],
  providers: [CaslPermissionsService],
})
export class CaslPermissionsModule {}
