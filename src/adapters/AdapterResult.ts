import { Artifact } from "@/models/Artifact";
import { Runtime } from "@/models/Runtime";

export type AdapterResult = {
  artifacts: Artifact[];
  runtime: Runtime | null;
};

export namespace AdapterResult {
  export function create(artifacts = [] as Artifact | Artifact[], runtime = null as Runtime | null): AdapterResult {
    return {
      artifacts: Array.isArray(artifacts) ? artifacts : [artifacts],
      runtime,
    };
  }
}
