import { Temporal } from "@js-temporal/polyfill";

export namespace Prettify {
  export function timestamp(value: Temporal.PlainDateTime): string {
    const month = String(value.month).padStart(2, "0");
    const day = String(value.day).padStart(2, "0");
    const year = value.year;

    const hours = String(value.hour).padStart(2, "0");
    const minutes = String(value.minute).padStart(2, "0");
    const seconds = String(value.second).padStart(2, "0");

    return `${year}-${month}-${day} at ${hours}:${minutes}:${seconds}`;
  }

  export function duration(value: Temporal.Duration): string {
    const parts: string[] = [];
    const days = Math.floor(value.total("days"));
    const hours = Math.floor(value.total("hours")) % 24;
    const minutes = Math.floor(value.total("minutes")) % 60;
    const seconds = Math.floor(value.total("seconds")) % 60;
    const milliSeconds = Math.floor(value.total("milliseconds")) % 1000;

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    if ((seconds < 10 && milliSeconds > 0) || parts.length === 0) parts.push(`${milliSeconds}ms`);

    return parts.join(" ");
  }
}
