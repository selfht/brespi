import { Pipeline } from "../models/Pipeline";
import { Step } from "../models/Step";

export namespace PipelineData {
  export const POSTGRES_BACKUP: Pipeline = {
    id: "342698472-pgb-2173",
    name: "My Postgres Backup Pipeline",
    steps: [
      {
        id: Bun.randomUUIDv7(),
        type: Step.Type.postgres_backup,
        databases: {
          selection: "all",
        },
      },
      {
        id: Bun.randomUUIDv7(),
        type: Step.Type.compression,
        algorithm: "targzip",
        targzip: {
          level: 9,
        },
      },
      {
        id: Bun.randomUUIDv7(),
        type: Step.Type.encryption,
        algorithm: "aes256cbc",
        keyReference: "SYMMETRIC_KEY",
      },
      {
        id: Bun.randomUUIDv7(),
        type: Step.Type.s3_upload,
        accessKeyReference: "ACCESS_KEY",
        secretKeyReference: "SECRET_KEY",
        namespace: "some-random-parent-folder",
      },
    ],
  };

  export const WP_BACKUP: Pipeline = {
    id: "872318923-wpb-28917383",
    name: "My Wordpress Pipeline for /wp-uploads (work in progress)",
    steps: [
      {
        id: Bun.randomUUIDv7(),
        type: Step.Type.filesystem_read,
        path: "/wordpress/wp-uploads",
      },
    ],
  };

  export const RESTORE: Pipeline = {
    id: "5672129810-rs-36746853",
    name: "My Restore Pipeline",
    steps: [
      {
        id: Bun.randomUUIDv7(),
        type: Step.Type.s3_download,
        namespace: "some-random-parent-folder",
        artifact: "gamingworld",
        accessKeyReference: "ACCESS_KEY",
        secretKeyReference: "SECRET_KEY",
        selection: {
          strategy: "latest",
        },
      },
      {
        id: Bun.randomUUIDv7(),
        type: Step.Type.decryption,
        algorithm: "aes256cbc",
        keyReference: "SYMMETRIC_KEY",
      },
      {
        id: Bun.randomUUIDv7(),
        type: Step.Type.decompression,
        algorithm: "targzip",
      },
    ],
  };
}
