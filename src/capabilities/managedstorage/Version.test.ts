import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "bun:test";
import { Version } from "./Version";

describe("Temporal.Instant (behavior verification)", () => {
  it("parses offset timestamps into absolute instants", () => {
    // Same physical moment: 09:15 in New York (-04:00) = 13:15 in UTC
    const a = Temporal.Instant.from("2025-07-10T09:15:00.000-04:00");
    const b = Temporal.Instant.from("2025-07-10T13:15:00.000+00:00");
    expect(a.equals(b)).toEqual(true);
  });

  it("compares by absolute time, not wall-clock time", () => {
    // 09:15-04:00 = 13:15Z (earlier)
    // 14:00+00:00 = 14:00Z (later)
    const result = Temporal.Instant.compare(
      Temporal.Instant.from("2025-07-10T09:15:00.000-04:00"),
      Temporal.Instant.from("2025-07-10T14:00:00.000+00:00"),
    );
    expect(result).toBeLessThan(0);
  });

  it("rejects strings without an offset", () => {
    expect(() => Temporal.Instant.from("2025-07-10T09:15:00.000")).toThrow();
  });
});

describe(Version.now.name, () => {
  const truncateCases: Array<{
    timestamp: string;
    expectedVersion: string;
  }> = [
    { timestamp: "2018-01-13T15:19:36.469576466+00:00[UTC]", expectedVersion: "2018-01-13T15:19:36.469+00:00" },
    { timestamp: "2019-02-13T15:25:17.673917671+00:00[UTC]", expectedVersion: "2019-02-13T15:25:17.673+00:00" },
    { timestamp: "2020-03-13T15:25:49.66294966+00:00[UTC]", expectedVersion: "2020-03-13T15:25:49.662+00:00" },
    { timestamp: "2021-04-13T15:26:36.915996913+00:00[UTC]", expectedVersion: "2021-04-13T15:26:36.915+00:00" },
    { timestamp: "2022-05-13T15:26:00.481960477+00:00[UTC]", expectedVersion: "2022-05-13T15:26:00.481+00:00" },
    { timestamp: "2023-06-13T15:26:06.490966487+00:00[UTC]", expectedVersion: "2023-06-13T15:26:06.490+00:00" },
    { timestamp: "2024-07-13T15:26:11.887971885+00:00[UTC]", expectedVersion: "2024-07-13T15:26:11.887+00:00" },
    { timestamp: "2025-08-13T15:26:17.5+00:00[UTC]", expectedVersion: "2025-08-13T15:26:17.500+00:00" },
    { timestamp: "2026-09-13T15:26:22.113982111+00:00[UTC]", expectedVersion: "2026-09-13T15:26:22.113+00:00" },
    { timestamp: "2025-07-10T09:15:00.200123456-04:00[America/New_York]", expectedVersion: "2025-07-10T09:15:00.200-04:00" },
  ];
  for (const { timestamp, expectedVersion } of truncateCases) {
    it(`truncates to millisecond precision: ${timestamp}`, () => {
      // Simulate what Version.now does: given a ZonedDateTime, format as offset-only with 3 fractional digits
      const zdt = Temporal.ZonedDateTime.from(timestamp);
      const result = `${zdt.toPlainDateTime().toString({ fractionalSecondDigits: 3 })}${zdt.offset}`;
      expect(result).toEqual(expectedVersion);
    });
  }

  it("produces offset-only format without timezone brackets", () => {
    const result = Version.now("UTC");
    expect(result).not.toContain("[");
    expect(result).not.toContain("]");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
  });
});

describe(Version.compare.name, () => {
  it("returns negative when a is before b", () => {
    expect(Version.compare("2025-01-01T00:00:00.000+00:00", "2025-06-01T00:00:00.000+00:00")).toBeLessThan(0);
  });

  it("returns positive when a is after b", () => {
    expect(Version.compare("2025-06-01T00:00:00.000+00:00", "2025-01-01T00:00:00.000+00:00")).toBeGreaterThan(0);
  });

  it("returns zero for equal timestamps", () => {
    expect(Version.compare("2025-01-01T00:00:00.000+00:00", "2025-01-01T00:00:00.000+00:00")).toEqual(0);
  });

  it("compares correctly across offsets", () => {
    // 10:15-04:00 = 14:15Z (later than 14:00Z)
    expect(Version.compare("2025-07-10T10:15:00.000-04:00", "2025-07-10T14:00:00.000+00:00")).toBeGreaterThan(0);
  });
});

describe(Version.isValid.name, () => {
  it("accepts valid offset timestamps", () => {
    expect(Version.isValid("2025-01-01T00:00:00.000+00:00")).toEqual(true);
    expect(Version.isValid("2025-07-10T09:15:00.200-04:00")).toEqual(true);
    expect(Version.isValid("2025-11-25T22:45:00.300+09:00")).toEqual(true);
  });

  it("accepts legacy bracket format for backwards compatibility", () => {
    expect(Version.isValid("2025-01-01T00:00:00.000+00:00[UTC]")).toEqual(true);
    expect(Version.isValid("2025-07-10T09:15:00.200-04:00[America/New_York]")).toEqual(true);
  });

  it("rejects invalid strings", () => {
    expect(Version.isValid("not-a-timestamp")).toEqual(false);
    expect(Version.isValid("2025-01-01")).toEqual(false);
    expect(Version.isValid("")).toEqual(false);
  });
});
