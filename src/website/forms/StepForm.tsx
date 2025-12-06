import { Step } from "@/models/Step";
import { FileSystemReadForm } from "./FileSystemReadForm";
import { PostgresBackupForm } from "./PostgresBackupForm";
import { CompressionForm } from "./CompressionForm";

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

export namespace StepForm {
  export async function snoozeBeforeSubmit(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
