import { Test } from "@/helpers/Test.spec";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { EncryptionAdapter } from "./EncryptionAdapter";

describe(EncryptionAdapter.name, async () => {
  const keyRef = "UNIT_TEST_KEY";
  const adapter = new EncryptionAdapter(await Test.buildEnv());

  beforeEach(async () => {
    await Test.cleanup();
    await Test.patchEnv({
      [keyRef]: "secret-symmetric-key",
    });
  });

  afterEach(async () => {
    await Test.cleanup();
  });

  it("supports reversible encryption/decryption", async () => {
    // given
    const [original] = await Test.createArtifacts("f:plaintext");
    // when
    const cipherText = await adapter.encrypt(original, StepConfig.encryption);
    const plainText = await adapter.decrypt(cipherText, StepConfig.decryption);
    // then
    expect(await bytes(original)).toEqual(await bytes(plainText));
    expect(await bytes(original)).not.toEqual(await bytes(cipherText));
  });

  it.each(["encrypt", "decrypt"] as const)("fails when trying to %s a directory", async (operation) => {
    // given
    const [directory] = await Test.createArtifacts("d:myfolder");
    // when
    const action =
      operation === "encrypt" //
        ? () => adapter.encrypt(directory, StepConfig.encryption)
        : () => adapter.decrypt(directory, StepConfig.decryption);
    // then
    expect(action()).rejects.toEqual(
      expect.objectContaining({
        problem: "ExecutionError::artifact_type_invalid",
      }),
    );
  });

  it("fails to decrypt when the key is different", async () => {
    // given
    const [file] = await Test.createArtifacts("f:helloworld");
    const encrypted = await adapter.encrypt(file, StepConfig.encryption);
    // when
    await Test.patchEnv({
      [keyRef]: Bun.randomUUIDv7(), // randomly generated decryption key
    });
    const action = () => adapter.decrypt(encrypted, StepConfig.decryption);
    // then
    expect(action()).rejects.toEqual(
      expect.objectContaining({
        problem: "ExecutionError::decryption_failed",
      }),
    );
  });

  const StepConfig = {
    encryption: {
      keyReference: "UNIT_TEST_KEY",
      algorithm: {
        implementation: "aes256cbc",
      },
    } as Step.Encryption,
    decryption: {
      keyReference: "UNIT_TEST_KEY",
      algorithm: {
        implementation: "aes256cbc",
      },
    } as Step.Decryption,
  };

  function bytes({ path }: Artifact) {
    return Bun.file(path).bytes();
  }
});
