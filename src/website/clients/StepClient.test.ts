import { Step } from "@/models/Step";
import { StepWarning } from "@/models/StepWarning";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { beforeEach, describe, expect, it } from "bun:test";
import { StepClient } from "./StepClient";

describe(StepClient.name, () => {
  let context!: TestEnvironment.Context;
  let client!: StepClient;

  beforeEach(async () => {
    context = await TestEnvironment.initialize();
    client = new StepClient(context.yesttpMock.cast());
  });

  it("retrieves all sensitive field IDs without error", () => {
    // given
    const allSensitiveFieldIds = Object.values(Step.Type).flatMap((type) => {
      // when
      return client.getSensitiveFieldIds(type).sensitiveFieldIds;
    });
    // then (no errors)
    expect(allSensitiveFieldIds).not.toBeEmpty();
  });

  for (const [type, dotPaths] of Object.entries(StepWarning.sensitiveFields())) {
    for (const dotPath of dotPaths) {
      it(`has a label for ${type}[${dotPath}]`, async () => {
        // given
        context.yesttpMock.post.mockResolvedValue({
          body: { fields: [dotPath] } satisfies StepWarning,
          bodyRaw: "irrelevant",
          headers: {},
          status: 200,
        });
        // when
        const { warningFieldLabels } = await client.validate({ type } as Step);
        // then
        expect(warningFieldLabels.length).toEqual(1);
        expect(warningFieldLabels[0]).toBeString();
      });
    }
  }
});
