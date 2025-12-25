import { Generate } from "@/helpers/Generate";
import { ServerMessage } from "@/models/socket/ServerMessage";

type Subscription = {
  id: string;
  type: ServerMessage.Type;
  callback: (message: ServerMessage) => unknown;
};

export class SocketClient {
  private readonly subscriptions: Subscription[] = [];
  private readonly pauseBuffers: Map<string, ServerMessage[]> = new Map();
  private readonly latestMessages: Partial<Record<ServerMessage.Type, ServerMessage>> = {};
  private socket: WebSocket | null = null;

  public connect() {
    this.socket = new WebSocket("/socket");
    this.socket.addEventListener("message", ({ data }) => {
      const message = ServerMessage.parse(JSON.parse(data));
      this.latestMessages[message.type] = message;
      this.deliverMessage(message);
    });
    this.socket.addEventListener("close", () => {
      setTimeout(() => this.connect(), 100);
    });
    this.socket.addEventListener("error", () => {
      this.socket?.close();
    });
  }

  public subscribe = <T extends ServerMessage.Type>({
    type,
    callback,
    replayLatestMessage = false,
  }: SocketClient.SubscribeOptions<T>): string => {
    const subscription = {
      id: `CB${Generate.shortRandomString()}`,
      type,
      callback: callback as Subscription["callback"],
    };
    this.subscriptions.push(subscription);
    if (replayLatestMessage) {
      const latestMessage = this.latestMessages[type];
      if (latestMessage) {
        this.deliverMessage(latestMessage, subscription);
      }
    }
    return subscription.id;
  };

  public unsubscribe = (id: string): void => {
    const index = this.subscriptions.findIndex((sub) => sub.id === id);
    if (index >= 0) {
      this.subscriptions.splice(index, 1);
    }
    this.pauseBuffers.delete(id);
  };

  public pauseAndBuffer(id: string): void {
    this.pauseBuffers.set(id, []);
  }

  public continueAndDrain(id: string): void {
    const bufferedMessages = this.pauseBuffers.get(id);
    if (bufferedMessages) {
      const subscription = this.subscriptions.find((sub) => sub.id === id);
      if (subscription) {
        setTimeout(() => {
          bufferedMessages.forEach((message) => this.deliverMessage(message, subscription));
        });
      }
      this.pauseBuffers.delete(id);
    }
  }

  private deliverMessage(message: ServerMessage, specificSubscription?: Subscription) {
    const deliveryTargets: Subscription[] = specificSubscription
      ? [specificSubscription]
      : this.subscriptions.filter(({ type }) => type === message.type);
    deliveryTargets.forEach(({ id, callback }) => {
      const buffer = this.pauseBuffers.get(id);
      if (buffer) {
        buffer.push(message);
      } else {
        callback(message);
      }
    });
  }
}

export namespace SocketClient {
  export type SubscribeOptions<T extends ServerMessage.Type> = {
    type: T;
    callback(message: Extract<ServerMessage, { type: T }>): unknown;
    replayLatestMessage?: boolean;
  };
}
