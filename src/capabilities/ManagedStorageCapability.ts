import { Listing } from "@/capabilities/managedstorage/Listing";
import { Manifest } from "@/capabilities/managedstorage/Manifest";
import { ExecutionError } from "@/errors/ExecutionError";
import { Generate } from "@/helpers/Generate";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { StepWithRuntime } from "@/models/StepWithRuntime";
import { Temporal } from "@js-temporal/polyfill";
import { dirname, join } from "path";

export class ManagedStorageCapability {
  public prepareInsertion({
    baseFolder,
    artifacts,
    trail,
  }: ManagedStorageCapability.PrepareInsertionOptions): ManagedStorageCapability.PrepareInsertionResult {
    const timestamp = Temporal.Now.plainDateTimeISO();
    const itemDir = `${timestamp}-${Generate.shortRandomString()}`;
    // 1. Create the listing
    const listing = {
      name: Listing.generateName(artifacts),
      get path() {
        return join(itemDir, this.name);
      },
      get parentDir() {
        return dirname(this.path);
      },
      get content(): Listing {
        return {
          object: "listing",
          artifacts: artifacts.map((artifact) => ({
            path: artifact.name, // (sic) `artifact.name` is unique in each batch (and artifact.path` refers to the current path on the filesystem)
            trail,
          })),
        };
      },
    };
    // 2. Create the manifest modifier
    const manifestModifier: ManagedStorageCapability.PrepareInsertionResult["manifestModifier"] = ({ manifest }) => {
      return {
        ...manifest,
        items: [
          ...manifest.items,
          {
            isoTimestamp: timestamp.toString(),
            listingPath: listing.path,
          },
        ],
      };
    };
    // 3. Return
    return {
      manifestModifier,
      listing: {
        destinationPath: join(baseFolder, listing.path),
        content: listing.content,
      },
      insertableArtifacts: artifacts.map<ManagedStorageCapability.InsertableArtifact>(({ name, path }) => ({
        sourcePath: path,
        destinationPath: join(baseFolder, listing.parentDir, name),
      })),
    };
  }

  public prepareSelection({
    baseFolder,
    configuration,
    storageReaderFn,
  }: ManagedStorageCapability.PrepareSelectionOptions): ManagedStorageCapability.PrepareSelectionResult {
    return {
      selectableArtifactsFn: async ({ manifest }) => {
        const item = this.findMatchingItem(manifest, configuration);
        const listingPath = join(baseFolder, item.listingPath);
        const listingParentDir = dirname(listingPath);
        const listing = this.parseListing(await storageReaderFn({ absolutePath: listingPath }));
        const selectableArtifacts = listing.artifacts.map<ManagedStorageCapability.SelectableArtifact>(({ path }) => ({
          name: path,
          path: join(listingParentDir, path),
        }));
        return {
          selectableArtifacts,
          version: dirname(item.listingPath),
        };
      },
    };
  }

  private findMatchingItem(manifest: Manifest, conf: Step.ManagedStorage): Manifest.Item {
    switch (conf.target) {
      case "latest": {
        const sortedItems = manifest.items.toSorted(Manifest.Item.sort);
        if (sortedItems.length === 0) {
          throw new Error("Latest item could not be found");
        }
        return sortedItems[0];
      }
      case "specific": {
        const version = conf.version;
        const matchingItems = manifest.items.filter((u) => u.isoTimestamp === version || dirname(u.listingPath) === version);
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

  public parseManifest(content: string): Manifest {
    try {
      const json = JSON.parse(content);
      return Manifest.parse(json);
    } catch (e) {
      throw ExecutionError.managed_storage_corrupted({ element: "manifest" });
    }
  }

  private parseListing(content: string): Listing {
    try {
      const json = JSON.parse(content);
      return Listing.parse(json);
    } catch (e) {
      throw ExecutionError.managed_storage_corrupted({ element: "listing" });
    }
  }
}

export namespace ManagedStorageCapability {
  export type InsertableArtifact = {
    sourcePath: string;
    destinationPath: string;
  };
  export type PrepareInsertionOptions = {
    baseFolder: string;
    artifacts: Array<Pick<Artifact, "name" | "path">>;
    trail: StepWithRuntime[];
  };
  export type PrepareInsertionResult = {
    manifestModifier: (arg: { manifest: Manifest }) => Manifest;
    listing: { content: Listing; destinationPath: string };
    insertableArtifacts: InsertableArtifact[];
  };

  export type SelectableArtifact = {
    name: string;
    path: string;
  };
  export type PrepareSelectionOptions = {
    baseFolder: string;
    configuration: Step.ManagedStorage;
    storageReaderFn: (arg: { absolutePath: string }) => Promise<string>;
  };
  export type PrepareSelectionResult = {
    selectableArtifactsFn: (arg: { manifest: Manifest }) => Promise<{
      selectableArtifacts: SelectableArtifact[];
      version: string;
    }>;
  };
}
