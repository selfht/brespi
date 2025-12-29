import { Generate } from "@/helpers/Generate";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { TrailStep } from "@/models/TrailStep";
import { ArtifactIndex } from "@/models/versioning/ArtifactIndex";
import { Manifest } from "@/models/versioning/Manifest";
import { Temporal } from "@js-temporal/polyfill";
import { dirname, join } from "path";

export namespace VersioningSystem {
  type ArtifactInsert = {
    sourcePath: string;
    destinationPath: string;
  };
  type PrepareInsertionOptions = {
    baseDirectory: string;
    artifacts: Array<Pick<Artifact, "name" | "path">>;
    trail: TrailStep[];
  };
  type PrepareInsertionResult = {
    manifestModifier: (arg: { manifest: Manifest }) => Manifest;
    artifactIndex: { path: string; content: string };
    artifactInserts: ArtifactInsert[];
  };
  export function prepareInsertion({ baseDirectory, artifacts, trail }: PrepareInsertionOptions): PrepareInsertionResult {
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
    const manifestModifier: PrepareInsertionResult["manifestModifier"] = ({ manifest }) => {
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
        path: join(baseDirectory, artifactIndex.path),
        content: JSON.stringify(artifactIndex.content),
      },
      artifactInserts: artifacts.map<ArtifactInsert>(({ name, path }) => ({
        name,
        sourcePath: path,
        destinationPath: join(baseDirectory, artifactIndex.parentDir, name),
      })),
    };
  }

  type SelectableArtifact = {
    name: string;
    path: string;
  };
  type PrepareSelectionOptions = {
    baseDirectory: string;
    selection: Step.ItemSelection;
    storageReader: (arg: { absolutePath: string }) => Promise<any>;
  };
  type PrepareSelectionResult = {
    artifactSelector: (arg: { manifest: Manifest }) => Promise<SelectableArtifact[]>;
  };
  export function prepareSelection({ selection, storageReader, baseDirectory }: PrepareSelectionOptions): PrepareSelectionResult {
    return {
      async artifactSelector({ manifest }) {
        const item = findMatchingItem(manifest, selection);
        const artifactIndexPath = join(baseDirectory, item.artifactIndexPath);
        const artifactIndexParentDir = dirname(artifactIndexPath);
        const index = ArtifactIndex.parse(await storageReader({ absolutePath: artifactIndexPath }));
        return index.artifacts.map<SelectableArtifact>(({ path }) => ({
          name: path,
          path: join(artifactIndexParentDir, path),
        }));
      },
    };
  }

  function findMatchingItem(manifest: Manifest, selection: Step.ItemSelection): Manifest.Item {
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
        const matchingItems = manifest.items.filter((u) => u.isoTimestamp === version || u.artifactIndexPath === version);
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
