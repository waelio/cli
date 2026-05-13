import { Injectable } from "@nestjs/common";

@Injectable()
export class SeoService {
  getSeo() {
    return { message: "This action returns a SEO" };
  }
}
