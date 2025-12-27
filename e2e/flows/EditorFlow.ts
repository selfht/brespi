import { type Locator, type Page, expect } from "@playwright/test";

export namespace EditorFlow {
  type StepCommon = {
    id?: string;
    previousId?: string;
  };
  type StepOptions =
    | (StepCommon & { type: "Postgres Backup"; connectionReference?: string })
    | (StepCommon & { type: "Compression"; level?: string })
    | (StepCommon & { type: "Encryption"; keyReference?: string })
    | (StepCommon & {
        type: "S3 Upload";
        bucket?: string;
        endpoint?: string;
        accessKeyReference?: string;
        secretKeyReference?: string;
        baseFolder?: string;
      });
  export type CreatePipelineOptions = {
    name: string;
    steps: StepOptions[];
  };
  type CreatePipelineResult = {
    id: string;
  };

  export async function createPipeline(page: Page, options: CreatePipelineOptions): Promise<CreatePipelineResult> {
    const Config = {
      DRAG_STEPS_TO_PREVENT_CLICK_INTERPRETATION: 30,
      GRID: {
        startX: 80,
        startY: 50,
        columnSpacing: 180,
        rowSpacing: 120,
        maxColumns: 5,
        maxRows: 3,
      },
    };
    const maxSteps = Config.GRID.maxColumns * Config.GRID.maxRows;
    if (options.steps.length > maxSteps) {
      throw new Error(
        `Unsupported: Pipeline has ${options.steps.length} steps, but maximum supported is ${maxSteps} (${Config.GRID.maxColumns}x${Config.GRID.maxRows} grid)`,
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
      await addStep(page, step);

      const stepId = step.id || `step-${i}`;
      const stepLocator = page.getByTestId(`BLOCK:${step.type}`);
      stepLocators.set(stepId, stepLocator);

      const column = i % Config.GRID.maxColumns;
      const row = Math.floor(i / Config.GRID.maxColumns);
      const x = Config.GRID.startX + column * Config.GRID.columnSpacing;
      const y = Config.GRID.startY + row * Config.GRID.rowSpacing;
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
    const url = page.url();
    const match = url.match(/pipelines\/(.+)/);
    if (!match) {
      throw new Error(`Invalid url: ${url}`);
    }
    return {
      id: match[1],
    };
  }

  async function addStep(page: Page, step: StepOptions) {
    await page.getByText(step.type, { exact: true }).click();
    switch (step.type) {
      case "Postgres Backup":
        if (step.connectionReference) {
          await page.getByLabel("Connection Reference").fill(step.connectionReference);
        }
        break;
      case "Compression":
        if (step.level) {
          await page.getByLabel("Compression level").fill(step.level);
        }
        break;
      case "Encryption":
        if (step.keyReference) {
          await page.getByLabel("Key Reference").fill(step.keyReference);
        }
        break;
      case "S3 Upload":
        if (step.bucket) await page.getByLabel("Bucket").fill(step.bucket);
        if (step.endpoint) await page.getByLabel("Endpoint").fill(step.endpoint);
        if (step.accessKeyReference) await page.getByLabel("Access Key Reference").fill(step.accessKeyReference);
        if (step.secretKeyReference) await page.getByLabel("Secret Key Reference").fill(step.secretKeyReference);
        if (step.baseFolder) await page.getByLabel("Base Folder").fill(step.baseFolder);
        break;
    }
    await page.getByText("Add Step").click();
  }
}
