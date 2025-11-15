import { readdir } from "fs/promises";
import { join } from "path";

export class FolderHelper {
  public static async findSingleChildPathWithinDirectory(dirPath: string): Promise<string> {
    const children = await readdir(dirPath);
    if (children.length === 0) {
      throw new Error(`Directory is empty: ${dirPath}`);
    }
    if (children.length > 1) {
      throw new Error(`Directory contains more than one child: ${dirPath} (found ${children.length} children)`);
    }
    return join(dirPath, children[0]);
  }
}
