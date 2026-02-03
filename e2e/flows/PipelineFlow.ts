import { type Locator, type Page, expect } from "@playwright/test";
import { Common } from "e2e/common/Common";

export namespace PipelineFlow {
  type StepCommon = {
    id?: string;
    previousId?: string;
  };
  export type StepOptions =
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
        type: "Filesystem Write";
        folder?: string;
        managedStorage?: "true" | "false";
        retention?: "none" | "last_n_versions";
        retentionMaxVersions?: number;
      })
    | (StepCommon & {
        type: "Filesystem Read";
        path?: string;
        managedStorage?: "true" | "false";
        managedStorageSelectionTarget?: "latest" | "specific";
        managedStorageSelectionSpecificVersion?: string;
        filterCriteria?: "true" | "false";
        filterCriteriaMethod?: "exact" | "glob" | "regex";
        filterCriteriaName?: string;
        filterCriteriaNameGlob?: string;
        filterCriteriaNameRegex?: string;
      })
    | (StepCommon & {
        type: "S3 Upload";
        bucket?: string;
        baseFolder?: string;
        endpoint?: string;
        region?: string;
        accessKeyReference?: string;
        secretKeyReference?: string;
        retention?: "none" | "last_n_versions";
        retentionMaxVersions?: number;
      })
    | (StepCommon & {
        type: "S3 Download";
        bucket?: string;
        baseFolder?: string;
        endpoint?: string;
        region?: string;
        accessKeyReference?: string;
        secretKeyReference?: string;
        managedStorageSelectionTarget?: "latest" | "specific";
        managedStorageSelectionVersion?: string;
        filterCriteria?: "true" | "false";
        filterCriteriaMethod?: "exact" | "glob" | "regex";
        filterCriteriaName?: string;
        filterCriteriaNameGlob?: string;
        filterCriteriaNameRegex?: string;
      })
    | (StepCommon & {
        type: "PostgreSQL Backup";
        connectionReference?: string;
        databaseSelectionStrategy?: "all" | "include" | "exclude";
        databaseSelectionInclusions?: string;
        databaseSelectionExclusions?: string;
      })
    | (StepCommon & {
        type: "PostgreSQL Restore";
        connectionReference?: string;
        database?: string;
      })
    | (StepCommon & {
        type: "MariaDB Backup";
        connectionReference?: string;
        databaseSelectionStrategy?: "all" | "include" | "exclude";
        databaseSelectionInclusions?: string;
        databaseSelectionExclusions?: string;
      })
    | (StepCommon & {
        type: "MariaDB Restore";
        connectionReference?: string;
        database?: string;
      });

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

  type StepLocators = Map<string, Locator>;

  export type CreateOptions = {
    name: string;
    steps: StepOptions[];
  };
  export async function create(page: Page, options: CreateOptions): Promise<{ id: string; stepLocators: StepLocators }> {
    const maxSteps = Config.Grid.MAX_COLUMNS * Config.Grid.MAX_ROWS;
    if (options.steps.length > maxSteps) {
      throw new Error(
        `Unsupported: Pipeline has ${options.steps.length} steps, but maximum supported is ${maxSteps} (${Config.Grid.MAX_COLUMNS}x${Config.Grid.MAX_ROWS} grid)`,
      );
    }
    // Navigate to pipeline editor
    await Subroutine.navigateToNewPipelineScreen(page);
    // Track locators for the canvas and individual steps blocks (for arrow drawing)
    const stepLocators = await Subroutine.insertSteps(page, options.steps);
    // Draw arrows based on previousId relationships
    for (const step of options.steps) {
      if (step.previousId) {
        await Subroutine.drawRelationArrow(page, stepLocators, {
          from: step.previousId,
          to: step.id || `step-${options.steps.indexOf(step)}`,
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
    return { id: pipelineId, stepLocators };
  }

  export type RemoveOptions = {
    id?: string;
  };
  export async function remove(page: Page, { id } = {} as RemoveOptions): Promise<void> {
    if (id) {
      await page.goto(`pipelines/${id}`);
    } else {
      const pipelineIdFromUrl = Common.extractCurrentPipelineIdFromUrl(page);
      if (!pipelineIdFromUrl) {
        throw new Error("Cannot execute pipeline; no active pipeline view is open, and no id was supplied");
      }
    }
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
  }

  type ExecuteOptions = {
    id?: string;
    expectedOutcome?: "success" | "error";
  };
  export async function execute(page: Page, { id, expectedOutcome = "success" } = {} as ExecuteOptions) {
    if (id) {
      await page.goto(`pipelines/${id}`);
    } else {
      const pipelineIdFromUrl = Common.extractCurrentPipelineIdFromUrl(page);
      if (!pipelineIdFromUrl) {
        throw new Error("Cannot execute pipeline; no active pipeline view is open, and no id was supplied");
      }
    }

    const nameLocator = page.getByRole("heading", { level: 1 });
    await expect(nameLocator).toHaveText(/.+/);
    const name = await nameLocator.textContent();
    await expect(page).toHaveTitle(`${name} | Pipelines | Brespi`);

    await page.getByRole("button", { name: "Execute", exact: true }).click();
    if (expectedOutcome === "success") {
      await expect(page.getByText("This execution has succeeded")).toBeVisible();
    }
    if (expectedOutcome === "error") {
      await expect(page.getByText("This execution has failed")).toBeVisible();
    }
  }

  async function findCurrentlyActiveStepId(page: Page): Promise<string> {
    const element = page.locator("[data-x-selected='true']");
    const testId = await element.getAttribute("data-testid");
    if (!testId) {
      throw new Error("No selected block found or data-testid missing");
    }
    return testId;
  }

  /**
   * Subroutines in the pipeline flow
   */
  export namespace Subroutine {
    export async function navigateToNewPipelineScreen(page: Page) {
      await page.getByRole("link", { name: "Pipelines", exact: true }).click();
      await page.getByRole("link", { name: "New Pipeline ..." }).click();
    }

    export async function insertSteps(page: Page, steps: StepOptions[]): Promise<StepLocators> {
      const canvas = page.getByTestId("canvas");
      const stepLocators = new Map<string, Locator>();
      // Add and position each step
      for (let index = 0; index < steps.length; index++) {
        const step = steps[index];
        const stepId = step.id || `step-${index}`;

        const stepRef = await fillStepForm(page, step);
        await page.getByText("Add Step").click();

        const stepLocator = page.getByTestId(stepRef);
        stepLocators.set(stepId, stepLocator);

        const column = index % Config.Grid.MAX_COLUMNS;
        const row = Math.floor(index / Config.Grid.MAX_COLUMNS);
        const x = Config.Grid.START_X + column * Config.Grid.COLUMN_SPACING;
        const y = Config.Grid.START_Y + row * Config.Grid.ROW_SPACING;
        await stepLocator.dragTo(canvas, {
          targetPosition: { x, y },
          steps: Config.DRAG_STEPS_TO_PREVENT_CLICK_INTERPRETATION,
        });
      }
      return stepLocators;
    }

    export async function drawRelationArrow(page: Page, stepLocators: StepLocators, { from, to }: { from: string; to: string }) {
      const fromLocator = stepLocators.get(from);
      const toLocator = stepLocators.get(to);
      if (!fromLocator || !toLocator) {
        throw new Error(`Cannot draw arrow: step ${from} or ${to} not found`);
      }
      // Drag from previous step's output to current step's input
      await fromLocator.getByTestId("output").dragTo(toLocator.getByTestId("input"), {
        steps: Config.DRAG_STEPS_TO_PREVENT_CLICK_INTERPRETATION,
      });
    }

    export async function cancelRelationArrow(page: Page, stepLocators: StepLocators, { to }: { to: string }) {
      const toLocator = stepLocators.get(to);
      if (!toLocator) {
        throw new Error(`Cannot cancel arrow: step ${to} not found`);
      }
      await toLocator.getByTestId("input").click();
    }

    export async function fillStepForm(page: Page, step: StepOptions): Promise<string> {
      await page.getByRole("button", { name: step.type, exact: true }).click();
      switch (step.type) {
        case "Compression": {
          if (step.level) await page.getByLabel("Compression level").fill(step.level);
          return await findCurrentlyActiveStepId(page);
        }
        case "Decompression": {
          // No configurable fields
          return await findCurrentlyActiveStepId(page);
        }
        case "Encryption": {
          if (step.keyReference) await page.getByLabel("Key reference").fill(step.keyReference);
          return await findCurrentlyActiveStepId(page);
        }
        case "Decryption": {
          if (step.keyReference) await page.getByLabel("Key reference").fill(step.keyReference);
          return await findCurrentlyActiveStepId(page);
        }
        case "Folder Flatten": {
          // No configurable fields
          return await findCurrentlyActiveStepId(page);
        }
        case "Folder Group": {
          // No configurable fields
          return await findCurrentlyActiveStepId(page);
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
          return await findCurrentlyActiveStepId(page);
        }
        case "Custom Script": {
          if (step.path) await page.getByLabel("Script path").fill(step.path);
          if (step.passthrough) await page.getByLabel("Passthrough?").selectOption(step.passthrough);
          return await findCurrentlyActiveStepId(page);
        }
        case "Filesystem Write": {
          if (step.folder) await page.getByLabel("Folder").fill(step.folder);
          if (step.managedStorage) await page.getByLabel("Use managed storage?").selectOption(step.managedStorage);
          if (step.retention) await page.getByLabel("Retention policy").selectOption(step.retention);
          if (step.retentionMaxVersions) await page.getByLabel("Retention: max versions").fill(String(step.retentionMaxVersions));
          return await findCurrentlyActiveStepId(page);
        }
        case "Filesystem Read": {
          if (step.path) await page.getByLabel("Path").fill(step.path);
          if (step.managedStorage) await page.getByLabel("Use managed storage?").selectOption(step.managedStorage);
          if (step.managedStorage === "true" && step.managedStorageSelectionTarget) {
            await page.getByLabel("Managed storage: target").selectOption(step.managedStorageSelectionTarget);
            if (step.managedStorageSelectionTarget === "specific" && step.managedStorageSelectionSpecificVersion) {
              await page.getByLabel("Managed storage: version").fill(step.managedStorageSelectionSpecificVersion);
            }
          }
          if (step.filterCriteria) await page.getByLabel("Use filter?").selectOption(step.filterCriteria);
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
          return await findCurrentlyActiveStepId(page);
        }
        case "S3 Upload": {
          if (step.bucket) await page.getByLabel("Bucket").fill(step.bucket);
          if (step.baseFolder) await page.getByLabel("Base prefix").fill(step.baseFolder);
          if (step.endpoint) await page.getByLabel("Endpoint").fill(step.endpoint);
          if (step.region) await page.getByLabel("Region").fill(step.region);
          if (step.accessKeyReference) await page.getByLabel("Access key reference").fill(step.accessKeyReference);
          if (step.secretKeyReference) await page.getByLabel("Secret key reference").fill(step.secretKeyReference);
          if (step.retention) await page.getByLabel("Retention policy").selectOption(step.retention);
          if (step.retentionMaxVersions) await page.getByLabel("Retention: max versions").fill(String(step.retentionMaxVersions));
          return await findCurrentlyActiveStepId(page);
        }
        case "S3 Download": {
          if (step.bucket) await page.getByLabel("Bucket").fill(step.bucket);
          if (step.baseFolder) await page.getByLabel("Base prefix").fill(step.baseFolder);
          if (step.endpoint) await page.getByLabel("Endpoint").fill(step.endpoint);
          if (step.region) await page.getByLabel("Region").fill(step.region);
          if (step.accessKeyReference) await page.getByLabel("Access key reference").fill(step.accessKeyReference);
          if (step.secretKeyReference) await page.getByLabel("Secret key reference").fill(step.secretKeyReference);
          if (step.managedStorageSelectionTarget) {
            await page.getByLabel("Managed storage: target").selectOption(step.managedStorageSelectionTarget);
            if (step.managedStorageSelectionTarget === "specific" && step.managedStorageSelectionVersion) {
              await page.getByLabel("Managed storage: version").fill(step.managedStorageSelectionVersion);
            }
          }
          if (step.filterCriteria) await page.getByLabel("Use filter?").selectOption(step.filterCriteria);
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
          return await findCurrentlyActiveStepId(page);
        }
        case "PostgreSQL Backup": {
          if (step.connectionReference) await page.getByLabel("Connection reference").fill(step.connectionReference);
          if (step.databaseSelectionStrategy) {
            await page.getByLabel("Database selection method").selectOption(step.databaseSelectionStrategy);
            if (step.databaseSelectionStrategy === "include" && step.databaseSelectionInclusions) {
              await page.getByLabel("Database selection: inclusions").fill(step.databaseSelectionInclusions);
            } else if (step.databaseSelectionStrategy === "exclude" && step.databaseSelectionExclusions) {
              await page.getByLabel("Database selection: exclusions").fill(step.databaseSelectionExclusions);
            }
          }
          return await findCurrentlyActiveStepId(page);
        }
        case "PostgreSQL Restore": {
          if (step.connectionReference) await page.getByLabel("Connection reference").fill(step.connectionReference);
          if (step.database) await page.getByLabel("Database").fill(step.database);
          return await findCurrentlyActiveStepId(page);
        }
        case "MariaDB Backup": {
          if (step.connectionReference) await page.getByLabel("Connection reference").fill(step.connectionReference);
          if (step.databaseSelectionStrategy) {
            await page.getByLabel("Database selection method").selectOption(step.databaseSelectionStrategy);
            if (step.databaseSelectionStrategy === "include" && step.databaseSelectionInclusions) {
              await page.getByLabel("Database selection: inclusions").fill(step.databaseSelectionInclusions);
            } else if (step.databaseSelectionStrategy === "exclude" && step.databaseSelectionExclusions) {
              await page.getByLabel("Database selection: exclusions").fill(step.databaseSelectionExclusions);
            }
          }
          return await findCurrentlyActiveStepId(page);
        }
        case "MariaDB Restore": {
          if (step.connectionReference) await page.getByLabel("Connection reference").fill(step.connectionReference);
          if (step.database) await page.getByLabel("Database").fill(step.database);
          return await findCurrentlyActiveStepId(page);
        }
      }
    }
  }
}
