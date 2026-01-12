import { Env } from "@/Env";
import { FilterCapability } from "@/capabilities/filter/FilterCapability";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { AbstractAdapter } from "../AbstractAdapter";
import { AdapterResult } from "../AdapterResult";

export class FilterAdapter extends AbstractAdapter {
  public constructor(
    protected readonly env: Env.Private,
    private readonly filterCapability: FilterCapability,
  ) {
    super(env);
  }

  public async filter(artifacts: Artifact[], { filterCriteria }: Step.Filter): Promise<AdapterResult> {
    const { predicate } = this.filterCapability.createPredicate(filterCriteria);
    return AdapterResult.create(artifacts.filter(predicate));
  }
}
