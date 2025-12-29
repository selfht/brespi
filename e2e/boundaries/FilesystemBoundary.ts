import { mkdir, rm } from "fs/promises";
import path from "path";

export namespace FilesystemBoundary {
  export const SCRATCH_PAD = path.join("opt", "scratchpad");

  export async function ensureEmptyScratchPad() {
    await rm(SCRATCH_PAD, { recursive: true, force: true });
    await mkdir(SCRATCH_PAD, { recursive: true });
  }
}
