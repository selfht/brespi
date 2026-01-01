import { Configuration } from "@/models/Configuration";
import { ConfigurationClient } from "../clients/ConfigurationClient";
import { Paper } from "../comps/Paper";
import { Skeleton } from "../comps/Skeleton";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useRegistry } from "../hooks/useRegistry";
import { useYesQuery } from "../hooks/useYesQuery";
import { ProblemDetails } from "@/models/ProblemDetails";
import { ErrorDump } from "../comps/ErrorDump";
import { Spinner } from "../comps/Spinner";
import { CoreConfiguration } from "@/models/CoreConfiguration";

export function configuration() {
  useDocumentTitle("Configuration | Brespi");

  const configurationClient = useRegistry(ConfigurationClient);
  const query = useYesQuery<CoreConfiguration, ProblemDetails>({
    queryFn: () =>
      configurationClient.get().then((configuration) => ({
        pipelines: configuration.pipelines,
      })),
  });

  return (
    <Skeleton>
      <Paper className="col-span-full p-6">
        {query.error ? (
          <div className="p-6 text-center">
            <ErrorDump error={query.error} />
          </div>
        ) : !query.data ? (
          <div className="p-6 text-center">
            <Spinner />
          </div>
        ) : (
          <pre>{JSON.stringify(query.data, null, 2)}</pre>
        )}
      </Paper>
    </Skeleton>
  );
}
