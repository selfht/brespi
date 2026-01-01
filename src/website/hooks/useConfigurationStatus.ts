import { ServerMessage } from "@/models/socket/ServerMessage";
import { useEffect, useState } from "react";
import { ConfigurationClient } from "../clients/ConfigurationClient";
import { SocketClient } from "../clients/SocketClient";
import { useRegistry } from "./useRegistry";

type Result = {
  synchronized: boolean;
};
export function useConfigurationStatus(): Result {
  const [synchronized, setSynchronized] = useState(true);

  const socketClient = useRegistry(SocketClient);
  const configurationClient = useRegistry(ConfigurationClient);
  useEffect(() => {
    configurationClient.get().then(({ synchronized }) => setSynchronized(synchronized));
    const token = socketClient.subscribe({
      type: ServerMessage.Type.configuration_update,
      callback: ({ configuration: { synchronized } }) => setSynchronized(synchronized),
    });
    return () => socketClient.unsubscribe(token);
  }, []);

  return { synchronized };
}
