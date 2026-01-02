import { Artifact } from "@/models/Artifact";
import { Json } from "@/types/Json";

export type AdapterResult = {
  artifacts: Artifact[];
  runtime: Record<string, Json> | null;
};

export namespace AdapterResult {
  export function create(artifacts = [] as Artifact[], runtime = null as AdapterResult["runtime"]): AdapterResult {
    return {
      artifacts,
      runtime,
    };
  }
}
