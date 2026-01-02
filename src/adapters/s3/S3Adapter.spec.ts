import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { S3Adapter } from "./S3Adapter";
import { Env } from "bun";
import { Test } from "@/helpers/Test.spec";
import { Step } from "@/models/Step";

describe(S3Adapter.name, async () => {
  const { resetAllMocks, managedStorageCapability, filterCapability } = await Test.initializeMockRegistry();
  const adapter = new S3Adapter(await Test.env(), Test.impl(managedStorageCapability), Test.impl(filterCapability));

  beforeEach(() => {
    resetAllMocks();
    Bun.env.ACCESS_KEY = "ACCESS_KEY";
    Bun.env.SECRET_KEY = "SECRET_KEY";
  });

  afterEach(() => {
    delete Bun.env.ACCESS_KEY;
    delete Bun.env.SECRET_KEY;
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
    managedStorageCapability.prepareSelection.mockImplementation(() => {
      throw new Error("irrelevant error");
    });
    // when
    const action = adapter.download({ baseFolder: from, connection } as Step.S3Download);
    expect(action).rejects.toEqual(new Error("irrelevant error"));
    // then
    expect(managedStorageCapability.prepareSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        baseFolder: to,
      }),
    );
  });
});
