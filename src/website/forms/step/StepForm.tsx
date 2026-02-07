import { Step } from "@/models/Step";
import { DialogClient } from "@/website/clients/DialogClient";
import { StepClient } from "@/website/clients/StepClient";
import { useRegistry } from "@/website/hooks/useRegistry";
import { Route } from "@/website/Route";
import { JSX } from "react/jsx-dev-runtime";
import { CompressionForm } from "./CompressionForm";
import { CustomScriptForm } from "./CustomScriptForm";
import { DecompressionForm } from "./DecompressionForm";
import { DecryptionForm } from "./DecryptionForm";
import { EncryptionForm } from "./EncryptionForm";
import { FilesystemReadForm } from "./FilesystemReadForm";
import { FilesystemWriteForm } from "./FilesystemWriteForm";
import { FilterForm } from "./FilterForm";
import { FolderFlattenForm } from "./FolderFlattenForm";
import { FolderGroupForm } from "./FolderGroupForm";
import { MariadbBackupForm } from "./MariadbBackupForm";
import { MariadbRestoreForm } from "./MariadbRestoreForm";
import { PostgresqlBackupForm } from "./PostgresqlBackupForm";
import { PostgresqlRestoreForm } from "./PostgresqlRestoreForm";
import { S3DownloadForm } from "./S3DownloadForm";
import { S3UploadForm } from "./S3UploadForm";

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
  const dialogClient = useRegistry(DialogClient);
  const validateAndSave = async (step: Step) => {
    const { warningFieldLabels } = await stepClient.validate(step);
    if (
      warningFieldLabels.length === 0 ||
      (await dialogClient.confirm({
        warning: { title: "insecure plaintext configuration" },
        render({ yesNoButtons }) {
          const pluralS = warningFieldLabels.length === 1 ? "" : ("s" as const);
          return (
            <div>
              <p>You've assigned a plaintext value to the following field{pluralS}:</p>
              <ul className="mt-4 list-disc list-inside text-c-error font-bold text-lg">
                {warningFieldLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
              <p className="mt-4">
                This is considered insecure, because the corresponding value(s) are about to be included as-is in the{" "}
                <a
                  href={`/${Route.configuration()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline underline-offset-2 decoration-2 decoration-c-accent"
                >
                  main configuration object
                </a>{" "}
                (click to open a new tab).
              </p>
              <p className="mt-4">
                In order to fix this, please consider using <span className="text-c-warning font-mono">{`\${REFERENCE}`}</span> notation for
                these field(s), which will see their values resolved via environment variables or property files at the time of execution.
              </p>
              {yesNoButtons({
                noLabel: "Cancel and Fix",
                noTheme: "success",
                yesLabel: "Continue and Ignore",
                yesTheme: "error",
              })}
            </div>
          );
        },
      }))
    ) {
      onSave(step);
    }
  };
  switch (type) {
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
      return <CustomScriptForm existing={existing as Step.CustomScript} onSave={validateAndSave} {...props} />;
    case Step.Type.filesystem_write:
      return <FilesystemWriteForm existing={existing as Step.FilesystemWrite} onSave={validateAndSave} {...props} />;
    case Step.Type.filesystem_read:
      return <FilesystemReadForm existing={existing as Step.FilesystemRead} onSave={validateAndSave} {...props} />;
    case Step.Type.s3_upload:
      return <S3UploadForm existing={existing as Step.S3Upload} onSave={validateAndSave} {...props} />;
    case Step.Type.s3_download:
      return <S3DownloadForm existing={existing as Step.S3Download} onSave={validateAndSave} {...props} />;
    case Step.Type.postgresql_backup:
      return <PostgresqlBackupForm existing={existing as Step.PostgresqlBackup} onSave={validateAndSave} {...props} />;
    case Step.Type.postgresql_restore:
      return <PostgresqlRestoreForm existing={existing as Step.PostgresqlRestore} onSave={validateAndSave} {...props} />;
    case Step.Type.mariadb_backup:
      return <MariadbBackupForm existing={existing as Step.MariadbBackup} onSave={validateAndSave} {...props} />;
    case Step.Type.mariadb_restore:
      return <MariadbRestoreForm existing={existing as Step.MariadbRestore} onSave={validateAndSave} {...props} />;
  }
}
