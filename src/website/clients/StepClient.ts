import { PropertyExtractor } from "@/capabilities/propertyresolution/PropertyExtractor";
import { PropertyReference } from "@/models/PropertyReference";
import { Step } from "@/models/Step";
import { StepWarning } from "@/models/StepWarning";
import { Yesttp } from "yesttp";
import { CompressionForm } from "../forms/step/CompressionForm";
import { CustomScriptForm } from "../forms/step/CustomScriptForm";
import { DecompressionForm } from "../forms/step/DecompressionForm";
import { DecryptionForm } from "../forms/step/DecryptionForm";
import { EncryptionForm } from "../forms/step/EncryptionForm";
import { FilesystemReadForm } from "../forms/step/FilesystemReadForm";
import { FilesystemWriteForm } from "../forms/step/FilesystemWriteForm";
import { FilterForm } from "../forms/step/FilterForm";
import { FolderFlattenForm } from "../forms/step/FolderFlattenForm";
import { FolderGroupForm } from "../forms/step/FolderGroupForm";
import { MariadbBackupForm } from "../forms/step/MariadbBackupForm";
import { MariadbRestoreForm } from "../forms/step/MariadbRestoreForm";
import { PostgresqlBackupForm } from "../forms/step/PostgresqlBackupForm";
import { PostgresqlRestoreForm } from "../forms/step/PostgresqlRestoreForm";
import { S3DownloadForm } from "../forms/step/S3DownloadForm";
import { S3UploadForm } from "../forms/step/S3UploadForm";

export class StepClient {
  private readonly LABELS: Record<Step.Type, Record<string, string>> = {
    [Step.Type.compression]: CompressionForm.Label,
    [Step.Type.decompression]: DecompressionForm.Label,
    [Step.Type.encryption]: EncryptionForm.Label,
    [Step.Type.decryption]: DecryptionForm.Label,
    [Step.Type.folder_flatten]: FolderFlattenForm.Label,
    [Step.Type.folder_group]: FolderGroupForm.Label,
    [Step.Type.filter]: FilterForm.Label,
    [Step.Type.custom_script]: CustomScriptForm.Label,
    [Step.Type.filesystem_write]: FilesystemWriteForm.Label,
    [Step.Type.filesystem_read]: FilesystemReadForm.Label,
    [Step.Type.s3_upload]: S3UploadForm.Label,
    [Step.Type.s3_download]: S3DownloadForm.Label,
    [Step.Type.postgresql_backup]: PostgresqlBackupForm.Label,
    [Step.Type.postgresql_restore]: PostgresqlRestoreForm.Label,
    [Step.Type.mariadb_backup]: MariadbBackupForm.Label,
    [Step.Type.mariadb_restore]: MariadbRestoreForm.Label,
  };

  public constructor(private readonly yesttp: Yesttp) {}

  public getSensitiveFieldIds(type: Step.Type): { sensitiveFieldIds: string[] } {
    return {
      sensitiveFieldIds: StepWarning.sensitiveFields(type).map((dotPath) => {
        const id = dotPath.replaceAll(".", "_");
        if (!this.LABELS[type][id]) throw new Error(`Missing id for ${type}[${dotPath}]`);
        return id;
      }),
    };
  }

  public extractReferences(input: string): PropertyReference[] {
    return PropertyExtractor.extractReferences(input);
  }

  public async validate(step: Step) {
    const { body } = await this.yesttp.post<StepWarning>("/steps/validate", { body: step });
    const labels = this.LABELS[step.type];
    return {
      warningFieldLabels: body.fields.map((dotPath) => {
        const label = labels[dotPath.replaceAll(".", "_")];
        if (!label) throw new Error(`Missing label for ${step.type}[${dotPath}]`);
        return label;
      }),
    };
  }
}
