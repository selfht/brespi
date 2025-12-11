import { Step } from "@/models/Step";
import { Yesttp } from "yesttp";

export class StepClient {
  public constructor(private readonly yesttp: Yesttp) {}

  public async validate(step: Step): Promise<void> {
    await this.yesttp.post("/steps/validate", {
      body: step,
    });
  }
}
