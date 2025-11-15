import { ErrorLike, serve } from "bun";
import { Config } from "@/Config";
import index from "@/website/index.html";
import { ZodError } from "zod/v4";
import { WebError } from "@/errors/WebError";
import { ServiceError } from "@/errors/ServiceError";

export class Server {
  public constructor() {
    this.listenForIncomingRequests();
  }

  private listenForIncomingRequests() {
    const server = serve({
      development: Config.O_BACNREESE_STAGE === "development",
      routes: {
        /**
         * Defaults
         */
        "/*": index,
        "/api/*": () => {
          return Response.json(WebError.route_not_found().json(), { status: 404 });
        },

        /**
         * Configuration
         */
        "/api/config": {
          GET: async () => {
            const response = Object.entries(Config)
              .filter(([key]) => key.startsWith("O_BACNREESE_" satisfies Config.PublicPrefix))
              .map(([key, value]) => ({ [key]: value }))
              .reduce((kv1, kv2) => Object.assign({}, kv1, kv2), {});
            return Response.json(response as Config.Public);
          },
        },

        /**
         * Generated
         */
        "/api/hello": {
          async GET(req) {
            return Response.json({
              message: "Hello, world!",
              method: "GET",
            });
          },
          async PUT(req) {
            return Response.json({
              message: "Hello, world!",
              method: "PUT",
            });
          },
        },
        "/api/hello/:name": async (req) => {
          const name = req.params.name;
          return Response.json({
            message: `Hello, ${name}!`,
          });
        },
        /**
         * Error handling
         */
        error: (e) => this.handleError(e),
      },
    });
    console.log(`🚀 Server running at ${server.url}`);
  }

  private async handleError(e: ErrorLike): Promise<Response> {
    if (e.name === ServiceError.name) {
      const error = e as ServiceError;
      if (WebError.unauthorized.matches(error.problem) || WebError.forbidden.matches(error.problem)) {
        return Response.json(error.json(), {
          status: 401,
          headers: { "www-authenticate": "basic" },
        });
      }
      return Response.json(error.json(), { status: 400 });
    }
    if (e.name === ZodError.name) {
      const error = e as ZodError;
      return Response.json(
        WebError.invalid_request_body({
          problemFields: error.issues.map((zodIssue) => zodIssue.path.join(",")),
        }).json(),
        { status: 400 },
      );
    }
    if (e.message?.includes("invalid input syntax for type")) {
      return Response.json(WebError.invalid_request_body().json(), { status: 400 });
    }
    console.error("An unknown error occurred", e);
    return Response.json(WebError.unknown().json(), { status: 500 });
  }
}
