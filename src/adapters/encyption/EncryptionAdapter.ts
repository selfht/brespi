import { Artifact } from "@/models/Artifact";
import { NamingHelper } from "@/helpers/NamingHelper";
import { createReadStream, createWriteStream } from "fs";
import { stat } from "fs/promises";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { pipeline } from "stream/promises";
import { Step } from "@/models/Step";

export class EncryptionAdapter {
  private readonly key = "supersecretkey"; // TODO

  public async encrypt(artifact: Artifact, options: Step.Encryption): Promise<Artifact> {
    if (artifact.type !== "file") {
      throw new Error("Unsupported artifact type");
    }
    const algorithm = this.translateAlgorithm(options.implementation.algorithm);

    const inputPath = artifact.path;
    const outputPath = NamingHelper.generatePath(artifact);

    // Derive a 32-byte key from the hardcoded key using SHA-256
    const keyBuffer = createHash("sha256").update(this.key).digest();

    // Generate a random 16-byte initialization vector
    const iv = randomBytes(16);

    // Create cipher
    const cipher = createCipheriv(algorithm, keyBuffer, iv);

    // Write IV to the beginning of the file, then encrypted data
    const outputStream = createWriteStream(outputPath);
    outputStream.write(iv);

    await pipeline(createReadStream(inputPath), cipher, outputStream);

    const stats = await stat(outputPath);
    return {
      path: outputPath,
      size: stats.size,
      type: "file",
      name: artifact.name,
      timestamp: artifact.timestamp,
    };
  }

  public async decrypt(artifact: Artifact, options: Step.Decryption): Promise<Artifact> {
    if (artifact.type !== "file") {
      throw new Error("Unsupported artifact type");
    }
    const algorithm = this.translateAlgorithm(options.implementation.algorithm);

    const inputPath = artifact.path;
    const outputPath = NamingHelper.generatePath(artifact);

    // Derive the same 32-byte key
    const keyBuffer = createHash("sha256").update(this.key).digest();

    // Read the IV from the beginning of the encrypted file
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

    // Create decipher
    const decipher = createDecipheriv(algorithm, keyBuffer, iv);

    // Decrypt the rest of the file
    await pipeline(inputStream, decipher, createWriteStream(outputPath));

    const stats = await stat(outputPath);
    return {
      path: outputPath,
      size: stats.size,
      type: "file",
      name: artifact.name,
      timestamp: artifact.timestamp,
    };
  }

  private translateAlgorithm(algorithm: string): string {
    if (algorithm !== "aes256cbc") {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
    return "aes-256-cbc";
  }
}
