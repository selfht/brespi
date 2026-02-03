import { Page } from "@playwright/test";
import fsp from "fs/promises";
import { dirname } from "path";

export namespace Common {
  export const Regex = {
    RANDOM: /\w+/.source,
    TIMESTAMP: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+/.source,
  };

  export function extractCurrentPipelineIdFromUrl(page: Page): string | undefined {
    const url = page.url();
    const match = url.match(/pipelines\/(.+)/);
    if (!match || !match[1]) {
      return undefined;
    }
    return match[1];
  }

  export async function emptyDirectory(path: string) {
    await fsp.rm(path, { recursive: true, force: true });
    await fsp.mkdir(path, { recursive: true });
  }

  export async function readFile(path: string) {
    return await fsp.readFile(path, { encoding: "utf-8" });
  }

  export async function existingFile(path: string) {
    try {
      await fsp.access(path);
      return true;
    } catch {
      return false;
    }
  }

  export async function writeFile(path: string, contents: string) {
    await fsp.mkdir(dirname(path), { recursive: true });
    await fsp.writeFile(path, contents);
  }

  export function writeExecutableFile(path: string) {
    return {
      async withContents(contents: string) {
        await writeFile(path, contents.trim());
        await fsp.chmod(path, 0o755);
      },
    };
  }
}
