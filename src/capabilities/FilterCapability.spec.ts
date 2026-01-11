import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { describe, expect, it } from "bun:test";
import { FilterCapability } from "./FilterCapability";
import { Test } from "@/testing/Test.spec";

describe(FilterCapability.name, () => {
  const capability = new FilterCapability();

  describe("exact filtering", () => {
    const collection = Test.createCollection<{
      description: string;
      artifacts: string[];
      name: string;
      expectation: string[];
    }>("description", [
      {
        description: "matches exact name",
        artifacts: ["backup-db", "backup-files", "backup-db-copy"],
        name: "backup-db",
        expectation: ["backup-db"],
      },
      {
        description: "returns empty array when no exact match",
        artifacts: ["backup-db", "backup-files"],
        name: "not-found",
        expectation: [],
      },
      {
        description: "matches multiple artifacts with the same name",
        artifacts: ["backup", "backup", "restore"],
        name: "backup",
        expectation: ["backup", "backup"],
      },
    ]);
    it.each(collection.testCases)("%s", async (testCase) => {
      const { artifacts, name, expectation } = collection.get(testCase);
      // when
      const filtered = applyFilter(artifacts, {
        method: "exact",
        name,
      });
      // then
      expect(filtered).toEqual(expectation);
    });
  });

  describe("glob filtering", () => {
    const collection = Test.createCollection<{
      pattern: string;
      artifacts: string[];
      expectation: string[];
    }>("pattern", [
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
    ]);
    it.each(collection.testCases)("matches: %s", async (testCase) => {
      const { artifacts, pattern, expectation } = collection.get(testCase);
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
    const collection = Test.createCollection<{
      description: string;
      artifacts: string[];
      nameRegex: string;
      expectation: string[];
    }>("description", [
      {
        description: "matches with simple regex",
        artifacts: ["backup-01", "backup-02", "restore-01"],
        nameRegex: "^backup-\\d+$",
        expectation: ["backup-01", "backup-02"],
      },
      {
        description: "matches with complex regex",
        artifacts: ["file-2024-01-01.tar", "file-2024-12-31.tar", "file-invalid.tar"],
        nameRegex: "^file-\\d{4}-\\d{2}-\\d{2}\\.tar$",
        expectation: ["file-2024-01-01.tar", "file-2024-12-31.tar"],
      },
      {
        description: "case-sensitive by default",
        artifacts: ["Backup", "backup", "BACKUP"],
        nameRegex: "^backup$",
        expectation: ["backup"],
      },
      {
        description: "partial match without anchors",
        artifacts: ["backup-db", "db-backup", "restore"],
        nameRegex: "backup",
        expectation: ["backup-db", "db-backup"],
      },
    ]);
    it.each(collection.testCases)("%s", async (testCase) => {
      const { artifacts, nameRegex, expectation } = collection.get(testCase);
      // when
      const filtered = applyFilter(artifacts, {
        method: "regex",
        nameRegex,
      });
      // then
      expect(filtered).toEqual(expectation);
    });
  });

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
});
