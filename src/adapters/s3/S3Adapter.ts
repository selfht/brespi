import { Env } from "@/Env";
import { Mutex } from "@/helpers/Mutex";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { TrailStep } from "@/models/TrailStep";
import { Manifest } from "@/models/versioning/Manifest";
import { VersioningSystem } from "@/versioning/VersioningSystem";
import { S3Client } from "bun";
import { join, relative } from "path";
import { AbstractAdapter } from "../AbstractAdapter";

export class S3Adapter extends AbstractAdapter {
  private static readonly MANIFEST_MUTEX = new Mutex();

  public constructor(protected readonly env: Env.Private) {
    super(env);
  }

  public async upload(artifacts: Artifact[], { baseFolder, ...step }: Step.S3Upload, trail: TrailStep[]): Promise<void> {
    baseFolder = this.relativize(baseFolder);
    const client = this.constructClient(step.connection);
    const { manifestModifier, artifactIndex, insertableArtifacts } = VersioningSystem.prepareInsertion({
      baseFolder,
      artifacts,
      trail,
    });
    // Save manifest
    await this.handleManifestExclusively(client, baseFolder, async (manifest, save) => {
      await save(manifestModifier({ manifest }));
    });
    // Save index
    await client.write(artifactIndex.destinationPath, JSON.stringify(artifactIndex.content));
    // Save artifacts
    for (const { sourcePath, destinationPath } of insertableArtifacts) {
      await client.write(destinationPath, Bun.file(sourcePath));
    }
  }

  public async download({ baseFolder, ...step }: Step.S3Download): Promise<Artifact[]> {
    baseFolder = this.relativize(baseFolder);
    const client = this.constructClient(step.connection);
    const { selectableArtifactsFn: artifactSelector } = VersioningSystem.prepareSelection({
      baseFolder: baseFolder,
      selection: step.selection,
      storageReader: ({ absolutePath }) => client.file(absolutePath).json(),
    });
    const selectableArtifacts = await this.handleManifestExclusively(client, baseFolder, async (manifest) => {
      return await artifactSelector({ manifest });
    });
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

  /**
   * Specifically for S3, we want to make absolute base folders relative
   * For example: `/my-backups` --> `my-backups`
   */
  private relativize(baseFolder: string): string {
    return relative("/", baseFolder);
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
}
