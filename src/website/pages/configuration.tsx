import { Configuration } from "@/models/Configuration";
import { ProblemDetails } from "@/models/ProblemDetails";
import { ConfigurationClient } from "../clients/ConfigurationClient";
import { ErrorDump } from "../comps/ErrorDump";
import { Paper } from "../comps/Paper";
import { Skeleton } from "../comps/Skeleton";
import { Spinner } from "../comps/Spinner";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useRegistry } from "../hooks/useRegistry";
import { useYesQuery } from "../hooks/useYesQuery";

export function configuration() {
  useDocumentTitle("Configuration | Brespi");

  const configurationClient = useRegistry(ConfigurationClient);
  const query = useYesQuery<Configuration.Core, ProblemDetails>({
    queryFn: () => configurationClient.get("core"),
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
