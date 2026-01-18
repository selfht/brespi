import { Env } from "@/Env";
import { Exception } from "@/errors/exception/Exception";
import { ServerError } from "@/errors/ServerError";
import index from "@/website/index.html";
import { ErrorLike } from "bun";
import { Generate } from "./helpers/Generate";
import { Configuration } from "./models/Configuration";
import { Execution } from "./models/Execution";
import { ConfigurationService } from "./services/ConfigurationService";
import { ExecutionService } from "./services/ExecutionService";
import { PipelineService } from "./services/PipelineService";
import { RestrictedService } from "./services/RestrictedService";
import { StepService } from "./services/StepService";
import { Socket } from "./socket/Socket";
import { PipelineView } from "./views/PipelineView";
import { ScheduleService } from "./services/ScheduleService";
import { Schedule } from "./models/Schedule";

export class Server {
  private static readonly SOCKET_ENDPOINT = "/socket";

  public constructor(
    private readonly env: Env.Private,
    private readonly stepService: StepService,
    private readonly pipelineService: PipelineService,
    private readonly executionService: ExecutionService,
    private readonly scheduleService: ScheduleService,
    private readonly restrictedService: RestrictedService,
    private readonly configurationService: ConfigurationService,
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
          return Response.json(ServerError.socket_upgrade_failed().json());
        }
        return Response.json(ServerError.route_not_found().json());
      },
      websocket: {
        message: () => {
          // Ignore any incoming client messages
        },
        open: (socket) => {
          this.executionService.registerSocket(socket);
          this.configurationService.registerSocket(socket);
        },
        close: (socket) => {
          this.executionService.unregisterSocket(socket);
          this.configurationService.unregisterSocket(socket);
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
         * Configuration
         */
        "/api/configuration": {
          GET: async () => {
            const configuration: Configuration = await this.configurationService.get();
            return Response.json(configuration);
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
            const pipeline: PipelineView = await this.pipelineService.delete(request.params.id);
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

        /**
         * Schedules
         */
        "/api/schedules": {
          GET: async () => {
            const schedules: Schedule[] = await this.scheduleService.list();
            return Response.json(schedules);
          },
          POST: async (request) => {
            const schedule: Schedule = await this.scheduleService.create(await request.json());
            return Response.json(schedule);
          },
        },
        "/api/schedules/:id": {
          PUT: async (request) => {
            const schedule: Schedule = await this.scheduleService.update(request.params.id, await request.json());
            return Response.json(schedule);
          },
          DELETE: async (request) => {
            const schedule: Schedule = await this.scheduleService.delete(request.params.id);
            return Response.json(schedule);
          },
        },

        /**
         * Restricted endpoints (for Playwright)
         */
        "/api/restricted/delete-everything": {
          POST: async () => {
            if (this.env.O_BRESPI_STAGE === "development") {
              await this.restrictedService.deleteEverything();
              return new Response();
            }
            return Response.json(ServerError.route_not_found().json());
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
    if (Exception.isInstance(e)) {
      if (e.problem === "SERVER::unauthorized" || e.problem === "SERVER::forbidden") {
        return Response.json(e.json(), {
          status: 401,
          headers: { "www-authenticate": "basic" },
        });
      }
      return Response.json(e.json(), { status: 400 });
    }
    if (e.message?.includes("invalid input syntax for type")) {
      return Response.json(ServerError.invalid_request_body().json(), { status: 400 });
    }
    console.error("An unknown error occurred", e);
    return Response.json(ServerError.unknown().json(), { status: 500 });
  }
}
