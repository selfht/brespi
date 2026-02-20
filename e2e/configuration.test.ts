import { expect, Page, test } from "@playwright/test";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { PipelineFlow } from "./flows/PipelineFlow";
import { ScheduleFlow } from "./flows/ScheduleFlow";
import { FSBoundary } from "./boundaries/FSBoundary";
import { Common } from "./common/Common";
import { NotificationFlow } from "./flows/NotificationFlow";

test.beforeEach(async ({ request, page }) => {
  await ResetBoundary.reset(request);
  await page.goto("");
});

test.describe("pipelines affects configuration and sync status", () => {
  for (const configurationAction of ["Save changes", "Discard changes"] as const) {
    test(configurationAction, async ({ page }) => {
      // given
      await assertConfigurationState(page, "in_sync");

      // when
      await PipelineFlow.create(page, {
        name: "My Test Pipeline",
        steps: [
          {
            type: "Encryption",
            key: "${IRRELEVANT}",
          },
        ],
      });
      // then
      await assertConfigurationState(page, "out_of_sync");

      // when
      await page.getByRole("link", { name: "Configuration" }).click();
      if (configurationAction === "Save changes") {
        await page.getByRole("button", { name: "Save changes" }).click();
      } else if (configurationAction === "Discard changes") {
        await page.getByRole("button", { name: "Discard changes" }).click();
      } else {
        configurationAction satisfies never;
      }
      // then
      await assertConfigurationState(page, "in_sync");

      // when
      await page.getByRole("link", { name: "Pipelines" }).click();
      await expect(page.getByRole("link", { name: "New Pipeline ..." })).toBeVisible();
      // then
      const pipeline = page.getByRole("link", { name: "My Test Pipeline" });
      if (configurationAction === "Save changes") {
        await expect(pipeline).toBeVisible();
      } else if (configurationAction === "Discard changes") {
        await expect(pipeline).not.toBeVisible();
      } else {
        configurationAction satisfies never;
      }
    });
  }
});

test("when configuration is reinstated, schedules and policies are activated", async ({ page, request }) => {
  // given
  const { id: pipelineId } = await PipelineFlow.create(page, {
    name: "Pipeline-of-Nothing",
    steps: [{ type: "Filter" }],
  });
  await ScheduleFlow.create(page, {
    pipelineName: "Pipeline-of-Nothing",
    cron: "* * * * * *", // every second
    active: false,
  });
  const scriptPath = FSBoundary.SCRATCH_PAD.join("notify.sh");
  await Common.writeExecutableFile(scriptPath).withContents(`
      #!/bin/bash
      echo "$BRESPI_PIPELINE_NAME" > notification.txt
    `);
  await NotificationFlow.createPolicy(page, {
    channel: "Custom script",
    customScriptPath: scriptPath,
    events: {
      execution_started: false,
      execution_completed: true,
    },
    active: false,
  });
  await page.getByRole("link", { name: "Configuration" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await assertConfigurationState(page, "in_sync");

  // when
  await PipelineFlow.remove(page, { id: pipelineId });
  await page.getByRole("link", { name: "Schedules" }).click();
  await expect(page.getByRole("button", { name: "New Schedule ..." })).toBeVisible();
  await expect(page.getByTestId("schedule-row")).not.toBeVisible();
  await NotificationFlow.remove(page, { index: 0 });
  await expect(page.getByRole("button", { name: "New Policy ..." })).toBeVisible();
  await expect(page.getByTestId("policy-row")).not.toBeVisible();
  // then
  await assertConfigurationState(page, "out_of_sync");

  // when
  const notification = FSBoundary.SCRATCH_PAD.join("notification.txt");
  expect(await Common.existingFile(notification)).toEqual(false);
  await page.getByRole("link", { name: "Configuration" }).click();
  await page.getByRole("button", { name: "Discard changes" }).click();
  // then
  await assertConfigurationState(page, "in_sync");
  await expect.poll(() => Common.existingFile(notification), { timeout: 20_000 }).toEqual(true);
  expect(await Common.readFile(notification)).toContain("Pipeline-of-Nothing");
  await ResetBoundary.reset(request); // cleanup the hanging schedule
});

async function assertConfigurationState(page: Page, state: "in_sync" | "out_of_sync") {
  const outOfSyncLocator = page.getByTestId("conf-out-of-sync");
  const navigate = () => page.getByRole("link", { name: "Configuration" }).click();
  switch (state) {
    case "in_sync": {
      await expect(outOfSyncLocator).not.toBeVisible();
      await navigate();
      await expect(page.getByText(/^The current configuration is either empty or matches .+\/brespi\/config\.json$/)).toBeVisible();
      break;
    }
    case "out_of_sync": {
      await expect(outOfSyncLocator).toBeVisible();
      await navigate();
      await expect(
        page.getByText(/^The current configuration \(below\) has unsaved changes and doesn't match .+\/brespi\/config\.json$/),
      ).toBeVisible();
      await expect(page.getByText(/^Restarting Brespi discards these unsaved changes\.$/)).toBeVisible();
      break;
    }
    default: {
      state satisfies never;
    }
  }
}
