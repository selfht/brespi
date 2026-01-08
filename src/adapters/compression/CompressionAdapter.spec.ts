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
    const compressed = await adapter.compress(original, {} as Step.Compression);
    const decompressed = await adapter.decompress(compressed, {} as Step.Decompression);
    // then
    expect(decompressed.name).toEqual("Collection");
  });
});
