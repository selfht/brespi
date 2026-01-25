import { Test } from "@/testing/Test.test";
import { beforeEach, describe, it, expect } from "bun:test";
import { ScriptAdapter } from "./ScriptAdapter";
import { Step } from "@/models/Step";
import { join } from "path";
import { chmod } from "fs/promises";

describe(ScriptAdapter.name, async () => {
  const ctx = await Test.initialize();
  const adapter = new ScriptAdapter(ctx.env);

  beforeEach(async () => {
    await Test.cleanup();
  });

  it("executes a bash passthrough script", async () => {
    // given
    const iwasherePath = join(ctx.scratchpad, "iwashere");
    const scriptPath = await saveScript(`
      #!/bin/bash
      touch ${iwasherePath}
    `);
    expect(await Bun.file(iwasherePath).exists()).toBeFalse();
    // when
    const input = await ctx.createArtifacts("f:Apple.txt", "d:Bananafolder");
    const { artifacts: output } = await adapter.execute(
      input,
      fixture.script({
        passthrough: true,
        path: scriptPath,
      }),
    );
    // then
    expect(await Bun.file(iwasherePath).exists()).toBeTrue();
    expect(output).toEqual(input);
  });

  it("executes a bash transformer script", async () => {
    // given
    const scriptPath = await saveScript(`
      #!/bin/bash
      cat $BRESPI_ARTIFACTS_IN/*.txt > $BRESPI_ARTIFACTS_OUT/single.txt
      cat $BRESPI_ARTIFACTS_IN/*.sql > $BRESPI_ARTIFACTS_OUT/single.sql
    `);
    const input = await ctx.createArtifacts(
      { name: "f:Apple.txt", content: "Apple" },
      { name: "f:Banana.txt", content: "Banana" },
      { name: "f:Coconut.txt", content: "Coconut" },
      { name: "f:Archery.sql", content: "Archery" },
      { name: "f:Basketball.sql", content: "Basketball" },
      { name: "f:Cycling.sql", content: "Cycling" },
    );
    // when
    const { artifacts: output } = await adapter.execute(
      input,
      fixture.script({
        passthrough: false,
        path: scriptPath,
      }),
    );
    // then
    expect(output).toHaveLength(2);
    const txt = output.find(({ name }) => name === "single.txt")!;
    const sql = output.find(({ name }) => name === "single.sql")!;
    expect(txt).toBeDefined();
    expect(sql).toBeDefined();
    expect(await Bun.file(txt.path).text()).toEqual("AppleBananaCoconut");
    expect(await Bun.file(sql.path).text()).toEqual("ArcheryBasketballCycling");
  });

  it("fails on a nonzero script exit", async () => {
    // given
    const path = await saveScript(`
      #!/bin/bash
      echo "Overjoyed STDOUT"
      echo "Melancholic STDERR" >&2
      exit 1
    `);
    // when
    const action = () => adapter.execute([], fixture.script({ passthrough: true, path }));
    // then
    expect(action()).rejects.toEqual(
      expect.objectContaining({
        problem: "ExecutionError::nonzero_script_exit",
        details: expect.objectContaining({
          cause: "Overjoyed STDOUT\nMelancholic STDERR\n\n(exit 1)",
        }),
      }),
    );
  });

  const fixture = {
    script(options: Pick<Step.CustomScript, "path" | "passthrough">): Step.CustomScript {
      return options as Step.CustomScript;
    },
  };

  async function saveScript(content: string): Promise<string> {
    const path = join(ctx.scratchpad, Bun.randomUUIDv7());
    await Bun.write(path, content);
    await chmod(path, 0o755);
    return path;
  }
});
