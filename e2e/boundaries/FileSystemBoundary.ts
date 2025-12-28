import { mkdir } from "fs/promises";
import { rm } from "fs/promises";
import { join } from "path";

export namespace FileSystemBoundary {
  export const SCRATCH_PAD_APP = "/app/opt/scratchpad";
  export const SCRATCH_PAD_PLAYWRIGHT = "./opt/scratchpad";

  export async function ensureEmptyScratchPad() {
    await rm(SCRATCH_PAD_PLAYWRIGHT, { recursive: true, force: true });
    await mkdir(SCRATCH_PAD_PLAYWRIGHT, { recursive: true });
  }
}
