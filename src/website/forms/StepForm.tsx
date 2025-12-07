import { Step } from "@/models/Step";
import { JSX } from "react/jsx-dev-runtime";
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
export function StepForm({ type, existing, ...props }: Props): JSX.Element {
  switch (type) {
    case Step.Type.filesystem_read:
      return <FileSystemReadForm existing={existing as Step.FilesystemRead} {...props} />;
    case Step.Type.compression:
      return <CompressionForm existing={existing as Step.Compression} {...props} />;
    case Step.Type.postgres_backup:
      return <PostgresBackupForm existing={existing as Step.PostgresBackup} {...props} />;
  }
  throw new Error("TODO add remaining branches, and remove this statement (forcing the compiler to check for exhaustion)");
}
