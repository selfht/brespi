import test from "@playwright/test";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { Common } from "./common/Common";
import { NotificationFlow } from "./flows/NotificationFlow";

test.beforeEach(async ({ request, page }) => {
  await ResetBoundary.reset(request);
  await page.goto("");
});

test("custom notification script gets invoked", async ({ page }) => {
  // given
  const scriptPath = FilesystemBoundary.SCRATCH_PAD.join("notify.sh");
  await Common.writeExecutableFile(scriptPath).withContents(`
      #!/bin/bash
      echo "iwashere" > iwashere.txt
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
});
