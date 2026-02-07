import { PropertyReference } from "@/models/PropertyReference";

export class PropertyExtractor {
  public static readonly PATTERN = /\$\{([A-Z_][A-Z0-9_]*)\}/g;

  public static containsReference(input: string): boolean {
    return this.extractReferences(input).length > 0;
  }

  public static extractReferences(input: string): PropertyReference[] {
    const refs: PropertyReference[] = [];
    let match;
    while ((match = this.PATTERN.exec(input)) !== null) {
      refs.push({
        variable: match[1],
        variableWithBrackets: match[0],
        variableWithBracketsStartIndex: match.index,
      });
    }
    return refs;
  }
}
