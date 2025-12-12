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
import { useRegistry } from "../hooks/useRegistry";
import { StepClient } from "../clients/StepClient.ts";

type Props = {
  id: string;
  type: Step.Type;
  existing?: Step;
  className?: string;
  onSave: (step: Step) => unknown;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
};
export function StepForm({ type, existing, onSave, ...props }: Props): JSX.Element {
  const stepClient = useRegistry.instance(StepClient);
  const validateAndSubmit = async (step: Step) => {
    await stepClient.validate(step);
    onSave(step);
  };
  switch (type) {
    case Step.Type.filesystem_read:
      return <FileSystemReadForm existing={existing as Step.FilesystemRead} onSubmit={validateAndSubmit} {...props} />;
    case Step.Type.filesystem_write:
      return <FilesystemWriteForm existing={existing as Step.FilesystemWrite} onSubmit={validateAndSubmit} {...props} />;
    case Step.Type.compression:
      return <CompressionForm existing={existing as Step.Compression} onSubmit={validateAndSubmit} {...props} />;
    case Step.Type.decompression:
      return <DecompressionForm existing={existing as Step.Decompression} onSubmit={validateAndSubmit} {...props} />;
    case Step.Type.encryption:
      return <EncryptionForm existing={existing as Step.Encryption} onSubmit={validateAndSubmit} {...props} />;
    case Step.Type.decryption:
      return <DecryptionForm existing={existing as Step.Decryption} onSubmit={validateAndSubmit} {...props} />;
    case Step.Type.folder_flatten:
      return <FolderFlattenForm existing={existing as Step.FolderFlatten} onSubmit={validateAndSubmit} {...props} />;
    case Step.Type.folder_group:
      return <FolderGroupForm existing={existing as Step.FolderGroup} onSubmit={validateAndSubmit} {...props} />;
    case Step.Type.script_execution:
      return <ScriptExecutionForm existing={existing as Step.ScriptExecution} onSubmit={validateAndSubmit} {...props} />;
    case Step.Type.s3_upload:
      return <S3UploadForm existing={existing as Step.S3Upload} onSubmit={validateAndSubmit} {...props} />;
    case Step.Type.s3_download:
      return <S3DownloadForm existing={existing as Step.S3Download} onSubmit={validateAndSubmit} {...props} />;
    case Step.Type.postgres_backup:
      return <PostgresBackupForm existing={existing as Step.PostgresBackup} onSave={validateAndSubmit} {...props} />;
    case Step.Type.postgres_restore:
      return <PostgresRestoreForm existing={existing as Step.PostgresRestore} onSubmit={validateAndSubmit} {...props} />;
  }
}
