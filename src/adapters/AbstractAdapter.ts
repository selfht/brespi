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

  protected generateArtifactDestination(): { outputId: string; outputPath: string } {
    const outputId = Bun.randomUUIDv7();
    return {
      outputId,
      outputPath: join(this.env.X_BRESPI_ARTIFACTS_ROOT, outputId),
    };
  }

  protected async createTempDir(): Promise<string> {
    const unixSeconds = Math.floor(Temporal.Now.instant().epochMilliseconds / 1000);
    const folder = join(this.env.X_BRESPI_ROOT, `tmp-${unixSeconds}-${Bun.randomUUIDv7()}`);
    await mkdir(folder, { recursive: true });
    return folder;
  }
}
