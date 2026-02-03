import test, { expect } from "@playwright/test";
import { FSBoundary } from "./boundaries/FSBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { Common } from "./common/Common";
import { NotificationFlow } from "./flows/NotificationFlow";
import { PipelineFlow } from "./flows/PipelineFlow";
import { join } from "path";

test.beforeEach(async ({ request, page }) => {
  await ResetBoundary.reset(request);
  await page.goto("");
});

for (const variant of ["successful pipeline", "failing pipeline"] as const) {
  test(`delivers a custom_script notification for a ${variant}`, async ({ page }) => {
    // given
    const scriptPath = FSBoundary.SCRATCH_PAD.join("notify.sh");
    await Common.writeExecutableFile(scriptPath).withContents(`
        #!/bin/bash
        echo "$BRESPI_PIPELINE_NAME" >> notification.txt
      `);
    await NotificationFlow.createPolicy(page, {
      channel: "Custom script",
      customScriptPath: scriptPath,
      active: true,
      events: {
        execution_started: true,
        execution_completed: true,
      },
    });

    // when
    if (variant === "successful pipeline") {
      await PipelineFlow.create(page, {
        name: "Irrelevant",
        steps: [
          {
            type: "Filter",
            filterCriteriaMethod: "exact",
            filterCriteriaName: "will-always-succeed",
          },
        ],
      });
      await PipelineFlow.execute(page);
    }
    if (variant === "failing pipeline") {
      await PipelineFlow.create(page, {
        name: "Irrelevant",
        steps: [
          {
            type: "Custom Script",
            path: "i/do/not/exist/so/i/will/fail",
          },
        ],
      });
      await PipelineFlow.execute(page, { expectedOutcome: "error" });
    }

    // then
    const notification = await Common.readFile(join(scriptPath, "..", "notification.txt"));
    const pipelineNameOccurrences = (notification.match(/Irrelevant/g) || []).length;
    expect(pipelineNameOccurrences).toEqual(2);
  });
}
