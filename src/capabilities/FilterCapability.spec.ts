import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { describe, expect, it } from "bun:test";
import { FilterCapability } from "./FilterCapability";

describe(FilterCapability.name, () => {
  const capability = new FilterCapability();

  function applyFilter(artifacts: string[], criteria: Step.FilterCriteria): string[] {
    const actualArtifacts = artifacts.map<Artifact>((name) => ({
      id: `${Math.random()}`,
      type: "file",
      name,
      path: "does/not/matter",
      size: 10,
    }));
    const { predicate } = capability.createPredicate(criteria);
    return actualArtifacts.filter(predicate).map(({ name }) => name);
  }

  describe("exact filtering", () => {
    it("matches exact name", () => {
      // given
      const artifacts = ["backup-db", "backup-files", "backup-db-copy"];
      // when
      const filtered = applyFilter(artifacts, {
        method: "exact",
        name: "backup-db",
      });
      // then
      expect(filtered).toEqual(["backup-db"]);
    });

    it("returns empty array when no exact match", async () => {
      // given
      const artifacts = ["backup-db", "backup-files"];
      // when
      const filtered = applyFilter(artifacts, {
        method: "exact",
        name: "not-found",
      });
      // then
      expect(filtered).toEqual([]);
    });

    it("matches multiple artifacts with same name", async () => {
      // given
      const artifacts = ["backup", "backup", "restore"];
      // when
      const filtered = applyFilter(artifacts, {
        method: "exact",
        name: "backup",
      });
      // then
      expect(filtered).toHaveLength(2);
    });
  });

  describe("glob filtering", () => {
    type GlobTestCase = {
      pattern: string;
      artifacts: string[];
      expectation: string[];
    };
    it.each<GlobTestCase>([
      // Simple tests
      { pattern: "*ll*", artifacts: ["hello", "goodbye"], expectation: ["hello"] },
      { pattern: "*e*", artifacts: ["hello", "goodbye"], expectation: ["hello", "goodbye"] },

      // Match all
      { pattern: "*", artifacts: ["hello", "world", "foo"], expectation: ["hello", "world", "foo"] },

      // Prefix matching
      { pattern: "backup-*", artifacts: ["backup-db", "backup-files", "restore-db"], expectation: ["backup-db", "backup-files"] },
      { pattern: "test*", artifacts: ["test", "testing", "tests", "mytest"], expectation: ["test", "testing", "tests"] },

      // Suffix matching
      { pattern: "*.tar", artifacts: ["backup.tar", "data.tar.gz", "file.zip"], expectation: ["backup.tar"] },
      { pattern: "*-prod", artifacts: ["db-prod", "api-prod", "db-dev"], expectation: ["db-prod", "api-prod"] },

      // Single character wildcard (?)
      { pattern: "file?.txt", artifacts: ["file1.txt", "file2.txt", "file10.txt", "file.txt"], expectation: ["file1.txt", "file2.txt"] },
      {
        pattern: "log-??.txt",
        artifacts: ["log-01.txt", "log-02.txt", "log-123.txt", "log-1.txt"],
        expectation: ["log-01.txt", "log-02.txt"],
      },

      // Multiple wildcards
      {
        pattern: "*backup*db*",
        artifacts: ["backup-db", "my-backup-db-file", "db-backup", "backup"],
        expectation: ["backup-db", "my-backup-db-file"],
      },
      {
        pattern: "test-*-prod",
        artifacts: ["test-api-prod", "test-db-prod", "test-api-dev"],
        expectation: ["test-api-prod", "test-db-prod"],
      },

      // No matches
      { pattern: "xyz*", artifacts: ["abc", "def", "ghi"], expectation: [] },
      { pattern: "*xyz", artifacts: ["abc", "def", "ghi"], expectation: [] },

      // Exact match (no wildcards)
      { pattern: "exact-name", artifacts: ["exact-name", "exact-names", "inexact-name"], expectation: ["exact-name"] },

      // Special characters that should be escaped
      { pattern: "file.*.txt", artifacts: ["file.backup.txt", "fileastxt", "file.txt"], expectation: ["file.backup.txt"] },
      { pattern: "data[1].json", artifacts: ["data[1].json", "data1.json"], expectation: ["data[1].json"] },

      // Edge cases
      { pattern: "", artifacts: ["", "something"], expectation: [""] },
      { pattern: "???", artifacts: ["abc", "ab", "abcd"], expectation: ["abc"] },
    ])("glob: '$pattern' with $names", async ({ pattern, artifacts, expectation }) => {
      // when
      const filtered = applyFilter(artifacts, {
        method: "glob",
        nameGlob: pattern,
      });
      // then
      expect(filtered).toEqual(expectation);
    });
  });

  describe("regex filtering", () => {
    it("matches with simple regex", async () => {
      // given
      const artifacts = ["backup-01", "backup-02", "restore-01"];
      // when
      const filtered = applyFilter(artifacts, {
        method: "regex",
        nameRegex: "^backup-\\d+$",
      });
      // then
      expect(filtered).toEqual(["backup-01", "backup-02"]);
    });

    it("matches with complex regex", async () => {
      // given
      const artifacts = ["file-2024-01-01.tar", "file-2024-12-31.tar", "file-invalid.tar"];
      // when
      const filtered = applyFilter(artifacts, {
        method: "regex",
        nameRegex: "^file-\\d{4}-\\d{2}-\\d{2}\\.tar$",
      });
      // then
      expect(filtered).toEqual(["file-2024-01-01.tar", "file-2024-12-31.tar"]);
    });

    it("case-sensitive by default", async () => {
      // given
      const artifacts = ["Backup", "backup", "BACKUP"];
      // when
      const filtered = applyFilter(artifacts, {
        method: "regex",
        nameRegex: "^backup$",
      });
      // then
      expect(filtered).toEqual(["backup"]);
    });

    it("partial match without anchors", async () => {
      // given
      const artifacts = ["backup-db", "db-backup", "restore"];
      // when
      const filtered = applyFilter(artifacts, {
        method: "regex",
        nameRegex: "backup",
      });
      // then
      expect(filtered).toEqual(["backup-db", "db-backup"]);
    });
  });
});
