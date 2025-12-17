import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";

export class FilterAdapter {
  public async filter(artifacts: Artifact[], options: Step.Filter): Promise<Artifact[]> {
    const { selection } = options;
    switch (selection.method) {
      case "exact":
        return artifacts.filter((artifact) => artifact.name === selection.name);
      case "glob":
        const globPattern = this.globToRegex(selection.nameGlob);
        return artifacts.filter((artifact) => globPattern.test(artifact.name));
      case "regex":
        const regex = new RegExp(selection.nameRegex);
        return artifacts.filter((artifact) => regex.test(artifact.name));
    }
  }

  /**
   * TODO: test!
   */
  private globToRegex(pattern: string): RegExp {
    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");

    return new RegExp(`^${regexPattern}$`);
  }
}
