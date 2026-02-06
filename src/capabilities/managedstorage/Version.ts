import { Temporal } from "@js-temporal/polyfill";

export namespace Version {
  export function now(timezone: string): string {
    const zdt = Temporal.Now.zonedDateTimeISO(timezone);
    return `${zdt.toPlainDateTime().toString({ fractionalSecondDigits: 3 })}${zdt.offset}`;
  }

  export function compare(a: string, b: string): number {
    return Temporal.Instant.compare(Temporal.Instant.from(a), Temporal.Instant.from(b));
  }

  export function isValid(version: string): boolean {
    try {
      Temporal.Instant.from(version);
      return true;
    } catch {
      return false;
    }
  }
}
