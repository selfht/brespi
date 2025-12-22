import { Artifact } from "@/models/Artifact";
import { Json } from "@/types/Json";

export type AdapterResult = {
  artifacts: Artifact[];
  runtimeInformation: Record<string, Json> | null;
};

export namespace AdapterResult {
  export function create(artifacts = [] as Artifact[], runtimeInformation = null as AdapterResult["runtimeInformation"]): AdapterResult {
    return {
      artifacts,
      runtimeInformation,
    };
  }
}
