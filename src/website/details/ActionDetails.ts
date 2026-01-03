import { Prettify } from "@/helpers/Prettify";
import { Action } from "@/models/Action";
import { Outcome } from "@/models/Outcome";
import { Block } from "../canvas/Block";

export namespace ActionDetails {
  export function get(action: Action): Block.Details | null {
    const result: Block.Details = {};
    if (action.startedAt) {
      result["Started"] = Prettify.timestamp(action.startedAt);
      if (action.result) {
        result["Completed"] = Prettify.timestamp(action.result.completedAt);
        result["Duration"] = Prettify.duration(action.result.duration);
        switch (action.result.outcome) {
          case Outcome.success: {
            const maxLength = 10;
            for (const category of ["consumed", "produced"] as const) {
              const artifacts = action.result[category].slice(0, maxLength).map(({ name }) => name);
              const artifactsRemainder = Math.min(0, action.result[category].length - maxLength);
              if (artifactsRemainder > 0) {
                artifacts.push(`+${artifactsRemainder}`);
              }
              const capitalizedCategory = `${category[0].toUpperCase()}${category.slice(1)}`;
              result[capitalizedCategory] = artifacts.length > 0 ? artifacts : { custom: "empty_array" };
            }
            break;
          }
          case Outcome.error: {
            result["Error"] = action.result.errorMessage;
            break;
          }
        }
      }
    }
    return Object.entries(result).length > 0 ? result : null;
  }
}
