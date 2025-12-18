import { mkdir } from "fs/promises";
import { Env } from "./Env";
import { Server } from "./Server";
import { ServerRegistry } from "./ServerRegistry";
import { CleanupService } from "./services/CleanupService";

/**
 * Initialize the env configuration
 */
const env = Env();

/**
 * Create the artifacts directory
 */
await mkdir(env.artifactsRoot(), { recursive: true });

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
