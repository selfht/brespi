import { useEffect, useState } from "react";
import { createBrowserRouter, replace, RouterProvider } from "react-router";
import { ClientRegistry } from "./ClientRegistry";
import { SocketClient } from "./clients/SocketClient";
import { configurationPage } from "./pages/configuration.page";
import { notificationsPage } from "./pages/notifications.page";
import { pipelinesPage } from "./pages/pipelines.page";
import { pipelines$idPage } from "./pages/pipelines.$id.page";
import { schedulesPage } from "./pages/schedules.page";

const router = createBrowserRouter([
  {
    path: "pipelines",
    Component: pipelinesPage,
  },
  {
    path: "pipelines/:id",
    Component: pipelines$idPage,
  },
  {
    path: "schedules",
    Component: schedulesPage,
  },
  {
    path: "notifications",
    Component: notificationsPage,
  },
  {
    path: "configuration",
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
      </ClientRegistry.Context.Provider>
    );
  }
  return null;
}
