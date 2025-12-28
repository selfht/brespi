import { Env } from "@/Env";
import { Generate } from "@/helpers/Generate";
import { Mutex } from "@/helpers/Mutex";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { Manifest } from "@/models/versioning/Manifest";
import { Temporal } from "@js-temporal/polyfill";
import { S3Client } from "bun";
import { dirname, join } from "path";
import { AbstractAdapter } from "../AbstractAdapter";
import { ArtifactIndex } from "@/models/versioning/ArtifactIndex";

export class S3Adapter extends AbstractAdapter {
  private static readonly MANIFEST_MUTEX = new Mutex();

  public constructor(protected readonly env: Env.Private) {
    super(env);
  }

  public async upload(artifacts: Artifact[], step: Step.S3Upload, stepTrail: Step[]): Promise<void> {
    const client = this.constructClient(step.connection);
    const timestamp = Temporal.Now.plainDateTimeISO();
    const uploadDir = {
      relativePath: `${timestamp}-${Generate.shortRandomString()}`,
      get absolutePath() {
        return join(step.baseFolder, this.relativePath);
      },
    };
    // 1. Write the artifact index
    const artifactIndex = {
      name: ArtifactIndex.generateName(artifacts),
      get relativePath() {
        return join(uploadDir.relativePath, this.name);
      },
      get absolutePath() {
        return join(uploadDir.absolutePath, this.name);
      },
      get content(): ArtifactIndex {
        return {
          object: "artifact_index",
          artifacts: artifacts.map((artifact) => ({
            path: artifact.name, // (sic) `artifact.name` is unique in each batch (and artifact.path` refers to the current path on the filesystem)
            stepTrail,
          })),
        };
      },
    };
    await client.write(artifactIndex.absolutePath, JSON.stringify(artifactIndex.content));
    // 2. Update the manifest
    await this.handleManifestExclusively(client, step.baseFolder, async (manifest, save) => {
      manifest.items.push({
        isoTimestamp: timestamp.toString(),
        artifactIndexPath: artifactIndex.relativePath,
      });
      await save(manifest);
    });
    // 3. Write the artifacts themselves
    for (const artifact of artifacts) {
      await client.write(join(uploadDir.absolutePath, artifact.name), Bun.file(artifact.path));
    }
  }

  public async download(step: Step.S3Download): Promise<Artifact[]> {
    const client = this.constructClient(step.connection);

    const item = await this.handleManifestExclusively(client, step.baseFolder, (manifest) => {
      return this.findMatchingItem(manifest, step.selection);
    });

    const artifactIndexPath = join(step.baseFolder, item.artifactIndexPath);
    const artifactIndexParentDir = dirname(artifactIndexPath);

    const index = ArtifactIndex.parse(await client.file(artifactIndexPath).json());
    const artifacts: Artifact[] = [];
    for (const { path: name } of index.artifacts) {
      const { outputId, outputPath } = this.generateArtifactDestination();
      await Bun.write(outputPath, client.file(join(artifactIndexParentDir, name)));
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
    fn: (mani: Manifest, save: (mf: Manifest) => Promise<Manifest>) => T | Promise<T>,
  ): Promise<Awaited<T>> {
    const release = await S3Adapter.MANIFEST_MUTEX.acquire();
    try {
      const manifestPath = join(folder, Manifest.NAME);
      const manifestFile = client.file(manifestPath);
      const manifestContent: Manifest = (await manifestFile.exists()) ? Manifest.parse(await manifestFile.json()) : Manifest.empty();
      const save = (mf: Manifest) => client.write(manifestPath, JSON.stringify(manifestContent)).then(() => mf);
      return await fn(manifestContent, save);
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
