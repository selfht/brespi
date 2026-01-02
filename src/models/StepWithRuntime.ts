import { Json } from "@/types/Json";
import { Step } from "./Step";
import { UnionHasProperty } from "@/types/UnionHasProperty";

export type StepWithRuntime =
  UnionHasProperty<Step, "runtime"> extends true
    ? never
    : Step & {
        runtime: Record<string, Json> | null;
      };

"typecheck_to_prevent_clash_on_extra_step_property" satisfies StepWithRuntime extends never ? never : string;
