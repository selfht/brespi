import { Temporal } from "@js-temporal/polyfill";

export namespace Generate {
  const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

  export function shortRandomString() {
    const length = 6;
    let id = "";
    for (let i = 0; i < length; i++) {
      id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return id;
  }

  export function uniqueEpochBasedId() {
    return `${Temporal.Now.instant().epochMilliseconds}-${shortRandomString()}`;
  }
}
