import { Env } from "@/Env";
import { Mutex } from "@/helpers/Mutex";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { TrailStep } from "@/models/TrailStep";
import { Manifest } from "@/models/versioning/Manifest";
import { VersioningSystem } from "@/versioning/VersioningSystem";
import { S3Client } from "bun";
import { join } from "path";
import { AbstractAdapter } from "../AbstractAdapter";

export class S3Adapter extends AbstractAdapter {
  private static readonly MANIFEST_MUTEX = new Mutex();

  public constructor(protected readonly env: Env.Private) {
    super(env);
  }

  public async upload(artifacts: Artifact[], step: Step.S3Upload, trail: TrailStep[]): Promise<void> {
    const client = this.constructClient(step.connection);
    const { manifestModifier, artifactIndex, artifactInserts } = VersioningSystem.prepareInsertion({
      baseDirectory: step.baseFolder,
      artifacts,
      trail,
    });
    // Save manifest
    await this.handleManifestExclusively(client, step.baseFolder, async (manifest, save) => {
      await save(manifestModifier({ manifest }));
    });
    // Save index
    await client.write(artifactIndex.path, artifactIndex.content);
    // Save artifacts
    for (const { sourcePath, destinationPath } of artifactInserts) {
      await client.write(destinationPath, Bun.file(sourcePath));
    }
  }

  public async download(step: Step.S3Download): Promise<Artifact[]> {
    const client = this.constructClient(step.connection);
    const { artifactSelector } = VersioningSystem.prepareSelection({
      baseDirectory: step.baseFolder,
      selection: step.selection,
      storageReader: ({ absolutePath }) => client.file(absolutePath).json(),
    });
    const selectableArtifacts = await this.handleManifestExclusively(client, step.baseFolder, async (manifest) => {
      return await artifactSelector({ manifest });
    });
    console.log(JSON.stringify({ selectableArtifacts }, null, 2));
    const artifacts: Artifact[] = [];
    for (const { name, path } of selectableArtifacts) {
      const { outputId, outputPath } = this.generateArtifactDestination();
      await Bun.write(outputPath, client.file(path));
      artifacts.push({
        id: outputId,
        type: "file",
        path: outputPath,
        name,
      });
    }
    return artifacts;
  }

  private constructClient(connection: Step.S3Connection): S3Client {
    const accessKeyId = this.readEnvironmentVariable(connection.accessKeyReference);
    const secretAccessKey = this.readEnvironmentVariable(connection.secretKeyReference);
    return new S3Client({
      bucket: connection.bucket,
      endpoint: connection.endpoint,
      region: connection.region ?? undefined,
      accessKeyId,
      secretAccessKey,
    });
  }

  private async handleManifestExclusively<T>(
    client: S3Client,
    folder: string,
    fn: (mani: Manifest, saveFn: (mf: Manifest) => Promise<Manifest>) => T | Promise<T>,
  ): Promise<Awaited<T>> {
    const release = await S3Adapter.MANIFEST_MUTEX.acquire();
    try {
      const manifestPath = join(folder, Manifest.NAME);
      const manifestFile = client.file(manifestPath);
      const manifestContent: Manifest = (await manifestFile.exists()) ? Manifest.parse(await manifestFile.json()) : Manifest.empty();
      const saveFn = (newManifest: Manifest) => client.write(manifestPath, JSON.stringify(newManifest)).then(() => newManifest);
      return await fn(manifestContent, saveFn);
    } finally {
      release();
    }
  }

  private findMatchingItem(manifest: Manifest, selection: Step.S3Download["selection"]): Manifest.Item {
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
