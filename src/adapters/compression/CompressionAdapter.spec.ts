import { Test } from "@/helpers/Test.spec";
import { Step } from "@/models/Step";
import { beforeEach, describe, expect, it } from "bun:test";
import { CompressionAdapter } from "./CompressionAdapter";

describe(CompressionAdapter.name, async () => {
  const adapter = new CompressionAdapter(await Test.buildEnv());

  beforeEach(async () => {
    await Test.cleanup();
  });

  it("should respect and retain the original artifact name when compressing/decompressing a folder", async () => {
    // given
    const [original] = await Test.createArtifacts("d:Collection");
    expect(original.name).toEqual("Collection");
    // when
    const compresionStep = { algorithm: { implementation: "targzip", level: 9 } } as Step.Compression;
    const compressed = await adapter.compress(original, compresionStep);
    const decompressionStep = {} as Step.Decompression;
    const decompressed = await adapter.decompress(compressed, decompressionStep);
    // then
    expect(decompressed.name).toEqual("Collection");
  });
  
  it("should result in different file sizes for different compression levels", () => {
    // TODO
  });
});
