import { Env } from "@/Env";
import { ProblemDetails } from "@/models/ProblemDetails";
import { Class } from "@/types/Class";
import { createContext } from "react";
import { Yesttp } from "yesttp";
import { ConfigurationClient } from "./clients/ConfigurationClient";
import { ExecutionClient } from "./clients/ExecutionClient";
import { PipelineClient } from "./clients/PipelineClient";
import { RestrictedClient } from "./clients/RestrictedClient";
import { ScheduleClient } from "./clients/ScheduleClient";
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
    this.printEnv(env);
    return new ClientRegistry(env);
  }

  private static printEnv(env: Env.Public) {
    if (Object.entries(env).length > 0) {
      const longestKey = Object.keys(env)
        .map((k) => k.length)
        .reduce((l1, l2) => Math.max(l1, l2));
      let result = ``;
      Object.entries(env).forEach(([key, value]) => {
        result += `${key.padEnd(longestKey + 1)}: ${value}\n`;
      });
      console.log("%cBrespi\n\n%c%s", "font-size: 24px; font-weight: 800;", "font-size: 12px; font-weight: normal", result);
    }
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
    this.registry[ScheduleClient.name] = new ScheduleClient(yesttp);
    this.registry[ExecutionClient.name] = new ExecutionClient(yesttp);
    this.registry[ConfigurationClient.name] = new ConfigurationClient(yesttp);
    this.registry[RestrictedClient.name] = new RestrictedClient(yesttp);
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
