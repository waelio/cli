import { Injectable } from "@nestjs/common";

@Injectable()
export class BrandAssetsService {
  getBrandAssets() {
    return { message: "This action returns a Brand Assets" };
  }
}
