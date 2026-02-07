import { Env } from "@/Env";
import { ExecutionError } from "@/errors/ExecutionError";
import { UrlParser } from "@/helpers/UrlParser";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { rename, rm } from "fs/promises";
import { join } from "path";
import { z } from "zod/v4";
import { AbstractAdapter } from "../AbstractAdapter";
import { AdapterResult } from "../AdapterResult";
import { PropertyResolver } from "@/capabilities/propertyresolution/PropertyResolver";

export class MariadbAdapter extends AbstractAdapter {
  private readonly EXTENSION = ".sql";

  public constructor(
    protected readonly env: Env.Private,
    protected readonly propertyResolver: PropertyResolver,
  ) {
    super(env, propertyResolver);
  }

  public async backup(step: Step.MariadbBackup): Promise<AdapterResult> {
    const { username, password, host, port } = UrlParser.mariadb(this.resolveString(step.connection));
    const { toolkit } = step;
    const tempDir = await this.createTmpDestination();
    try {
      const scriptPath = join(import.meta.dir, "mariadb_backup.sh");
      const { stdout } = await this.runCommand({
        cmd: ["bash", scriptPath],
        env: {
          ...process.env,
          MARIADB_USER: username,
          MARIADB_PASSWORD: password,
          MARIADB_HOST: host,
          MARIADB_PORT: port,
          BACKUP_ROOT: tempDir,
          SELECTION_MODE: step.databaseSelection.method,
          ...(step.databaseSelection.method === "include"
            ? { DB_INCLUSIONS: step.databaseSelection.inclusions.map((db) => this.resolveString(db)).join(" ") }
            : {}),
          ...(step.databaseSelection.method === "exclude"
            ? { DB_EXCLUSIONS: step.databaseSelection.exclusions.map((db) => this.resolveString(db)).join(" ") }
            : {}),
          ...(toolkit.resolution === "automatic"
            ? { TOOLKIT_RESOLUTION: "automatic" }
            : {
                TOOLKIT_RESOLUTION: "manual",
                TOOLKIT_MARIADB: this.resolveString(toolkit.mariadb),
                TOOLKIT_MARIADB_DUMP: this.resolveString(toolkit["mariadb-dump"]),
              }),
        },
      });
      const output = z
        .object({
          databases: z.array(
            z.object({
              name: z.string(),
              path: z.string(),
            }),
          ),
          runtime: z.object({
            mariadb: z.object({
              version: z.string(),
              path: z.string(),
            }),
            "mariadb-dump": z.object({
              version: z.string(),
              path: z.string(),
            }),
          }),
        })
        .parse(JSON.parse(stdout));
      // All databases in output are successful (script fails on first error)
      const artifacts: Artifact[] = [];
      for (const db of output.databases) {
        const { outputId, outputPath } = this.generateArtifactDestination();
        await rename(db.path, outputPath);
        artifacts.push({
          id: outputId,
          type: "file",
          path: outputPath,
          name: this.addExtension(db.name, this.EXTENSION),
        });
      }
      return AdapterResult.create(artifacts, output.runtime);
    } catch (e) {
      throw this.mapError(e, ExecutionError.mariadb_backup_failed);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  public async restore(artifacts: Artifact[], step: Step.MariadbRestore): Promise<AdapterResult> {
    this.requireArtifactSize(artifacts, { min: 1, max: 1 });
    const artifact = artifacts[0];
    this.requireArtifactType("file", artifact);
    const { username, password, host, port } = UrlParser.mariadb(this.resolveString(step.connection));
    const { toolkit } = step;
    try {
      const { stdout } = await this.runCommand({
        cmd: ["bash", join(import.meta.dir, "mariadb_restore.sh")],
        env: {
          ...process.env,
          MARIADB_USER: username,
          MARIADB_PASSWORD: password,
          MARIADB_HOST: host,
          MARIADB_PORT: port,
          RESTORE_FILE: artifact.path,
          DATABASE: this.resolveString(step.database),
          ...(toolkit.resolution === "automatic"
            ? { TOOLKIT_RESOLUTION: "automatic" }
            : {
                TOOLKIT_RESOLUTION: "manual",
                TOOLKIT_MARIADB: this.resolveString(toolkit.mariadb),
              }),
        },
      });
      const output = z
        .object({
          status: z.literal("success"),
          database: z.string(),
          runtime: z.object({
            mariadb: z.object({
              version: z.string(),
              path: z.string(),
            }),
          }),
        })
        .parse(JSON.parse(stdout));
      return AdapterResult.create([], output.runtime);
    } catch (e) {
      throw this.mapError(e, ExecutionError.mariadb_restore_failed);
    }
  }
}
