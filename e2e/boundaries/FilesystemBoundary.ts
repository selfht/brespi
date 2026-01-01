import { mkdir, readdir, rm } from "fs/promises";
import path, { join } from "path";

export namespace FilesystemBoundary {
  export const SCRATCH_PAD = class {
    public static readonly root = path.join("opt", "scratchpad");

    public static join(...segments: string[]) {
      return path.join(this.root, ...segments);
    }

    public static async ensureEmpty() {
      await rm(this.root, { recursive: true, force: true });
      await mkdir(this.root, { recursive: true });
    }
  };

  export async function ensureEmptyScratchPad() {
    await SCRATCH_PAD.ensureEmpty();
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
