import test, { Page } from "@playwright/test";
import { describe } from "node:test";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { Common } from "./common/Common";
import { EditorFlow } from "./flows/EditorFlow";
import { ScheduleFlow } from "./flows/ScheduleFlow";

describe("scheduling | start_and_stop", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test("executes a dummy pipeline every second while active", async ({ page }) => {
    // given
    const scriptPath = FilesystemBoundary.SCRATCH_PAD.join("simple.sh");
    const outputDir = FilesystemBoundary.SCRATCH_PAD.join("output");
    await Common.writeExecutableFile(scriptPath).withContents(`
      #!/bin/bash
      echo "Hello World" > "$BRESPI_ARTIFACTACTS_OUT/greetings.txt"
    `);
    const { name } = await createPipeline(page, {
      scriptPath,
      passthrough: false,
      outputDir,
      managedStorage: true,
    });

    // when
    await ScheduleFlow.createSchedule(page, {
      pipelineName: name,
      cron: "* * * * * *",
      active: true,
    });
    // then
  });

  type Options = {
    scriptPath: string;
    passthrough: boolean;
    outputDir: string;
    managedStorage: boolean;
  };
  async function createPipeline(page: Page, { scriptPath, passthrough, outputDir, managedStorage }: Options) {
    const name = "My Custom Script";
    const id = await EditorFlow.createPipeline(page, {
      name: "My Custom Script",
      steps: [
        {
          id: "A",
          type: "Custom Script",
          path: scriptPath,
          passthrough: passthrough ? "true" : "false",
        },
        {
          previousId: "A",
          type: "Filesystem Write",
          managedStorage: managedStorage ? "true" : "false",
          folder: outputDir,
        },
      ],
    });
    return { id, name };
  }
});
