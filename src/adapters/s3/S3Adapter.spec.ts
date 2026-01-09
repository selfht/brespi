import { Test } from "@/helpers/Test.spec";
import { Step } from "@/models/Step";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { S3Adapter } from "./S3Adapter";

describe(S3Adapter.name, async () => {
  const { managedStorageCapabilityMock, filterCapabilityMock } = await Test.initializeMockRegistry();
  const adapter = new S3Adapter(await Test.buildEnv(), Test.impl(managedStorageCapabilityMock), Test.impl(filterCapabilityMock));

  beforeEach(async () => {
    await Test.cleanup();
    await Test.patchEnv({
      ACCESS_KEY: "kim",
      SECRET_KEY: "possible",
    });
  });

  afterEach(async () => {
    await Test.cleanup();
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
  const collection = Test.createCollection<TestCase>("from", [
    { from: "backups", to: "backups" },
    { from: "/backups", to: "backups" },
    { from: "/my/backups", to: "my/backups" },
    { from: "my/backups", to: "my/backups" },
  ]);
  it.each(collection.testCases)("correctly relativizes a base folder: %s", async (testCase) => {
    const { from, to } = collection.get(testCase);
    // given
    managedStorageCapabilityMock.prepareSelection.mockImplementation(() => {
      throw new Error("irrelevant error");
    });
    // when
    const action = adapter.download({ basePrefix: from, connection } as Step.S3Download);
    expect(action).rejects.toEqual(new Error("irrelevant error"));
    // then
    expect(managedStorageCapabilityMock.prepareSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        baseFolder: to,
      }),
    );
  });
});
