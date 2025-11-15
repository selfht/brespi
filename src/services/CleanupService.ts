import { Config } from "@/Config";
import { NamingHelper } from "@/helpers/NamingHelper";
import { readdir, rm } from "fs/promises";
import { join } from "path";

export class CleanupService {
  public async periodicallyKeepThingsClean() {
    setInterval(() => {
      this.cleanIllegalFilesAndFoldersWithinArtifactsDir();
      this.cleanForgottenArtifacts();
      this.cleanForgottenTempFolders();
    }, 30_000);
  }

  private async cleanIllegalFilesAndFoldersWithinArtifactsDir() {
    const entries = await readdir(Config.artifactsRoot(), { withFileTypes: true });
    for (const entry of entries) {
      const path = join(Config.artifactsRoot(), entry.name);
      if (!NamingHelper.isValidFilename(entry.name)) {
        await rm(path, { recursive: true, force: true });
      }
    }
  }

  private async cleanForgottenArtifacts() {
    // TODO
  }

  private async cleanForgottenTempFolders() {
    // TODO
  }
}
