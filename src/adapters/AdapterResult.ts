import { Artifact } from "@/models/Artifact";
import { Runtime } from "@/models/Runtime";

export type AdapterResult = {
  artifacts: Artifact[];
  runtime?: Runtime;
};

export namespace AdapterResult {
  export function create(artifacts = [] as Artifact | Artifact[], runtime?: Runtime): AdapterResult {
    return {
      artifacts: Array.isArray(artifacts) ? artifacts : [artifacts],
      runtime,
    };
  }
}
