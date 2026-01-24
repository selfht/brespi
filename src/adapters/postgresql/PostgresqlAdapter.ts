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

export class PostgresqlAdapter extends AbstractAdapter {
  private readonly EXTENSION = ".dump";

  public constructor(protected readonly env: Env.Private) {
    super(env);
  }

  public async backup(step: Step.PostgresqlBackup): Promise<AdapterResult> {
    const { username, password, host, port } = UrlParser.postgresql(this.readEnvironmentVariable(step.connectionReference));
    const { toolkit } = step;
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
          SELECTION_MODE: step.databaseSelection.method,
          ...(step.databaseSelection.method === "include" ? { DB_INCLUSIONS: step.databaseSelection.inclusions.join(" ") } : {}),
          ...(step.databaseSelection.method === "exclude" ? { DB_EXCLUSIONS: step.databaseSelection.exclusions.join(" ") } : {}),
          ...(toolkit.resolution === "automatic"
            ? { TOOLKIT_RESOLUTION: "automatic" }
            : {
                TOOLKIT_RESOLUTION: "manual",
                TOOLKIT_PSQL: toolkit.psql,
                TOOLKIT_PG_DUMP: toolkit.pg_dump,
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
            psql: z.object({
              version: z.string(),
              path: z.string(),
            }),
            pg_dump: z.object({
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
      throw this.mapError(e, ExecutionError.postgresql_backup_failed);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  public async restore(artifacts: Artifact[], step: Step.PostgresqlRestore): Promise<AdapterResult> {
    this.requireArtifactSize(artifacts, { min: 1, max: 1 });
    const artifact = artifacts[0];
    this.requireArtifactType("file", artifact);
    const { username, password, host, port } = UrlParser.postgresql(this.readEnvironmentVariable(step.connectionReference));
    const { toolkit } = step;
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
          ...(toolkit.resolution === "automatic"
            ? { TOOLKIT_RESOLUTION: "automatic" }
            : {
                TOOLKIT_RESOLUTION: "manual",
                TOOLKIT_PSQL: toolkit.psql,
                TOOLKIT_PG_RESTORE: toolkit.pg_restore,
              }),
        },
      });
      const output = z
        .object({
          status: z.literal("success"),
          database: z.string(),
          runtime: z.object({
            psql: z.object({
              version: z.string(),
              path: z.string(),
            }),
            pg_restore: z.object({
              version: z.string(),
              path: z.string(),
            }),
          }),
        })
        .parse(JSON.parse(stdout));
      return AdapterResult.create([], output.runtime);
    } catch (e) {
      throw this.mapError(e, ExecutionError.postgresql_restore_failed);
    }
  }
}

export namespace PostgresqlAdapter {
  export interface ConstructorArgs {
    host: string;
    user: string;
    password: string;
  }
}
