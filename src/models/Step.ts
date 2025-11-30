import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";

export type Step =
  | Step.FsRead
  | Step.FsWrite
  | Step.PostgresBackup
  | Step.Compression
  | Step.Decompression
  | Step.Encryption
  | Step.Decryption
  | Step.S3Upload
  | Step.S3Download;

export namespace Step {
  export enum Type {
    fs_read = "fs_read",
    fs_write = "fs_write",
    postgres_backup = "postgres_backup",
    compression = "compression",
    decompression = "decompression",
    encryption = "encryption",
    decryption = "decryption",
    s3_upload = "s3_upload",
    s3_download = "s3_download",
  }

  export enum Category {
    producer = "producer",
    transformer = "transformer",
    consumer = "consumer",
  }

  type Common = {
    id: string;
    previousStepId?: string;
  };

  export type FsRead = Common & {
    type: Type.fs_read;
    path: string;
    itemizeDirectoryContents: boolean;
  };

  export type FsWrite = Common & {
    type: Type.fs_write;
    path: string;
  };

  export type PostgresBackup = Common & {
    type: Type.postgres_backup;
    databases:
      | { selection: "all" }
      //
      | { selection: "include"; include: string[] }
      //
      | { selection: "exclude"; exclude: string[] };
  };

  export type Compression = Common & {
    type: Type.compression;
    algorithm: "targzip";
    targzip: {
      level: number;
    };
  };

  export type Decompression = Common & {
    type: Type.decompression;
    algorithm: "targzip";
  };

  export type Encryption = Common & {
    type: Type.encryption;
    algorithm: "aes256cbc";
    keyReference: string;
  };

  export type Decryption = Common & {
    type: Type.decryption;
    algorithm: "aes256cbc";
    keyReference: string;
  };

  export type S3Upload = Common & {
    type: Type.s3_upload;
    accessKeyReference: string;
    secretKeyReference: string;
    namespace: string;
  };

  export type S3Download = Common & {
    type: Type.s3_download;
    accessKeyReference: string;
    secretKeyReference: string;
    namespace: string;
    artifact: string;
    selection:
      | { strategy: "latest" }
      //
      | { strategy: "version"; version: string };
  };

  const categories: Record<Step.Type, Step.Category> = {
    [Step.Type.fs_read]: Step.Category.producer,
    [Step.Type.fs_write]: Step.Category.consumer,
    [Step.Type.postgres_backup]: Step.Category.producer,
    [Step.Type.compression]: Step.Category.transformer,
    [Step.Type.decompression]: Step.Category.transformer,
    [Step.Type.encryption]: Step.Category.transformer,
    [Step.Type.decryption]: Step.Category.transformer,
    [Step.Type.s3_upload]: Step.Category.consumer,
    [Step.Type.s3_download]: Step.Category.producer,
  };
  export function getCategory(step: Step): Step.Category {
    return categories[step.type];
  }

  type SubSchema<T extends Step> = Record<keyof T, z.ZodType>;
  export const parse = ZodParser.forType<Step>()
    .ensureSchemaMatchesType(
      z.discriminatedUnion("type", [
        z.object({
          id: z.string(),
          previousStepId: z.string().optional(),
          type: z.literal(Type.fs_read),
          path: z.string(),
          itemizeDirectoryContents: z.boolean(),
        } satisfies SubSchema<Step.FsRead>),

        z.object({
          id: z.string(),
          previousStepId: z.string().optional(),
          type: z.literal(Type.fs_write),
          path: z.string(),
        } satisfies SubSchema<Step.FsWrite>),

        z.object({
          id: z.string(),
          previousStepId: z.string().optional(),
          type: z.literal(Type.postgres_backup),
          databases: z.union([
            z.object({ selection: z.literal("all") }),
            z.object({ selection: z.literal("include"), include: z.array(z.string()) }),
            z.object({ selection: z.literal("exclude"), exclude: z.array(z.string()) }),
          ]),
        } satisfies SubSchema<Step.PostgresBackup>),

        z.object({
          id: z.string(),
          previousStepId: z.string().optional(),
          type: z.literal(Type.compression),
          algorithm: z.literal("targzip"),
          targzip: z.object({
            level: z.number().min(1).max(9),
          }),
        } satisfies SubSchema<Step.Compression>),

        z.object({
          id: z.string(),
          previousStepId: z.string().optional(),
          type: z.literal(Type.decompression),
          algorithm: z.literal("targzip"),
        } satisfies SubSchema<Step.Decompression>),

        z.object({
          id: z.string(),
          previousStepId: z.string().optional(),
          type: z.literal(Type.encryption),
          algorithm: z.literal("aes256cbc"),
          keyReference: z.string(),
        } satisfies SubSchema<Step.Encryption>),

        z.object({
          id: z.string(),
          previousStepId: z.string().optional(),
          type: z.literal(Type.decryption),
          algorithm: z.literal("aes256cbc"),
          keyReference: z.string(),
        } satisfies SubSchema<Step.Decryption>),

        z.object({
          id: z.string(),
          previousStepId: z.string().optional(),
          type: z.literal(Type.s3_upload),
          accessKeyReference: z.string(),
          secretKeyReference: z.string(),
          namespace: z.string(),
        } satisfies SubSchema<Step.S3Upload>),

        z.object({
          id: z.string(),
          previousStepId: z.string().optional(),
          type: z.literal(Type.s3_download),
          accessKeyReference: z.string(),
          secretKeyReference: z.string(),
          namespace: z.string(),
          artifact: z.string(),
          selection: z.union([
            z.object({ strategy: z.literal("latest") }),
            z.object({ strategy: z.literal("version"), version: z.string() }),
          ]),
        } satisfies SubSchema<Step.S3Download>),
      ]),
    )
    .ensureTypeMatchesSchema();
}
