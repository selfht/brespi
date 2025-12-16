import { Env } from "@/Env";
import { join } from "path";

export type Artifact = Artifact.File | Artifact.Directory;

export namespace Artifact {
  type Common = {
    id: string;
    path: string;
    name: string;
  };

  export type File = Common & {
    type: "file";
    size: number;
  };

  export type Directory = Common & {
    type: "directory";
  };

  const VALID_FORMAT = /^\d{10}\.[a-z0-9]{8}\.[a-zA-Z0-9_-]+$/;

  export function isValidFilename(filename: string): boolean {
    return VALID_FORMAT.test(filename);
  }

  export function generatePath({ name, timestamp }: Pick<Artifact, "name" | "timestamp">): string {
    const filename = `${timestamp}.${generateShortId()}.${sanitizeName(name)}`;
    return join(Env.artifactsRoot(), filename);
  }

  export function parseLogicalName(validFileName: string): string {
    if (!isValidFilename(validFileName)) {
      throw new Error(`Invalid filename: ${validFileName}`);
    }
    const [_1, _2, name] = validFileName.split(".");
    return name;
  }

  export function sanitizeName(name: string): string {
    // Replace non-ASCII and problematic characters with underscores
    // Keep: alphanumeric (a-z, A-Z, 0-9), hyphens, underscores
    return name.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 30);
  }

  export function generateShortId(): string {
    // Generate a random 8-character alphanumeric ID
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < 8; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }
}
