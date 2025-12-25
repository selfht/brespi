import { Env } from "@/Env";
import { CommandHelper } from "@/helpers/CommandHelper";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { rename, rm } from "fs/promises";
import { join } from "path";
import { z } from "zod/v4";
import { AbstractAdapter } from "../AbstractAdapter";

export class PostgresAdapter extends AbstractAdapter {
  private readonly EXTENSION = ".sql";

  public constructor(
    protected readonly env: Env.Private,
    private readonly commandExecutionFn = CommandHelper.execute,
  ) {
    super(env);
  }

  public async backup(step: Step.PostgresBackup): Promise<Artifact[]> {
    // TODO: add below to step, using a DB_REFERENCE, just like the S3 step
    const opts = {
      host: "postgres",
      user: "postgres",
      password: "postgres",
    };

    // Get the path to the backup script
    const scriptPath = join(import.meta.dir, "pg_backup.sh");

    // Prepare environment variables based on selection mode
    const tempDir = await this.createTmpDestination();
    const env = {
      PGHOST: opts.host,
      PGUSER: opts.user,
      PGPASSWORD: opts.password,
      BACKUP_ROOT: tempDir,
      SELECTION_MODE: step.databaseSelection.strategy,
      ...(step.databaseSelection.strategy === "include" && {
        INCLUDE_DBS: step.databaseSelection.include.join(" "),
      }),
      ...(step.databaseSelection.strategy === "exclude" && {
        EXCLUDE_DBS: step.databaseSelection.exclude.join(" "),
      }),
    };

    try {
      const { exitCode, stdout, stderr } = await this.commandExecutionFn({
        cmd: ["bash", scriptPath],
        env: {
          ...process.env,
          ...env,
        },
      });
      if (exitCode !== 0) {
        throw new Error(`Script exited with code ${exitCode}: ${stderr}`);
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
      throw new Error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  public async restore(artifacts: Artifact[], step: Step.PostgresRestore): Promise<void> {
    throw new Error("TODO: Not implemented");
  }

  public static parseUrl(url: string): { username: string; password: string; host: string; port?: number } {
    try {
      const parsedUrl = new URL(url);
      // Validate protocol
      if (parsedUrl.protocol !== "postgresql:" && parsedUrl.protocol !== "postgres:") {
        throw new Error(`Invalid protocol: ${parsedUrl.protocol}. Expected 'postgresql:' or 'postgres:'`);
      }
      // Extract username and password
      const username = decodeURIComponent(parsedUrl.username);
      const password = decodeURIComponent(parsedUrl.password);
      if (!username) {
        throw new Error("Username is required in connection URL");
      }
      if (!password) {
        throw new Error("Password is required in connection URL");
      }
      // Extract host (strip brackets from IPv6 addresses)
      let host = parsedUrl.hostname;
      if (!host) {
        throw new Error("Host is required in connection URL");
      }
      // Remove brackets from IPv6 addresses
      if (host.startsWith("[") && host.endsWith("]")) {
        host = host.slice(1, -1);
      }
      // Extract port (if specified)
      const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : undefined;
      return {
        username,
        password,
        host,
        ...(port !== undefined && { port }),
      };
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Invalid URL format: ${error.message}`);
      }
      throw error;
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
