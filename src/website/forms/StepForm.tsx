import { Step } from "@/models/Step";
import { JSX } from "react/jsx-dev-runtime";
import { CompressionForm } from "./step/CompressionForm";
import { DecompressionForm } from "./step/DecompressionForm";
import { DecryptionForm } from "./step/DecryptionForm";
import { EncryptionForm } from "./step/EncryptionForm";
import { FileSystemReadForm } from "./step/FileSystemReadForm";
import { FilesystemWriteForm } from "./step/FilesystemWriteForm";
import { FolderFlattenForm } from "./step/FolderFlattenForm";
import { FolderGroupForm } from "./step/FolderGroupForm";
import { PostgresBackupForm } from "./step/PostgresBackupForm";
import { PostgresRestoreForm } from "./step/PostgresRestoreForm";
import { S3DownloadForm } from "./step/S3DownloadForm";
import { S3UploadForm } from "./step/S3UploadForm";
import { ScriptExecutionForm } from "./step/ScriptExecutionForm";

type Props = {
  id: string;
  type: Step.Type;
  existing?: Step;
  className?: string;
  onCancel: () => unknown;
  onSubmit: (step: Step) => unknown;
};
export function StepForm({ type, existing, ...props }: Props): JSX.Element {
  switch (type) {
    case Step.Type.filesystem_read:
      return <FileSystemReadForm existing={existing as Step.FilesystemRead} {...props} />;
    case Step.Type.filesystem_write:
      return <FilesystemWriteForm existing={existing as Step.FilesystemWrite} {...props} />;
    case Step.Type.compression:
      return <CompressionForm existing={existing as Step.Compression} {...props} />;
    case Step.Type.decompression:
      return <DecompressionForm existing={existing as Step.Decompression} {...props} />;
    case Step.Type.encryption:
      return <EncryptionForm existing={existing as Step.Encryption} {...props} />;
    case Step.Type.decryption:
      return <DecryptionForm existing={existing as Step.Decryption} {...props} />;
    case Step.Type.folder_flatten:
      return <FolderFlattenForm existing={existing as Step.FolderFlatten} {...props} />;
    case Step.Type.folder_group:
      return <FolderGroupForm existing={existing as Step.FolderGroup} {...props} />;
    case Step.Type.script_execution:
      return <ScriptExecutionForm existing={existing as Step.ScriptExecution} {...props} />;
    case Step.Type.s3_upload:
      return <S3UploadForm existing={existing as Step.S3Upload} {...props} />;
    case Step.Type.s3_download:
      return <S3DownloadForm existing={existing as Step.S3Download} {...props} />;
    case Step.Type.postgres_backup:
      return <PostgresBackupForm existing={existing as Step.PostgresBackup} {...props} />;
    case Step.Type.postgres_restore:
      return <PostgresRestoreForm existing={existing as Step.PostgresRestore} {...props} />;
  }
}
