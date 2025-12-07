import { Step } from "@/models/Step";
import { Block } from "../canvas/Block";

const types: Record<Step.Type, string> = {
  [Step.Type.filesystem_read]: "Filesystem Read",
  [Step.Type.filesystem_write]: "Filesystem Write",
  [Step.Type.postgres_backup]: "Postgres Backup",
  [Step.Type.postgres_restore]: "Postgres Restore",
  [Step.Type.compression]: "Compression",
  [Step.Type.decompression]: "Decompression",
  [Step.Type.encryption]: "Encryption",
  [Step.Type.decryption]: "Decryption",
  [Step.Type.folder_flatten]: "Folder Flatten",
  [Step.Type.folder_group]: "Folder Group",
  [Step.Type.script_execution]: "Script Execution",
  [Step.Type.s3_upload]: "S3 Upload",
  [Step.Type.s3_download]: "S3 Download",
};

const categories: Record<Step.Category, string> = {
  [Step.Category.producer]: "Artifact producers",
  [Step.Category.transformer]: "Artifact transformers",
  [Step.Category.consumer]: "Artifact consumers",
};

const algorithms: Record<"targzip" | "aes256cbc", string> = {
  targzip: "tar/gzip",
  aes256cbc: "AES-256-CBC",
};

export namespace StepTranslation {
  export function type(type: Step.Type): string {
    return types[type];
  }
  export function category(category: Step.Category): string {
    return categories[category];
  }
  export function algorithm(algorithm: keyof typeof algorithms): string {
    return algorithms[algorithm];
  }
  export function details(step: Step): Block["details"] {
    switch (step.type) {
      case Step.Type.filesystem_read:
        return {
          Path: step.path,
        };
      case Step.Type.filesystem_write:
        return {
          Path: step.path,
        };
      case Step.Type.compression:
        return {
          Algorithm: algorithms[step.algorithm.implementation],
          "Compression level": step.algorithm.level,
        };
      case Step.Type.decompression:
        return {
          Algorithm: algorithms[step.algorithm.implementation],
        };
      case Step.Type.encryption:
        return {
          "Key reference": step.keyReference,
          Algorithm: algorithms[step.algorithm.implementation],
        };
      case Step.Type.decryption:
        return {
          "Key reference": step.keyReference,
          Algorithm: algorithms[step.algorithm.implementation],
        };
      case Step.Type.folder_flatten:
        return {};
      case Step.Type.folder_group:
        return {};
      case Step.Type.script_execution:
        return {
          Path: step.path,
          "Passthrough?": step.passthrough,
        };
      case Step.Type.s3_upload:
        return {
          "Access key reference": step.accessKeyReference,
          "Secret key reference": step.secretKeyReference,
          "Base folder": step.baseFolder,
        };
      case Step.Type.s3_download:
        return {
          "Access key reference": step.accessKeyReference,
          "Secret key reference": step.secretKeyReference,
          "Base folder": step.baseFolder,
          Artifact: step.artifact,
          Selection: step.selection.target,
          "Selection version": step.selection.target === "specific" ? step.selection.version : undefined,
        };
      case Step.Type.postgres_backup:
        return {
          Selection: step.databaseSelection.strategy,
          "Selection include": step.databaseSelection.strategy === "include" ? step.databaseSelection.include : undefined,
          "Selection exclude": step.databaseSelection.strategy === "exclude" ? step.databaseSelection.exclude : undefined,
        };
      case Step.Type.postgres_restore:
        return {
          Database: step.database,
        };
    }
  }
}
