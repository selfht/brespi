import { BasicAuthMiddleware } from "./basicauth/BasicAuthMiddleware";
import { MiddlewareHandler } from "./MiddlewareHandler";

export class Middleware {
  private readonly middlewares: MiddlewareHandler[];

  public constructor(basicAuthMiddleware: BasicAuthMiddleware) {
    this.middlewares = [basicAuthMiddleware];
  }

  public handle<R extends Request>(request: R, handler: () => Promise<Response>): Promise<Response> {
    const chain = this.middlewares.reduceRight<() => Promise<Response>>(
      (next, middleware) => () => middleware.apply(request, next),
      () => handler(),
    );
    return chain();
  }
}
