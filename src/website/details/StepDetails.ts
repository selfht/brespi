import { Prettify } from "@/helpers/Prettify";
import { Action } from "@/models/Action";
import { Outcome } from "@/models/Outcome";
import { Step } from "@/models/Step";
import { Block } from "../canvas/Block";
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
import { PostgresBackupForm } from "../forms/step/PostgresBackupForm";
import { PostgresRestoreForm } from "../forms/step/PostgresRestoreForm";
import { S3DownloadForm } from "../forms/step/S3DownloadForm";
import { S3UploadForm } from "../forms/step/S3UploadForm";

export namespace StepDetails {
  function performLabeling<F>(labels: Record<keyof F, string>, values: Record<keyof F, ValueOf<Block.Details>>): Block.Details {
    const result: Block.Details = {};
    Object.entries(labels).forEach(([key, value]) => {
      result[value as string] = values[key as keyof F];
    });
    return result;
  }

  export function get(step: Step): Block.Details {
    switch (step.type) {
      case Step.Type.compression: {
        const F = CompressionForm.Field;
        return performLabeling<typeof F>(CompressionForm.Label, {
          [F.algorithm_implementation]: step.algorithm.implementation,
          [F.algorithm_targzip_level]: step.algorithm.level,
        });
      }
      case Step.Type.decompression: {
        const F = DecompressionForm.Field;
        return performLabeling<typeof F>(DecompressionForm.Label, {
          [F.algorithm_implementation]: step.algorithm.implementation,
        });
      }
      case Step.Type.encryption: {
        const F = EncryptionForm.Field;
        return performLabeling<typeof F>(EncryptionForm.Label, {
          [F.keyReference]: step.keyReference,
          [F.algorithm_implementation]: step.algorithm.implementation,
        });
      }
      case Step.Type.decryption: {
        const F = DecryptionForm.Field;
        return performLabeling<typeof F>(DecryptionForm.Label, {
          [F.keyReference]: step.keyReference,
          [F.algorithm_implementation]: step.algorithm.implementation,
        });
      }
      case Step.Type.folder_flatten: {
        const F = FolderFlattenForm.Field;
        return performLabeling<typeof F>(FolderFlattenForm.Label, {});
      }
      case Step.Type.folder_group: {
        const F = FolderGroupForm.Field;
        return performLabeling<typeof F>(FolderGroupForm.Label, {});
      }
      case Step.Type.filter: {
        const F = FilterForm.Field;
        return performLabeling<typeof F>(FilterForm.Label, {
          [F.filterCriteria_method]: step.filterCriteria.method,
          [F.filterCriteria_name]: step.filterCriteria.method === "exact" ? step.filterCriteria.name : undefined,
          [F.filterCriteria_nameGlob]: step.filterCriteria.method === "glob" ? step.filterCriteria.nameGlob : undefined,
          [F.filterCriteria_nameRegex]: step.filterCriteria.method === "regex" ? step.filterCriteria.nameRegex : undefined,
        });
      }
      case Step.Type.custom_script: {
        const F = CustomScriptForm.Field;
        return performLabeling<typeof F>(CustomScriptForm.Label, {
          [F.path]: step.path,
          [F.passthrough]: step.passthrough,
        });
      }
      case Step.Type.filesystem_write: {
        const F = FilesystemWriteForm.Field;
        return performLabeling<typeof F>(FilesystemWriteForm.Label, {
          [F.folderPath]: step.folderPath,
          [F.managedStorage]: step.managedStorage,
          [F.retentionPolicy]: step.retention ? step.retention.policy : "none",
          [F.retentionMaxVersions]: step.retention?.policy === "last_n_versions" ? step.retention.maxVersions : undefined,
        });
      }
      case Step.Type.filesystem_read: {
        const F = FilesystemReadForm.Field;
        return performLabeling<typeof F>(FilesystemReadForm.Label, {
          [F.path]: step.path,
          managedStorage: Boolean(step.managedStorage),
          [F.managedStorage_target]: step.managedStorage ? step.managedStorage.target : undefined,
          [F.managedStorage_version]: step.managedStorage?.target === "specific" ? step.managedStorage.version : undefined,
          filterCriteria: Boolean(step.filterCriteria),
          [F.filterCriteria_method]: step.filterCriteria ? step.filterCriteria.method : undefined,
          [F.filterCriteria_name]: step.filterCriteria?.method === "exact" ? step.filterCriteria.name : undefined,
          [F.filterCriteria_nameGlob]: step.filterCriteria?.method === "glob" ? step.filterCriteria.nameGlob : undefined,
          [F.filterCriteria_nameRegex]: step.filterCriteria?.method === "regex" ? step.filterCriteria.nameRegex : undefined,
        });
      }
      case Step.Type.s3_upload: {
        const F = S3UploadForm.Field;
        return performLabeling<typeof F>(S3UploadForm.Label, {
          [F.connection_bucket]: step.connection.bucket,
          [F.basePrefix]: step.basePrefix,
          [F.connection_region]: step.connection.region,
          [F.connection_endpoint]: step.connection.endpoint,
          [F.connection_accessKeyReference]: step.connection.accessKeyReference,
          [F.connection_secretKeyReference]: step.connection.secretKeyReference,
          [F.managedStorage]: true,
          [F.retentionPolicy]: step.retention ? step.retention.policy : "none",
          [F.retentionMaxVersions]: step.retention?.policy === "last_n_versions" ? step.retention.maxVersions : undefined,
        });
      }
      case Step.Type.s3_download: {
        const F = S3DownloadForm.Field;
        return performLabeling<typeof F>(S3DownloadForm.Label, {
          [F.connection_bucket]: step.connection.bucket,
          [F.basePrefix]: step.basePrefix,
          [F.connection_region]: step.connection.region,
          [F.connection_endpoint]: step.connection.endpoint,
          [F.connection_accessKeyReference]: step.connection.accessKeyReference,
          [F.connection_secretKeyReference]: step.connection.secretKeyReference,
          [F.managedStorage]: true,
          [F.managedStorage_target]: step.managedStorage.target,
          [F.managedStorage_version]: step.managedStorage.target === "specific" ? step.managedStorage.version : undefined,
          filterCriteria: Boolean(step.filterCriteria),
          [F.filterCriteria_method]: step.filterCriteria ? step.filterCriteria.method : undefined,
          [F.filterCriteria_name]: step.filterCriteria?.method === "exact" ? step.filterCriteria.name : undefined,
          [F.filterCriteria_nameGlob]: step.filterCriteria?.method === "glob" ? step.filterCriteria.nameGlob : undefined,
          [F.filterCriteria_nameRegex]: step.filterCriteria?.method === "regex" ? step.filterCriteria.nameRegex : undefined,
        });
      }
      case Step.Type.postgres_backup: {
        const F = PostgresBackupForm.Field;
        return performLabeling<typeof F>(PostgresBackupForm.Label, {
          [F.connectionReference]: step.connectionReference,
          [F.toolkit_resolution]: step.toolkit.resolution,
          [F.toolkit_psql]: step.toolkit.resolution === "manual" ? step.toolkit.psql : undefined,
          [F.toolkit_pg_dump]: step.toolkit.resolution === "manual" ? step.toolkit.pg_dump : undefined,
          [F.databaseSelection_strategy]: step.databaseSelection.method,
          [F.databaseSelection_inclusions]: step.databaseSelection.method === "include" ? step.databaseSelection.inclusions : undefined,
          [F.databaseSelection_exclusions]: step.databaseSelection.method === "exclude" ? step.databaseSelection.exclusions : undefined,
        });
      }
      case Step.Type.postgres_restore: {
        const F = PostgresRestoreForm.Field;
        return performLabeling<typeof F>(PostgresRestoreForm.Label, {
          [F.connectionReference]: step.connectionReference,
          [F.toolkit_resolution]: step.toolkit.resolution,
          [F.toolkit_psql]: step.toolkit.resolution === "manual" ? step.toolkit.psql : undefined,
          [F.toolkit_pg_restore]: step.toolkit.resolution === "manual" ? step.toolkit.pg_restore : undefined,
          [F.database]: step.database,
        });
      }
      case Step.Type.mariadb_backup: {
        const F = MariadbBackupForm.Field;
        return performLabeling<typeof F>(MariadbBackupForm.Label, {
          [F.connectionReference]: step.connectionReference,
          [F.toolkit_resolution]: step.toolkit.resolution,
          [F.toolkit_mariadb]: step.toolkit.resolution === "manual" ? step.toolkit.mariadb : undefined,
          [F.toolkit_mariadb_dump]: step.toolkit.resolution === "manual" ? step.toolkit["mariadb-dump"] : undefined,
          [F.databaseSelection_strategy]: step.databaseSelection.method,
          [F.databaseSelection_inclusions]: step.databaseSelection.method === "include" ? step.databaseSelection.inclusions : undefined,
          [F.databaseSelection_exclusions]: step.databaseSelection.method === "exclude" ? step.databaseSelection.exclusions : undefined,
        });
      }
      case Step.Type.mariadb_restore: {
        const F = MariadbRestoreForm.Field;
        return performLabeling<typeof F>(MariadbRestoreForm.Label, {
          [F.connectionReference]: step.connectionReference,
          [F.toolkit_resolution]: step.toolkit.resolution,
          [F.toolkit_mariadb]: step.toolkit.resolution === "manual" ? step.toolkit.mariadb : undefined,
          [F.database]: step.database,
        });
      }
    }
  }
  export function actionDetails(action: Action): Block.Details | null {
    const result: Block.Details = {};
    if (action.startedAt) {
      result["Started"] = Prettify.timestamp(action.startedAt);
      if (action.result) {
        result["Completed"] = Prettify.timestamp(action.result.completedAt);
        result["Duration"] = Prettify.duration(action.result.duration);
        switch (action.result.outcome) {
          case Outcome.success: {
            const maxLength = 10;
            for (const category of ["consumed", "produced"] as const) {
              const artifacts = action.result[category].slice(0, maxLength).map(({ name }) => name);
              const artifactsRemainder = Math.min(0, action.result[category].length - maxLength);
              if (artifactsRemainder > 0) {
                artifacts.push(`+${artifactsRemainder}`);
              }
              const capitalizedCategory = `${category[0].toUpperCase()}${category.slice(1)}`;
              result[capitalizedCategory] = artifacts.length > 0 ? artifacts : { custom: "empty_array" };
            }
            break;
          }
          case Outcome.error: {
            result["Error"] = action.result.errorMessage;
            break;
          }
        }
      }
    }
    return Object.entries(result).length > 0 ? result : null;
  }
}
