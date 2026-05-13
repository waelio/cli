import { Controller, Get } from "@nestjs/common";
import { LocalDatabaseService } from "./local-database.service.js";

@Controller("local-database")
export class LocalDatabaseController {
  constructor(private readonly localDatabaseService: LocalDatabaseService) {}

  @Get()
  get() {
    return this.localDatabaseService.getLocalDatabase();
  }
}
