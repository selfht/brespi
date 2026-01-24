import { Test } from "@/testing/Test.test";
import { Temporal } from "@js-temporal/polyfill";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { join } from "path";
import { Listing } from "./Listing";
import { Manifest } from "./Manifest";
import { ManagedStorageCapability } from "./ManagedStorageCapability";

describe(ManagedStorageCapability.name, async () => {
  const Regex = {
    RANDOM_ID: /\w+/.source,
    TIMESTAMP: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+/.source,
  };

  const env = await Test.buildEnv();
  const capability = new ManagedStorageCapability(env);

  beforeEach(async () => {
    await Test.cleanup();
  });

  afterEach(async () => {
    await Test.cleanup();
  });

  describe(capability.insert.name, () => {
    it("correctly generates the to-be-upserted manifest/listing/artifacts", async () => {
      // given
      const { filesystem, ...readWriteFns } = createReadWriteFns();
      const { options, sizesPerArtifact } = await ensureExistingBaseline({
        mutexKey: [],
        base: "hello-123-base",
        artifacts: [
          { name: "Apple.txt", path: "tmp-x/123" },
          { name: "Banana.txt", path: "tmp-x/456" },
          { name: "Coconut.txt", path: "tmp-x/789" },
        ],
        trail: [],
        ...readWriteFns,
      });

      // when
      const { insertableArtifacts } = await capability.insert(options);

      // then (validate the manifest)
      const manifest = Manifest.parse(JSON.parse(filesystem["hello-123-base/__brespi_manifest__.json"]));
      expect(manifest.items).toHaveLength(1);
      expect(manifest.items[0].version).toMatch(new RegExp(`^${Regex.TIMESTAMP}$`));
      expect(manifest.items[0].listingPath).toMatch(
        // the link between `manifest --> listing` is always relative
        new RegExp(`^${Regex.TIMESTAMP}/__brespi_listing_${Regex.RANDOM_ID}__.json$`),
      );

      // then (validate the listing)
      type ListingArtifact = Partial<Listing["artifacts"][number]>;
      const listing = Listing.parse(JSON.parse(filesystem[`hello-123-base/${manifest.items[0].listingPath}`]));
      expect(listing.artifacts).toHaveLength(3);
      expect(listing.artifacts).toEqual(
        expect.arrayContaining([
          // the link between `Index --> Artifact` is always relative
          expect.objectContaining({
            path: "Apple.txt",
            size: sizesPerArtifact.get("Apple.txt"),
          } satisfies ListingArtifact),
          expect.objectContaining({
            path: "Banana.txt",
            size: sizesPerArtifact.get("Banana.txt"),
          } satisfies ListingArtifact),
          expect.objectContaining({
            path: "Coconut.txt",
            size: sizesPerArtifact.get("Coconut.txt"),
          } satisfies ListingArtifact),
        ]),
      );

      // then (validate the artifacts)
      expect(insertableArtifacts).toHaveLength(3);
      expect(insertableArtifacts).toEqual(
        expect.arrayContaining([
          {
            name: "Apple.txt",
            path: expect.stringMatching(/tmp-x\/123$/), // in this test we have to change the relative folder
            destinationPath: expect.stringMatching(new RegExp(`^hello-123-base/${Regex.TIMESTAMP}/Apple.txt$`)),
          },
          {
            name: "Banana.txt",
            path: expect.stringMatching(/tmp-x\/456$/), // in this test we have to change the relative folder
            destinationPath: expect.stringMatching(new RegExp(`^hello-123-base/${Regex.TIMESTAMP}/Banana.txt$`)),
          },
          {
            name: "Coconut.txt",
            path: expect.stringMatching(/tmp-x\/789$/), // in this test we have to change the relative folder
            destinationPath: expect.stringMatching(new RegExp(`^hello-123-base/${Regex.TIMESTAMP}/Coconut.txt$`)),
          },
        ]),
      );
    });

    it("prepends a new listing to an existing manifest", async () => {
      for (let existingManifestSize = 0; existingManifestSize < 10; existingManifestSize++) {
        const range = Array.from({ length: existingManifestSize }, (_, i) => i);
        const { filesystem, ...readWriteFns } = createReadWriteFns();
        // given
        const existingManifest: Manifest = {
          object: "manifest",
          items: range.map((index) => ({
            version: Temporal.Now.plainDateTimeISO().toString(),
            totalSize: range.length,
            listingPath: `blabla-${index}`,
          })),
        };
        filesystem["__brespi_manifest__.json"] = JSON.stringify(existingManifest);
        // when
        await capability.insert({ mutexKey: [], artifacts: [], trail: [], base: "", ...readWriteFns });
        // then
        const updatedManifest = Manifest.parse(JSON.parse(filesystem["__brespi_manifest__.json"]));
        expect(updatedManifest.items).toHaveLength(existingManifestSize + 1);
        expect(updatedManifest.items[0]).toEqual(
          expect.objectContaining({
            listingPath: expect.stringMatching(new RegExp(`^${Regex.TIMESTAMP}/__brespi_listing_${Regex.RANDOM_ID}__.json$`)),
          } satisfies Partial<Manifest.Item>),
        );
        expect(updatedManifest.items).toEqual(
          expect.arrayContaining([
            ...range.map((index) =>
              expect.objectContaining({
                listingPath: `blabla-${index}`,
              } satisfies Partial<Manifest.Item>),
            ),
          ]),
        );
      }
    });

    const truncateCollection = Test.createCollection<{
      timestamp: string;
      expectedVersion: string;
    }>("timestamp", [
      { timestamp: "2018-01-13T15:19:36.469576466", expectedVersion: "2018-01-13T15:19:36.469" },
      { timestamp: "2019-02-13T15:25:17.673917671", expectedVersion: "2019-02-13T15:25:17.673" },
      { timestamp: "2020-03-13T15:25:49.66294966", expectedVersion: "2020-03-13T15:25:49.662" },
      { timestamp: "2021-04-13T15:26:36.915996913", expectedVersion: "2021-04-13T15:26:36.915" },
      { timestamp: "2022-05-13T15:26:00.481960477", expectedVersion: "2022-05-13T15:26:00.481" },
      { timestamp: "2023-06-13T15:26:06.490966487", expectedVersion: "2023-06-13T15:26:06.490" },
      { timestamp: "2024-07-13T15:26:11.887971885", expectedVersion: "2024-07-13T15:26:11.887" },
      { timestamp: "2025-08-13T15:26:17.5", expectedVersion: "2025-08-13T15:26:17.500" },
      { timestamp: "2026-09-13T15:26:22.113982111", expectedVersion: "2026-09-13T15:26:22.113" },
    ]);
    it.each(truncateCollection.testCases)("truncates generated timestamp into version with millisecond precision: %s", async (testCase) => {
      const { timestamp, expectedVersion } = truncateCollection.get(testCase);
      // given
      spyOn(Temporal.Now, "plainDateTimeISO").mockReturnValue(Temporal.PlainDateTime.from(timestamp));
      const { filesystem, ...readWriteFns } = createReadWriteFns();
      // when
      await capability.insert({
        mutexKey: [],
        base: "",
        artifacts: [],
        trail: [],
        ...readWriteFns,
      });
      // then
      const manifest = Manifest.parse(JSON.parse(filesystem["__brespi_manifest__.json"]));
      const [version] = manifest.items.map(({ version }) => version);
      expect(version).toEqual(expectedVersion);
    });

    const relativizeCollection = Test.createCollection<{
      base: string;
      expectation: {
        destinationPathMatcher: RegExp;
      };
    }>("base", [
      {
        base: "",
        expectation: {
          destinationPathMatcher: new RegExp(`^${Regex.TIMESTAMP}/.+`),
        },
      },
      {
        base: "backups",
        expectation: {
          destinationPathMatcher: new RegExp(`^backups/${Regex.TIMESTAMP}/.+`),
        },
      },
      {
        base: "/backups",
        expectation: {
          destinationPathMatcher: new RegExp(`^/backups/${Regex.TIMESTAMP}/.+`),
        },
      },
      {
        base: "backups/postgres",
        expectation: {
          destinationPathMatcher: new RegExp(`^backups/postgres/${Regex.TIMESTAMP}/.+`),
        },
      },
      {
        base: "/backups/postgres",
        expectation: {
          destinationPathMatcher: new RegExp(`^/backups/postgres/${Regex.TIMESTAMP}/.+`),
        },
      },
    ]);
    it.each(relativizeCollection.testCases)("relativizes generated files to base: %s", async (testCase) => {
      const { base, expectation } = relativizeCollection.get(testCase);
      // given
      const { filesystem, ...readWriteFns } = createReadWriteFns();
      const { options } = await ensureExistingBaseline({
        mutexKey: [],
        artifacts: [{ name: "Apple", path: "irrelevant" }],
        trail: [],
        base,
        ...readWriteFns,
      });
      // when
      const { insertableArtifacts } = await capability.insert(options);
      // then
      expect(insertableArtifacts).toHaveLength(1);
      expect(insertableArtifacts[0].destinationPath).toMatch(expectation.destinationPathMatcher);
    });
  });

  describe(capability.select.name, () => {
    const Timestamp = {
      _now_: Temporal.Now.plainDateTimeISO(),
      get VERY_LONG_AGO() {
        return this._now_.subtract({ days: 365000 }).toString();
      },
      get LAST_YEAR() {
        return this._now_.subtract({ days: 365 }).toString();
      },
      get PRESENT() {
        return this._now_.toString();
      },
      get NEXT_YEAR() {
        return this._now_.add({ days: 365 }).toString();
      },
      get VERY_FAR_AWAY() {
        return this._now_.add({ days: 365000 }).toString();
      },
    };

    it("selects the latest item from the manifest", async () => {
      // given
      const { filesystem, ...readWriteFns } = createReadWriteFns();
      persistInFilesystem({
        filesystem,
        listingArtifacts: ["file1.txt", "file2.txt"],
        manifest: {
          object: "manifest",
          items: [
            {
              version: Timestamp.LAST_YEAR,
              totalSize: 1,
              listingPath: `${Timestamp.LAST_YEAR}/__brespi_listing__.json`,
            },
            {
              version: Timestamp.PRESENT,
              totalSize: 1,
              listingPath: `${Timestamp.PRESENT}/__brespi_listing__.json`,
            },
            {
              version: Timestamp.VERY_LONG_AGO,
              totalSize: 1,
              listingPath: `${Timestamp.VERY_LONG_AGO}/__brespi_listing__.json`,
            },
          ],
        },
      });
      // when
      const { resolvedVersion, selectableArtifacts } = await capability.select({
        mutexKey: [],
        base: "",
        configuration: {
          target: "latest",
        },
        ...readWriteFns,
      });
      // then
      expect(resolvedVersion).toEqual(`${Timestamp.PRESENT}`);
      expect(selectableArtifacts).toHaveLength(2);
      expect(selectableArtifacts).toEqual(
        expect.arrayContaining([
          { name: "file1.txt", path: `${Timestamp.PRESENT}/file1.txt` },
          { name: "file2.txt", path: `${Timestamp.PRESENT}/file2.txt` },
        ]),
      );
    });

    it("selects a specific item by 'isoTimestamp'", async () => {
      // given
      const { filesystem, ...readWriteFns } = createReadWriteFns();
      persistInFilesystem({
        base: "bbbase",
        filesystem,
        listingArtifacts: ["specific-file.txt"],
        manifest: {
          object: "manifest",
          items: [
            {
              version: Timestamp.LAST_YEAR,
              totalSize: 1,
              listingPath: `${Timestamp.LAST_YEAR}/__brespi_listing__.json`,
            },
            {
              version: Timestamp.PRESENT,
              totalSize: 1,
              listingPath: `${Timestamp.PRESENT}/__brespi_listing__.json`,
            },
          ],
        },
      });
      // when
      const { resolvedVersion, selectableArtifacts } = await capability.select({
        mutexKey: [],
        base: "bbbase",
        configuration: {
          target: "specific",
          version: Timestamp.LAST_YEAR,
        },
        ...readWriteFns,
      });
      // then
      expect(resolvedVersion).toEqual(`${Timestamp.LAST_YEAR}`);
      expect(selectableArtifacts).toHaveLength(1);
      expect(selectableArtifacts).toEqual([
        {
          name: "specific-file.txt",
          path: `bbbase/${Timestamp.LAST_YEAR}/specific-file.txt`,
        },
      ]);
    });

    it("selects a specific item by 'dirname'", async () => {
      // given
      const { filesystem, ...readWriteFns } = createReadWriteFns();
      persistInFilesystem({
        base: "storage",
        filesystem,
        listingArtifacts: ["doc1.pdf", "doc2.pdf", "doc3.pdf"],
        manifest: {
          object: "manifest",
          items: [
            {
              version: Timestamp.VERY_LONG_AGO,
              totalSize: 1,
              listingPath: `${Timestamp.VERY_LONG_AGO}/__brespi_listing__.json`,
            },
            {
              version: Timestamp.LAST_YEAR,
              totalSize: 1,
              listingPath: `${Timestamp.LAST_YEAR}/__brespi_listing__.json`,
            },
            {
              version: Timestamp.PRESENT,
              totalSize: 1,
              listingPath: `${Timestamp.PRESENT}/__brespi_listing__.json`,
            },
          ],
        },
      });
      // when
      const { resolvedVersion, selectableArtifacts } = await capability.select({
        mutexKey: [],
        base: "storage",
        configuration: {
          target: "specific",
          version: `${Timestamp.VERY_LONG_AGO}`,
        },
        ...readWriteFns,
      });
      // then
      expect(resolvedVersion).toEqual(`${Timestamp.VERY_LONG_AGO}`);
      expect(selectableArtifacts).toHaveLength(3);
      expect(selectableArtifacts).toEqual([
        { name: "doc1.pdf", path: `storage/${Timestamp.VERY_LONG_AGO}/doc1.pdf` },
        { name: "doc2.pdf", path: `storage/${Timestamp.VERY_LONG_AGO}/doc2.pdf` },
        { name: "doc3.pdf", path: `storage/${Timestamp.VERY_LONG_AGO}/doc3.pdf` },
      ]);
    });

    it("throws an error when selecting the latest from an empty manifest", async () => {
      // given
      const { filesystem, ...readWriteFns } = createReadWriteFns();
      persistInFilesystem({
        filesystem,
        listingArtifacts: [],
        manifest: Manifest.empty(),
      });
      // when
      const action = () =>
        capability.select({
          mutexKey: [],
          base: "",
          configuration: {
            target: "latest",
          },
          ...readWriteFns,
        });
      // then
      expect(action()).rejects.toThrow(
        expect.objectContaining({
          problem: "ExecutionError::managed_storage_manifest_empty",
        }),
      );
    });

    it("throws an error when a specific version cannot be found", async () => {
      // given
      const { filesystem, ...readWriteFns } = createReadWriteFns();
      persistInFilesystem({
        filesystem,
        listingArtifacts: ["Apple.txt"],
        manifest: {
          object: "manifest",
          items: [
            {
              version: Timestamp.LAST_YEAR,
              totalSize: 1,
              listingPath: "path1/__brespi_listing__.json",
            },
          ],
        },
      });
      // when
      const action = () =>
        capability.select({
          mutexKey: [],
          base: "",
          configuration: {
            target: "specific",
            version: Timestamp.VERY_FAR_AWAY,
          },
          ...readWriteFns,
        });
      // then
      expect(action()).rejects.toThrow(
        expect.objectContaining({
          problem: "ExecutionError::managed_storage_version_not_found",
        }),
      );
    });

    it("throws an error when multiple items match the specific version", async () => {
      // given
      const { filesystem, ...readWriteFns } = createReadWriteFns();
      persistInFilesystem({
        filesystem,
        listingArtifacts: ["Apple.txt"],
        manifest: {
          object: "manifest",
          items: [
            {
              version: Timestamp.LAST_YEAR,
              totalSize: 1,
              listingPath: "path1/__brespi_listing__.json",
            },
            {
              version: Timestamp.LAST_YEAR,
              totalSize: 1,
              listingPath: "path2/__brespi_listing__.json",
            },
          ],
        },
      });
      // when
      const action = () =>
        capability.select({
          mutexKey: [],
          base: "",
          configuration: {
            target: "specific",
            version: Timestamp.LAST_YEAR,
          },
          ...readWriteFns,
        });
      // then
      expect(action()).rejects.toThrow(
        expect.objectContaining({
          problem: "ExecutionError::managed_storage_version_not_uniquely_identified",
        }),
      );
    });

    const collection = Test.createCollection<{
      base: string;
      manifest: {
        singleListingPath: string;
      };
      expectation: {
        listingPathPrefix: string;
      };
    }>("base", [
      {
        base: "",
        manifest: {
          singleListingPath: `${Timestamp.PRESENT}/__brespi_listing__.json`,
        },
        expectation: {
          listingPathPrefix: `${Timestamp.PRESENT}`,
        },
      },
      {
        base: "backups",
        manifest: {
          singleListingPath: `${Timestamp.PRESENT}/__brespi_listing__.json`,
        },
        expectation: {
          listingPathPrefix: `backups/${Timestamp.PRESENT}`,
        },
      },
      {
        base: "/backups",
        manifest: {
          singleListingPath: `${Timestamp.PRESENT}/__brespi_listing__.json`,
        },
        expectation: {
          listingPathPrefix: `/backups/${Timestamp.PRESENT}`,
        },
      },
      {
        base: "backups/postgres",
        manifest: {
          singleListingPath: `${Timestamp.PRESENT}/__brespi_listing__.json`,
        },
        expectation: {
          listingPathPrefix: `backups/postgres/${Timestamp.PRESENT}`,
        },
      },
      {
        base: "/backups/postgres",
        manifest: {
          singleListingPath: `${Timestamp.PRESENT}/__brespi_listing__.json`,
        },
        expectation: {
          listingPathPrefix: `/backups/postgres/${Timestamp.PRESENT}`,
        },
      },
    ]);
    it.each(collection.testCases)("relativizes selected artifacts to base prefix: %s", async (testCase) => {
      const {
        base,
        manifest: { singleListingPath },
        expectation,
      } = collection.get(testCase);
      // given
      const { filesystem, ...readWriteFns } = createReadWriteFns();
      persistInFilesystem({
        base,
        filesystem,
        listingArtifacts: ["test-file.txt"],
        manifest: {
          object: "manifest",
          items: [
            {
              version: Timestamp.PRESENT,
              totalSize: 1,
              listingPath: singleListingPath,
            },
          ],
        },
      });
      // when
      const { selectableArtifacts } = await capability.select({
        mutexKey: [],
        base,
        configuration: { target: "latest" },
        ...readWriteFns,
      });
      // then
      expect(selectableArtifacts).toHaveLength(1);
      expect(selectableArtifacts[0].path).toEqual(`${expectation.listingPathPrefix}/test-file.txt`);
      expect(selectableArtifacts[0].name).toEqual("test-file.txt");
    });
  });

  function createReadWriteFns(): ManagedStorageCapability.ReadWriteFns & { filesystem: Record<string, string> } {
    const filesystem: Record<string, string> = {};
    return {
      filesystem,
      async readFn(path) {
        return filesystem[path];
      },
      async writeFn({ path, content }) {
        filesystem[path] = content;
      },
    };
  }

  async function ensureExistingBaseline(
    options: ManagedStorageCapability.InsertOptions,
  ): Promise<{ options: ManagedStorageCapability.InsertOptions; sizesPerArtifact: Map<string, number> }> {
    const { scratchpad } = await Test.getScratchpad();
    const rewrittenArtifacts: typeof options.artifacts = [];
    const sizesPerArtifact = new Map<string, number>();
    for (const { path, name } of options.artifacts) {
      const newPath = join(scratchpad, path);
      const file = Bun.file(newPath);
      await file.write(name);
      if (await file.exists()) {
        rewrittenArtifacts.push({ path: newPath, name });
        sizesPerArtifact.set(name, file.size);
      } else {
        throw new Error("Illegal state!!!");
      }
    }
    return {
      options: {
        ...options,
        artifacts: rewrittenArtifacts,
      },
      sizesPerArtifact,
    };
  }

  type PersistInFilesystemOptions = {
    base?: string;
    filesystem: Record<string, string>;
    listingArtifacts: string[];
    manifest: Manifest;
  };
  function persistInFilesystem({ base = "", filesystem, listingArtifacts, manifest }: PersistInFilesystemOptions) {
    filesystem[join(base, "__brespi_manifest__.json")] = JSON.stringify(manifest);
    manifest.items.forEach(({ listingPath }) => {
      const listing: Listing = {
        object: "listing",
        artifacts: listingArtifacts.map((path) => ({
          path,
          size: 1,
        })),
        trail: [],
        brespi: {
          commit: env.O_BRESPI_COMMIT,
          version: env.O_BRESPI_VERSION,
        },
      };
      filesystem[join(base, listingPath)] = JSON.stringify(listing);
    });
  }
});
