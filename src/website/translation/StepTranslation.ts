import { Step } from "@/models/Step";
import { StepFlatten } from "@/types/StepFlatten";

const typeLabels: Record<Step.Type, string> = {
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

const categoryLabels: Record<Step.Category, string> = {
  [Step.Category.producer]: "Artifact producers",
  [Step.Category.transformer]: "Artifact transformers",
  [Step.Category.consumer]: "Artifact consumers",
};

type DetailLabels = {
  [T in Step.Type]: Record<keyof StepFlatten<T>, string>;
};
const detailLabels: DetailLabels = {
  [Step.Type.filesystem_read]: {
    path: "Path",
  },
  [Step.Type.filesystem_write]: {
    path: "Path",
  },
  [Step.Type.compression]: {
    "implementation.algorithm": "Algorithm",
    "implementation.level": "Compression level",
  },
  [Step.Type.decompression]: {
    "implementation.algorithm": "Algorithm",
  },
  [Step.Type.encryption]: {
    "implementation.algorithm": "Algorithm",
    keyReference: "Key reference",
  },
  [Step.Type.decryption]: {
    "implementation.algorithm": "Algorithm",
    keyReference: "Key reference",
  },
  [Step.Type.folder_flatten]: {},
  [Step.Type.folder_group]: {},
  [Step.Type.script_execution]: {
    path: "Path",
    passthrough: "Passthrough?",
  },
  [Step.Type.s3_upload]: {
    accessKeyReference: "Access key reference",
    secretKeyReference: "Secret key reference",
    baseFolder: "Base folder",
  },
  [Step.Type.s3_download]: {
    accessKeyReference: "Access key reference",
    secretKeyReference: "Secret key reference",
    baseFolder: "Base folder",
    artifact: "Artifact",
    "selection.target": "Selection target",
    "selection.version": "Selection version",
  },
  [Step.Type.postgres_backup]: {
    "databases.selection": "Selection",
  },
  [Step.Type.postgres_restore]: {
    database: "Database",
  },
};

export namespace StepTranslation {
  export function type(type: Step.Type): string {
    return typeLabels[type];
  }

  export function category(category: Step.Category): string {
    return categoryLabels[category];
  }

  export function details<T extends Step.Type>(type: T): DetailLabels[T];
  export function details<T extends Step.Type>(type: T, key: keyof DetailLabels[T]): string;
  export function details<T extends Step.Type>(type: T, key?: keyof DetailLabels[T]): DetailLabels[T] | string {
    if (key) {
      return detailLabels[type][key];
    }
    return detailLabels[type];
  }
}
