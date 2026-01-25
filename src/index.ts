import { mkdir } from "fs/promises";
import { initializeSqlite } from "./drizzle/sqlite";
import { Env } from "./Env";
import { ConfigurationRepository } from "./repositories/ConfigurationRepository";
import { seed } from "./seed";
import { Server } from "./Server";
import { ServerRegistry } from "./ServerRegistry";
import { CleanupService } from "./services/CleanupService";
import { ScheduleService } from "./services/ScheduleService";
import { rm } from "fs/promises";

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
const sqlite = await initializeSqlite(env);

/**
 * Bootstrap the registry
 */
const registry = await ServerRegistry.bootstrap(env, sqlite);

/**
 * Initialize the application
 */
async function initializeApplication() {
  await registry.get(ConfigurationRepository).initialize();
  await registry.get(ScheduleService).initializeSchedules();
  registry.get(CleanupService).keepTmpFolderClean();
  registry.get(Server).listen();
}

/**
 * Development only: seed the environment
 */
const seedEnvironment = true && env.O_BRESPI_STAGE === "development";
if (seedEnvironment) {
  await rm(env.O_BRESPI_CONFIGURATION, { force: true });
  await initializeApplication();
  await seed(registry);
} else {
  await initializeApplication();
}
