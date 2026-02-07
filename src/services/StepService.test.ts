import { Step } from "@/models/Step";
import { describe, expect, it } from "bun:test";
import { StepService } from "./StepService";

describe(StepService.name, () => {
  const service = new StepService();

  it("returns empty fields when all reference fields use ${REFERENCE} notation", () => {
    const step: Step.Encryption = {
      id: "test",
      object: "step",
      type: Step.Type.encryption,
      key: "${MY_KEY}",
      algorithm: { implementation: "aes256cbc" },
    };
    expect(service.validate(step)).toEqual({ fields: [] });
  });

  it("returns dot-paths for plaintext reference fields", () => {
    const step: Step.Encryption = {
      id: "test",
      object: "step",
      type: Step.Type.encryption,
      key: "my-secret-key-in-plaintext",
      algorithm: { implementation: "aes256cbc" },
    };
    expect(service.validate(step)).toEqual({ fields: ["key"] });
  });

  it("returns dot-paths for nested plaintext reference fields", () => {
    const step: Step.S3Upload = {
      id: "test",
      object: "step",
      type: Step.Type.s3_upload,
      connection: {
        bucket: "my-bucket",
        endpoint: "https://s3.example.com",
        accessKey: "AKIAIOSFODNN7EXAMPLE",
        secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      },
      basePrefix: "backups/",
    };
    expect(service.validate(step)).toEqual({ fields: ["connection.secretKey"] });
  });

  it("returns empty fields for step types without reference fields", () => {
    const step: Step.Compression = {
      id: "test",
      object: "step",
      type: Step.Type.compression,
      algorithm: { implementation: "targzip", level: 6 },
    };
    expect(service.validate(step)).toEqual({ fields: [] });
  });
});
