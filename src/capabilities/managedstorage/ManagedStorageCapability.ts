import { Listing } from "./Listing";
import { Manifest } from "./Manifest";
import { ExecutionError } from "@/errors/ExecutionError";
import { Mutex } from "@/helpers/Mutex";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { StepWithRuntime } from "@/models/StepWithRuntime";
import { Temporal } from "@js-temporal/polyfill";
import { dirname, join } from "path";

export class ManagedStorageCapability {
  public async insert({
    mutexKey,
    artifacts,
    trail,
    base,
    readFn,
    writeFn,
  }: ManagedStorageCapability.InsertOptions): Promise<ManagedStorageCapability.InsertResult> {
    // 1. Prepare the listing
    const createListingDetails = (timestamp: Temporal.PlainDateTime) => ({
      name: Listing.generateAvailableName(artifacts),
      relativeParentPath: timestamp.toString(),
      get relativePath() {
        return join(this.relativeParentPath, this.name);
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
    });
    // 2. Update the manifest (exclusively)
    let listingDetails: ReturnType<typeof createListingDetails>;
    const { release } = await Mutex.acquireFromRegistry({ key: mutexKey });
    try {
      const mfPath = join(base, Manifest.NAME);
      const mfFile = await readFn(mfPath);
      const existingMf: Manifest = mfFile === undefined ? Manifest.empty() : this.parseManifest(mfFile);

      const timestamp = await this.waitForAvailableTimestamp(existingMf);
      listingDetails = createListingDetails(timestamp);

      const updatedMf: Manifest = {
        ...existingMf,
        items: [
          ...existingMf.items,
          {
            version: timestamp.toString(),
            listingPath: listingDetails.relativePath,
          },
        ],
      };
      await writeFn({
        path: mfPath,
        content: JSON.stringify(updatedMf),
      });
    } finally {
      release();
    }
    // 3. Write the listing
    await writeFn({
      path: join(base, listingDetails.relativePath),
      content: JSON.stringify(listingDetails.content),
    });
    // 4. Return the insertable artifacts
    return {
      insertableArtifacts: artifacts.map(({ name, path }) => ({
        name,
        path,
        destinationPath: join(base, listingDetails.relativeParentPath, name),
      })),
    };
  }

  public async select({
    mutexKey,
    base,
    readFn,
    configuration,
  }: ManagedStorageCapability.SelectOptions): Promise<ManagedStorageCapability.SelectResult> {
    // 1. Read the manifest
    let manifest: Manifest;
    const { release } = await Mutex.acquireFromRegistry({ key: mutexKey });
    try {
      const mfPath = join(base, Manifest.NAME);
      const mfFile = await readFn(mfPath);
      manifest = this.parseManifest(mfFile!);
    } finally {
      release();
    }
    // 2. Find a matching listing, based on the configuration
    const mfItem = this.findMatchingItem(manifest, configuration);
    const listingPath = join(base, mfItem.listingPath);
    const listingFile = await readFn(listingPath);
    const listing = this.parseListing(listingFile!);
    // 3. Return the selectable artifacts
    return {
      resolvedVersion: dirname(mfItem.listingPath),
      selectableArtifacts: listing.artifacts.map(({ path }) => ({
        name: path,
        path: join(dirname(listingPath), path),
      })),
    };
  }

  public async clean({
    mutexKey,
    base,
    configuration,
    readFn,
    writeFn,
  }: ManagedStorageCapability.CleanOptions): Promise<ManagedStorageCapability.CleanResult> {
    // 1. Read the manifest
    let removableItems: Manifest.Item[];
    const { release } = await Mutex.acquireFromRegistry({ key: mutexKey });
    try {
      const mfPath = join(base, Manifest.NAME);
      const mfFile = await readFn(mfPath);
      const existingMf = this.parseManifest(mfFile!);
      // 2. Determine the removable items
      removableItems = existingMf.items.toSorted(Manifest.Item.sort).filter((_, index) => {
        return index >= configuration.maxVersions;
      });
      const removableItemIds = removableItems.map(({ listingPath: id }) => id);
      // 3. Update the manifest
      const updatedMf: Manifest = {
        ...existingMf,
        items: existingMf.items.filter(({ listingPath: id }) => !removableItemIds.includes(id)),
      };
      await writeFn({
        path: mfPath,
        content: JSON.stringify(updatedMf),
      });
    } finally {
      release();
    }
    // 3. Return the removable items
    return { removableItems };
  }

  private async waitForAvailableTimestamp(manifest: Manifest): Promise<Temporal.PlainDateTime> {
    const taken = manifest.items.map(({ version: isoTimestamp }) => isoTimestamp);
    while (true) {
      const candidate = Temporal.Now.plainDateTimeISO();
      if (!taken.includes(candidate.toString())) {
        return candidate;
      }
      await Bun.sleep(1);
    }
  }

  private findMatchingItem(manifest: Manifest, conf: Step.ManagedStorage): Manifest.Item {
    switch (conf.target) {
      case "latest": {
        const sortedItems = manifest.items.toSorted(Manifest.Item.sort);
        if (sortedItems.length === 0) {
          throw ExecutionError.managed_storage_manifest_empty();
        }
        return sortedItems[0];
      }
      case "specific": {
        const version = conf.version;
        const matchingItems = manifest.items.filter((u) => u.version === version);
        if (matchingItems.length === 0) {
          throw ExecutionError.managed_storage_version_not_found({ version });
        }
        if (matchingItems.length > 1) {
          throw ExecutionError.managed_storage_version_not_uniquely_identified({ version });
        }
        return matchingItems[0];
      }
    }
  }

  private parseManifest(content: string): Manifest {
    try {
      const json = JSON.parse(content);
      return Manifest.parse(json);
    } catch (e) {
      throw ExecutionError.managed_storage_corrupted({ descriptor: "manifest" });
    }
  }

  private parseListing(content: string): Listing {
    try {
      const json = JSON.parse(content);
      return Listing.parse(json);
    } catch (e) {
      throw ExecutionError.managed_storage_corrupted({ descriptor: "listing" });
    }
  }
}

export namespace ManagedStorageCapability {
  export type ReadWriteFns = {
    readFn: (path: string) => Promise<string | undefined>;
    writeFn: (file: { path: string; content: string }) => Promise<void>;
  };

  export type InsertOptions = ReadWriteFns & {
    mutexKey: string[];
    artifacts: Array<Pick<Artifact, "name" | "path">>;
    trail: StepWithRuntime[];
    base: string;
  };
  export type InsertResult = {
    insertableArtifacts: Array<{ name: string; path: string; destinationPath: string }>;
  };

  export type SelectOptions = Pick<ReadWriteFns, "readFn"> & {
    mutexKey: string[];
    base: string;
    configuration: Step.ManagedStorage;
  };
  export type SelectResult = {
    resolvedVersion: string;
    selectableArtifacts: Array<{ name: string; path: string }>;
  };

  export type CleanOptions = ReadWriteFns & {
    mutexKey: string[];
    base: string;
    configuration: Step.Retention;
  };
  export type CleanResult = {
    removableItems: Manifest.Item[];
  };
}
