import { ServerMessage } from "@/socket/ServerMessage";
import { useEffect, useState } from "react";
import { ConfigurationClient } from "../clients/ConfigurationClient";
import { SocketClient } from "../clients/SocketClient";
import { useRegistry } from "./useRegistry";
import { useYesQuery } from "./useYesQuery";
import { ProblemDetails } from "@/models/ProblemDetails";
import { Configuration } from "@/models/Configuration";

type Result = {
  synchronized: boolean;
  coreConfiguration: Configuration.Core;
};
function split({ synchronized, ...coreConfiguration }: Configuration): Result {
  return {
    synchronized,
    coreConfiguration: Configuration.Core.parse(coreConfiguration),
  };
}
export function useConfiguration(): useYesQuery.Result<Result, ProblemDetails> {
  const socketClient = useRegistry(SocketClient);
  const configurationClient = useRegistry(ConfigurationClient);
  const query = useYesQuery<Result, ProblemDetails>({
    queryFn: () => configurationClient.get().then(split),
  });
  useEffect(() => {
    const token = socketClient.subscribe({
      type: ServerMessage.Type.configuration_update,
      callback: ({ configuration }) => query.setData(split(configuration)),
    });
    return () => socketClient.unsubscribe(token);
  }, []);
  return query;
}
