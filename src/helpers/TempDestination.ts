import { Env } from "@/Env";
import { join } from "path";
import { Generate } from "./Generate";

export namespace TempDestination {
  export function create(env: Pick<Env.Private, "X_BRESPI_TMP_ROOT">) {
    const destinationId = Generate.uniqueEpochBasedId();
    return {
      destinationId: destinationId,
      destinationPath: join(env.X_BRESPI_TMP_ROOT, destinationId),
    };
  }
}
