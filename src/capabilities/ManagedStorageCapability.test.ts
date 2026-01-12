import { Test } from "@/testing/Test.test";
import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "bun:test";
import { join } from "path";
import { Listing } from "./managedstorage/Listing";
import { Manifest } from "./managedstorage/Manifest";
import { ManagedStorageCapability } from "./ManagedStorageCapability";

describe(ManagedStorageCapability.name, () => {
  const Regex = {
    RANDOM_ID: /\w+/.source,
    TIMESTAMP: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+/.source,
  };

  const capability = new ManagedStorageCapability();

  describe(capability.insert.name, () => {
    it("correctly generates the to-be-upserted manifest/listing/artifacts", async () => {
      // given
      const { filesystem, ...readWriteFns } = createReadWriteFns();
      const options: ManagedStorageCapability.InsertOptions = {
        mutexKey: [],
        base: "hello-123-base",
        artifacts: [
          { name: "Apple.txt", path: "/tmp-x/123" },
          { name: "Banana.txt", path: "/tmp-x/456" },
          { name: "Coconut.txt", path: "/tmp-x/789" },
        ],
        trail: [],
        ...readWriteFns,
      };

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
      const listing = Listing.parse(JSON.parse(filesystem[`hello-123-base/${manifest.items[0].listingPath}`]));
      expect(listing.artifacts).toHaveLength(3);
      expect(listing.artifacts).toEqual(
        expect.arrayContaining([
          // the link between `Index --> Artifact` is always relative
          expect.objectContaining({ path: "Apple.txt" } satisfies Partial<Listing["artifacts"][number]>),
          expect.objectContaining({ path: "Banana.txt" } satisfies Partial<Listing["artifacts"][number]>),
          expect.objectContaining({ path: "Coconut.txt" } satisfies Partial<Listing["artifacts"][number]>),
        ]),
      );

      // then (validate the artifacts)
      expect(insertableArtifacts).toHaveLength(3);
      expect(insertableArtifacts).toEqual(
        expect.arrayContaining([
          {
            name: "Apple.txt",
            path: "/tmp-x/123",
            destinationPath: expect.stringMatching(new RegExp(`^hello-123-base/${Regex.TIMESTAMP}/Apple.txt$`)),
          },
          {
            name: "Banana.txt",
            path: "/tmp-x/456",
            destinationPath: expect.stringMatching(new RegExp(`^hello-123-base/${Regex.TIMESTAMP}/Banana.txt$`)),
          },
          {
            name: "Coconut.txt",
            path: "/tmp-x/789",
            destinationPath: expect.stringMatching(new RegExp(`^hello-123-base/${Regex.TIMESTAMP}/Coconut.txt$`)),
          },
        ]),
      );
    });

    it("appends a new listing to an existing manifest", async () => {
      for (let existingManifestSize = 0; existingManifestSize < 10; existingManifestSize++) {
        const range = Array.from({ length: existingManifestSize }, (_, i) => i);
        const { filesystem, ...readWriteFns } = createReadWriteFns();
        // given
        const existingManifest: Manifest = {
          object: "manifest",
          items: range.map((index) => ({
            version: Temporal.Now.plainDateTimeISO().toString(),
            listingPath: `blabla-${index}`,
          })),
        };
        filesystem["__brespi_manifest__.json"] = JSON.stringify(existingManifest);
        // when
        await capability.insert({ mutexKey: [], artifacts: [], trail: [], base: "", ...readWriteFns });
        // then
        const updatedManifest = Manifest.parse(JSON.parse(filesystem["__brespi_manifest__.json"]));
        expect(updatedManifest.items).toHaveLength(existingManifestSize + 1);
        expect(updatedManifest.items).toEqual(
          expect.arrayContaining([
            ...range.map((index) =>
              expect.objectContaining({
                listingPath: `blabla-${index}`,
              } satisfies Partial<Manifest.Item>),
            ),
            expect.objectContaining({
              listingPath: expect.stringMatching(new RegExp(`^${Regex.TIMESTAMP}/__brespi_listing_${Regex.RANDOM_ID}__.json$`)),
            } satisfies Partial<Manifest.Item>),
          ]),
        );
      }
    });

    const collection = Test.createCollection<{
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
    it.each(collection.testCases)("relativizes generated files to base: %s", async (testCase) => {
      const { base, expectation } = collection.get(testCase);
      // given
      const { filesystem, ...readWriteFns } = createReadWriteFns();
      const options: ManagedStorageCapability.InsertOptions = {
        mutexKey: [],
        artifacts: [{ name: "Apple", path: "irrelevant" }],
        trail: [],
        base,
        ...readWriteFns,
      };
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
              listingPath: `${Timestamp.LAST_YEAR}/__brespi_listing__.json`,
            },
            {
              version: Timestamp.PRESENT,
              listingPath: `${Timestamp.PRESENT}/__brespi_listing__.json`,
            },
            {
              version: Timestamp.VERY_LONG_AGO,
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
              listingPath: `${Timestamp.LAST_YEAR}/__brespi_listing__.json`,
            },
            {
              version: Timestamp.PRESENT,
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
              listingPath: `${Timestamp.VERY_LONG_AGO}/__brespi_listing__.json`,
            },
            {
              version: Timestamp.LAST_YEAR,
              listingPath: `${Timestamp.LAST_YEAR}/__brespi_listing__.json`,
            },
            {
              version: Timestamp.PRESENT,
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
              listingPath: "path1/__brespi_listing__.json",
            },
            {
              version: Timestamp.LAST_YEAR,
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
          singleListingPath: `${Timestamp.PRESENT}-abc/__brespi_listing__.json`,
        },
        expectation: {
          listingPathPrefix: `${Timestamp.PRESENT}-abc`,
        },
      },
      {
        base: "backups",
        manifest: {
          singleListingPath: `${Timestamp.PRESENT}-abc/__brespi_listing__.json`,
        },
        expectation: {
          listingPathPrefix: `backups/${Timestamp.PRESENT}-abc`,
        },
      },
      {
        base: "/backups",
        manifest: {
          singleListingPath: `${Timestamp.PRESENT}-abc/__brespi_listing__.json`,
        },
        expectation: {
          listingPathPrefix: `/backups/${Timestamp.PRESENT}-abc`,
        },
      },
      {
        base: "backups/postgres",
        manifest: {
          singleListingPath: `${Timestamp.PRESENT}-abc/__brespi_listing__.json`,
        },
        expectation: {
          listingPathPrefix: `backups/postgres/${Timestamp.PRESENT}-abc`,
        },
      },
      {
        base: "/backups/postgres",
        manifest: {
          singleListingPath: `${Timestamp.PRESENT}-abc/__brespi_listing__.json`,
        },
        expectation: {
          listingPathPrefix: `/backups/postgres/${Timestamp.PRESENT}-abc`,
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

  type PersistInFilesystemOptions = {
    base?: string;
    filesystem: Record<string, string>;
    listingArtifacts: string[];
    manifest: Manifest;
  };
  function persistInFilesystem({ base = "", filesystem, listingArtifacts, manifest }: PersistInFilesystemOptions) {
    filesystem[join(base, "__brespi_manifest__.json")] = JSON.stringify(manifest);
    manifest.items.forEach(({ listingPath }) => {
      const emptyListing: Listing = {
        object: "listing",
        artifacts: listingArtifacts.map((path) => ({
          path,
          trail: [],
        })),
      };
      filesystem[join(base, listingPath)] = JSON.stringify(emptyListing);
    });
  }
});
