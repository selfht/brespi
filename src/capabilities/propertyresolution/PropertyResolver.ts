import { PropertyError } from "@/errors/PropertyError";
import { PropertyExtractor } from "./PropertyExtractor";

export class PropertyResolver {
  public resolve(input: string): string {
    return input.replace(PropertyExtractor.PATTERN, (_, name) => {
      const result = Bun.env[name];
      if (result === undefined) {
        throw PropertyError.variable_unresolved({ name });
      }
      return result;
    });
  }
}
