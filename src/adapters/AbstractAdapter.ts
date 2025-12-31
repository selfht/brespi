import { Env } from "@/Env";
import { ExecutionError } from "@/errors/ExecutionError";
import { Generate } from "@/helpers/Generate";
import { Artifact } from "@/models/Artifact";
import { stat } from "fs/promises";
import { mkdir } from "fs/promises";

export abstract class AbstractAdapter {
  protected constructor(protected readonly env: Env.Private) {}

  protected addExtension(name: string, extension: string): string {
    return name.endsWith(extension) ? name : `${name}${extension}`;
  }

  protected stripExtension(name: string, extension: string): string {
    return name.endsWith(extension) ? name.slice(0, name.length - extension.length) : name;
  }

  protected generateArtifactDestination() {
    const { destinationId, destinationPath } = Generate.tmpDestination(this.env);
    return {
      outputId: destinationId,
      outputPath: destinationPath,
    };
  }

  protected async createTmpDestination(): Promise<string> {
    const { destinationPath } = Generate.tmpDestination(this.env);
    await mkdir(destinationPath, { recursive: true });
    return destinationPath;
  }

  protected readEnvironmentVariable(reference: string): string {
    const value = process.env[reference];
    if (!value) {
      throw ExecutionError.environment_variable_missing({ name: reference });
    }
    return value;
  }

  protected requireArtifactType(requiredType: Artifact["type"], ...artifacts: Artifact[]): void {
    const badArtifact = artifacts.find((a) => a.type !== requiredType);
    if (badArtifact) {
      throw ExecutionError.artifact_type_invalid({ name: badArtifact.name, type: badArtifact.type });
    }
  }

  // Overload signatures
  protected async requireFilesystemExistence<T extends "file" | "directory">(path: string, expectedType: T): Promise<{ type: T }>;
  protected async requireFilesystemExistence(path: string): Promise<{ type: "file" | "directory" }>;
  protected async requireFilesystemExistence(path: string, expectedType?: "file" | "directory"): Promise<{ type: "file" | "directory" }> {
    try {
      const s = await stat(path);
      const actualType = s.isFile() ? "file" : "directory";
      // Validate type if expected type was provided
      if (expectedType && actualType !== expectedType) {
        throw ExecutionError.filesystem_item_type_invalid({
          path,
          expected: expectedType,
          actual: actualType,
        });
      }
      return { type: actualType };
    } catch (err: any) {
      if (err.code === "ENOENT") {
        throw ExecutionError.filesystem_item_does_not_exist({ path });
      }
      throw err; // real error (permissions, etc.)
    }
  }
}
