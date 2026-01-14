import { Configuration } from "@/models/Configuration";
import { ServerMessage } from "@/socket/ServerMessage";
import { Socket } from "@/socket/Socket";
import { ConfigurationRepository } from "@/repositories/ConfigurationRepository";

export class ConfigurationService {
  private readonly sockets: Socket[] = [];

  public constructor(private readonly repository: ConfigurationRepository) {
    repository.subscribe("synchronization_change", (configuration) => this.notifySockets(configuration));
  }

  public registerSocket = (socket: Socket) => {
    this.sockets.push(socket);
  };

  public unregisterSocket = (socket: Socket) => {
    const index = this.sockets.findIndex((s) => s.data.clientId === socket.data.clientId);
    if (index >= 0) {
      this.sockets.splice(index, 1);
    }
  };

  private notifySockets = (configuration: Configuration) => {
    const message: ServerMessage = {
      type: ServerMessage.Type.configuration_update,
      configuration,
    };
    this.sockets.forEach((socket) => socket.send(JSON.stringify(message)));
  };

  public get(): Promise<Configuration> {
    return this.repository.read((config) => config);
  }
}
