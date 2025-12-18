export class CleanupService {
  public async periodicallyKeepThingsClean() {
    setInterval(() => {
      this.cleanIllegalFilesAndFoldersWithinArtifactsDir();
      this.cleanForgottenArtifacts();
      this.cleanForgottenTempFolders();
    }, 30_000);
  }

  private async cleanIllegalFilesAndFoldersWithinArtifactsDir() {
    // TODO; perhaps the destination generator should generate IDs which look like `${unixMillis}-${randomSuffix}`
  }

  private async cleanForgottenArtifacts() {
    // TODO
  }

  private async cleanForgottenTempFolders() {
    // TODO
  }
}
