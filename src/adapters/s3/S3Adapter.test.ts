import { Step } from "@/models/Step";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { TestUtils } from "@/testing/TestUtils.test";
import { beforeEach, describe, expect, it } from "bun:test";
import { S3Adapter } from "./S3Adapter";

describe(S3Adapter.name, async () => {
  let context!: TestEnvironment.Context;
  let adapter!: S3Adapter;

  beforeEach(async () => {
    context = await TestEnvironment.initialize();
    adapter = new S3Adapter(context.env, context.managedStorageCapabilityMock.cast(), context.filterCapabilityMock.cast());
    context.patchEnv({
      ACCESS_KEY: "kim",
      SECRET_KEY: "possible",
    });
  });

  const connection: Step.S3Connection = {
    bucket: "irrelevant",
    region: null,
    endpoint: "http://irrelevant",
    secretKeyReference: "SECRET_KEY",
    accessKeyReference: "ACCESS_KEY",
  };

  type TestCase = {
    from: string;
    to: string;
  };
  const collection = TestUtils.createCollection<TestCase>("from", [
    { from: "backups", to: "backups" },
    { from: "/backups", to: "backups" },
    { from: "/my/backups", to: "my/backups" },
    { from: "my/backups", to: "my/backups" },
  ]);
  it.each(collection.testCases)("correctly relativizes a base prefix: %s", async (testCase) => {
    const { from, to } = collection.get(testCase);
    // given
    context.managedStorageCapabilityMock.select.mockImplementation(() => {
      throw new Error("irrelevant error");
    });
    // when
    const action = () => adapter.download({ basePrefix: from, connection } as Step.S3Download);
    expect(action()).rejects.toEqual(new Error("irrelevant error"));
    // then
    expect(context.managedStorageCapabilityMock.select).toHaveBeenCalledWith(
      expect.objectContaining({
        base: to,
      }),
    );
  });
});
