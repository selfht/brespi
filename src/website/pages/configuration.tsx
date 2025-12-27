import { Paper } from "../comps/Paper";
import { Skeleton } from "../comps/Skeleton";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export function configuration() {
  useDocumentTitle("Configuration | Brespi");
  return (
    <Skeleton>
      <Paper className="col-span-full p-6">Welcome to the Configuration</Paper>
    </Skeleton>
  );
}
