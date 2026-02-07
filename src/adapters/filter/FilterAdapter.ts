import { Env } from "@/Env";
import { FilterCapability } from "@/capabilities/filter/FilterCapability";
import { PropertyResolver } from "@/capabilities/propertyresolution/PropertyResolver";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { AbstractAdapter } from "../AbstractAdapter";
import { AdapterResult } from "../AdapterResult";

export class FilterAdapter extends AbstractAdapter {
  public constructor(
    protected readonly env: Env.Private,
    protected readonly propertyResolver: PropertyResolver,
    private readonly filterCapability: FilterCapability,
  ) {
    super(env, propertyResolver);
  }

  public async filter(artifacts: Artifact[], { filterCriteria }: Step.Filter): Promise<AdapterResult> {
    // Resolve strings in filter criteria
    const resolvedCriteria: Step.FilterCriteria =
      filterCriteria.method === "exact"
        ? { method: "exact", name: this.resolveString(filterCriteria.name) }
        : filterCriteria.method === "glob"
          ? { method: "glob", nameGlob: this.resolveString(filterCriteria.nameGlob) }
          : { method: "regex", nameRegex: this.resolveString(filterCriteria.nameRegex) };

    const { predicate } = this.filterCapability.createPredicate(resolvedCriteria);
    return AdapterResult.create(artifacts.filter(predicate));
  }
}
