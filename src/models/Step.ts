import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";

export type Step =
  | Step.Compression
  | Step.Decompression
  | Step.Encryption
  | Step.Decryption
  | Step.FolderFlatten
  | Step.FolderGroup
  | Step.Filter
  | Step.ScriptExecution
  | Step.FilesystemWrite
  | Step.FilesystemRead
  | Step.S3Upload
  | Step.S3Download
  | Step.PostgresBackup
  | Step.PostgresRestore;

export namespace Step {
  export enum Type {
    compression = "compression",
    decompression = "decompression",
    encryption = "encryption",
    decryption = "decryption",
    folder_flatten = "folder_flatten",
    folder_group = "folder_group",
    filter = "filter",
    custom_script = "custom_script",
    filesystem_write = "filesystem_write",
    filesystem_read = "filesystem_read",
    s3_upload = "s3_upload",
    s3_download = "s3_download",
    postgres_backup = "postgres_backup",
    postgres_restore = "postgres_restore",
  }
  export function TypeInstance(value: string): value is Type {
    return Object.values(Type).includes(value as Type);
  }

  export enum Category {
    producer = "producer",
    transformer = "transformer",
    consumer = "consumer",
  }

  type Common = {
    id: string;
    previousId: string | null;
    object: "step";
  };

  export type ManagedStorage =
    | { target: "latest" } //
    | { target: "specific"; version: string };

  export type FilterCriteria =
    | { method: "exact"; name: string } //
    | { method: "glob"; nameGlob: string }
    | { method: "regex"; nameRegex: string };

  export type S3Connection = {
    bucket: string;
    region: string | null;
    endpoint: string;
    accessKeyReference: string;
    secretKeyReference: string;
  };

  export type FilesystemWrite = Common & {
    type: Type.filesystem_write;
    folderPath: string;
    managedStorage: boolean;
  };

  export type FilesystemRead = Common & {
    type: Type.filesystem_read;
    path: string;
    managedStorage: ManagedStorage | null;
    filterCriteria: FilterCriteria | null;
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
    filterCriteria: FilterCriteria;
  };

  export type ScriptExecution = Common & {
    type: Type.custom_script;
    path: string;
    passthrough: boolean;
  };

  export type S3Upload = Common & {
    type: Type.s3_upload;
    connection: S3Connection;
    baseFolder: string;
  };

  export type S3Download = Common & {
    type: Type.s3_download;
    connection: S3Connection;
    baseFolder: string;
    managedStorage: ManagedStorage;
    filterCriteria: FilterCriteria | null;
  };

  export type PostgresBackup = Common & {
    type: Type.postgres_backup;
    connectionReference: string;
    toolkit:
      | { resolution: "automatic" } //
      | { resolution: "manual"; psql: string; pg_dump: string };
    databaseSelection:
      | { strategy: "all" } //
      | { strategy: "include"; inclusions: string[] }
      | { strategy: "exclude"; exclusions: string[] };
  };

  export type PostgresRestore = Common & {
    type: Type.postgres_restore;
    connectionReference: string;
    toolkit:
      | { resolution: "automatic" } //
      | { resolution: "manual"; psql: string; pg_restore: string };
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
    [Step.Type.filter]: Step.Category.transformer,
    [Step.Type.custom_script]: Step.Category.transformer,
    [Step.Type.s3_upload]: Step.Category.consumer,
    [Step.Type.s3_download]: Step.Category.producer,
    [Step.Type.postgres_backup]: Step.Category.producer,
    [Step.Type.postgres_restore]: Step.Category.consumer,
  };
  export function getCategory({ type }: Pick<Step, "type">): Step.Category {
    return categories[type];
  }

  type SubSchema<T> = Record<keyof T, z.ZodType>;

  export const parse = ZodParser.forType<Step>()
    .ensureSchemaMatchesType(() => {
      const subSchema = {
        common: {
          id: z.string(),
          previousId: z.string().nullable(),
          object: z.literal("step"),
        },

        managedStorage: z.union([
          z.object({ target: z.literal("latest") }), //
          z.object({ target: z.literal("specific"), version: z.string() }),
        ]),

        filterCriteria: z.union([
          z.object({ method: z.literal("exact"), name: z.string() }),
          z.object({ method: z.literal("glob"), nameGlob: z.string() }),
          z.object({ method: z.literal("regex"), nameRegex: z.string() }),
        ]),

        s3Connection: z.object({
          bucket: z.string(),
          region: z.string().nullable(),
          endpoint: z.string(),
          accessKeyReference: z.string(),
          secretKeyReference: z.string(),
        } satisfies SubSchema<S3Connection>),
      };

      return z.discriminatedUnion("type", [
        z.object({
          ...subSchema.common,
          type: z.literal(Type.compression),
          algorithm: z.object({
            implementation: z.literal("targzip"),
            level: z.int().min(1).max(9),
          }),
        } satisfies SubSchema<Step.Compression>),

        z.object({
          ...subSchema.common,
          type: z.literal(Type.decompression),
          algorithm: z.object({
            implementation: z.literal("targzip"),
          }),
        } satisfies SubSchema<Step.Decompression>),

        z.object({
          ...subSchema.common,
          type: z.literal(Type.encryption),
          keyReference: z.string(),
          algorithm: z.object({
            implementation: z.literal("aes256cbc"),
          }),
        } satisfies SubSchema<Step.Encryption>),

        z.object({
          ...subSchema.common,
          type: z.literal(Type.decryption),
          keyReference: z.string(),
          algorithm: z.object({
            implementation: z.literal("aes256cbc"),
          }),
        } satisfies SubSchema<Step.Decryption>),

        z.object({
          ...subSchema.common,
          type: z.literal(Type.folder_flatten),
        } satisfies SubSchema<Step.FolderFlatten>),

        z.object({
          ...subSchema.common,
          type: z.literal(Type.folder_group),
        } satisfies SubSchema<Step.FolderGroup>),

        z.object({
          ...subSchema.common,
          type: z.literal(Type.filter),
          filterCriteria: subSchema.filterCriteria,
        } satisfies SubSchema<Step.Filter>),

        z.object({
          ...subSchema.common,
          type: z.literal(Type.custom_script),
          path: z.string(),
          passthrough: z.boolean(),
        } satisfies SubSchema<Step.ScriptExecution>),

        z.object({
          ...subSchema.common,
          type: z.literal(Type.filesystem_write),
          folderPath: z.string(),
          managedStorage: z.boolean(),
        } satisfies SubSchema<Step.FilesystemWrite>),

        z
          .object({
            ...subSchema.common,
            type: z.literal(Type.filesystem_read),
            path: z.string(),
            managedStorage: subSchema.managedStorage.nullable(),
            filterCriteria: subSchema.filterCriteria.nullable(),
          } satisfies SubSchema<Step.FilesystemRead>)
          .refine(
            ({ managedStorage, filterCriteria }) => {
              const invalidCombination = !managedStorage && !!filterCriteria;
              return !invalidCombination;
            },
            {
              error: "Cannot use `filterCriteria` without `managedStorage`",
            },
          ),

        z.object({
          ...subSchema.common,
          type: z.literal(Type.s3_upload),
          connection: subSchema.s3Connection,
          baseFolder: z.string(),
        } satisfies SubSchema<Step.S3Upload>),

        z.object({
          ...subSchema.common,
          type: z.literal(Type.s3_download),
          connection: subSchema.s3Connection,
          baseFolder: z.string(),
          managedStorage: subSchema.managedStorage,
          filterCriteria: subSchema.filterCriteria.nullable(),
        } satisfies SubSchema<Step.S3Download>),

        z.object({
          ...subSchema.common,
          type: z.literal(Type.postgres_backup),
          connectionReference: z.string(),
          toolkit: z.union([
            z.object({ resolution: z.literal("automatic") }),
            z.object({
              resolution: z.literal("manual"),
              psql: z.string(),
              pg_dump: z.string(),
            }),
          ]),
          databaseSelection: z.union([
            z.object({ strategy: z.literal("all") }),
            z.object({ strategy: z.literal("include"), inclusions: z.array(z.string()) }),
            z.object({ strategy: z.literal("exclude"), exclusions: z.array(z.string()) }),
          ]),
        } satisfies SubSchema<Step.PostgresBackup>),

        z.object({
          ...subSchema.common,
          type: z.literal(Type.postgres_restore),
          connectionReference: z.string(),
          toolkit: z.union([
            z.object({ resolution: z.literal("automatic") }),
            z.object({
              resolution: z.literal("manual"),
              psql: z.string(),
              pg_restore: z.string(),
            }),
          ]),
          database: z.string(),
        } satisfies SubSchema<Step.PostgresRestore>),
      ]);
    })
    .ensureTypeMatchesSchema();
}
