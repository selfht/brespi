import { FilterCapability } from "@/capabilities/FilterCapability";
import { ManagedStorageCapability } from "@/capabilities/ManagedStorageCapability";
import { Env } from "@/Env";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { StepWithRuntime } from "@/models/StepWithRuntime";
import { S3Client } from "bun";
import { isAbsolute, relative } from "path";
import { AbstractAdapter } from "../AbstractAdapter";
import { AdapterResult } from "../AdapterResult";

export class S3Adapter extends AbstractAdapter {
  public constructor(
    protected readonly env: Env.Private,
    private readonly managedStorageCapability: ManagedStorageCapability,
    private readonly filterCapability: FilterCapability,
  ) {
    super(env);
  }

  public async upload(artifacts: Artifact[], { basePrefix, ...step }: Step.S3Upload, trail: StepWithRuntime[]): Promise<AdapterResult> {
    this.requireArtifactType("file", ...artifacts);
    basePrefix = this.relativize(basePrefix);
    const client = this.constructClient(step.connection);
    const { insertableArtifacts } = await this.managedStorageCapability.insert({
      key: [S3Adapter.name, basePrefix],
      artifacts,
      trail,
      base: basePrefix,
      ...this.createReadWriteFns(client),
    });
    for (const { path, destinationPath } of insertableArtifacts) {
      await client.write(destinationPath, Bun.file(path));
    }
    return AdapterResult.create();
  }

  public async download({ basePrefix, ...step }: Step.S3Download): Promise<AdapterResult> {
    basePrefix = this.relativize(basePrefix);
    const client = this.constructClient(step.connection);
    // Find artifacts
    let { resolvedVersion, selectableArtifacts } = await this.managedStorageCapability.select({
      key: [S3Adapter.name, basePrefix],
      base: basePrefix,
      configuration: step.managedStorage,
      ...this.createReadWriteFns(client),
    });
    // Optional: filter
    if (step.filterCriteria) {
      const { predicate } = this.filterCapability.createPredicate(step.filterCriteria);
      selectableArtifacts = selectableArtifacts.filter(predicate);
    }
    // Retrieve artifacts
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
    return AdapterResult.create(artifacts, { version: resolvedVersion });
  }

  /**
   * Specifically for S3, we want to make absolute base folders relative
   * For example: `/my-backups` --> `my-backups`
   */
  private relativize(baseFolder: string): string {
    return isAbsolute(baseFolder) ? relative("/", baseFolder) : baseFolder;
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

  private createReadWriteFns(client: S3Client): ManagedStorageCapability.ReadWriteFns {
    return {
      async writeFn(item: { path: string; content: string }) {
        await client.write(item.path, item.content);
      },
      async readFn(path: string) {
        const file = client.file(path);
        const exists = await file.exists();
        return exists ? await file.text() : undefined;
      },
    };
  }
}
