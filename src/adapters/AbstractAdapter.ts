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
    return Generate.artifactDestination(this.env);
  }

  protected async createTempDestination() {
    const path = Generate.tmpDestination(this.env);
    await mkdir(path, { recursive: true });
    return path;
  }
}
