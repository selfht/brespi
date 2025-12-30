import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";

type Options = Step.FilterCriteria;
type Result = {
  predicate: (artifactLike: { name: string }) => boolean;
};
export class FilterCapability {
  public createPredicate(options: Options): Result {
    switch (options.method) {
      case "exact":
        return {
          predicate: (artifact) => artifact.name === options.name,
        };
      case "glob":
        const globPattern = this.globToRegex(options.nameGlob);
        return {
          predicate: (artifact) => globPattern.test(artifact.name),
        };
      case "regex":
        const regex = new RegExp(options.nameRegex);
        return {
          predicate: (artifact) => regex.test(artifact.name),
        };
    }
  }

  private globToRegex(pattern: string): RegExp {
    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    return new RegExp(`^${regexPattern}$`);
  }
}
