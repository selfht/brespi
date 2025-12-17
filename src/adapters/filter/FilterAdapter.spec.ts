import { describe, it, expect } from "bun:test";
import { FilterAdapter } from "./FilterAdapter";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";

describe(FilterAdapter.name, () => {
  const adapter = new FilterAdapter();

  describe("exact filtering", () => {
    it("matches exact name", async () => {
      // given
      const artifacts = createArtifacts(["backup-db", "backup-files", "backup-db-copy"]);
      // when
      const filtered = await adapter.filter(artifacts, {
        id: "test",
        type: Step.Type.filter,
        previousId: null,
        selection: {
          method: "exact",
          name: "backup-db",
        },
      });
      // then
      expect(filtered.map((a) => a.name)).toEqual(["backup-db"]);
    });

    it("returns empty array when no exact match", async () => {
      // given
      const artifacts = createArtifacts(["backup-db", "backup-files"]);
      // when
      const filtered = await adapter.filter(artifacts, {
        id: "test",
        type: Step.Type.filter,
        previousId: null,
        selection: {
          method: "exact",
          name: "not-found",
        },
      });
      // then
      expect(filtered).toEqual([]);
    });

    it("matches multiple artifacts with same name", async () => {
      // given
      const artifacts = createArtifacts(["backup", "backup", "restore"]);
      // when
      const filtered = await adapter.filter(artifacts, {
        id: "test",
        type: Step.Type.filter,
        previousId: null,
        selection: {
          method: "exact",
          name: "backup",
        },
      });
      // then
      expect(filtered).toHaveLength(2);
    });
  });

  describe("glob filtering", () => {
    type GlobTestCase = {
      pattern: string;
      names: string[];
      expectation: string[];
    };
    it.each<GlobTestCase>([
      // Simple tests
      { pattern: "*ll*", names: ["hello", "goodbye"], expectation: ["hello"] },
      { pattern: "*e*", names: ["hello", "goodbye"], expectation: ["hello", "goodbye"] },

      // Match all
      { pattern: "*", names: ["hello", "world", "foo"], expectation: ["hello", "world", "foo"] },

      // Prefix matching
      { pattern: "backup-*", names: ["backup-db", "backup-files", "restore-db"], expectation: ["backup-db", "backup-files"] },
      { pattern: "test*", names: ["test", "testing", "tests", "mytest"], expectation: ["test", "testing", "tests"] },

      // Suffix matching
      { pattern: "*.tar", names: ["backup.tar", "data.tar.gz", "file.zip"], expectation: ["backup.tar"] },
      { pattern: "*-prod", names: ["db-prod", "api-prod", "db-dev"], expectation: ["db-prod", "api-prod"] },

      // Single character wildcard (?)
      { pattern: "file?.txt", names: ["file1.txt", "file2.txt", "file10.txt", "file.txt"], expectation: ["file1.txt", "file2.txt"] },
      { pattern: "log-??.txt", names: ["log-01.txt", "log-02.txt", "log-123.txt", "log-1.txt"], expectation: ["log-01.txt", "log-02.txt"] },

      // Multiple wildcards
      {
        pattern: "*backup*db*",
        names: ["backup-db", "my-backup-db-file", "db-backup", "backup"],
        expectation: ["backup-db", "my-backup-db-file"],
      },
      { pattern: "test-*-prod", names: ["test-api-prod", "test-db-prod", "test-api-dev"], expectation: ["test-api-prod", "test-db-prod"] },

      // No matches
      { pattern: "xyz*", names: ["abc", "def", "ghi"], expectation: [] },
      { pattern: "*xyz", names: ["abc", "def", "ghi"], expectation: [] },

      // Exact match (no wildcards)
      { pattern: "exact-name", names: ["exact-name", "exact-names", "inexact-name"], expectation: ["exact-name"] },

      // Special characters that should be escaped
      { pattern: "file.*.txt", names: ["file.backup.txt", "fileastxt", "file.txt"], expectation: ["file.backup.txt"] },
      { pattern: "data[1].json", names: ["data[1].json", "data1.json"], expectation: ["data[1].json"] },

      // Edge cases
      { pattern: "", names: ["", "something"], expectation: [""] },
      { pattern: "???", names: ["abc", "ab", "abcd"], expectation: ["abc"] },
    ])("glob: '$pattern' with $names", async ({ pattern, names, expectation }) => {
      // given
      const artifacts = createArtifacts(names);
      // when
      const filteredNames = await adapter
        .filter(artifacts, {
          id: `${Math.random()}`,
          type: Step.Type.filter,
          previousId: null,
          selection: {
            method: "glob",
            nameGlob: pattern,
          },
        })
        .then((artifacts) => artifacts.map(({ name }) => name));
      // then
      expect(filteredNames).toEqual(expectation);
    });
  });

  describe("regex filtering", () => {
    it("matches with simple regex", async () => {
      // given
      const artifacts = createArtifacts(["backup-01", "backup-02", "restore-01"]);
      // when
      const filtered = await adapter.filter(artifacts, {
        id: "test",
        type: Step.Type.filter,
        previousId: null,
        selection: {
          method: "regex",
          nameRegex: "^backup-\\d+$",
        },
      });
      // then
      expect(filtered.map((a) => a.name)).toEqual(["backup-01", "backup-02"]);
    });

    it("matches with complex regex", async () => {
      // given
      const artifacts = createArtifacts(["file-2024-01-01.tar", "file-2024-12-31.tar", "file-invalid.tar"]);
      // when
      const filtered = await adapter.filter(artifacts, {
        id: "test",
        type: Step.Type.filter,
        previousId: null,
        selection: {
          method: "regex",
          nameRegex: "^file-\\d{4}-\\d{2}-\\d{2}\\.tar$",
        },
      });
      // then
      expect(filtered.map((a) => a.name)).toEqual(["file-2024-01-01.tar", "file-2024-12-31.tar"]);
    });

    it("case-sensitive by default", async () => {
      // given
      const artifacts = createArtifacts(["Backup", "backup", "BACKUP"]);
      // when
      const filtered = await adapter.filter(artifacts, {
        id: "test",
        type: Step.Type.filter,
        previousId: null,
        selection: {
          method: "regex",
          nameRegex: "^backup$",
        },
      });
      // then
      expect(filtered.map((a) => a.name)).toEqual(["backup"]);
    });

    it("partial match without anchors", async () => {
      // given
      const artifacts = createArtifacts(["backup-db", "db-backup", "restore"]);
      // when
      const filtered = await adapter.filter(artifacts, {
        id: "test",
        type: Step.Type.filter,
        previousId: null,
        selection: {
          method: "regex",
          nameRegex: "backup",
        },
      });
      // then
      expect(filtered.map((a) => a.name)).toEqual(["backup-db", "db-backup"]);
    });
  });

  function createArtifacts(names: string[]) {
    return names.map<Artifact>((name) => ({
      id: `${Math.random()}`,
      type: "file",
      name,
      path: "does/not/matter",
      size: 10,
    }));
  }
});
