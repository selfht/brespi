import { Env } from "@/Env";
import { readdir } from "fs/promises";
import { join } from "path";

export namespace AdapterHelper {
  export function generateArtifactPath(): { outputId: string; outputPath: string } {
    const outputId = Bun.randomUUIDv7();
    return {
      outputId,
      outputPath: join(Env.artifactsRoot(), outputId),
    };
  }

  export async function findSingleChildPathWithinDirectory(dirPath: string): Promise<string> {
    const children = await readdir(dirPath);
    if (children.length === 0) {
      throw new Error(`Directory is empty: ${dirPath}`);
    }
    if (children.length > 1) {
      throw new Error(`Directory contains more than one child: ${dirPath} (found ${children.length} children)`);
    }
    return join(dirPath, children[0]);
  }
}
