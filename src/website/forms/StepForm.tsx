import { Step } from "@/models/Step";
import { CompressionForm } from "./step/CompressionForm";
import { FileSystemReadForm } from "./step/FileSystemReadForm";
import { PostgresBackupForm } from "./step/PostgresBackupForm";

type Props = {
  id: string;
  type: Step.Type;
  existing?: Step;
  className?: string;
  onCancel: () => unknown;
  onSubmit: (step: Step) => unknown;
};
export function StepForm({ type, existing, ...props }: Props) {
  if (type === Step.Type.filesystem_read) {
    return <FileSystemReadForm existing={existing as Step.FilesystemRead} {...props} />;
  }
  if (type === Step.Type.compression) {
    return <CompressionForm existing={existing as Step.Compression} {...props} />;
  }
  if (type === Step.Type.postgres_backup) {
    return <PostgresBackupForm existing={existing as Step.PostgresBackup} {...props} />;
  }
  return null;
}
