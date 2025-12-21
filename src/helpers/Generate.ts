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

  export function tmpDestination(env: Env.Private) {
    const destinationId = uniqueEpochBasedId();
    return {
      destinationId: destinationId,
      destinationPath: join(env.X_BRESPI_TMP_ROOT, destinationId),
    };
  }
}
