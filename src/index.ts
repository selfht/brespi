import { mkdir } from "fs/promises";
import { Env } from "./Env";
import { Server } from "./Server";
import { ServerRegistry } from "./ServerRegistry";
import { CleanupService } from "./services/CleanupService";

/**
 * Initialize the env configuration
 */
const env = Env.readAndValidateEnvironment();

/**
 * Create the main directories
 */
await Promise.all([
  mkdir(env.X_BRESPI_TMP_ROOT, { recursive: true }), //
  mkdir(env.X_BRESPI_DATA_ROOT, { recursive: true }),
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
