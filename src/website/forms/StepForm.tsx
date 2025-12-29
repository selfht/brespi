import { Step } from "@/models/Step";
import { JSX } from "react/jsx-dev-runtime";
import { CompressionForm } from "./step/CompressionForm";
import { DecompressionForm } from "./step/DecompressionForm";
import { DecryptionForm } from "./step/DecryptionForm";
import { EncryptionForm } from "./step/EncryptionForm";
import { FilesystemReadForm } from "./step/FilesystemReadForm";
import { FilesystemWriteForm } from "./step/FilesystemWriteForm";
import { FolderFlattenForm } from "./step/FolderFlattenForm";
import { FolderGroupForm } from "./step/FolderGroupForm";
import { PostgresBackupForm } from "./step/PostgresBackupForm";
import { PostgresRestoreForm } from "./step/PostgresRestoreForm";
import { S3DownloadForm } from "./step/S3DownloadForm";
import { S3UploadForm } from "./step/S3UploadForm";
import { CustomScriptForm } from "./step/CustomScriptForm";
import { useRegistry } from "../hooks/useRegistry";
import { StepClient } from "../clients/StepClient.ts";
import { FilterForm } from "./step/FilterForm";

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
  const stepClient = useRegistry(StepClient);
  const validateAndSave = async (step: Step) => {
    await stepClient.validate(step);
    onSave(step);
  };
  switch (type) {
    case Step.Type.filesystem_read:
      return <FilesystemReadForm existing={existing as Step.FilesystemRead} onSave={validateAndSave} {...props} />;
    case Step.Type.filesystem_write:
      return <FilesystemWriteForm existing={existing as Step.FilesystemWrite} onSave={validateAndSave} {...props} />;
    case Step.Type.compression:
      return <CompressionForm existing={existing as Step.Compression} onSave={validateAndSave} {...props} />;
    case Step.Type.decompression:
      return <DecompressionForm existing={existing as Step.Decompression} onSave={validateAndSave} {...props} />;
    case Step.Type.encryption:
      return <EncryptionForm existing={existing as Step.Encryption} onSave={validateAndSave} {...props} />;
    case Step.Type.decryption:
      return <DecryptionForm existing={existing as Step.Decryption} onSave={validateAndSave} {...props} />;
    case Step.Type.folder_flatten:
      return <FolderFlattenForm existing={existing as Step.FolderFlatten} onSave={validateAndSave} {...props} />;
    case Step.Type.folder_group:
      return <FolderGroupForm existing={existing as Step.FolderGroup} onSave={validateAndSave} {...props} />;
    case Step.Type.filter:
      return <FilterForm existing={existing as Step.Filter} onSave={validateAndSave} {...props} />;
    case Step.Type.custom_script:
      return <CustomScriptForm existing={existing as Step.ScriptExecution} onSave={validateAndSave} {...props} />;
    case Step.Type.s3_upload:
      return <S3UploadForm existing={existing as Step.S3Upload} onSave={validateAndSave} {...props} />;
    case Step.Type.s3_download:
      return <S3DownloadForm existing={existing as Step.S3Download} onSave={validateAndSave} {...props} />;
    case Step.Type.postgres_backup:
      return <PostgresBackupForm existing={existing as Step.PostgresBackup} onSave={validateAndSave} {...props} />;
    case Step.Type.postgres_restore:
      return <PostgresRestoreForm existing={existing as Step.PostgresRestore} onSave={validateAndSave} {...props} />;
  }
}
