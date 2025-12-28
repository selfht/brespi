import { describe, it, expect } from "bun:test";
import { S3Manifest } from "./S3Manifest";
import { Temporal } from "@js-temporal/polyfill";

describe("S3Manifest", () => {
  describe("Upload", () => {
    it("sorts from new to old", () => {
      // given
      const uploads: S3Manifest.Upload[] = [
        {
          path: "now",
          isoTimestamp: Temporal.Now.plainDateTimeISO().toString(),
        },
        {
          path: "past",
          isoTimestamp: Temporal.Now.plainDateTimeISO().subtract({ days: 100 }).toString(),
        },
        {
          path: "future",
          isoTimestamp: Temporal.Now.plainDateTimeISO().add({ days: 100 }).toString(),
        },
      ];
      // when
      uploads.sort(S3Manifest.Upload.sort);
      // then
      const paths = uploads.map(({ path }) => path);
      expect(paths).toEqual(["future", "now", "past"]);
    });
  });
});
