import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";

export type Step =
  | Step.FilesystemRead
  | Step.FilesystemWrite
  | Step.Compression
  | Step.Decompression
  | Step.Encryption
  | Step.Decryption
  | Step.FolderFlatten
  | Step.FolderGroup
  | Step.Filter
  | Step.ScriptExecution
  | Step.S3Upload
  | Step.S3Download
  | Step.PostgresBackup
  | Step.PostgresRestore;

export namespace Step {
  export enum Type {
    filesystem_read = "filesystem_read",
    filesystem_write = "filesystem_write",
    compression = "compression",
    decompression = "decompression",
    encryption = "encryption",
    decryption = "decryption",
    folder_flatten = "folder_flatten",
    folder_group = "folder_group",
    filter = "filter",
    script_execution = "script_execution",
    s3_upload = "s3_upload",
    s3_download = "s3_download",
    postgres_backup = "postgres_backup",
    postgres_restore = "postgres_restore",
  }

  export enum Category {
    producer = "producer",
    transformer = "transformer",
    consumer = "consumer",
  }

  type Common = {
    id: string;
    previousId: string | null;
  };

  export type FilesystemRead = Common & {
    type: Type.filesystem_read;
    path: string;
  };

  export type FilesystemWrite = Common & {
    type: Type.filesystem_write;
    path: string;
  };

  export type Compression = Common & {
    type: Type.compression;
    algorithm: {
      implementation: "targzip";
      level: number;
    };
  };

  export type Decompression = Common & {
    type: Type.decompression;
    algorithm: {
      implementation: "targzip";
    };
  };

  export type Encryption = Common & {
    type: Type.encryption;
    keyReference: string;
    algorithm: {
      implementation: "aes256cbc";
    };
  };

  export type Decryption = Common & {
    type: Type.decryption;
    keyReference: string;
    algorithm: {
      implementation: "aes256cbc";
    };
  };

  export type FolderFlatten = Common & {
    type: Type.folder_flatten;
  };

  export type FolderGroup = Common & {
    type: Type.folder_group;
  };

  export type Filter = Common & {
    type: Type.filter;
    selection:
      | { method: "exact"; name: string }
      //
      | { method: "glob"; nameGlob: string }
      | { method: "regex"; nameRegex: string };
  };

  export type ScriptExecution = Common & {
    type: Type.script_execution;
    path: string;
    passthrough: boolean;
  };

  export type S3Upload = Common & {
    type: Type.s3_upload;
    accessKeyReference: string;
    secretKeyReference: string;
    baseFolder: string;
  };

  export type S3Download = Common & {
    type: Type.s3_download;
    accessKeyReference: string;
    secretKeyReference: string;
    baseFolder: string;
    artifact: string;
    selection:
      | { target: "latest" }
      //
      | { target: "specific"; version: string };
  };

  export type PostgresBackup = Common & {
    type: Type.postgres_backup;
    databaseSelection:
      | { strategy: "all" }
      //
      | { strategy: "include"; include: string[] }
      //
      | { strategy: "exclude"; exclude: string[] };
  };

  export type PostgresRestore = Common & {
    type: Type.postgres_restore;
    database: string;
  };

  const categories: Record<Step.Type, Step.Category> = {
    [Step.Type.filesystem_read]: Step.Category.producer,
    [Step.Type.filesystem_write]: Step.Category.consumer,
    [Step.Type.compression]: Step.Category.transformer,
    [Step.Type.decompression]: Step.Category.transformer,
    [Step.Type.encryption]: Step.Category.transformer,
    [Step.Type.decryption]: Step.Category.transformer,
    [Step.Type.folder_flatten]: Step.Category.transformer,
    [Step.Type.folder_group]: Step.Category.transformer,
    [Step.Type.script_execution]: Step.Category.transformer,
    [Step.Type.s3_upload]: Step.Category.consumer,
    [Step.Type.s3_download]: Step.Category.producer,
    [Step.Type.postgres_backup]: Step.Category.producer,
    [Step.Type.postgres_restore]: Step.Category.consumer,
  };
  export function getCategory({ type }: Pick<Step, "type">): Step.Category {
    return categories[type];
  }

  type SubSchema<T extends Step> = Record<keyof T, z.ZodType>;
  export const parse = ZodParser.forType<Step>()
    .ensureSchemaMatchesType(
      z.discriminatedUnion("type", [
        z.object({
          id: z.string(),
          previousId: z.string().nullable(),
          type: z.literal(Type.filesystem_read),
          path: z.string(),
        } satisfies SubSchema<Step.FilesystemRead>),

        z.object({
          id: z.string(),
          previousId: z.string().nullable(),
          type: z.literal(Type.filesystem_write),
          path: z.string(),
        } satisfies SubSchema<Step.FilesystemWrite>),

        z.object({
          id: z.string(),
          previousId: z.string().nullable(),
          type: z.literal(Type.compression),
          algorithm: z.object({
            implementation: z.literal("targzip"),
            level: z.int().min(1).max(9),
          }),
        } satisfies SubSchema<Step.Compression>),

        z.object({
          id: z.string(),
          previousId: z.string().nullable(),
          type: z.literal(Type.decompression),
          algorithm: z.object({
            implementation: z.literal("targzip"),
          }),
        } satisfies SubSchema<Step.Decompression>),

        z.object({
          id: z.string(),
          previousId: z.string().nullable(),
          type: z.literal(Type.encryption),
          keyReference: z.string(),
          algorithm: z.object({
            implementation: z.literal("aes256cbc"),
          }),
        } satisfies SubSchema<Step.Encryption>),

        z.object({
          id: z.string(),
          previousId: z.string().nullable(),
          type: z.literal(Type.decryption),
          keyReference: z.string(),
          algorithm: z.object({
            implementation: z.literal("aes256cbc"),
          }),
        } satisfies SubSchema<Step.Decryption>),

        z.object({
          id: z.string(),
          previousId: z.string().nullable(),
          type: z.literal(Type.folder_flatten),
        } satisfies SubSchema<Step.FolderFlatten>),

        z.object({
          id: z.string(),
          previousId: z.string().nullable(),
          type: z.literal(Type.folder_group),
        } satisfies SubSchema<Step.FolderGroup>),

        z.object({
          id: z.string(),
          previousId: z.string().nullable(),
          type: z.literal(Type.script_execution),
          path: z.string(),
          passthrough: z.boolean(),
        } satisfies SubSchema<Step.ScriptExecution>),

        z.object({
          id: z.string(),
          previousId: z.string().nullable(),
          type: z.literal(Type.s3_upload),
          accessKeyReference: z.string(),
          secretKeyReference: z.string(),
          baseFolder: z.string(),
        } satisfies SubSchema<Step.S3Upload>),

        z.object({
          id: z.string(),
          previousId: z.string().nullable(),
          type: z.literal(Type.s3_download),
          accessKeyReference: z.string(),
          secretKeyReference: z.string(),
          baseFolder: z.string(),
          artifact: z.string(),
          selection: z.union([
            z.object({ target: z.literal("latest") }),
            //
            z.object({ target: z.literal("specific"), version: z.string() }),
          ]),
        } satisfies SubSchema<Step.S3Download>),

        z.object({
          id: z.string(),
          previousId: z.string().nullable(),
          type: z.literal(Type.postgres_backup),
          databaseSelection: z.union([
            z.object({ strategy: z.literal("all") }),
            z.object({ strategy: z.literal("include"), include: z.array(z.string()) }),
            z.object({ strategy: z.literal("exclude"), exclude: z.array(z.string()) }),
          ]),
        } satisfies SubSchema<Step.PostgresBackup>),

        z.object({
          id: z.string(),
          previousId: z.string().nullable(),
          type: z.literal(Type.postgres_restore),
          database: z.string(),
        } satisfies SubSchema<Step.PostgresRestore>),
      ]),
    )
    .ensureTypeMatchesSchema();
}
