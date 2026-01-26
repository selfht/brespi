import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { beforeEach, describe, expect, it } from "bun:test";
import { EncryptionAdapter } from "./EncryptionAdapter";

describe(EncryptionAdapter.name, async () => {
  let context!: TestEnvironment.Context;
  let adapter!: EncryptionAdapter;

  const keyRef = "UNIT_TEST_KEY";
  beforeEach(async () => {
    context = await TestEnvironment.initialize();
    adapter = new EncryptionAdapter(context.env);
    context.patchEnvironmentVariables({
      [keyRef]: "secret-symmetric-key",
    });
  });

  it("supports reversible encryption/decryption", async () => {
    // given
    const [original] = await context.createArtifacts("f:plaintext");
    // when
    const cipherText = await adapter.encrypt(original, fixture.encryption());
    const plainText = await adapter.decrypt(cipherText, fixture.decryption());
    // then
    expect(await bytes(original)).toEqual(await bytes(plainText));
    expect(await bytes(original)).not.toEqual(await bytes(cipherText));
  });

  it.each(["encrypt", "decrypt"] as const)("fails when trying to %s a directory", async (operation) => {
    // given
    const [directory] = await context.createArtifacts("d:myfolder");
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
    const [file] = await context.createArtifacts("f:helloworld");
    const encrypted = await adapter.encrypt(file, fixture.encryption());
    // when
    context.patchEnvironmentVariables({
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
