import { readdir } from "fs/promises";
import { mkdir, rm } from "fs/promises";
import path, { join } from "path";

export namespace FilesystemBoundary {
  export const SCRATCH_PAD = path.join("opt", "scratchpad");

  export async function ensureEmptyScratchPad() {
    await rm(SCRATCH_PAD, { recursive: true, force: true });
    await mkdir(SCRATCH_PAD, { recursive: true });
  }

  export async function listFlattenedFolderEntries(folder: string): Promise<string[]> {
    const results: string[] = [];
    async function recurse(currentPath: string, relativePath: string = "") {
      const entries = await readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const entryRelativePath = relativePath ? join(relativePath, entry.name) : entry.name;
        if (entry.isFile()) {
          results.push(entryRelativePath);
        } else if (entry.isDirectory()) {
          await recurse(join(currentPath, entry.name), entryRelativePath);
        }
      }
    }
    await recurse(folder);
    return results;
  }
}
