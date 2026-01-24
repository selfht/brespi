import { ErrorDump } from "../comps/ErrorDump";
import { Paper } from "../comps/Paper";
import { Skeleton } from "../comps/Skeleton";
import { Spinner } from "../comps/Spinner";
import { useConfiguration } from "../hooks/useConfiguration";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export function configuration() {
  useDocumentTitle("Configuration | Brespi");
  const query = useConfiguration();
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
        ) : (
          <pre>{JSON.stringify(query.data.coreConfiguration, null, 2)}</pre>
        )}
      </Paper>
    </Skeleton>
  );
}
