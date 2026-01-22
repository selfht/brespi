import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "bun:test";
import { Manifest } from "./Manifest";

describe("Manifest", () => {
  describe("Item", () => {
    it("sorts from new to old", () => {
      // given
      const uploads: Manifest.Item[] = [
        {
          listingPath: "now",
          totalSize: 1,
          version: Temporal.Now.plainDateTimeISO().toString(),
        },
        {
          listingPath: "past",
          totalSize: 1,
          version: Temporal.Now.plainDateTimeISO().subtract({ days: 100 }).toString(),
        },
        {
          listingPath: "future",
          totalSize: 1,
          version: Temporal.Now.plainDateTimeISO().add({ days: 100 }).toString(),
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
