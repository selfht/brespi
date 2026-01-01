import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { mkdir, rm } from "fs/promises";
import { $execution } from "./drizzle/schema";
import { initializeSqlite } from "./drizzle/sqlite";
import { Env } from "./Env";
import { Server } from "./Server";
import { ServerRegistry } from "./ServerRegistry";
import { CleanupService } from "./services/CleanupService";
import { Temporal } from "@js-temporal/polyfill";
import { Outcome } from "./models/Outcome";

/**
 * Initialize the env configuration
 */
const env = Env.initialize();

/**
 * Create the main directories
 */
await Promise.all([
  mkdir(env.X_BRESPI_TMP_ROOT, { recursive: true }), //
  mkdir(env.X_BRESPI_DATA_ROOT, { recursive: true }),
]);

/**
 * Initialize the database
 */
await rm(env.X_BRESPI_DATABASE);
const sqlite = await initializeSqlite(env);
await sqlite.insert($execution).values([
  {
    id: Bun.randomUUIDv7(),
    pipelineId: Bun.randomUUIDv7(),
    startedAt: Temporal.Now.plainDateTimeISO().toString(),
    resultOutcome: Outcome.success,
    resultDurationMs: 5000,
    resultCompletedAt: Temporal.Now.plainDateTimeISO().add({ days: 3 }).toString(),
  },
]);

/**
 * Set up the registry
 */
const registry = await ServerRegistry.bootstrap(env);

/**
 * Periodically clean up
 */
registry.get(CleanupService).periodicallyKeepThingsClean();

/**
 * Listen for incoming requests
 */
registry.get(Server).listen();
