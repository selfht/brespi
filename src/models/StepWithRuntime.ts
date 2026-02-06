import { UnionHasProperty } from "@/types/UnionHasProperty";
import { Runtime } from "./Runtime";
import { Step } from "./Step";

export type StepWithRuntime =
  UnionHasProperty<Step, "runtime"> extends true
    ? never
    : Step & {
        runtime?: Runtime;
      };

"typecheck_to_prevent_clash_on_extra_step_property" satisfies StepWithRuntime extends never ? never : string;
