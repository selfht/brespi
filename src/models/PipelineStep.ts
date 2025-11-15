export type PipelineStep =
  | PipelineStep.FsRead
  | PipelineStep.FsWrite
  | PipelineStep.PostgresBackup
  | PipelineStep.Compression
  | PipelineStep.Decompression
  | PipelineStep.Encryption
  | PipelineStep.Decryption
  | PipelineStep.S3Upload
  | PipelineStep.S3Download;

export namespace PipelineStep {
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

  export type FsRead = {
    type: Type.fs_read;
    path: string;
    itemizeDirectoryContents: boolean;
  };

  export type FsWrite = {
    type: Type.fs_write;
    directoryPath: string;
  };

  export type PostgresBackup = {
    type: Type.postgres_backup;
    databases:
      | {
          selection: "all";
        }
      | {
          selection: "include";
          include: string[];
        }
      | {
          selection: "exclude";
          exclude: string[];
        };
  };

  export type Compression = {
    type: Type.compression;
    algorithm: "targzip";
    targzip: {
      level: number;
    };
  };

  export type Decompression = {
    type: Type.decompression;
    algorithm: "targzip";
  };

  export type Encryption = {
    type: Type.encryption;
    algorithm: "aes256";
    keyReference: string;
  };

  export type Decryption = {
    type: Type.decryption;
    algorithm: "aes256";
    keyReference: string;
  };

  export type S3Upload = {
    type: Type.s3_upload;
    accessKeyReference: string;
    secretKeyReference: string;
    folder: string;
  };

  export type S3Download = {
    type: Type.s3_download;
    accessKeyReference: string;
    secretKeyReference: string;
    folder: string;
    name: string;
  } & ({ selection: "latest" } | { selection: "version"; version: string });
}
