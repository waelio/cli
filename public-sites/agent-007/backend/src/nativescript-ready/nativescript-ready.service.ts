import { Injectable } from "@nestjs/common";

@Injectable()
export class NativescriptReadyService {
  getNativescriptReady() {
    return { message: "This action returns a NativeScript Ready" };
  }
}
