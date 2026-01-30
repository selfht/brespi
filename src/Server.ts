import { Env } from "@/Env";
import { Exception } from "@/errors/exception/Exception";
import { ServerError } from "@/errors/ServerError";
import index from "@/website/index.html";
import { ErrorLike } from "bun";
import { Generate } from "./helpers/Generate";
import { Middleware } from "./middleware/Middleware";
import { Configuration } from "./models/Configuration";
import { Execution } from "./models/Execution";
import { NotificationPolicy } from "./models/NotificationPolicy";
import { Schedule } from "./models/Schedule";
import { ConfigurationService } from "./services/ConfigurationService";
import { ExecutionService } from "./services/ExecutionService";
import { NotificationService } from "./services/NotificationService";
import { PipelineService } from "./services/PipelineService";
import { RestrictedService } from "./services/RestrictedService";
import { ScheduleService } from "./services/ScheduleService";
import { StepService } from "./services/StepService";
import { Socket } from "./socket/Socket";
import { PipelineView } from "./views/PipelineView";

export class Server {
  public constructor(
    private readonly env: Env.Private,
    private readonly stepService: StepService,
    private readonly pipelineService: PipelineService,
    private readonly executionService: ExecutionService,
    private readonly scheduleService: ScheduleService,
    private readonly notificationService: NotificationService,
    private readonly configurationService: ConfigurationService,
    private readonly restrictedService: RestrictedService,
    private readonly middleware: Middleware,
  ) {}

  public listen() {
    const server: Bun.Server<Socket.Context> = Bun.serve({
      development: this.env.O_BRESPI_STAGE === "development",
      /**
       * Websockets
       */
      fetch: this.handleFetch(async (request, server) => {
        const { pathname } = new URL(request.url);
        if (pathname === "/socket") {
          const context: Socket.Context = {
            clientId: Generate.shortRandomString(),
          };
          if (server.upgrade(request, { data: context })) {
            return new Response(null, { status: 200 });
          }
          return Response.json(ServerError.socket_upgrade_failed().json());
        }
        return Response.json(ServerError.route_not_found().json());
      }),
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
         * HTML/API fallbacks
         *
         * Unfortunately, no middleware/basic-auth on the HTMLBundle right now; see
         * https://github.com/oven-sh/bun/issues/17595#issuecomment-2965865078
         *
         * (the suggested "secret asset path" breaks my websocket, unfortunately)
         */
        "/*": index,
        "/api/*": this.handleRoute(() => {
          return Response.json(ServerError.route_not_found().json(), { status: 404 });
        }),

        /**
         * Env
         */
        "/api/env": {
          GET: this.handleRoute(() => {
            const response = Object.entries(this.env)
              .filter(([key]) => key.startsWith("O_BRESPI_" satisfies Env.PublicPrefix))
              .map(([key, value]) => ({ [key]: value }))
              .reduce((kv1, kv2) => Object.assign({}, kv1, kv2), {});
            return Response.json(response as Env.Public);
          }),
        },

        /**
         * Configuration
         */
        "/api/configuration": {
          GET: this.handleRoute(async () => {
            const configuration: Configuration = await this.configurationService.get();
            return Response.json(configuration);
          }),
        },
        "/api/configuration/save-changes": {
          POST: this.handleRoute(async () => {
            const configuration: Configuration = await this.configurationService.saveChanges();
            return Response.json(configuration);
          }),
        },
        "/api/configuration/discard-changes": {
          POST: this.handleRoute(async () => {
            const configuration: Configuration = await this.configurationService.discardChanges();
            return Response.json(configuration);
          }),
        },

        /**
         * Steps & Pipelines
         */
        "/api/steps/validate": {
          POST: this.handleRoute(async (request) => {
            this.stepService.validate(await request.json());
            return new Response();
          }),
        },
        "/api/pipelines": {
          GET: this.handleRoute(async () => {
            const pipelines: PipelineView[] = await this.pipelineService.query();
            return Response.json(pipelines);
          }),
          POST: this.handleRoute(async (request) => {
            const pipeline: PipelineView = await this.pipelineService.create(await request.json());
            return Response.json(pipeline);
          }),
        },
        "/api/pipelines/:id": {
          GET: this.handleRoute(async (request) => {
            const pipeline: PipelineView = await this.pipelineService.find(request.params.id);
            return Response.json(pipeline);
          }),
          PUT: this.handleRoute(async (request) => {
            const pipeline: PipelineView = await this.pipelineService.update(request.params.id, await request.json());
            return Response.json(pipeline);
          }),
          DELETE: this.handleRoute(async (request) => {
            const pipeline: PipelineView = await this.pipelineService.delete(request.params.id);
            return Response.json(pipeline);
          }),
        },

        /**
         * Executions
         */
        "/api/executions": {
          GET: this.handleRoute(async (request) => {
            const executions: Execution[] = await this.executionService.query({
              pipelineId: this.searchParam(request, "pipelineId!"),
            });
            return Response.json(executions);
          }),
          POST: this.handleRoute(async (request) => {
            const execution: Execution = await this.executionService.create({
              ...(await request.json()),
              trigger: "ad_hoc",
            });
            return Response.json(execution);
          }),
        },
        "/api/executions/:id": {
          GET: this.handleRoute(async (request) => {
            const execution: Execution = await this.executionService.find(request.params.id);
            return Response.json(execution);
          }),
          POST: this.handleRoute(async (request) => {
            return Response.json(null);
          }),
        },

        /**
         * Schedules
         */
        "/api/schedules": {
          GET: this.handleRoute(async () => {
            const schedules: Schedule[] = await this.scheduleService.query();
            return Response.json(schedules);
          }),
          POST: this.handleRoute(async (request) => {
            const schedule: Schedule = await this.scheduleService.create(await request.json());
            return Response.json(schedule);
          }),
        },
        "/api/schedules/:id": {
          PUT: this.handleRoute(async (request) => {
            const schedule: Schedule = await this.scheduleService.update(request.params.id, await request.json());
            return Response.json(schedule);
          }),
          DELETE: this.handleRoute(async (request) => {
            const schedule: Schedule = await this.scheduleService.delete(request.params.id);
            return Response.json(schedule);
          }),
        },

        /**
         * Notification policies
         */
        "/api/notification-policies": {
          GET: this.handleRoute(async () => {
            const policies: NotificationPolicy[] = await this.notificationService.queryPolicies();
            return Response.json(policies);
          }),
          POST: this.handleRoute(async (request) => {
            const policy: NotificationPolicy = await this.notificationService.createPolicy(await request.json());
            return Response.json(policy);
          }),
        },
        "/api/notification-policies/:id": {
          PUT: this.handleRoute(async (request) => {
            const policy: NotificationPolicy = await this.notificationService.updatePolicy(request.params.id, await request.json());
            return Response.json(policy);
          }),
          DELETE: this.handleRoute(async (request) => {
            const policy: NotificationPolicy = await this.notificationService.deletePolicy(request.params.id);
            return Response.json(policy);
          }),
        },

        /**
         * Restricted endpoints for local and/or e2e testing
         */
        "/api/restricted/purge": {
          POST: this.handleRoute(async () => {
            if (this.env.O_BRESPI_STAGE === "development") {
              await this.restrictedService.purge();
              return new Response();
            }
            return Response.json(ServerError.route_not_found().json(), { status: 404 });
          }),
        },
        "/api/restricted/seed": {
          POST: this.handleRoute(async () => {
            if (this.env.O_BRESPI_STAGE === "development") {
              await this.restrictedService.seed();
              return new Response();
            }
            return Response.json(ServerError.route_not_found().json(), { status: 404 });
          }),
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

  private handleFetch<C>(
    fn: (request: Request, server: Bun.Server<C>) => Response | Promise<Response>,
  ): (request: Request, server: Bun.Server<C>) => Promise<Response> {
    return (request, server) =>
      this.middleware.handle(request, async () => {
        return await fn(request, server);
      });
  }

  private handleRoute<T extends string>(
    fn: (req: Bun.BunRequest<T>) => Response | Promise<Response>,
  ): (req: Bun.BunRequest<T>) => Promise<Response> {
    return (request) =>
      this.middleware.handle(request, async () => {
        return await fn(request);
      });
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
