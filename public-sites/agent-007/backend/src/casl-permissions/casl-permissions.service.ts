import { Injectable } from "@nestjs/common";

@Injectable()
export class CaslPermissionsService {
  getCaslPermissions() {
    return { message: "This action returns a CASL Permissions" };
  }
}
