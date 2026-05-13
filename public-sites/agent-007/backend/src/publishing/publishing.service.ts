import { Injectable } from "@nestjs/common";

@Injectable()
export class PublishingService {
  getPublishing() {
    return { message: "This action returns a Publishing" };
  }
}
