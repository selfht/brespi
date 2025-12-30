import { type Locator, type Page, expect } from "@playwright/test";
import { Common } from "e2e/common/Common";

export namespace EditorFlow {
  type StepCommon = {
    id?: string;
    previousId?: string;
  };
  export type StepOptions =
    | (StepCommon & {
        type: "Filesystem Write";
        folder?: string;
        managedStorage?: "true" | "false";
      })
    | (StepCommon & {
        type: "Filesystem Read";
        fileOrFolder?: string;
        managedStorage?: "true" | "false";
        managedStorageSelectionTarget?: "latest" | "specific";
        managedStorageSelectionSpecificVersion?: string;
      })
    | (StepCommon & { type: "Compression"; level?: string })
    | (StepCommon & { type: "Decompression" })
    | (StepCommon & { type: "Encryption"; keyReference?: string })
    | (StepCommon & { type: "Decryption"; keyReference?: string })
    | (StepCommon & { type: "Folder Flatten" })
    | (StepCommon & { type: "Folder Group" })
    | (StepCommon & {
        type: "Filter";
        filterCriteriaMethod?: "exact" | "glob" | "regex";
        filterCriteriaName?: string;
        filterCriteriaNameGlob?: string;
        filterCriteriaNameRegex?: string;
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
        managedStorageSelectionTarget?: "latest" | "specific";
        managedStorageSelectionVersion?: string;
        filterCriteria?: "true" | "false";
        filterCriteriaMethod?: "exact" | "glob" | "regex";
        filterCriteriaName?: string;
        filterCriteriaNameGlob?: string;
        filterCriteriaNameRegex?: string;
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
      throw new Error("Invalid url");
    }
    return pipelineId;
  }

  async function fillStepForm(page: Page, step: StepOptions): Promise<null> {
    await page.getByText(step.type, { exact: true }).click();
    switch (step.type) {
      case "Filesystem Write": {
        if (step.folder) await page.getByLabel("Folder").fill(step.folder);
        if (step.managedStorage) await page.getByLabel("Use managed storage?").selectOption(step.managedStorage);
        return null;
      }
      case "Filesystem Read": {
        if (step.fileOrFolder) await page.getByLabel("File or folder").fill(step.fileOrFolder);
        if (step.managedStorage) await page.getByLabel("Use managed storage?").selectOption(step.managedStorage);
        if (step.managedStorage === "true" && step.managedStorageSelectionTarget) {
          await page.getByLabel("Managed storage: target").selectOption(step.managedStorageSelectionTarget);
          if (step.managedStorageSelectionTarget === "specific" && step.managedStorageSelectionSpecificVersion) {
            await page.getByLabel("Managed storage: version").fill(step.managedStorageSelectionSpecificVersion);
          }
        }
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
        if (step.filterCriteriaMethod) await page.getByLabel("Method", { exact: true }).selectOption(step.filterCriteriaMethod);
        if (step.filterCriteriaMethod === "exact" && step.filterCriteriaName) {
          await page.getByLabel("Name", { exact: true }).fill(step.filterCriteriaName);
        } else if (step.filterCriteriaMethod === "glob" && step.filterCriteriaNameGlob) {
          await page.getByLabel("Name glob").fill(step.filterCriteriaNameGlob);
        } else if (step.filterCriteriaMethod === "regex" && step.filterCriteriaNameRegex) {
          await page.getByLabel("Name regex").fill(step.filterCriteriaNameRegex);
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
        if (step.accessKeyReference) await page.getByLabel("Access key reference").fill(step.accessKeyReference);
        if (step.secretKeyReference) await page.getByLabel("Secret key reference").fill(step.secretKeyReference);
        if (step.baseFolder) await page.getByLabel("Base Folder").fill(step.baseFolder);
        return null;
      }
      case "S3 Download": {
        if (step.bucket) await page.getByLabel("Bucket").fill(step.bucket);
        if (step.endpoint) await page.getByLabel("Endpoint").fill(step.endpoint);
        if (step.region) await page.getByLabel("Region").fill(step.region);
        if (step.accessKeyReference) await page.getByLabel("Access key reference").fill(step.accessKeyReference);
        if (step.secretKeyReference) await page.getByLabel("Secret key reference").fill(step.secretKeyReference);
        if (step.baseFolder) await page.getByLabel("Base Folder").fill(step.baseFolder);
        if (step.managedStorageSelectionTarget) {
          await page.getByLabel("Managed storage: target").selectOption(step.managedStorageSelectionTarget);
          if (step.managedStorageSelectionTarget === "specific" && step.managedStorageSelectionVersion) {
            await page.getByLabel("Managed storage: version").fill(step.managedStorageSelectionVersion);
          }
        }
        if (step.filterCriteria) await page.getByLabel("Use managed storage?").selectOption(step.filterCriteria);
        if (step.filterCriteria === "true") {
          if (step.filterCriteriaMethod) await page.getByLabel("Filter: method", { exact: true }).selectOption(step.filterCriteriaMethod);
          if (step.filterCriteriaMethod === "exact" && step.filterCriteriaName) {
            await page.getByLabel("Filter: name", { exact: true }).fill(step.filterCriteriaName);
          } else if (step.filterCriteriaMethod === "glob" && step.filterCriteriaNameGlob) {
            await page.getByLabel("Filter: name glob").fill(step.filterCriteriaNameGlob);
          } else if (step.filterCriteriaMethod === "regex" && step.filterCriteriaNameRegex) {
            await page.getByLabel("Filter: name regex").fill(step.filterCriteriaNameRegex);
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
