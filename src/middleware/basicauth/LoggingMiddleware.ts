import { MiddlewareHandler } from "../MiddlewareHandler";

export class LoggingMiddleware implements MiddlewareHandler {
  public async apply(request: Request, next: () => Promise<Response>): Promise<Response> {
    console.info(`➡️ ${request.url}`);
    return await next();
  }
}
