import { writeFile } from "fs/promises";
import { readFile } from "fs/promises";
import { rm } from "fs/promises";
import { chmod } from "fs/promises";
import { mkdir } from "fs/promises";
import { dirname } from "path";

export namespace Common {
  export async function emptyDir(path: string) {
    await rm(path, { recursive: true, force: true });
    await mkdir(path, { recursive: true });
  }

  export async function readFileUtf8(path: string) {
    return await readFile(path, { encoding: "utf-8" });
  }

  export async function writeFileRecursive(path: string, contents: string) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents);
  }

  export function writeScript(path: string) {
    return {
      async withContents(contents: string) {
        await writeFileRecursive(path, contents.trim());
        await chmod(path, 0o755);
      },
    };
  }
}
