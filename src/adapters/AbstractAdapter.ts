import { Env } from "@/Env";
import { join } from "path";

export abstract class AbstractAdapter {
  protected constructor(protected readonly env: Env.Private) {}

  protected generateArtifactDestination(): { outputId: string; outputPath: string } {
    const outputId = Bun.randomUUIDv7();
    return {
      outputId,
      outputPath: join(this.env.artifactsRoot(), outputId),
    };
  }
}
