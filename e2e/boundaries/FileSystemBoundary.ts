import { rm } from "fs/promises";
import { join } from "path";

export namespace FileSystemBoundary {
  export const SCRATCH_PAD = join("opt", "files");

  export async function deleteScratchPad() {
    await rm(SCRATCH_PAD, { recursive: true, force: true });
  }
}
