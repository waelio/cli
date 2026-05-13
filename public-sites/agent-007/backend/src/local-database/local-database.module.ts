import { Module } from "@nestjs/common";
import { LocalDatabaseController } from "./local-database.controller.js";
import { LocalDatabaseService } from "./local-database.service.js";

@Module({
  controllers: [LocalDatabaseController],
  providers: [LocalDatabaseService],
})
export class LocalDatabaseModule {}
