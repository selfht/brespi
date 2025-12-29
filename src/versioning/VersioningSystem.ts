import { Generate } from "@/helpers/Generate";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { TrailStep } from "@/models/TrailStep";
import { ArtifactIndex } from "@/models/versioning/ArtifactIndex";
import { Manifest } from "@/models/versioning/Manifest";
import { Temporal } from "@js-temporal/polyfill";
import { dirname, join } from "path";

export class VersioningSystem {
  public static prepareInsertion({
    baseFolder: baseDirectory,
    artifacts,
    trail,
  }: VersioningSystem.PrepareInsertionOptions): VersioningSystem.PrepareInsertionResult {
    const timestamp = Temporal.Now.plainDateTimeISO();
    const itemDir = `${timestamp}-${Generate.shortRandomString()}`;
    // 1. Create the artifact index
    const artifactIndex = {
      name: ArtifactIndex.generateName(artifacts),
      get path() {
        return join(itemDir, this.name);
      },
      get parentDir() {
        return dirname(this.path);
      },
      get content(): ArtifactIndex {
        return {
          object: "artifact_index",
          artifacts: artifacts.map((artifact) => ({
            path: artifact.name, // (sic) `artifact.name` is unique in each batch (and artifact.path` refers to the current path on the filesystem)
            trail,
          })),
        };
      },
    };
    // 2. Create the manifest modifier
    const manifestModifier: VersioningSystem.PrepareInsertionResult["manifestModifier"] = ({ manifest }) => {
      return {
        ...manifest,
        items: [
          ...manifest.items,
          {
            isoTimestamp: timestamp.toString(),
            artifactIndexPath: artifactIndex.path,
          },
        ],
      };
    };
    // 3. Return
    return {
      manifestModifier,
      artifactIndex: {
        destinationPath: join(baseDirectory, artifactIndex.path),
        content: artifactIndex.content,
      },
      insertableArtifacts: artifacts.map<VersioningSystem.InsertableArtifact>(({ name, path }) => ({
        sourcePath: path,
        destinationPath: join(baseDirectory, artifactIndex.parentDir, name),
      })),
    };
  }

  public static prepareSelection({
    selection,
    storageReaderFn,
    baseFolder,
  }: VersioningSystem.PrepareSelectionOptions): VersioningSystem.PrepareSelectionResult {
    return {
      selectableArtifactsFn: async ({ manifest }) => {
        const item = this.findMatchingItem(manifest, selection);
        const artifactIndexPath = join(baseFolder, item.artifactIndexPath);
        const artifactIndexParentDir = dirname(artifactIndexPath);
        const index = ArtifactIndex.parse(await storageReaderFn({ absolutePath: artifactIndexPath }));
        return index.artifacts.map<VersioningSystem.SelectableArtifact>(({ path }) => ({
          name: path,
          path: join(artifactIndexParentDir, path),
        }));
      },
    };
  }

  private static findMatchingItem(manifest: Manifest, selection: Step.ItemSelection): Manifest.Item {
    switch (selection.target) {
      case "latest": {
        const sortedItems = manifest.items.toSorted(Manifest.Item.sort);
        if (sortedItems.length === 0) {
          throw new Error("Latest item could not be found");
        }
        return sortedItems[0];
      }
      case "specific": {
        const version = selection.version;
        const matchingItems = manifest.items.filter((u) => u.isoTimestamp === version || dirname(u.artifactIndexPath) === version);
        if (matchingItems.length === 0) {
          throw new Error("Specific item could not be found");
        }
        if (matchingItems.length > 1) {
          throw new Error(`Specific item could not be identified uniquely; matches=${matchingItems.length}`);
        }
        return matchingItems[0];
      }
    }
  }
}

export namespace VersioningSystem {
  export type InsertableArtifact = {
    sourcePath: string;
    destinationPath: string;
  };
  export type PrepareInsertionOptions = {
    baseFolder: string;
    artifacts: Array<Pick<Artifact, "name" | "path">>;
    trail: TrailStep[];
  };
  export type PrepareInsertionResult = {
    manifestModifier: (arg: { manifest: Manifest }) => Manifest;
    artifactIndex: { content: ArtifactIndex; destinationPath: string };
    insertableArtifacts: InsertableArtifact[];
  };

  export type SelectableArtifact = {
    name: string;
    path: string;
  };
  export type PrepareSelectionOptions = {
    baseFolder: string;
    selection: Step.ItemSelection;
    storageReaderFn: (arg: { absolutePath: string }) => Promise<any>;
  };
  export type PrepareSelectionResult = {
    selectableArtifactsFn: (arg: { manifest: Manifest }) => Promise<SelectableArtifact[]>;
  };
}
