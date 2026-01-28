import { useState } from "react";
import { ConfigurationClient } from "../clients/ConfigurationClient";
import { Button } from "../comps/Button";
import { ErrorDump } from "../comps/ErrorDump";
import { JsonPreview } from "../comps/JsonPreview";
import { Paper } from "../comps/Paper";
import { Skeleton } from "../comps/Skeleton";
import { Spinner } from "../comps/Spinner";
import { useConfiguration } from "../hooks/useConfiguration";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useRegistry } from "../hooks/useRegistry";

export function configurationPage() {
  useDocumentTitle("Configuration | Brespi");
  const query = useConfiguration();
  const client = useRegistry(ConfigurationClient);
  const { O_BRESPI_CONFIGURATION } = useRegistry("env");

  const [busy, setBusy] = useState(false);
  const handleChanges = async (operation: "save" | "discard") => {
    try {
      setBusy(true);
      if (operation === "save") {
        await client.saveChanges();
      } else if (operation === "discard") {
        await client.discardChanges();
      } else {
        throw new Error(`Unknown operation: ${operation}`);
      }
    } finally {
      setBusy(false);
    }
  };
  const copyToClipboard = async () => {
    if (query.data) {
      const json = JSON.stringify(query.data.coreConfiguration);
      await navigator.clipboard.writeText(json);
    }
  };
  return (
    <Skeleton>
      <Paper className="col-span-full p-6">
        {query.error ? (
          <div className="p-6">
            <ErrorDump error={query.error} />
          </div>
        ) : !query.data ? (
          <div className="p-6 text-center">
            <Spinner />
          </div>
        ) : query.data.synchronized ? (
          <div>
            <div className="flex justify-between items-center">
              <p>
                The current configuration matches <code className="text-white">{O_BRESPI_CONFIGURATION}</code>
              </p>
              <Button theme="info" onClick={copyToClipboard}>
                Copy current configuration
              </Button>
            </div>
            <JsonPreview className="mt-2" data={query.data.coreConfiguration} maxLines={8} />
          </div>
        ) : (
          <div>
            <p>
              The current configuration (below) has <span className="text-white font-bold">unsaved changes</span> and doesn't match{" "}
              <code className="text-white text-sm p-2 bg-black/20 rounded-lg text-shadow-lg ">{O_BRESPI_CONFIGURATION}</code>.
            </p>
            <p>Restarting Brespi discards these unsaved changes.</p>
            <div className="mt-12 flex gap-2">
              <Button theme="success" disabled={busy} onClick={() => handleChanges("save")}>
                Save changes
              </Button>
              <Button theme="error" disabled={busy} onClick={() => handleChanges("discard")}>
                Discard changes
              </Button>
              <Button theme="info" className="ml-auto" onClick={copyToClipboard}>
                Copy current configuration
              </Button>
            </div>
            <JsonPreview className="mt-2" data={query.data.coreConfiguration} maxLines={8} />
          </div>
        )}
      </Paper>
    </Skeleton>
  );
}
