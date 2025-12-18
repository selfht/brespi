import { Env } from "@/Env";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { stat } from "fs/promises";
import { pipeline } from "stream/promises";
import { AbstractAdapter } from "../AbstractAdapter";

export class EncryptionAdapter extends AbstractAdapter {
  private readonly key = "supersecretkey"; // TODO

  public constructor(protected readonly env: Env.Private) {
    super(env);
  }

  public async encrypt(artifact: Artifact, options: Step.Encryption): Promise<Artifact> {
    if (artifact.type !== "file") {
      throw new Error("Unsupported artifact type");
    }
    const algorithm = this.translateAlgorithm(options.algorithm.implementation);

    const inputPath = artifact.path;
    const { outputId, outputPath } = this.generateArtifactDestination();

    // Derive a 32-byte key from the hardcoded key using SHA-256
    const keyBuffer = createHash("sha256").update(this.key).digest();

    // Encrypt
    const iv = randomBytes(16);
    const cipher = createCipheriv(algorithm, keyBuffer, iv);
    const outputStream = createWriteStream(outputPath);
    outputStream.write(iv);
    await pipeline(createReadStream(inputPath), cipher, outputStream);

    const stats = await stat(outputPath);
    return {
      id: outputId,
      type: "file",
      path: outputPath,
      size: stats.size,
      name: artifact.name,
    };
  }

  public async decrypt(artifact: Artifact, options: Step.Decryption): Promise<Artifact> {
    if (artifact.type !== "file") {
      throw new Error("Unsupported artifact type");
    }
    const algorithm = this.translateAlgorithm(options.algorithm.implementation);

    const inputPath = artifact.path;
    const { outputId, outputPath } = this.generateArtifactDestination();

    // Derive the same 32-byte key
    const keyBuffer = createHash("sha256").update(this.key).digest();

    // Decrypt
    const inputStream = createReadStream(inputPath);
    const iv = await new Promise<Buffer>((resolve, reject) => {
      inputStream.once("readable", () => {
        const chunk = inputStream.read(16);
        if (!chunk || chunk.length !== 16) {
          reject(new Error("Failed to read IV from encrypted file"));
        } else {
          resolve(chunk);
        }
      });
      inputStream.once("error", reject);
    });
    const decipher = createDecipheriv(algorithm, keyBuffer, iv);
    await pipeline(inputStream, decipher, createWriteStream(outputPath));

    const stats = await stat(outputPath);
    return {
      id: outputId,
      type: "file",
      path: outputPath,
      size: stats.size,
      name: artifact.name,
    };
  }

  private translateAlgorithm(algorithm: string): string {
    if (algorithm !== "aes256cbc") {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
    return "aes-256-cbc";
  }
}
