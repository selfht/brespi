import { Step } from "@/models/Step";
import { Test } from "@/testing/Test.test";
import { beforeEach, describe, expect, it } from "bun:test";
import { S3Adapter } from "./S3Adapter";

describe(S3Adapter.name, async () => {
  let ctx!: Test.Env.Context;
  let adapter!: S3Adapter;

  beforeEach(async () => {
    ctx = await Test.Env.initialize();
    adapter = new S3Adapter(ctx.env, ctx.managedStorageCapabilityMock.cast(), ctx.filterCapabilityMock.cast());
    ctx.patchEnv({
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
  const collection = Test.Utils.createCollection<TestCase>("from", [
    { from: "backups", to: "backups" },
    { from: "/backups", to: "backups" },
    { from: "/my/backups", to: "my/backups" },
    { from: "my/backups", to: "my/backups" },
  ]);
  it.each(collection.testCases)("correctly relativizes a base prefix: %s", async (testCase) => {
    const { from, to } = collection.get(testCase);
    // given
    ctx.managedStorageCapabilityMock.select.mockImplementation(() => {
      throw new Error("irrelevant error");
    });
    // when
    const action = () => adapter.download({ basePrefix: from, connection } as Step.S3Download);
    expect(action()).rejects.toEqual(new Error("irrelevant error"));
    // then
    expect(ctx.managedStorageCapabilityMock.select).toHaveBeenCalledWith(
      expect.objectContaining({
        base: to,
      }),
    );
  });
});
