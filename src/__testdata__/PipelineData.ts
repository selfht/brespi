import { Pipeline } from "../models/Pipeline";
import { Step } from "../models/Step";

export namespace PipelineData {
  export const POSTGRES_BACKUP: Pipeline = {
    id: "342698472-pgb-2173",
    name: "My Postgres Backup Pipeline",
    steps: [
      {
        id: Bun.randomUUIDv7(),
        previousId: null,
        type: Step.Type.postgres_backup,
        databaseSelection: {
          strategy: "include",
          include: ["apple", "banana", "coconut"],
        },
      },
      {
        id: Bun.randomUUIDv7(),
        previousId: null,
        type: Step.Type.compression,
        algorithm: {
          implementation: "targzip",
          level: 9,
        },
      },
      {
        id: Bun.randomUUIDv7(),
        previousId: null,
        type: Step.Type.encryption,
        keyReference: "SYMMETRIC_KEY_TUCKED_FAR_AWAY",
        algorithm: {
          implementation: "aes256cbc",
        },
      },
      {
        id: Bun.randomUUIDv7(),
        previousId: null,
        type: Step.Type.s3_upload,
        accessKeyReference: "ACCESS_KEY",
        secretKeyReference: "SECRET_KEY",
        baseFolder: "some-random-parent-folder",
      },
    ],
  };

  export const WP_BACKUP: Pipeline = {
    id: "872318923-wpb-28917383",
    name: "My Wordpress Pipeline for /wp-uploads (work in progress)",
    steps: [
      {
        id: Bun.randomUUIDv7(),
        previousId: null,
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
        previousId: null,
        type: Step.Type.s3_download,
        baseFolder: "some-random-parent-folder",
        artifact: "gamingworld",
        accessKeyReference: "ACCESS_KEY",
        secretKeyReference: "SECRET_KEY",
        selection: {
          target: "latest",
        },
      },
      {
        id: Bun.randomUUIDv7(),
        previousId: null,
        type: Step.Type.decryption,
        keyReference: "SYMMETRIC_KEY",
        algorithm: {
          implementation: "aes256cbc",
        },
      },
      {
        id: Bun.randomUUIDv7(),
        previousId: null,
        type: Step.Type.decompression,
        algorithm: {
          implementation: "targzip",
        },
      },
    ],
  };
}
