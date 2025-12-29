import { Manifest } from "@/models/versioning/Manifest";
import { describe, expect, it } from "bun:test";
import { VersioningSystem } from "./VersioningSystem";
import { ArtifactIndex } from "@/models/versioning/ArtifactIndex";
import { Temporal } from "@js-temporal/polyfill";

describe(VersioningSystem.name, () => {
  const Regex = {
    RANDOM_ID: /\w+/.source,
    TIMESTAMP: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+/.source,
    get TIMESTAMP_FOLDER() {
      return new RegExp(`${this.TIMESTAMP}-${this.RANDOM_ID}`).source;
    },
  };

  describe(VersioningSystem.prepareInsertion.name, () => {
    it("correctly generates the to-be-upserted manifest/index/artifacts", () => {
      // given
      const options: VersioningSystem.PrepareInsertionOptions = {
        baseFolder: "hello-123-base",
        artifacts: [
          { name: "Apple.txt", path: "/tmp-x/123" },
          { name: "Banana.txt", path: "/tmp-x/456" },
          { name: "Coconut.txt", path: "/tmp-x/789" },
        ],
        trail: [],
      };

      // when
      const { manifestModifier, artifactIndex, insertableArtifacts } = VersioningSystem.prepareInsertion(options);
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
        expect.arrayContaining<VersioningSystem.InsertableArtifact>([
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
        const { manifestModifier } = VersioningSystem.prepareInsertion({ artifacts: [], baseFolder: "", trail: [] });
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
      const options: VersioningSystem.PrepareInsertionOptions = {
        baseFolder,
        artifacts: [{ name: "Apple", path: "irrelevant" }],
        trail: [],
      };
      // when
      const { artifactIndex, insertableArtifacts } = VersioningSystem.prepareInsertion(options);
      // then
      expect(artifactIndex.destinationPath).toMatch(expectation.itemPathMatcher);
      expect(insertableArtifacts).toHaveLength(1);
      expect(insertableArtifacts[0].destinationPath).toMatch(expectation.itemPathMatcher);
    });
  });

  describe(VersioningSystem.prepareSelection.name, () => {});
});
