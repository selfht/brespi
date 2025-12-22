import { Env } from "@/Env";
import { ProblemDetails } from "@/models/ProblemDetails";
import { Class } from "@/types/Class";
import { QueryClient } from "@tanstack/react-query";
import { createContext } from "react";
import { Yesttp } from "yesttp";
import { ExecutionClient } from "./clients/ExecutionClient";
import { PipelineClient } from "./clients/PipelineClient";
import { SocketClient } from "./clients/SocketClient";
import { StepClient } from "./clients/StepClient.ts";

export class ClientRegistry {
  /**
   * There's always this catch-42 where you need the configuration URL in order to get the configuration.
   * With Bun, there's no build step, though, so we can always assume frontend + backend are served from the same domain.
   *
   * In other frameworks, we'd have to use a build-time variable containing the configuration URL.
   */
  public static async bootstrap(): Promise<ClientRegistry> {
    const { body: env } = await new Yesttp({ baseUrl: "/api" }).get<Env.Public>("/env");
    console.table(env);
    return new ClientRegistry(env);
  }

  private readonly registry: Record<string, any> = {};

  public constructor(private readonly env: Env.Public) {
    const yesttp = (this.registry[Yesttp.name] = new Yesttp({
      baseUrl: "/api",
      responseErrorIntercepter: (request, response): Promise<ProblemDetails> => {
        return Promise.reject(response?.body);
      },
    }));
    this.registry[SocketClient.name] = new SocketClient();
    this.registry[StepClient.name] = new StepClient(yesttp);
    this.registry[PipelineClient.name] = new PipelineClient(yesttp);
    this.registry[PipelineClient.name] = new PipelineClient(yesttp);
    this.registry[ExecutionClient.name] = new ExecutionClient(yesttp);
    this.registry[QueryClient.name] = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  }

  public getEnv() {
    return this.env;
  }

  public get<T>(klass: Class<T>): T {
    const result = this.registry[klass.name] as T;
    if (!result) {
      throw new Error(`No registration for ${klass.name}`);
    }
    return result;
  }
}

export namespace ClientRegistry {
  export const Context = createContext({} as ClientRegistry);
}
