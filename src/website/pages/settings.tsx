import { Paper } from "../comps/Paper";
import { Skeleton } from "../comps/Skeleton";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export function settings() {
  useDocumentTitle("Settings | Brespi");
  return (
    <Skeleton>
      <Paper className="col-span-full p-6">Welcome to the Settings</Paper>
    </Skeleton>
  );
}
