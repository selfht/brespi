import { Env } from "@/Env";
import { Exception } from "@/errors/Exception";
import { ServerError } from "@/errors/ServerError";
import index from "@/website/index.html";
import { ErrorLike } from "bun";
import { Generate } from "./helpers/Generate";
import { Execution } from "./models/Execution";
import { Socket } from "./models/socket/Socket";
import { ExecutionService } from "./services/ExecutionService";
import { PipelineService } from "./services/PipelineService";
import { StepService } from "./services/StepService";
import { PipelineView } from "./views/PipelineView";

export class Server {
  private static readonly SOCKET_ENDPOINT = "/socket";

  public constructor(
    private readonly env: Env.Private,
    private readonly stepService: StepService,
    private readonly pipelineService: PipelineService,
    private readonly executionService: ExecutionService,
  ) {}

  public listen() {
    const server: Bun.Server<Socket.Context> = Bun.serve({
      development: this.env.O_BRESPI_STAGE === "development",
      /**
       * Websockets
       */
      fetch: (request, server) => {
        const { pathname } = new URL(request.url);
        if (pathname === Server.SOCKET_ENDPOINT) {
          const context: Socket.Context = {
            clientId: Generate.shortRandomString(),
          };
          if (server.upgrade(request, { data: context })) {
            return new Response(null, { status: 200 });
          }
          return Response.json(ServerError.socket_upgrade_failed());
        }
        return Response.json(ServerError.route_not_found());
      },
      websocket: {
        message: () => {
          // Ignore any incoming client messages
        },
        open: (socket) => {
          this.executionService.registerSocket(socket);
        },
        close: (socket) => {
          this.executionService.unregisterSocket(socket);
        },
      },
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
            const response = Object.entries(this.env)
              .filter(([key]) => key.startsWith("O_BRESPI_" satisfies Env.PublicPrefix))
              .map(([key, value]) => ({ [key]: value }))
              .reduce((kv1, kv2) => Object.assign({}, kv1, kv2), {});
            return Response.json(response as Env.Public);
          },
        },

        /**
         * Steps & Pipelines
         */
        "/api/steps/validate": {
          POST: async (request) => {
            this.stepService.validate(await request.json());
            return new Response();
          },
        },
        "/api/pipelines": {
          GET: async () => {
            const pipelines: PipelineView[] = await this.pipelineService.list();
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
         * Executions
         */
        "/api/executions": {
          GET: async (request) => {
            const executions: Execution[] = await this.executionService.query({
              pipelineId: this.searchParam(request, "pipelineId!"),
            });
            return Response.json(executions);
          },
          POST: async (request) => {
            const execution: Execution = await this.executionService.create(await request.json());
            return Response.json(execution);
          },
        },
        "/api/executions/:id": {
          GET: async (request) => {
            const execution: Execution = await this.executionService.find(request.params.id);
            return Response.json(execution);
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

  private searchParam<T extends `${string}!`>(request: Bun.BunRequest, name: T): string;
  private searchParam<T extends string>(request: Bun.BunRequest, name: T): string | undefined;
  private searchParam<T extends string>(request: Bun.BunRequest, nameWithPossibleExclamation: T): string | undefined {
    const url = new URL(request.url);
    const isRequired = nameWithPossibleExclamation.endsWith("!");
    const name = isRequired
      ? nameWithPossibleExclamation.substring(0, nameWithPossibleExclamation.length - 1)
      : nameWithPossibleExclamation;
    const value = url.searchParams.get(name);
    if (isRequired && !value) {
      throw ServerError.missing_query_parameter({ name });
    }
    return value || undefined;
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
