import { Config } from "@/Config";
import { NamingHelper } from "@/helpers/NamingHelper";
import { Artifact } from "@/models/Artifact";
import { PipelineStep } from "@/models/PipelineStep";
import { Temporal } from "@js-temporal/polyfill";
import { spawn } from "bun";
import { rm } from "fs/promises";
import { rename } from "fs/promises";
import { join } from "path";
import { z } from "zod/v4";

export class PostgresAdapter {
  private readonly opts: PostgresAdapter.ConstructorArgs;
  constructor() {
    this.opts = {
      host: "postgres",
      user: "postgres",
      password: "postgres",
    };
  }

  public async backup(options: PipelineStep.PostgresBackup): Promise<Artifact[]> {
    // Get the path to the backup script
    const scriptPath = join(import.meta.dir, "pg_backup.sh");

    // Prepare environment variables based on selection mode
    const tempDir = await Config.createTempDir();
    const env = {
      PGHOST: this.opts.host,
      PGUSER: this.opts.user,
      PGPASSWORD: this.opts.password,
      BACKUP_ROOT: tempDir,
      SELECTION_MODE: options.databases.selection,
      ...(options.databases.selection === "include" && {
        INCLUDE_DBS: options.databases.include.join(" "),
      }),
      ...(options.databases.selection === "exclude" && {
        EXCLUDE_DBS: options.databases.exclude.join(" "),
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

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

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
      const timestamp = Math.floor(Temporal.Now.instant().epochMilliseconds / 1000);
      const artifacts: Artifact[] = [];
      for (const db of output.databases.filter((db): db is Extract<typeof db, { status: "success" }> => db.status === "success")) {
        const newPath = NamingHelper.generatePath({ name: db.name, timestamp });
        await rename(db.path, newPath);
        artifacts.push({
          path: newPath,
          size: db.size,
          type: "file",
          name: db.name,
          timestamp,
        });
      }
      return artifacts;
    } catch (error) {
      throw new Error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
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
