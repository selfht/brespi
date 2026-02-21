import { Temporal } from "@js-temporal/polyfill";
import { basename } from "path";

export class Logger {
  private readonly name: string;

  public constructor(filename: string) {
    this.name = basename(filename);
  }

  public debug = (...args: unknown[]) => {
    console.debug(this.prefix("🐞"), ...args);
  };

  public info = (...args: unknown[]) => {
    console.info(this.prefix("ℹ️"), ...args);
  };

  public warn = (...args: unknown[]) => {
    console.warn(this.prefix("⚠️"), ...args);
  };

  public error = (...args: unknown[]) => {
    console.error(this.prefix("🛑"), ...args);
  };

  private prefix = (emoji: string) => {
    const timestamp = Temporal.Now.plainDateTimeISO().toString({ smallestUnit: "second" }).replace("T", " ");
    return `${timestamp} ${emoji} ${this.name} |`;
  };
}
