import { Env } from "@/Env";
import { Exception } from "@/errors/exception/Exception";
import { ExecutionError } from "@/errors/ExecutionError";
import { CommandRunner } from "@/helpers/CommandRunner";
import { Generate } from "@/helpers/Generate";
import { Artifact } from "@/models/Artifact";
import { mkdir, stat } from "fs/promises";

export abstract class AbstractAdapter {
  protected constructor(protected readonly env: Env.Private) {}

  protected async runCommand(options: CommandRunner.Options) {
    const { exitCode, ...result } = await CommandRunner.run(options);
    if (exitCode !== 0) {
      throw ExecutionError.nonzero_script_exit({ exitCode: exitCode, stdall: result.stdall });
    }
    return result;
  }

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
      throw ExecutionError.artifact_type_invalid({ name: badArtifact.name, type: badArtifact.type, requiredType });
    }
  }

  protected requireArtifactSize({ length }: Artifact[], { min, max }: { min?: number; max?: number }): void {
    if ((typeof min === "number" && length < min) || (typeof max === "number" && length > max)) {
      throw ExecutionError.artifact_count_invalid({ count: length, min, max });
    }
  }

  // Overload signatures
  protected async requireFilesystemExistence<T extends "file" | "directory">(path: string, expectedType: T): Promise<{ type: T }>;
  protected async requireFilesystemExistence(path: string): Promise<{ type: "file" | "directory" }>;
  protected async requireFilesystemExistence(path: string, requiredType?: "file" | "directory"): Promise<{ type: "file" | "directory" }> {
    try {
      const s = await stat(path);
      const type = s.isFile() ? "file" : "directory";
      // Validate type if expected type was provided
      if (requiredType && type !== requiredType) {
        throw ExecutionError.fspath_type_invalid({
          path,
          type,
          requiredType,
        });
      }
      return { type };
    } catch (err: any) {
      if (err.code === "ENOENT") {
        throw ExecutionError.fspath_does_not_exist({ path });
      }
      throw err; // real error (permissions, etc.)
    }
  }

  protected mapError(e: unknown, custom: (opt: { cause: string }) => Exception): Exception {
    if (Exception.isInstance(e)) {
      return e;
    }
    return custom({
      cause: e instanceof Error ? e.message : String(e),
    });
  }
}
