import { EventBus } from "@/events/EventBus";
import { Configuration } from "@/models/Configuration";
import { ConfigurationRepository } from "@/repositories/ConfigurationRepository";
import { ServerMessage } from "@/socket/ServerMessage";
import { Socket } from "@/socket/Socket";

export class ConfigurationService {
  private readonly sockets: Socket[] = [];

  public constructor(
    private readonly repository: ConfigurationRepository,
    eventBus: EventBus,
  ) {
    repository.subscribe("synchronization_change", ({ configuration }) => {
      this.notifySockets(configuration);
    });
    repository.subscribe("configuration_change", ({ configuration, origin }) => {
      eventBus.publish({
        type: "configuration_updated",
        data: {
          origin,
          configuration,
        },
      });
    });
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

  public saveChanges(): Promise<Configuration> {
    return this.repository.saveChanges();
  }

  public discardChanges(): Promise<Configuration> {
    return this.repository.discardChanges();
  }
}
