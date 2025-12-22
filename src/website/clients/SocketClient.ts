import { Generate } from "@/helpers/Generate";
import { ServerMessage } from "@/models/socket/ServerMessage";

export class SocketClient {
  private readonly callbacks: Record<ServerMessage.Type, Record<string, (message: ServerMessage) => void>> = {
    [ServerMessage.Type.execution_update]: {},
  };
  private readonly latestMessages: Partial<Record<ServerMessage.Type, ServerMessage>> = {};

  public initialize() {
    new WebSocket("/socket").addEventListener("message", ({ data }) => {
      const message = ServerMessage.parse(JSON.parse(data));
      Object.values(this.callbacks[message.type]).forEach((callback) => callback(message));
      this.latestMessages[message.type] = message;
    });
  }

  public subscribe = <T extends ServerMessage.Type>(type: T, callback: (message: Extract<ServerMessage, { type: T }>) => void): string => {
    const id = `CB${Generate.shortRandomString()}`;
    this.callbacks[type as ServerMessage.Type][id] = (message) => {
      callback(message as Extract<ServerMessage, { type: T }>);
    };
    const latestMessage = this.latestMessages[type];
    if (latestMessage) {
      callback(latestMessage as Extract<ServerMessage, { type: T }>);
    }
    return id;
  };

  public unsubscribe = (id: string): void => {
    Object.values(this.callbacks).forEach((category) => {
      if (category[id]) {
        delete category[id];
      }
    });
  };
}
