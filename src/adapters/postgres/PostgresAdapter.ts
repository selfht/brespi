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
    private readonly commandHelper: CommandHelper,
  ) {
    super(env);
  }

  public async backup(step: Step.PostgresBackup): Promise<Artifact[]> {
    const scriptPath = join(import.meta.dir, "pg_backup.sh");
    const { username, password, host, port } = this.parseUrl(this.readEnvironmentVariable(step.connectionReference));
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
      const { exitCode, stdout, stderr } = await this.commandHelper.execute({
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
    if (artifacts.length !== 1) {
      throw new Error(`Restore requires exactly 1 artifact; amount=${artifacts.length}`);
    }
    const artifact = artifacts[0];
    if (artifact.type !== "file") {
      throw new Error(`Invalid artifact type: ${artifact.type}`);
    }

    const scriptPath = join(import.meta.dir, "pg_restore.sh");
    const { username, password, host, port } = this.parseUrl(this.readEnvironmentVariable(step.connectionReference));

    const env: Record<string, string | undefined> = {
      PGUSER: username,
      PGPASSWORD: password,
      PGHOST: host,
      PGPORT: port,
      RESTORE_FILE: artifact.path,
      DATABASE: step.database,
    };

    try {
      const { exitCode, stdout, stderr } = await this.commandHelper.execute({
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
          status: z.literal("success"),
          database: z.string(),
        })
        .parse(JSON.parse(stdout));
    } catch (error) {
      throw new Error(`Restore failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private parseUrl(url: string): { username: string; password: string; host: string; port?: string } {
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
      const port = parsedUrl.port;
      return {
        username,
        password,
        host,
        port: port || undefined,
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
