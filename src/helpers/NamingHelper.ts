import { Config } from "@/Config";
import { Artifact } from "@/models/Artifact";
import { join } from "path";

export class NamingHelper {
  // Regex to validate format: <timestamp>.<randomid>.<name>
  // Example: 1731672345.a1b2c3d4.musicworld
  private static readonly VALID_FORMAT = /^\d{10}\.[a-z0-9]{8}\.[a-zA-Z0-9_-]+$/;

  public static isValidFilename(filename: string): boolean {
    return NamingHelper.VALID_FORMAT.test(filename);
  }

  public static generatePath({ name, timestamp }: Pick<Artifact, "name" | "timestamp">): string {
    const filename = `${timestamp}.${NamingHelper.generateShortId()}.${NamingHelper.sanitizeName(name)}`;
    return join(Config.artifactsRoot(), filename);
  }

  public static parseLogicalName(validFileName: string): string {
    if (!NamingHelper.isValidFilename(validFileName)) {
      throw new Error(`Invalid filename: ${validFileName}`);
    }
    const [_1, _2, name] = validFileName.split(".");
    return name;
  }

  public static sanitizeName(name: string): string {
    // Replace non-ASCII and problematic characters with underscores
    // Keep: alphanumeric (a-z, A-Z, 0-9), hyphens, underscores
    return name.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 30);
  }

  private static generateShortId(): string {
    // Generate a random 8-character alphanumeric ID
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < 8; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }
}
