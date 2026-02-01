import { describe, it } from "bun:test";
import { basename, join } from "path";

/**
 * This method contains skippable methods
 */
describe("REGRESSION > utils", async () => {
  it.skip("is a manual utility function for updating the regression suite", async () => {});
});

export namespace utils {
  export type ConfigurationJson = {
    filename: string;
    json: any;
  };
  const configurationsPath = join(import.meta.dir, "configurations");
  export async function readConfigurationJsons(): Promise<ConfigurationJson[]> {
    const glob = new Bun.Glob("*.json");
    const files = await Array.fromAsync(glob.scan({ cwd: configurationsPath, absolute: true }));
    const output = await Promise.all(
      [...files].map<Promise<ConfigurationJson>>(async (file) => ({
        filename: basename(file),
        json: await Bun.file(file).json(),
      })),
    );
    if (output.length === 0) {
      throw new Error(`Couldn't find configuration JSONs: ${configurationsPath}`);
    }
    return output;
  }
  export async function writeConfigurationJsons(input: ConfigurationJson[]): Promise<void> {
    await Promise.all(
      input.map(async ({ filename, json }) => {
        const path = join(configurationsPath, filename);
        await Bun.write(path, JSON.stringify(json, null, 2));
      }),
    );
  }
}
