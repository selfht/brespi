import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";

export class ScriptAdapter {
  public async execute(artifacts: Artifact[], options: Step.ScriptExecution): Promise<Artifact[]> {
    throw new Error("not implemented");
  }
}
