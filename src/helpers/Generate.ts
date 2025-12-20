import { Env } from "@/Env";
import { Temporal } from "@js-temporal/polyfill";
import { join } from "path";

export namespace Generate {
  export function shortRandomString() {
    const length = 6;
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < length; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  export function uniqueEpochBasedId() {
    return `${Temporal.Now.instant().epochMilliseconds}-${shortRandomString()}`;
  }

  export function artifactDestination(env: Env.Private) {
    const outputId = uniqueEpochBasedId();
    return {
      outputId,
      outputPath: join(env.X_BRESPI_ARTIFACT_ROOT, outputId),
    };
  }

  export function tmpDestination(env: Env.Private) {
    return join(env.X_BRESPI_TMP_ROOT, uniqueEpochBasedId());
  }
}
