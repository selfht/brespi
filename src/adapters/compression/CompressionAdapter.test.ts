import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { beforeEach, describe, expect, it } from "bun:test";
import { CompressionAdapter } from "./CompressionAdapter";

describe(CompressionAdapter.name, async () => {
  let context!: TestEnvironment.Context;
  let adapter!: CompressionAdapter;

  beforeEach(async () => {
    context = await TestEnvironment.initialize();
    adapter = new CompressionAdapter(context.env);
  });

  it("should respect and retain the original artifact name when compressing/decompressing a folder", async () => {
    // given
    const [original] = await context.createArtifacts("d:Collection");
    expect(original.name).toEqual("Collection");
    // when
    const compressed = await adapter.compress(original, fixture.compression(9));
    const decompressed = await adapter.decompress(compressed, fixture.decompression());
    // then
    expect(decompressed.name).toEqual("Collection");
  });

  it("should result in different file sizes for different compression levels", async () => {
    // given
    const [file] = await context.createArtifacts("f:data");
    await Bun.write(file.path, generateCompressibleText());
    // when
    const level1 = await adapter.compress(file, fixture.compression(1)).then(readSize);
    const level9 = await adapter.compress(file, fixture.compression(9)).then(readSize);
    // then
    expect(level1).toBeGreaterThan(level9);
  });

  const fixture = {
    compression(level: number): Step.Compression {
      return {
        algorithm: {
          implementation: "targzip",
          level,
        },
      } as Step.Compression;
    },
    decompression(): Step.Decompression {
      return {} as Step.Decompression;
    },
  };

  async function readSize({ path }: Artifact): Promise<number> {
    const file = Bun.file(path);
    if (await file.exists()) {
      return file.size;
    }
    throw new Error(`File not found: ${path}`);
  }

  function generateCompressibleText(): string {
    // Use actual natural language text which historically shows differences between
    // compression levels. Mix unique and repeated paragraphs at varying distances.
    const paragraphs = [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.",
      "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.",
      "Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.",
    ];
    const text: string[] = [];
    // Generate 200+ paragraphs with strategic repetition (deterministic)
    for (let i = 0; i < 250; i++) {
      // Every 15th paragraph, repeat the first paragraph (creates ~8KB distance pattern)
      if (i % 15 === 0 && i > 0) {
        text.push(paragraphs[0]);
      } else {
        // Use varied paragraphs with deterministic identifiers
        const para = paragraphs[i % paragraphs.length];
        const uniqueId = `[ID:${i}-${i * 123}-${i * 456}]`;
        text.push(`${para} ${uniqueId}`);
      }
    }
    return text.join("\n\n");
  }
});
