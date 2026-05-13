import { Injectable } from "@nestjs/common";

@Injectable()
export class LocalDatabaseService {
  getLocalDatabase() {
    return { message: "This action returns a Local Database" };
  }
}
