import { Step } from "@/models/Step";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { beforeEach, describe, expect, it } from "bun:test";
import { S3Adapter } from "./S3Adapter";

describe(S3Adapter.name, async () => {
  let context!: TestEnvironment.Context;
  let adapter!: S3Adapter;

  beforeEach(async () => {
    context = await TestEnvironment.initialize();
    adapter = new S3Adapter(
      context.env,
      context.propertyResolver,
      context.managedStorageCapabilityMock.cast(),
      context.filterCapabilityMock.cast(),
    );
    context.patchEnvironmentVariables({
      ACCESS_KEY: "kim",
      SECRET_KEY: "possible",
    });
  });

  const connection: Step.S3Connection = {
    bucket: "irrelevant",
    region: undefined,
    endpoint: "http://irrelevant",
    secretKey: "${SECRET_KEY}",
    accessKey: "${ACCESS_KEY}",
  };

  const testCases: Array<{ from: string; to: string }> = [
    { from: "backups", to: "backups" },
    { from: "/backups", to: "backups" },
    { from: "/my/backups", to: "my/backups" },
    { from: "my/backups", to: "my/backups" },
  ];
  for (const { from, to } of testCases) {
    it(`correctly relativizes a base prefix: ${from}`, async () => {
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
  }
});
