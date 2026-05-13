import { Controller, Get } from "@nestjs/common";
import { CaslPermissionsService } from "./casl-permissions.service.js";

@Controller("casl-permissions")
export class CaslPermissionsController {
  constructor(private readonly caslPermissionsService: CaslPermissionsService) {}

  @Get()
  get() {
    return this.caslPermissionsService.getCaslPermissions();
  }
}
