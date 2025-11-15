import { Config } from "@/Config";
import { ServiceError } from "@/errors/ServiceError";
import { WebError } from "@/errors/WebError";
import index from "@/website/index.html";
import { ErrorLike, serve } from "bun";
import { ZodError } from "zod/v4";
import { Pipeline } from "./models/Pipeline";
import { PipelineStep } from "./models/PipelineStep";
import { PipelineService } from "./services/PipelineService";

export class Server {
  public constructor(private readonly pipelineService: PipelineService) {}

  public listen() {
    const server = serve({
      development: Config.O_BRESPI_STAGE === "development",
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
              .filter(([key]) => key.startsWith("O_BRESPI_" satisfies Config.PublicPrefix))
              .map(([key, value]) => ({ [key]: value }))
              .reduce((kv1, kv2) => Object.assign({}, kv1, kv2), {});
            return Response.json(response as Config.Public);
          },
        },

        /**
         * Temporary
         */
        "/api/backup": {
          POST: async () => {
            const pipeline: Pipeline = {
              name: "My Pipeline",
              steps: [
                {
                  type: PipelineStep.Type.postgres_backup,
                  databases: {
                    selection: "all",
                  },
                },
                {
                  type: PipelineStep.Type.compression,
                  algorithm: "targzip",
                  targzip: {
                    level: 9,
                  },
                },
                {
                  type: PipelineStep.Type.encryption,
                  algorithm: "aes256",
                  keyReference: "CUSTOM_KEY",
                },
                {
                  type: PipelineStep.Type.s3_upload,
                  accessKeyReference: "ACCESS_KEY",
                  secretKeyReference: "SECRET_KEY",
                  folder: "some-random-parent-folder",
                },
              ],
            };
            const result = await this.pipelineService.execute(pipeline);
            return Response.json(result);
          },
        },
        "/api/restore": {
          POST: async () => {
            const pipeline: Pipeline = {
              name: "My Pipeline 2",
              steps: [
                {
                  type: PipelineStep.Type.s3_download,
                  folder: "some-random-parent-folder",
                  name: "bakingworld",
                  selection: "latest",
                  accessKeyReference: "ACCESS_KEY",
                  secretKeyReference: "SECRET_KEY",
                },
                {
                  type: PipelineStep.Type.decryption,
                  algorithm: "aes256",
                  keyReference: "CUSTOM_KEY",
                },
                {
                  type: PipelineStep.Type.decompression,
                  algorithm: "targzip",
                },
              ],
            };
            const result = await this.pipelineService.execute(pipeline);
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
