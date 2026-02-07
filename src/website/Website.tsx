import { useEffect, useState } from "react";
import { createBrowserRouter, replace, RouterProvider } from "react-router";
import { ClientRegistry } from "./ClientRegistry";
import { DialogClient } from "./clients/DialogClient";
import { SocketClient } from "./clients/SocketClient";
import { DialogManager } from "./comps/DialogManager";
import { configurationPage } from "./pages/configuration.page";
import { notificationsPage } from "./pages/notifications.page";
import { pipelines$idPage } from "./pages/pipelines.$id.page";
import { pipelinesPage } from "./pages/pipelines.page";
import { schedulesPage } from "./pages/schedules.page";
import { Route } from "./Route";

const router = createBrowserRouter([
  {
    path: Route.pipelines(),
    Component: pipelinesPage,
  },
  {
    path: Route.pipelines(":id"),
    Component: pipelines$idPage,
  },
  {
    path: Route.schedules(),
    Component: schedulesPage,
  },
  {
    path: Route.notifications(),
    Component: notificationsPage,
  },
  {
    path: Route.configuration(),
    Component: configurationPage,
  },
  {
    path: "*",
    loader: () => replace("/pipelines"),
  },
]);

export function Website() {
  const [clientRegistry, setClientRegistry] = useState<ClientRegistry>();
  useEffect(() => {
    ClientRegistry.bootstrap().then((registry) => {
      setClientRegistry(registry);
      registry.get(SocketClient).connect();
    });
  }, []);
  if (clientRegistry) {
    return (
      <ClientRegistry.Context.Provider value={clientRegistry}>
        <RouterProvider router={router} />
        <DialogManager ref={(m) => clientRegistry.get(DialogClient).initialize(m)} />
      </ClientRegistry.Context.Provider>
    );
  }
  return null;
}
