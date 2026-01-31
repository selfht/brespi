import test, { expect, Page } from "@playwright/test";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { Common } from "./common/Common";
import { PipelineFlow } from "./flows/PipelineFlow";
import { ScheduleFlow } from "./flows/ScheduleFlow";

test.beforeEach(async ({ request, page }) => {
  await ResetBoundary.reset(request);
  await page.goto("");
});

test("executes a pipeline every second while active", async ({ page }) => {
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
  await ScheduleFlow.create(page, {
    pipelineName: name,
    cron: "* * * * * *", // do something every second
    active: true,
  });
  await page.goto("pipelines");
  await page.getByRole("link", { name }).click();
  // then
  const executionLocator = page.getByText("Successfully executed");
  await expect.poll(() => executionLocator.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(2);

  // when
  await ScheduleFlow.update(page, {
    index: 0,
    active: false,
  });
  await page.goto("pipelines");
  await page.getByRole("link", { name }).click();
  await expect.poll(() => executionLocator.count()).toBeGreaterThanOrEqual(2);
  // then
  const countBeforeWaiting = await executionLocator.count();
  await page.waitForTimeout(2000); // should've done something after 2 seconds if the schedule was still active
  expect(await executionLocator.count()).toEqual(countBeforeWaiting);
});

type Options = {
  scriptPath: string;
  passthrough: boolean;
  outputDir: string;
  managedStorage: boolean;
};
async function createPipeline(page: Page, { scriptPath, passthrough, outputDir, managedStorage }: Options) {
  const name = "My Custom Script";
  const id = await PipelineFlow.create(page, {
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
