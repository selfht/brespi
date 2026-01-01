import { Env } from "@/Env";
import { ExecutionError } from "@/errors/ExecutionError";
import { UrlParser } from "@/helpers/UrlParser";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { rename, rm } from "fs/promises";
import { join } from "path";
import { z } from "zod/v4";
import { AbstractAdapter } from "../AbstractAdapter";

export class PostgresAdapter extends AbstractAdapter {
  private readonly EXTENSION = ".dump";

  public constructor(protected readonly env: Env.Private) {
    super(env);
  }

  public async backup(step: Step.PostgresBackup): Promise<Artifact[]> {
    const { username, password, host, port } = UrlParser.postgres(this.readEnvironmentVariable(step.connectionReference));
    const tempDir = await this.createTmpDestination();
    try {
      const scriptPath = join(import.meta.dir, "pg_backup.sh");
      const { stdout } = await this.runCommand({
        cmd: ["bash", scriptPath],
        env: {
          ...process.env,
          PGUSER: username,
          PGPASSWORD: password,
          PGHOST: host,
          PGPORT: port,
          BACKUP_ROOT: tempDir,
          SELECTION_MODE: step.databaseSelection.strategy,
          ...(step.databaseSelection.strategy === "include" ? { INCLUDE_DBS: step.databaseSelection.include.join(" ") } : {}),
          ...(step.databaseSelection.strategy === "exclude" ? { EXCLUDE_DBS: step.databaseSelection.exclude.join(" ") } : {}),
        },
      });
      const output = z
        .object({
          timestamp: z.string(),
          backupDir: z.string(),
          databases: z.array(
            z.union([
              z.object({
                name: z.string(),
                status: z.literal("success"),
                path: z.string(),
              }),
              z.object({
                name: z.string(),
                status: z.literal("error"),
                error: z.string(),
              }),
              z.object({
                name: z.string(),
                status: z.literal("skipped"),
              }),
            ]),
          ),
        })
        .parse(JSON.parse(stdout));
      // Extract artifacts (only successful backups)
      const artifacts: Artifact[] = [];
      for (const db of output.databases.filter((db): db is Extract<typeof db, { status: "success" }> => db.status === "success")) {
        const { outputId, outputPath } = this.generateArtifactDestination();
        await rename(db.path, outputPath);
        artifacts.push({
          id: outputId,
          type: "file",
          path: outputPath,
          name: this.addExtension(db.name, this.EXTENSION),
        });
      }
      return artifacts;
    } catch (e) {
      throw this.mapError(e, ExecutionError.postgres_backup_failed);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  public async restore(artifacts: Artifact[], step: Step.PostgresRestore): Promise<void> {
    this.requireArtifactSize(artifacts, { min: 1, max: 1 });
    const artifact = artifacts[0];
    this.requireArtifactType("file", artifact);
    const { username, password, host, port } = UrlParser.postgres(this.readEnvironmentVariable(step.connectionReference));
    try {
      const { stdout } = await this.runCommand({
        cmd: ["bash", join(import.meta.dir, "pg_restore.sh")],
        env: {
          ...process.env,
          PGUSER: username,
          PGPASSWORD: password,
          PGHOST: host,
          PGPORT: port,
          RESTORE_FILE: artifact.path,
          DATABASE: step.database,
        },
      });
      z.object({
        status: z.literal("success"),
        database: z.string(),
      }).parse(JSON.parse(stdout));
    } catch (e) {
      throw this.mapError(e, ExecutionError.postgres_restore_failed);
    }
  }
}

export namespace PostgresAdapter {
  export interface ConstructorArgs {
    host: string;
    user: string;
    password: string;
  }
}
