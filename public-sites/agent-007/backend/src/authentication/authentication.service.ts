import { Injectable } from "@nestjs/common";

@Injectable()
export class AuthenticationService {
  getAuthentication() {
    return { message: "This action returns a Authentication" };
  }
}
