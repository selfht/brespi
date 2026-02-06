import { mkdir } from "fs/promises";
import { initializeSqlite } from "./drizzle/sqlite";
import { Env } from "./Env";
import { BasicAuthMiddleware } from "./middleware/basicauth/BasicAuthMiddleware";
import { ConfigurationRepository } from "./repositories/ConfigurationRepository";
import { Server } from "./Server";
import { ServerRegistry } from "./ServerRegistry";
import { CleanupService } from "./services/CleanupService";

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
await registry.get(ConfigurationRepository).initializeFromDisk();
await registry.get(BasicAuthMiddleware).initializeFromDisk();
registry.get(CleanupService).keepTmpFolderClean();
registry.get(Server).listen();
