import { Env } from "@/Env";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { spawn } from "bun";
import { rename, rm } from "fs/promises";
import { join } from "path";
import { z } from "zod/v4";
import { AdapterHelper } from "../AdapterHelper";

export class PostgresAdapter {
  private readonly opts: PostgresAdapter.ConstructorArgs;

  constructor() {
    this.opts = {
      host: "postgres",
      user: "postgres",
      password: "postgres",
    };
  }

  public async backup(options: Step.PostgresBackup): Promise<Artifact[]> {
    // Get the path to the backup script
    const scriptPath = join(import.meta.dir, "pg_backup.sh");

    // Prepare environment variables based on selection mode
    const tempDir = await Env.createTempDir();
    const env = {
      PGHOST: this.opts.host,
      PGUSER: this.opts.user,
      PGPASSWORD: this.opts.password,
      BACKUP_ROOT: tempDir,
      SELECTION_MODE: options.databaseSelection.strategy,
      ...(options.databaseSelection.strategy === "include" && {
        INCLUDE_DBS: options.databaseSelection.include.join(" "),
      }),
      ...(options.databaseSelection.strategy === "exclude" && {
        EXCLUDE_DBS: options.databaseSelection.exclude.join(" "),
      }),
    };

    try {
      // Execute the backup script using Bun's spawn with proper environment
      const proc = spawn({
        cmd: ["bash", scriptPath],
        env: {
          ...process.env,
          ...env,
        },
        stdout: "pipe",
        stderr: "pipe",
      });
      await proc.exited;
      const stdout = await new Response(proc.stdout).text();

      if (proc.exitCode !== 0) {
        const stderr = await new Response(proc.stderr).text();
        throw new Error(`Script exited with code ${proc.exitCode}: ${stderr}`);
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
                size: z.number(),
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
        const { outputId, outputPath } = AdapterHelper.generateArtifactPath();
        await rename(db.path, outputPath);
        artifacts.push({
          id: outputId,
          type: "file",
          path: outputPath,
          name: db.name,
          size: db.size,
        });
      }
      return artifacts;
    } catch (error) {
      throw new Error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  public async restore(artifacts: Artifact[], options: Step.PostgresRestore): Promise<void> {
    throw new Error("TODO: Not implemented");
  }
}

export namespace PostgresAdapter {
  export interface ConstructorArgs {
    host: string;
    user: string;
    password: string;
  }
}
