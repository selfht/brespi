import { Env } from "@/Env";
import { ExecutionError } from "@/errors/ExecutionError";
import { CommandRunner } from "@/helpers/CommandRunner";
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
    const scriptPath = join(import.meta.dir, "pg_backup.sh");
    const { username, password, host, port } = UrlParser.postgres(this.readEnvironmentVariable(step.connectionReference));
    const tempDir = await this.createTmpDestination();

    const env: Record<string, string | undefined> = {
      PGUSER: username,
      PGPASSWORD: password,
      PGHOST: host,
      PGPORT: port,
      BACKUP_ROOT: tempDir,
      SELECTION_MODE: step.databaseSelection.strategy,
    };
    if (step.databaseSelection.strategy === "include") {
      env.INCLUDE_DBS = step.databaseSelection.include.join(" ");
    }
    if (step.databaseSelection.strategy === "exclude") {
      env.EXCLUDE_DBS = step.databaseSelection.exclude.join(" ");
    }

    try {
      const { exitCode, stdout, stdall } = await CommandRunner.run({
        cmd: ["bash", scriptPath],
        env: {
          ...process.env,
          ...env,
        },
      });
      if (exitCode !== 0) {
        throw new Error(stdall);
      }

      // Parse and validate the JSON output with Zod
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
    } catch (error) {
      throw ExecutionError.Postgres.backup_failed({
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  public async restore(artifacts: Artifact[], step: Step.PostgresRestore): Promise<void> {
    if (artifacts.length !== 1) {
      throw ExecutionError.Postgres.restore_requires_exactly_one_artifact({ amount: artifacts.length });
    }
    const artifact = artifacts[0];
    this.requireArtifactType("file", artifact);

    const scriptPath = join(import.meta.dir, "pg_restore.sh");
    const { username, password, host, port } = UrlParser.postgres(this.readEnvironmentVariable(step.connectionReference));

    const env: Record<string, string | undefined> = {
      PGUSER: username,
      PGPASSWORD: password,
      PGHOST: host,
      PGPORT: port,
      RESTORE_FILE: artifact.path,
      DATABASE: step.database,
    };

    try {
      const { exitCode, stdout, stdall } = await CommandRunner.run({
        cmd: ["bash", scriptPath],
        env: {
          ...process.env,
          ...env,
        },
      });
      if (exitCode !== 0) {
        throw new Error(stdall);
      }
      // Parse and validate the JSON output with Zod
      z.object({
        status: z.literal("success"),
        database: z.string(),
      }).parse(JSON.parse(stdout));
    } catch (error) {
      throw ExecutionError.Postgres.restore_failed({
        message: error instanceof Error ? error.message : String(error),
      });
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
