import { Env } from "@/Env";
import { AdapterError } from "@/errors/AdapterError";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { stat } from "fs/promises";
import { pipeline } from "stream/promises";
import { AbstractAdapter } from "../AbstractAdapter";

export class EncryptionAdapter extends AbstractAdapter {
  private readonly EXTENSION = ".enc";

  public constructor(protected readonly env: Env.Private) {
    super(env);
  }

  public async encrypt(artifact: Artifact, step: Step.Encryption): Promise<Artifact> {
    if (artifact.type !== "file") {
      throw AdapterError.Encryption.unsupported_artifact_type({ type: artifact.type });
    }
    const key = this.readEnvironmentVariable(step.keyReference);
    const algorithm = this.translateAlgorithm(step.algorithm.implementation);

    const inputPath = artifact.path;
    const { outputId, outputPath } = this.generateArtifactDestination();

    // Derive a 32-byte key from the hardcoded key using SHA-256
    const keyBuffer = createHash("sha256").update(key).digest();

    // Encrypt
    const iv = randomBytes(16);
    const cipher = createCipheriv(algorithm, keyBuffer, iv);
    const outputStream = createWriteStream(outputPath);
    outputStream.write(iv);
    await pipeline(createReadStream(inputPath), cipher, outputStream);

    return {
      id: outputId,
      type: "file",
      path: outputPath,
      name: this.addExtension(artifact.name, this.EXTENSION),
    };
  }

  public async decrypt(artifact: Artifact, step: Step.Decryption): Promise<Artifact> {
    if (artifact.type !== "file") {
      throw AdapterError.Encryption.unsupported_artifact_type({ type: artifact.type });
    }
    const key = this.readEnvironmentVariable(step.keyReference);
    const algorithm = this.translateAlgorithm(step.algorithm.implementation);

    const inputPath = artifact.path;
    const { outputId, outputPath } = this.generateArtifactDestination();

    // Derive the same 32-byte key
    const keyBuffer = createHash("sha256").update(key).digest();

    // Decrypt
    const inputStream = createReadStream(inputPath);
    const iv = await new Promise<Buffer>((resolve, reject) => {
      inputStream.once("readable", () => {
        const chunk = inputStream.read(16);
        if (!chunk || chunk.length !== 16) {
          reject(AdapterError.Encryption.failed_to_read_iv());
        } else {
          resolve(chunk);
        }
      });
      inputStream.once("error", reject);
    });
    const decipher = createDecipheriv(algorithm, keyBuffer, iv);
    await pipeline(inputStream, decipher, createWriteStream(outputPath));

    return {
      id: outputId,
      type: "file",
      path: outputPath,
      name: this.stripExtension(artifact.name, this.EXTENSION),
    };
  }

  private translateAlgorithm(algorithm: string): string {
    if (algorithm !== "aes256cbc") {
      throw AdapterError.Encryption.unsupported_algorithm({ algorithm });
    }
    return "aes-256-cbc";
  }
}
