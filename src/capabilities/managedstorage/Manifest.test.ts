import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "bun:test";
import { Manifest } from "./Manifest";
import { Version } from "./Version";

describe("Manifest", () => {
  const stripBrackets = (zdt: Temporal.ZonedDateTime) => zdt.toString().replace(/\[.*\]$/, "");

  describe("Item", () => {
    it("sorts from new to old", () => {
      // given
      const uploads: Manifest.Item[] = [
        {
          listingPath: "now",
          totalSize: 1,
          version: Version.now("UTC"),
        },
        {
          listingPath: "past",
          totalSize: 1,
          version: stripBrackets(Temporal.Now.zonedDateTimeISO("UTC").subtract({ days: 100 })),
        },
        {
          listingPath: "future",
          totalSize: 1,
          version: stripBrackets(Temporal.Now.zonedDateTimeISO("UTC").add({ days: 100 })),
        },
      ];
      // when
      uploads.sort(Manifest.Item.sort);
      // then
      const paths = uploads.map(({ listingPath: path }) => path);
      expect(paths).toEqual(["future", "now", "past"]);
    });
  });
});
