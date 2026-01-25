import { Test } from "@/testing/Test.test";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { EncryptionAdapter } from "./EncryptionAdapter";

describe(EncryptionAdapter.name, async () => {
  const keyRef = "UNIT_TEST_KEY";
  const ctx = await Test.initialize();
  const adapter = new EncryptionAdapter(ctx.env);

  beforeEach(async () => {
    await Test.cleanup();
    ctx.patchEnv({
      [keyRef]: "secret-symmetric-key",
    });
  });

  afterEach(async () => {
    await Test.cleanup();
  });

  it("supports reversible encryption/decryption", async () => {
    // given
    const [original] = await ctx.createArtifacts("f:plaintext");
    // when
    const cipherText = await adapter.encrypt(original, fixture.encryption());
    const plainText = await adapter.decrypt(cipherText, fixture.decryption());
    // then
    expect(await bytes(original)).toEqual(await bytes(plainText));
    expect(await bytes(original)).not.toEqual(await bytes(cipherText));
  });

  it.each(["encrypt", "decrypt"] as const)("fails when trying to %s a directory", async (operation) => {
    // given
    const [directory] = await ctx.createArtifacts("d:myfolder");
    // when
    const action =
      operation === "encrypt" //
        ? () => adapter.encrypt(directory, fixture.encryption())
        : () => adapter.decrypt(directory, fixture.decryption());
    // then
    expect(action()).rejects.toEqual(
      expect.objectContaining({
        problem: "ExecutionError::artifact_type_invalid",
      }),
    );
  });

  it("fails to decrypt when the key is different", async () => {
    // given
    const [file] = await ctx.createArtifacts("f:helloworld");
    const encrypted = await adapter.encrypt(file, fixture.encryption());
    // when
    ctx.patchEnv({
      [keyRef]: Bun.randomUUIDv7(), // randomly generated decryption key
    });
    const action = () => adapter.decrypt(encrypted, fixture.decryption());
    // then
    expect(action()).rejects.toEqual(
      expect.objectContaining({
        problem: "ExecutionError::decryption_failed",
      }),
    );
  });

  const fixture = {
    encryption() {
      return {
        keyReference: "UNIT_TEST_KEY",
        algorithm: {
          implementation: "aes256cbc",
        },
      } as Step.Encryption;
    },
    decryption() {
      return {
        keyReference: "UNIT_TEST_KEY",
        algorithm: {
          implementation: "aes256cbc",
        },
      } as Step.Decryption;
    },
  };

  function bytes({ path }: Artifact) {
    return Bun.file(path).bytes();
  }
});
