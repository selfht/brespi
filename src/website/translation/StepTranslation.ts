import { Prettify } from "@/helpers/Prettify";
import { Action } from "@/models/Action";
import { Outcome } from "@/models/Outcome";
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
  [Step.Type.custom_script]: "Custom Script",
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
  export function stepDetails(step: Step): Block.Details {
    switch (step.type) {
      case Step.Type.filesystem_write:
        return {
          Path: step.folder,
          "Managed storage?": step.managedStorage,
        };
      case Step.Type.filesystem_read:
        return {
          "File or folder": step.fileOrFolder,
          "Managed storage?": Boolean(step.managedStorage),
          "Managed storage: Selection": step.managedStorage ? step.managedStorage.selection.target : undefined,
          "Managed storage: version": step.managedStorage
            ? step.managedStorage.selection.target === "specific"
              ? step.managedStorage.selection.version
              : undefined
            : undefined,
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
          Selection: step.filterCriteria.method,
          Name: step.filterCriteria.method === "exact" ? step.filterCriteria.name : undefined,
          "Name glob": step.filterCriteria.method === "glob" ? step.filterCriteria.nameGlob : undefined,
          "Name regex": step.filterCriteria.method === "regex" ? step.filterCriteria.nameRegex : undefined,
        };
      case Step.Type.custom_script:
        return {
          Path: step.path,
          "Passthrough?": step.passthrough,
        };
      case Step.Type.s3_upload:
        return {
          "Connection: endpoint": step.connection.endpoint,
          "Connection: bucket": step.connection.bucket,
          "Connection: region": step.connection.region,
          "Connection: access key reference": step.connection.accessKeyReference,
          "Connection: secret key reference": step.connection.secretKeyReference,
          "Base folder": step.baseFolder,
        };
      case Step.Type.s3_download:
        return {
          "Connection: bucket": step.connection.bucket,
          "Connection: region": step.connection.region,
          "Connection: endpoint": step.connection.endpoint,
          "Connection: access key reference": step.connection.accessKeyReference,
          "Connection: secret key reference": step.connection.secretKeyReference,
          "Base folder": step.baseFolder,
          "Managed storage: selection": step.managedStorage.selection.target,
          "Managed storge: version":
            step.managedStorage.selection.target === "specific" ? step.managedStorage.selection.version : undefined,
        };
      case Step.Type.postgres_backup:
        return {
          "Connection reference": step.connectionReference,
          Selection: step.databaseSelection.strategy,
          "Selection include": step.databaseSelection.strategy === "include" ? step.databaseSelection.include : undefined,
          "Selection exclude": step.databaseSelection.strategy === "exclude" ? step.databaseSelection.exclude : undefined,
        };
      case Step.Type.postgres_restore:
        return {
          "Connection reference": step.connectionReference,
          Database: step.database,
        };
    }
  }
  export function actionDetails(action: Action): Block.Details | null {
    const result: Block.Details = {};
    if (action.startedAt) {
      result["Started"] = Prettify.timestamp(action.startedAt);
      if (action.result) {
        result["Completed"] = Prettify.timestamp(action.result.completedAt);
        result["Duration"] = Prettify.duration(action.result.duration);
        switch (action.result.outcome) {
          case Outcome.success: {
            const maxLength = 10;
            for (const category of ["consumed", "produced"] as const) {
              const artifacts = action.result[category].slice(0, maxLength).map(({ name }) => name);
              const artifactsRemainder = Math.min(0, action.result[category].length - maxLength);
              if (artifactsRemainder > 0) {
                artifacts.push(`+${artifactsRemainder}`);
              }
              const capitalizedCategory = `${category[0].toUpperCase()}${category.slice(1)}`;
              result[capitalizedCategory] = artifacts.length > 0 ? artifacts : { custom: "empty_array" };
            }
            break;
          }
          case Outcome.error: {
            result["Error"] = action.result.errorMessage;
            break;
          }
        }
      }
    }
    return Object.entries(result).length > 0 ? result : null;
  }
}
