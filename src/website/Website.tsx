import { useEffect, useState } from "react";
import { createBrowserRouter, replace, RouterProvider } from "react-router";
import { ClientRegistry } from "./ClientRegistry";
import { SocketClient } from "./clients/SocketClient";
import { configuration } from "./pages/configuration";
import { pipelines } from "./pages/pipelines";
import { pipelines_$id } from "./pages/pipelines.$id";
import { schedules } from "./pages/schedules";
import { settings } from "./pages/settings";

const router = createBrowserRouter([
  {
    path: "pipelines",
    Component: pipelines,
  },
  {
    path: "pipelines/:id",
    Component: pipelines_$id,
  },
  {
    path: "schedules",
    Component: schedules,
  },
  {
    path: "settings",
    Component: settings,
  },
  {
    path: "configuration",
    Component: configuration,
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
      registry.get(SocketClient).initialize();
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
