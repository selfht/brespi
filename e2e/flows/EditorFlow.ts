import { type Locator, type Page, expect } from "@playwright/test";
import { Common } from "e2e/common/Common";

export namespace EditorFlow {
  type StepCommon = {
    id?: string;
    previousId?: string;
  };
  type StepOptions =
    | (StepCommon & { type: "Filesystem Read"; path?: string })
    | (StepCommon & { type: "Filesystem Write"; path?: string })
    | (StepCommon & { type: "Compression"; level?: string })
    | (StepCommon & { type: "Decompression" })
    | (StepCommon & { type: "Encryption"; keyReference?: string })
    | (StepCommon & { type: "Decryption"; keyReference?: string })
    | (StepCommon & { type: "Folder Flatten" })
    | (StepCommon & { type: "Folder Group" })
    | (StepCommon & {
        type: "Filter";
        selectionMethod?: "exact" | "glob" | "regex";
        selectionName?: string;
        selectionNameGlob?: string;
        selectionNameRegex?: string;
      })
    | (StepCommon & {
        type: "Custom Script";
        path?: string;
        passthrough?: "true" | "false";
      })
    | (StepCommon & {
        type: "S3 Upload";
        bucket?: string;
        endpoint?: string;
        region?: string;
        accessKeyReference?: string;
        secretKeyReference?: string;
        baseFolder?: string;
      })
    | (StepCommon & {
        type: "S3 Download";
        bucket?: string;
        endpoint?: string;
        region?: string;
        accessKeyReference?: string;
        secretKeyReference?: string;
        baseFolder?: string;
        selectionTarget?: "latest" | "specific";
        selectionSpecificVersion?: string;
      })
    | (StepCommon & {
        type: "Postgres Backup";
        connectionReference?: string;
        databaseSelectionStrategy?: "all" | "include" | "exclude";
        databaseSelectionInclude?: string;
        databaseSelectionExclude?: string;
      })
    | (StepCommon & {
        type: "Postgres Restore";
        connectionReference?: string;
        database?: string;
      });
  export type CreatePipelineOptions = {
    name: string;
    steps: StepOptions[];
  };
  export async function createPipeline(page: Page, options: CreatePipelineOptions): Promise<string> {
    const Config = {
      DRAG_STEPS_TO_PREVENT_CLICK_INTERPRETATION: 30,
      Grid: {
        START_X: 80,
        START_Y: 50,
        MAX_COLUMNS: 4,
        COLUMN_SPACING: 180,
        MAX_ROWS: 3,
        ROW_SPACING: 120,
      },
    };
    const maxSteps = Config.Grid.MAX_COLUMNS * Config.Grid.MAX_ROWS;
    if (options.steps.length > maxSteps) {
      throw new Error(
        `Unsupported: Pipeline has ${options.steps.length} steps, but maximum supported is ${maxSteps} (${Config.Grid.MAX_COLUMNS}x${Config.Grid.MAX_ROWS} grid)`,
      );
    }
    // Navigate to pipeline editor
    await page.goto("pipelines");
    await page.getByRole("link", { name: "New Pipeline ..." }).click();
    // Track locators for the canvas and individual steps blocks (for arrow drawing)
    const canvas = page.getByTestId("canvas");
    const stepLocators = new Map<string, Locator>();
    // Add and position each step
    for (let i = 0; i < options.steps.length; i++) {
      const step = options.steps[i];
      await fillStepForm(page, step);
      await page.getByText("Add Step").click();

      const stepId = step.id || `step-${i}`;
      const stepLocator = page.getByTestId(`BLOCK:${step.type}`);
      stepLocators.set(stepId, stepLocator);

      const column = i % Config.Grid.MAX_COLUMNS;
      const row = Math.floor(i / Config.Grid.MAX_COLUMNS);
      const x = Config.Grid.START_X + column * Config.Grid.COLUMN_SPACING;
      const y = Config.Grid.START_Y + row * Config.Grid.ROW_SPACING;
      await stepLocator.dragTo(canvas, {
        targetPosition: { x, y },
        steps: Config.DRAG_STEPS_TO_PREVENT_CLICK_INTERPRETATION,
      });
    }
    // Draw arrows based on previousId relationships
    for (const step of options.steps) {
      if (step.previousId) {
        const stepId = step.id || `step-${options.steps.indexOf(step)}`;
        const fromLocator = stepLocators.get(step.previousId);
        const toLocator = stepLocators.get(stepId);
        if (!fromLocator || !toLocator) {
          throw new Error(`Cannot draw arrow: step ${step.previousId} or ${stepId} not found`);
        }
        // Drag from previous step's output to current step's input
        await fromLocator.getByTestId("output").dragTo(toLocator.getByTestId("input"), {
          steps: Config.DRAG_STEPS_TO_PREVENT_CLICK_INTERPRETATION,
        });
      }
    }
    // Set pipeline name and save
    const nameInput = page.locator("input");
    await nameInput.fill(options.name);
    await page.getByRole("button", { name: "Save" }).click();
    // Wait until the saving is complete
    await expect(page.getByRole("button", { name: "Execute" })).toBeVisible();
    // Extract the ID from the url
    const pipelineId = Common.extractCurrentPipelineIdFromUrl(page);
    if (!pipelineId) {
      throw new Error(`Invalid url: ${url}`);
    }
    return pipelineId;
  }

  async function fillStepForm(page: Page, step: StepOptions): Promise<null> {
    await page.getByText(step.type, { exact: true }).click();
    switch (step.type) {
      case "Filesystem Read": {
        if (step.path) await page.getByLabel("Path").fill(step.path);
        return null;
      }
      case "Filesystem Write": {
        if (step.path) await page.getByLabel("Path").fill(step.path);
        return null;
      }
      case "Compression": {
        if (step.level) await page.getByLabel("Compression level").fill(step.level);
        return null;
      }
      case "Decompression": {
        // No configurable fields
        return null;
      }
      case "Encryption": {
        if (step.keyReference) await page.getByLabel("Key Reference").fill(step.keyReference);
        return null;
      }
      case "Decryption": {
        if (step.keyReference) await page.getByLabel("Key Reference").fill(step.keyReference);
        return null;
      }
      case "Folder Flatten": {
        // No configurable fields
        return null;
      }
      case "Folder Group": {
        // No configurable fields
        return null;
      }
      case "Filter": {
        if (step.selectionMethod) {
          await page.getByLabel("Selection method").selectOption(step.selectionMethod);
          if (step.selectionMethod === "exact" && step.selectionName) {
            await page.getByLabel("Name", { exact: true }).fill(step.selectionName);
          } else if (step.selectionMethod === "glob" && step.selectionNameGlob) {
            await page.getByLabel("Name glob").fill(step.selectionNameGlob);
          } else if (step.selectionMethod === "regex" && step.selectionNameRegex) {
            await page.getByLabel("Name regex").fill(step.selectionNameRegex);
          }
        }
        return null;
      }
      case "Custom Script": {
        if (step.path) await page.getByLabel("Script path").fill(step.path);
        if (step.passthrough) await page.getByLabel("Passthrough?").selectOption(step.passthrough);
        return null;
      }
      case "S3 Upload": {
        if (step.bucket) await page.getByLabel("Bucket").fill(step.bucket);
        if (step.endpoint) await page.getByLabel("Endpoint").fill(step.endpoint);
        if (step.region) await page.getByLabel("Region").fill(step.region);
        if (step.accessKeyReference) await page.getByLabel("Access Key Reference").fill(step.accessKeyReference);
        if (step.secretKeyReference) await page.getByLabel("Secret Key Reference").fill(step.secretKeyReference);
        if (step.baseFolder) await page.getByLabel("Base Folder").fill(step.baseFolder);
        return null;
      }
      case "S3 Download": {
        if (step.bucket) await page.getByLabel("Bucket").fill(step.bucket);
        if (step.endpoint) await page.getByLabel("Endpoint").fill(step.endpoint);
        if (step.region) await page.getByLabel("Region").fill(step.region);
        if (step.accessKeyReference) await page.getByLabel("Access Key Reference").fill(step.accessKeyReference);
        if (step.secretKeyReference) await page.getByLabel("Secret Key Reference").fill(step.secretKeyReference);
        if (step.baseFolder) await page.getByLabel("Base Folder").fill(step.baseFolder);
        if (step.selectionTarget) {
          await page.getByLabel("Version Selection").selectOption(step.selectionTarget);
          if (step.selectionTarget === "specific" && step.selectionSpecificVersion) {
            await page.getByLabel("Version").fill(step.selectionSpecificVersion);
          }
        }
        return null;
      }
      case "Postgres Backup": {
        if (step.connectionReference) await page.getByLabel("Connection Reference").fill(step.connectionReference);
        if (step.databaseSelectionStrategy) {
          await page.getByLabel("Database selection").selectOption(step.databaseSelectionStrategy);
          if (step.databaseSelectionStrategy === "include" && step.databaseSelectionInclude) {
            await page.getByLabel("Include").fill(step.databaseSelectionInclude);
          } else if (step.databaseSelectionStrategy === "exclude" && step.databaseSelectionExclude) {
            await page.getByLabel("Exclude").fill(step.databaseSelectionExclude);
          }
        }
        return null;
      }
      case "Postgres Restore": {
        if (step.connectionReference) await page.getByLabel("Connection Reference").fill(step.connectionReference);
        if (step.database) await page.getByLabel("Database").fill(step.database);
        return null;
      }
    }
  }
}
