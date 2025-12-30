import { Env } from "@/Env";
import { FilterCapability } from "@/capabilities/FilterCapability";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { AbstractAdapter } from "../AbstractAdapter";

export class FilterAdapter extends AbstractAdapter {
  public constructor(
    protected readonly env: Env.Private,
    private readonly filterCapability: FilterCapability,
  ) {
    super(env);
  }

  public async filter(artifacts: Artifact[], { filterCriteria }: Step.Filter): Promise<Artifact[]> {
    const { predicate } = this.filterCapability.createPredicate(filterCriteria);
    return artifacts.filter(predicate);
  }
}
