import { mkdir } from "fs/promises";
import { initializeSqlite } from "./drizzle/sqlite";
import { Env } from "./Env";
import { ConfigurationRepository } from "./repositories/ConfigurationRepository";
import { seed } from "./seed";
import { Server } from "./Server";
import { ServerRegistry } from "./ServerRegistry";
import { CleanupService } from "./services/CleanupService";
import { ScheduleService } from "./services/ScheduleService";

/**
 * Initialize the env configuration
 */
const env = Env.initialize();

/**
 * Create the main directories
 */
await Promise.all([
  mkdir(env.X_BRESPI_TMP_ROOT, { recursive: true }),
  mkdir(env.X_BRESPI_DATA_ROOT, { recursive: true }),
  mkdir(env.X_BRESPI_CONFIG_ROOT, { recursive: true }),
]);

/**
 * Initialize the database
 */
const sqlite = await initializeSqlite(env);

/**
 * Set up the registry
 */
const registry = await ServerRegistry.bootstrap(env, sqlite);

/**
 * Set up the configuration repo
 */
await registry.get(ConfigurationRepository).initialize();

/**
 * Schedules
 */
registry.get(ScheduleService).initializeSchedules();
registry.get(CleanupService).periodicallyClean();

/**
 * Listen for incoming requests
 */
registry.get(Server).listen();

/**
 * Development only: seed the environment
 */
if (env.O_BRESPI_STAGE === "development") {
  await seed(registry);
}
