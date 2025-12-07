import { Step } from "@/models/Step";

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

export namespace StepTranslation {
  export function type(type: Step.Type): string {
    return typeLabels[type];
  }

  export function category(category: Step.Category): string {
    return categoryLabels[category];
  }
}
