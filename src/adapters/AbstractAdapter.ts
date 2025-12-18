import { Env } from "@/Env";
import { Temporal } from "@js-temporal/polyfill";
import { mkdir } from "fs/promises";
import { join } from "path";

export abstract class AbstractAdapter {
  protected constructor(protected readonly env: Env.Private) {}

  protected addExtension(name: string, extension: string): string {
    return name.endsWith(extension) ? name : `${name}${extension}`;
  }

  protected stripExtension(name: string, extension: string): string {
    return name.endsWith(extension) ? name.slice(0, name.length - extension.length) : name;
  }

  protected generateShortRandomString(): string {
    const length = 6;
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < length; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  protected generateArtifactDestination(): { outputId: string; outputPath: string } {
    const outputId = this.generateUniqueEpochBasedId();
    return {
      outputId,
      outputPath: join(this.env.X_BRESPI_ARTIFACTS_ROOT, outputId),
    };
  }

  protected async createTempDirectory(): Promise<string> {
    const folder = join(this.env.X_BRESPI_ROOT, this.generateUniqueEpochBasedId());
    await mkdir(folder, { recursive: true });
    return folder;
  }

  private generateUniqueEpochBasedId() {
    return `${Temporal.Now.instant().epochMilliseconds}-${this.generateShortRandomString()}`;
  }
}
