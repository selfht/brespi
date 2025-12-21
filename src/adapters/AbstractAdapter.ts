import { Env } from "@/Env";
import { Generate } from "@/helpers/Generate";
import { copyFile, cp, mkdir, readdir, rename, stat } from "fs/promises";

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
}
