import { Controller, Get } from "@nestjs/common";
import { AuthenticationService } from "./authentication.service.js";

@Controller("authentication")
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Get()
  get() {
    return this.authenticationService.getAuthentication();
  }
}
