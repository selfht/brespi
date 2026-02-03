import { expect, test } from "@playwright/test";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { S3Boundary } from "./boundaries/S3Boundary";
import { PipelineFlow } from "./flows/PipelineFlow";

test.beforeEach(async ({ request, page }) => {
  await ResetBoundary.reset(request);
  await page.goto("");
});

test("creates and deletes a simple backup pipeline", async ({ page }) => {
  // given
  const pipeline: PipelineFlow.CreateOptions = {
    name: "Typical Backup Pipeline",
    steps: [
      {
        id: "A",
        type: "PostgreSQL Backup",
        connectionReference: "MY_POSTGRESQL_URL",
      },
      {
        previousId: "A",
        id: "B",
        type: "Compression",
      },
      {
        previousId: "B",
        id: "C",
        type: "Encryption",
        keyReference: "MY_ENCRYPTION_KEY",
      },
      {
        previousId: "C",
        ...S3Boundary.connectionDefaults,
        type: "S3 Upload",
        baseFolder: "my-base-folder",
      },
    ],
  };

  // when
  await PipelineFlow.create(page, pipeline);
  await page.getByRole("link", { name: "Pipelines" }).click();
  // then (there's a pipeline on the main page)
  const pipelineLink = page.getByRole("link", { name: pipeline.name });
  await expect(pipelineLink).toBeVisible();
  // then (the configuration is out of sync)
  const outOfSyncLocator = page.getByTestId("conf-out-of-sync");
  await expect(outOfSyncLocator).toBeVisible();

  // when
  await pipelineLink.click();
  page.on("dialog", (dialog) => dialog.accept());
  await PipelineFlow.remove(page);
  // then (we're on the homepage again)
  await expect(page).toHaveTitle("Pipelines | Brespi");
  expect(page.url()).toMatch(/\/pipelines$/);
  await expect(pipelineLink).not.toBeVisible();
  // then (the configuration is in sync again)
  await expect(outOfSyncLocator).not.toBeVisible();
});

test("different step forms of the same type have their values reset upon focus", async ({ page }) => {
  const testCases = [
    { id: "A", glob: "*ABC*" },
    { id: "B", glob: "*DEF*" },
    { id: "C", glob: "*GHI*" },
  ];
  // given
  const { stepLocators } = await PipelineFlow.create(page, {
    name: "Test Pipeline",
    steps: testCases.map(({ id, glob }, index) => ({
      id,
      previousId: index > 0 ? testCases[index - 1].id : undefined,
      type: "Filter",
      filterCriteriaMethod: "glob",
      filterCriteriaNameGlob: glob,
    })),
  });
  // when
  await page.getByRole("button", { name: "Edit" }).click();
  for (const { id, glob } of testCases) {
    await stepLocators.get(id)!.click();
    await expect(page.getByLabel("Name glob")).toHaveValue(glob);
  }
});

test("relation links can be created when a step form is open", async ({ page }) => {
  // given (a pipeline where the steps aren't linked)
  await PipelineFlow.Subroutine.navigateToNewPipelineScreen(page);
  const unlinkedStepLocators = await PipelineFlow.Subroutine.insertSteps(page, [
    {
      id: "A",
      type: "Compression",
    },
    {
      id: "B",
      type: "Decompression",
    },
  ]);

  // when (entering "form mode" for a particular step)
  await unlinkedStepLocators.get("A")!.click();
  await expect(page.getByRole("button", { name: "Update step" })).toBeVisible();
  // when (drawing an arrow)
  await PipelineFlow.Subroutine.drawRelationArrow(page, unlinkedStepLocators, {
    from: "A",
    to: "B",
  });
  await page.getByRole("button", { name: "Cancel" }).last().click();

  // then (no errors after saving, because the steps have been linked)
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Execute" })).toBeVisible();
});

test("relation links can be deleted when a step form is open", async ({ page }) => {
  // given (a valid saved pipeline)
  await PipelineFlow.Subroutine.navigateToNewPipelineScreen(page);
  const { stepLocators } = await PipelineFlow.create(page, {
    name: "Valid pipeline",
    steps: [
      {
        id: "A",
        type: "Compression",
      },
      {
        id: "B",
        previousId: "A",
        type: "Decompression",
      },
    ],
  });

  // when (entering "form mode" for a particular step)
  await page.getByRole("button", { name: "Edit" }).click();
  await stepLocators.get("A")!.click();
  await expect(page.getByRole("button", { name: "Update step" })).toBeVisible();
  // when (removing the arrow relation)
  await PipelineFlow.Subroutine.cancelRelationArrow(page, stepLocators, { to: "B" });
  await page.getByRole("button", { name: "Cancel" }).last().click();

  // then (an error when saving, because the steps aren't linked anymore)
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("PipelineError::too_many_starting_steps")).toBeVisible();
});
