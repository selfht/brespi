import { ServerRegistry } from "./ServerRegistry";
import { Config } from "./Config";
import { mkdir } from "fs/promises";
import { Server } from "./Server";
import { CleanupService } from "./services/CleanupService";

/**
 * Create the artifacts directory
 */
await mkdir(Config.artifactsRoot(), { recursive: true });

/**
 * Set up the registry
 */
const registry = await ServerRegistry.bootstrap();

/**
 * Periodically clean up
 */
registry.get(CleanupService).periodicallyKeepThingsClean();

/**
 * Listen for incoming requests
 */
registry.get(Server).listen();
