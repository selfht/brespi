import { Step } from "@/models/Step";
import { Block } from "../canvas/Block";

const types: Record<Step.Type, string> = {
  [Step.Type.filesystem_read]: "Filesystem Read",
  [Step.Type.filesystem_write]: "Filesystem Write",
  [Step.Type.compression]: "Compression",
  [Step.Type.decompression]: "Decompression",
  [Step.Type.encryption]: "Encryption",
  [Step.Type.decryption]: "Decryption",
  [Step.Type.folder_flatten]: "Folder Flatten",
  [Step.Type.folder_group]: "Folder Group",
  [Step.Type.filter]: "Filter",
  [Step.Type.script_execution]: "Script Execution",
  [Step.Type.s3_upload]: "S3 Upload",
  [Step.Type.s3_download]: "S3 Download",
  [Step.Type.postgres_backup]: "Postgres Backup",
  [Step.Type.postgres_restore]: "Postgres Restore",
};

const categories: Record<Step.Category, string> = {
  [Step.Category.producer]: "Artifact producers",
  [Step.Category.transformer]: "Artifact transformers",
  [Step.Category.consumer]: "Artifact consumers",
};

export namespace StepTranslation {
  export function type(type: Step.Type): string {
    return types[type];
  }
  export function category(category: Step.Category): string {
    return categories[category];
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
          Algorithm: step.algorithm.implementation,
          "Compression level": step.algorithm.level,
        };
      case Step.Type.decompression:
        return {
          Algorithm: step.algorithm.implementation,
        };
      case Step.Type.encryption:
        return {
          "Key reference": step.keyReference,
          Algorithm: step.algorithm.implementation,
        };
      case Step.Type.decryption:
        return {
          "Key reference": step.keyReference,
          Algorithm: step.algorithm.implementation,
        };
      case Step.Type.folder_flatten:
        return {};
      case Step.Type.folder_group:
        return {};
      case Step.Type.filter:
        return {
          Selection: step.selection.method,
          Name: step.selection.method === "exact" ? step.selection.name : undefined,
          "Name glob": step.selection.method === "glob" ? step.selection.nameGlob : undefined,
          "Name regex": step.selection.method === "regex" ? step.selection.nameRegex : undefined,
        };
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
