import { Class } from "@/types/Class";
import { Server } from "./Server";

export class ServerRegistry {
  public static async bootstrap(): Promise<ServerRegistry> {
    return new ServerRegistry();
  }

  private readonly registry: Record<string, any> = {};

  private constructor() {
    this.registry[Server.name] = new Server();
  }

  public get<T>(klass: Class<T>): T {
    const result = this.registry[klass.name] as T;
    if (!result) {
      throw new Error(`No registration for ${klass.name}`);
    }
    return result;
  }
}
