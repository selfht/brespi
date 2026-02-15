import { Step as S } from "@/models/Step";

import grid from "./background/grid.svg";

import close from "./icons/close.svg";
import error from "./icons/error.svg";
import newSvg from "./icons/new.svg";
import play from "./icons/play.svg";
import success from "./icons/success.svg";
import trashcan from "./icons/trashcan.svg";
import warning from "./icons/warning.svg";

import compression from "./steps/compression.PNG";
import custom_script from "./steps/custom_script.PNG";
import decompression from "./steps/decompression.PNG";
import decryption from "./steps/decryption.PNG";
import encryption from "./steps/encryption.PNG";
import filesystem_read from "./steps/filesystem_read.PNG";
import filesystem_write from "./steps/filesystem_write.PNG";
import filter from "./steps/filter.PNG";
import folder_flatten from "./steps/folder_flatten.PNG";
import folder_group from "./steps/folder_group.PNG";
import mariadb_backup from "./steps/mariadb_backup.PNG";
import mariadb_restore from "./steps/mariadb_restore.PNG";
import postgresql_backup from "./steps/postresql_backup.PNG";
import postgresql_restore from "./steps/postresql_restore.PNG";
import s3_download from "./steps/s3_download.PNG";
import s3_upload from "./steps/s3_upload.PNG";

export namespace Images {
  export const Background = {
    grid,
  } as const;

  export const Icon = {
    close,
    error,
    new: newSvg,
    play,
    success,
    trashcan,
    warning,
  } as const;

  export const Step: Record<S.Type, string> = {
    compression,
    decompression,
    encryption,
    decryption,
    folder_flatten,
    folder_group,
    filter,
    custom_script,
    filesystem_write,
    filesystem_read,
    s3_upload,
    s3_download,
    postgresql_backup,
    postgresql_restore,
    mariadb_backup,
    mariadb_restore,
  };
}
