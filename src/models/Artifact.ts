import { Env } from "@/Env";
import { join } from "path";

export type Artifact = Artifact.File | Artifact.Directory;

export namespace Artifact {
  type Common = {
    id: string;
    name: string;
    path: string;
  };

  export type File = Common & {
    type: "file";
    size: number;
  };

  export type Directory = Common & {
    type: "directory";
  };

  export function generateDestination(): { outputId: string; outputPath: string } {
    const outputId = Bun.randomUUIDv7();
    return {
      outputId,
      outputPath: join(Env.artifactsRoot(), outputId),
    };
  }
}
