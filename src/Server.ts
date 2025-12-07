import { Env } from "@/Env";
import { Exception } from "@/errors/Exception";
import { ServerError } from "@/errors/ServerError";
import index from "@/website/index.html";
import { ErrorLike, serve } from "bun";
import { PipelineData } from "./__testdata__/PipelineData";
import { PipelineService } from "./services/PipelineService";
import { PipelineView } from "./views/PipelineView";

export class Server {
  public constructor(private readonly pipelineService: PipelineService) {}

  public listen() {
    const server = serve({
      development: Env.O_BRESPI_STAGE === "development",
      routes: {
        /**
         * Defaults
         */
        "/*": index,
        "/api/*": () => {
          return Response.json(ServerError.route_not_found().json(), { status: 404 });
        },

        /**
         * Env
         */
        "/api/env": {
          GET: async () => {
            const response = Object.entries(Env)
              .filter(([key]) => key.startsWith("O_BRESPI_" satisfies Env.PublicPrefix))
              .map(([key, value]) => ({ [key]: value }))
              .reduce((kv1, kv2) => Object.assign({}, kv1, kv2), {});
            return Response.json(response as Env.Public);
          },
        },

        /**
         * Pipelines
         */
        "/api/pipelines": {
          GET: async () => {
            const pipelines: PipelineView[] = await this.pipelineService.query();
            return Response.json(pipelines);
          },
          POST: async (request) => {
            const pipeline: PipelineView = await this.pipelineService.create(await request.json());
            return Response.json(pipeline);
          },
        },
        "/api/pipelines/:id": {
          GET: async (request) => {
            const pipeline: PipelineView = await this.pipelineService.find(request.params.id);
            return Response.json(pipeline);
          },
          PUT: async (request) => {
            const pipeline: PipelineView = await this.pipelineService.update(request.params.id, await request.json());
            return Response.json(pipeline);
          },
          DELETE: async (request) => {
            const pipeline: PipelineView = await this.pipelineService.remove(request.params.id);
            return Response.json(pipeline);
          },
        },

        /**
         * Temporary
         */
        "/api/backup": {
          POST: async () => {
            const result = await this.pipelineService.execute(PipelineData.POSTGRES_BACKUP);
            return Response.json(result);
          },
        },
        "/api/restore": {
          POST: async () => {
            const result = await this.pipelineService.execute(PipelineData.RESTORE);
            return Response.json(result);
          },
        },
      },
      /**
       * Error handling
       */
      error: (e) => this.handleError(e),
    });
    console.log(`🚀 Server running at ${server.url}`);
  }

  private async handleError(e: ErrorLike): Promise<Response> {
    if (e.name === Exception.name) {
      const error = e as Exception;
      if (ServerError.unauthorized.matches(error.problem) || ServerError.forbidden.matches(error.problem)) {
        return Response.json(error.json(), {
          status: 401,
          headers: { "www-authenticate": "basic" },
        });
      }
      return Response.json(error.json(), { status: 400 });
    }
    if (e.message?.includes("invalid input syntax for type")) {
      return Response.json(ServerError.invalid_request_body().json(), { status: 400 });
    }
    console.error("An unknown error occurred", e);
    return Response.json(ServerError.unknown().json(), { status: 500 });
  }
}
