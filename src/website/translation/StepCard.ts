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
import { PostgresBackupForm } from "../forms/step/PostgresBackupForm";
import { PostgresRestoreForm } from "../forms/step/PostgresRestoreForm";
import { S3DownloadForm } from "../forms/step/S3DownloadForm";
import { S3UploadForm } from "../forms/step/S3UploadForm";

export namespace StepCard {
  function performLabeling<F>(labels: Record<keyof F, string>, values: Record<keyof F, ValueOf<Block.Details>>): Block.Details {
    const result: Block.Details = {};
    Object.entries(labels).forEach(([key, value]) => {
      result[value as string] = values[key as keyof F];
    });
    return result;
  }

  export function getDetails(step: Step): Block.Details {
    switch (step.type) {
      case Step.Type.compression:
        return performLabeling<typeof CompressionForm.Field>(CompressionForm.Label, {
          algorithm_implementation: step.algorithm.implementation,
          algorithm_level: step.algorithm.level,
        });
      case Step.Type.decompression:
        return performLabeling<typeof DecompressionForm.Field>(DecompressionForm.Label, {
          algorithm_implementation: step.algorithm.implementation,
        });
      case Step.Type.encryption:
        return performLabeling<typeof EncryptionForm.Field>(EncryptionForm.Label, {
          keyReference: step.keyReference,
          algorithm_implementation: step.algorithm.implementation,
        });
      case Step.Type.decryption:
        return performLabeling<typeof DecryptionForm.Field>(DecryptionForm.Label, {
          keyReference: step.keyReference,
          algorithm_implementation: step.algorithm.implementation,
        });
      case Step.Type.folder_flatten:
        return performLabeling<typeof FolderFlattenForm.Field>(FolderFlattenForm.Label, {});
      case Step.Type.folder_group:
        return performLabeling<typeof FolderGroupForm.Field>(FolderGroupForm.Label, {});
      case Step.Type.filter:
        return performLabeling<typeof FilterForm.Field>(FilterForm.Label, {
          filterCriteria_method: step.filterCriteria.method,
          filterCriteria_name: step.filterCriteria.method === "exact" ? step.filterCriteria.name : undefined,
          filterCriteria_nameGlob: step.filterCriteria.method === "glob" ? step.filterCriteria.nameGlob : undefined,
          filterCriteria_nameRegex: step.filterCriteria.method === "regex" ? step.filterCriteria.nameRegex : undefined,
        });
      case Step.Type.custom_script:
        return performLabeling<typeof CustomScriptForm.Field>(CustomScriptForm.Label, {
          path: step.path,
          passthrough: step.passthrough,
        });
      case Step.Type.filesystem_write:
        return performLabeling<typeof FilesystemWriteForm.Field>(FilesystemWriteForm.Label, {
          folder: step.folder,
          managedStorage: step.managedStorage,
        });
      case Step.Type.filesystem_read:
        return performLabeling<typeof FilesystemReadForm.Field>(FilesystemReadForm.Label, {
          fileOrFolder: step.fileOrFolder,
          managedStorage: Boolean(step.managedStorage),
          managedStorage_target: step.managedStorage ? step.managedStorage.target : undefined,
          managedStorage_version: step.managedStorage?.target === "specific" ? step.managedStorage.version : undefined,
          filterCriteria: Boolean(step.filterCriteria),
          filterCriteria_method: step.filterCriteria ? step.filterCriteria.method : undefined,
          filterCriteria_name: step.filterCriteria?.method === "exact" ? step.filterCriteria.name : undefined,
          filterCriteria_nameGlob: step.filterCriteria?.method === "glob" ? step.filterCriteria.nameGlob : undefined,
          filterCriteria_nameRegex: step.filterCriteria?.method === "regex" ? step.filterCriteria.nameRegex : undefined,
        });
      case Step.Type.s3_upload:
        return performLabeling<typeof S3UploadForm.Field>(S3UploadForm.Label, {
          connection_bucket: step.connection.bucket,
          connection_region: step.connection.region,
          connection_endpoint: step.connection.endpoint,
          connection_accessKeyReference: step.connection.accessKeyReference,
          connection_secretKeyReference: step.connection.secretKeyReference,
          baseFolder: step.baseFolder,
        });
      case Step.Type.s3_download:
        return performLabeling<typeof S3DownloadForm.Field>(S3DownloadForm.Label, {
          connection_bucket: step.connection.bucket,
          connection_region: step.connection.region,
          connection_endpoint: step.connection.endpoint,
          connection_accessKeyReference: step.connection.accessKeyReference,
          connection_secretKeyReference: step.connection.secretKeyReference,
          baseFolder: step.baseFolder,
          managedStorage: true,
          managedStorage_target: step.managedStorage.target,
          managedStorage_version: step.managedStorage.target === "specific" ? step.managedStorage.version : undefined,
          filterCriteria: Boolean(step.filterCriteria),
          filterCriteria_method: step.filterCriteria ? step.filterCriteria.method : undefined,
          filterCriteria_name: step.filterCriteria?.method === "exact" ? step.filterCriteria.name : undefined,
          filterCriteria_nameGlob: step.filterCriteria?.method === "glob" ? step.filterCriteria.nameGlob : undefined,
          filterCriteria_nameRegex: step.filterCriteria?.method === "regex" ? step.filterCriteria.nameRegex : undefined,
        });
      case Step.Type.postgres_backup:
        return performLabeling<typeof PostgresBackupForm.Field>(PostgresBackupForm.Label, {
          connectionReference: step.connectionReference,
          toolkit_resolution: step.toolkit.resolution,
          toolkit_psql: step.toolkit.resolution === "manual" ? step.toolkit.psql : undefined,
          toolkit_pg_dump: step.toolkit.resolution === "manual" ? step.toolkit.pg_dump : undefined,
          databaseSelection_strategy: step.databaseSelection.strategy,
          databaseSelection_include: step.databaseSelection.strategy === "include" ? step.databaseSelection.inclusions : undefined,
          databaseSelection_exclude: step.databaseSelection.strategy === "exclude" ? step.databaseSelection.exclusions : undefined,
        });
      case Step.Type.postgres_restore:
        return performLabeling<typeof PostgresRestoreForm.Field>(PostgresRestoreForm.Label, {
          connectionReference: step.connectionReference,
          toolkit_resolution: step.toolkit.resolution,
          toolkit_psql: step.toolkit.resolution === "manual" ? step.toolkit.psql : undefined,
          toolkit_pg_restore: step.toolkit.resolution === "manual" ? step.toolkit.pg_restore : undefined,
          database: step.database,
        });
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
