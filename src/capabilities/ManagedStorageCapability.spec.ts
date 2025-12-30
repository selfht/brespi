import { Manifest } from "@/models/versioning/Manifest";
import { describe, expect, it } from "bun:test";
import { ArtifactIndex } from "@/models/versioning/ArtifactIndex";
import { Temporal } from "@js-temporal/polyfill";
import { ManagedStorageCapability } from "./ManagedStorageCapability";

describe(ManagedStorageCapability.name, () => {
  const Regex = {
    RANDOM_ID: /\w+/.source,
    TIMESTAMP: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+/.source,
    get TIMESTAMP_FOLDER() {
      return new RegExp(`${this.TIMESTAMP}-${this.RANDOM_ID}`).source;
    },
  };

  const capability = new ManagedStorageCapability();

  describe(capability.prepareInsertion.name, () => {
    it("correctly generates the to-be-upserted manifest/index/artifacts", () => {
      // given
      const options: ManagedStorageCapability.PrepareInsertionOptions = {
        baseFolder: "hello-123-base",
        artifacts: [
          { name: "Apple.txt", path: "/tmp-x/123" },
          { name: "Banana.txt", path: "/tmp-x/456" },
          { name: "Coconut.txt", path: "/tmp-x/789" },
        ],
        trail: [],
      };

      // when
      const { manifestModifier, artifactIndex, insertableArtifacts } = capability.prepareInsertion(options);
      const manifest = manifestModifier({ manifest: Manifest.empty() });

      // then (validate the manifest)
      expect(manifest.items).toHaveLength(1);
      expect(manifest.items[0].isoTimestamp).toMatch(new RegExp(`^${Regex.TIMESTAMP}$`));
      expect(manifest.items[0].artifactIndexPath).toMatch(
        // the link between `Manifest --> Index` is always relative
        new RegExp(`^${Regex.TIMESTAMP_FOLDER}/__brespi_artifact_index_${Regex.RANDOM_ID}__.json$`),
      );

      // then (validate the index)
      expect(artifactIndex.destinationPath).toEqual(`hello-123-base/${manifest.items[0].artifactIndexPath}`);
      expect(artifactIndex.content.artifacts).toHaveLength(3);
      expect(artifactIndex.content.artifacts).toEqual(
        expect.arrayContaining([
          // the link between `Index --> Artifact` is always relative
          expect.objectContaining({ path: "Apple.txt" } satisfies Partial<ArtifactIndex["artifacts"][number]>),
          expect.objectContaining({ path: "Banana.txt" } satisfies Partial<ArtifactIndex["artifacts"][number]>),
          expect.objectContaining({ path: "Coconut.txt" } satisfies Partial<ArtifactIndex["artifacts"][number]>),
        ]),
      );

      // then (validate the artifacts)
      expect(insertableArtifacts).toHaveLength(3);
      expect(insertableArtifacts).toEqual(
        expect.arrayContaining<ManagedStorageCapability.InsertableArtifact>([
          {
            sourcePath: "/tmp-x/123",
            destinationPath: expect.stringMatching(new RegExp(`^hello-123-base/${Regex.TIMESTAMP_FOLDER}/Apple.txt$`)),
          },
          {
            sourcePath: "/tmp-x/456",
            destinationPath: expect.stringMatching(new RegExp(`^hello-123-base/${Regex.TIMESTAMP_FOLDER}/Banana.txt$`)),
          },
          {
            sourcePath: "/tmp-x/789",
            destinationPath: expect.stringMatching(new RegExp(`^hello-123-base/${Regex.TIMESTAMP_FOLDER}/Coconut.txt$`)),
          },
        ]),
      );
    });

    it("appends a new artifact index to an existing manifest", () => {
      for (let existingManifestSize = 0; existingManifestSize < 10; existingManifestSize++) {
        const range = Array.from({ length: existingManifestSize }, (_, i) => i);
        // given
        const existingManifest: Manifest = {
          object: "manifest",
          items: range.map((index) => ({
            isoTimestamp: Temporal.Now.plainDateTimeISO().toString(),
            artifactIndexPath: `blabla-${index}`,
          })),
        };
        // when
        const { manifestModifier } = capability.prepareInsertion({ artifacts: [], baseFolder: "", trail: [] });
        const updatedManifest = manifestModifier({ manifest: existingManifest });
        // then
        expect(updatedManifest.items).toHaveLength(existingManifestSize + 1);
        expect(updatedManifest.items).toEqual(
          expect.arrayContaining([
            ...range.map((index) =>
              expect.objectContaining({
                artifactIndexPath: `blabla-${index}`,
              } satisfies Partial<Manifest.Item>),
            ),
            expect.objectContaining({
              artifactIndexPath: expect.stringMatching(
                new RegExp(`^${Regex.TIMESTAMP_FOLDER}/__brespi_artifact_index_${Regex.RANDOM_ID}__.json$`),
              ),
            } satisfies Partial<Manifest.Item>),
          ]),
        );
      }
    });

    type BaseFolderTestCase = {
      baseFolder: string;
      expectation: {
        itemPathMatcher: RegExp;
      };
    };
    it.each<BaseFolderTestCase>([
      {
        baseFolder: "",
        expectation: {
          itemPathMatcher: new RegExp(`^${Regex.TIMESTAMP_FOLDER}/.+`),
        },
      },
      {
        baseFolder: "backups",
        expectation: {
          itemPathMatcher: new RegExp(`^backups/${Regex.TIMESTAMP_FOLDER}/.+`),
        },
      },
      {
        baseFolder: "/backups",
        expectation: {
          itemPathMatcher: new RegExp(`^/backups/${Regex.TIMESTAMP_FOLDER}/.+`),
        },
      },
      {
        baseFolder: "backups/postgres",
        expectation: {
          itemPathMatcher: new RegExp(`^backups/postgres/${Regex.TIMESTAMP_FOLDER}/.+`),
        },
      },
      {
        baseFolder: "/backups/postgres",
        expectation: {
          itemPathMatcher: new RegExp(`^/backups/postgres/${Regex.TIMESTAMP_FOLDER}/.+`),
        },
      },
    ])("correctly relativizes generated files to the base folder", ({ baseFolder, expectation }) => {
      // given
      const options: ManagedStorageCapability.PrepareInsertionOptions = {
        baseFolder,
        artifacts: [{ name: "Apple", path: "irrelevant" }],
        trail: [],
      };
      // when
      const { artifactIndex, insertableArtifacts } = capability.prepareInsertion(options);
      // then
      expect(artifactIndex.destinationPath).toMatch(expectation.itemPathMatcher);
      expect(insertableArtifacts).toHaveLength(1);
      expect(insertableArtifacts[0].destinationPath).toMatch(expectation.itemPathMatcher);
    });
  });

  describe(capability.prepareSelection.name, () => {
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
      const manifest: Manifest = {
        object: "manifest",
        items: [
          {
            isoTimestamp: Timestamp.LAST_YEAR,
            artifactIndexPath: `${Timestamp.LAST_YEAR}-abc123/__brespi_artifact_index__.json`,
          },
          {
            isoTimestamp: Timestamp.PRESENT,
            artifactIndexPath: `${Timestamp.PRESENT}-def456/__brespi_artifact_index__.json`,
          },
          {
            isoTimestamp: Timestamp.VERY_LONG_AGO,
            artifactIndexPath: `${Timestamp.VERY_LONG_AGO}-ghi789/__brespi_artifact_index__.json`,
          },
        ],
      };
      const artifactIndex: ArtifactIndex = {
        object: "artifact_index",
        artifacts: [
          { path: "file1.txt", trail: [] },
          { path: "file2.txt", trail: [] },
        ],
      };
      // when
      const { selectableArtifactsFn } = capability.prepareSelection({
        baseFolder: "base-folder",
        configuration: { target: "latest" },
        storageReaderFn: () => Promise.resolve(artifactIndex),
      });
      const artifacts = await selectableArtifactsFn({ manifest });
      // then
      expect(artifacts).toHaveLength(2);
      expect(artifacts).toEqual([
        { name: "file1.txt", path: `base-folder/${Timestamp.PRESENT}-def456/file1.txt` },
        { name: "file2.txt", path: `base-folder/${Timestamp.PRESENT}-def456/file2.txt` },
      ]);
    });

    it("selects a specific item by 'isoTimestamp'", async () => {
      // given
      const manifest: Manifest = {
        object: "manifest",
        items: [
          {
            isoTimestamp: Timestamp.LAST_YEAR,
            artifactIndexPath: `${Timestamp.LAST_YEAR}-abc123/__brespi_artifact_index__.json`,
          },
          {
            isoTimestamp: Timestamp.PRESENT,
            artifactIndexPath: `${Timestamp.PRESENT}-def456/__brespi_artifact_index__.json`,
          },
        ],
      };
      const artifactIndex: ArtifactIndex = {
        object: "artifact_index",
        artifacts: [{ path: "specific-file.txt", trail: [] }],
      };
      // when
      const { selectableArtifactsFn } = capability.prepareSelection({
        configuration: { target: "specific", version: Timestamp.LAST_YEAR },
        storageReaderFn: () => Promise.resolve(artifactIndex),
        baseFolder: "my-base",
      });
      const artifacts = await selectableArtifactsFn({ manifest });
      // then
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0]).toEqual({
        name: "specific-file.txt",
        path: `my-base/${Timestamp.LAST_YEAR}-abc123/specific-file.txt`,
      });
    });

    it("selects a specific item by 'dirname'", async () => {
      // given
      const manifest: Manifest = {
        object: "manifest",
        items: [
          {
            isoTimestamp: Timestamp.VERY_LONG_AGO,
            artifactIndexPath: `${Timestamp.VERY_LONG_AGO}-abc123/__brespi_artifact_index__.json`,
          },
          {
            isoTimestamp: Timestamp.LAST_YEAR,
            artifactIndexPath: `${Timestamp.LAST_YEAR}-def456/__brespi_artifact_index__.json`,
          },
          {
            isoTimestamp: Timestamp.PRESENT,
            artifactIndexPath: `${Timestamp.PRESENT}-ghi789/__brespi_artifact_index__.json`,
          },
        ],
      };
      const artifactIndex: ArtifactIndex = {
        object: "artifact_index",
        artifacts: [
          { path: "doc1.pdf", trail: [] },
          { path: "doc2.pdf", trail: [] },
          { path: "doc3.pdf", trail: [] },
        ],
      };
      // when
      const { selectableArtifactsFn } = capability.prepareSelection({
        configuration: { target: "specific", version: `${Timestamp.VERY_LONG_AGO}-abc123` },
        storageReaderFn: () => Promise.resolve(artifactIndex),
        baseFolder: "/storage",
      });
      const artifacts = await selectableArtifactsFn({ manifest });
      // then
      expect(artifacts).toHaveLength(3);
      expect(artifacts).toEqual([
        { name: "doc1.pdf", path: `/storage/${Timestamp.VERY_LONG_AGO}-abc123/doc1.pdf` },
        { name: "doc2.pdf", path: `/storage/${Timestamp.VERY_LONG_AGO}-abc123/doc2.pdf` },
        { name: "doc3.pdf", path: `/storage/${Timestamp.VERY_LONG_AGO}-abc123/doc3.pdf` },
      ]);
    });

    it("throws an error when selecting latest from an empty manifest", async () => {
      // given
      const manifest: Manifest = Manifest.empty();
      // when
      const { selectableArtifactsFn } = capability.prepareSelection({
        configuration: { target: "latest" },
        storageReaderFn: () => Promise.reject("Should not be called"),
        baseFolder: "base",
      });
      // then
      expect(selectableArtifactsFn({ manifest })).rejects.toThrow("Latest item could not be found");
    });

    it("throws an error when specific item cannot be found", async () => {
      // given
      const manifest: Manifest = {
        object: "manifest",
        items: [
          {
            isoTimestamp: Timestamp.LAST_YEAR,
            artifactIndexPath: "path1/__brespi_artifact_index__.json",
          },
        ],
      };
      // when
      const { selectableArtifactsFn } = capability.prepareSelection({
        configuration: { target: "specific", version: Timestamp.VERY_FAR_AWAY },
        storageReaderFn: () => Promise.reject("Should not be called"),
        baseFolder: "base",
      });
      // then
      expect(selectableArtifactsFn({ manifest })).rejects.toThrow("Specific item could not be found");
    });

    it("throws an error when multiple items match the specific version", async () => {
      // given - create items with duplicate timestamps (edge case)
      const manifest: Manifest = {
        object: "manifest",
        items: [
          {
            isoTimestamp: Timestamp.LAST_YEAR,
            artifactIndexPath: "path1/__brespi_artifact_index__.json",
          },
          {
            isoTimestamp: Timestamp.LAST_YEAR,
            artifactIndexPath: "path2/__brespi_artifact_index__.json",
          },
        ],
      };
      // when
      const { selectableArtifactsFn } = capability.prepareSelection({
        configuration: { target: "specific", version: Timestamp.LAST_YEAR },
        storageReaderFn: () => Promise.reject("Should not be called"),
        baseFolder: "base",
      });
      // then
      expect(selectableArtifactsFn({ manifest })).rejects.toThrow("Specific item could not be identified uniquely; matches=2");
    });

    type BaseFolderTestCase = {
      baseFolder: string;
      manifest: {
        singleArtifactIndexPath: string;
      };
      expectation: {
        artifactPathPrefix: string;
      };
    };
    it.each<BaseFolderTestCase>([
      {
        baseFolder: "",
        manifest: {
          singleArtifactIndexPath: `${Timestamp.PRESENT}-abc/__brespi_artifact_index__.json`,
        },
        expectation: {
          artifactPathPrefix: `${Timestamp.PRESENT}-abc`,
        },
      },
      {
        baseFolder: "backups",
        manifest: {
          singleArtifactIndexPath: `${Timestamp.PRESENT}-abc/__brespi_artifact_index__.json`,
        },
        expectation: {
          artifactPathPrefix: `backups/${Timestamp.PRESENT}-abc`,
        },
      },
      {
        baseFolder: "/backups",
        manifest: {
          singleArtifactIndexPath: `${Timestamp.PRESENT}-abc/__brespi_artifact_index__.json`,
        },
        expectation: {
          artifactPathPrefix: `/backups/${Timestamp.PRESENT}-abc`,
        },
      },
      {
        baseFolder: "backups/postgres",
        manifest: {
          singleArtifactIndexPath: `${Timestamp.PRESENT}-abc/__brespi_artifact_index__.json`,
        },
        expectation: {
          artifactPathPrefix: `backups/postgres/${Timestamp.PRESENT}-abc`,
        },
      },
      {
        baseFolder: "/backups/postgres",
        manifest: {
          singleArtifactIndexPath: `${Timestamp.PRESENT}-abc/__brespi_artifact_index__.json`,
        },
        expectation: {
          artifactPathPrefix: `/backups/postgres/${Timestamp.PRESENT}-abc`,
        },
      },
    ])(
      "correctly relativizes selected artifacts to the base folder",
      async ({ baseFolder, manifest: { singleArtifactIndexPath }, expectation }) => {
        // given
        const manifest: Manifest = {
          object: "manifest",
          items: [
            {
              isoTimestamp: Timestamp.PRESENT,
              artifactIndexPath: singleArtifactIndexPath,
            },
          ],
        };
        const artifactIndex: ArtifactIndex = {
          object: "artifact_index",
          artifacts: [{ path: "test-file.txt", trail: [] }],
        };
        // when
        const { selectableArtifactsFn } = capability.prepareSelection({
          configuration: { target: "latest" },
          storageReaderFn: () => Promise.resolve(artifactIndex),
          baseFolder,
        });
        const artifacts = await selectableArtifactsFn({ manifest });
        // then
        expect(artifacts).toHaveLength(1);
        expect(artifacts[0].path).toEqual(`${expectation.artifactPathPrefix}/test-file.txt`);
        expect(artifacts[0].name).toEqual("test-file.txt");
      },
    );
  });
});
