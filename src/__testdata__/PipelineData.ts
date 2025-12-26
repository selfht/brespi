import { Pipeline } from "../models/Pipeline";
import { Step } from "../models/Step";

export namespace PipelineData {
  export const WORK_IN_PROGRESS: Pipeline = {
    id: "2c4204f8-e503-48dd-9ba6-33caa572920a",
    object: "pipeline",
    name: "This is just a work in progress",
    steps: [
      {
        id: Bun.randomUUIDv7(),
        type: Step.Type.filesystem_read,
        object: "step",
        previousId: null,
        path: "/etc",
      },
    ],
  };

  export const POSTGRES: Pipeline = {
    id: "e8b97a79-c187-477e-a03d-bb16a4560e72",
    object: "pipeline",
    name: "My Postgres Backup Pipeline",
    steps: [
      {
        id: "019b1e40-bc72-7001-80e4-c76ff6f1244e",
        previousId: null,
        object: "step",
        type: Step.Type.postgres_backup,
        connectionReference: "MY_POSTGRES_CONNECTION_URL",
        databaseSelection: {
          strategy: "all",
        },
      },
      {
        id: "019b1e40-bc72-7002-8177-3d26094656c8",
        previousId: "019b1e40-bc72-7001-80e4-c76ff6f1244e",
        object: "step",
        type: Step.Type.compression,
        algorithm: {
          implementation: "targzip",
          level: 9,
        },
      },
      {
        id: "019b1e40-bc72-7003-af23-dd2773f7bc70",
        previousId: "019b1e40-bc72-7002-8177-3d26094656c8",
        object: "step",
        type: Step.Type.encryption,
        keyReference: "MY_TEST_ENCRYPTION_KEY",
        algorithm: {
          implementation: "aes256cbc",
        },
      },
      {
        id: "019b1e40-bc72-7004-a622-09aaf21057ba",
        previousId: "019b1e40-bc72-7003-af23-dd2773f7bc70",
        object: "step",
        type: Step.Type.s3_upload,
        bucketReference: "s3+http://AK:SK@localhost/my-bucket",
        baseFolder: "some-random-parent-folder",
      },
    ],
  };

  export const WORDPRESS: Pipeline = {
    id: "6c827a56-be44-498e-8891-4d6cdde32e81",
    object: "pipeline",
    name: "My Wordpress Pipeline for /wp-uploads",
    steps: [
      {
        id: "kpwmqemdrxyz",
        previousId: "yfdqipzrjpka",
        object: "step",
        type: Step.Type.filesystem_write,
        path: "",
      },
      {
        id: "dlxhvcsgumze",
        previousId: "yfdqipzrjpka",
        object: "step",
        type: Step.Type.s3_upload,
        bucketReference: "s3+http://AK:SK@localhost/my-bucket",
        baseFolder: "",
      },
      {
        id: "xalkneycatmp",
        previousId: "yfdqipzrjpka",
        object: "step",
        type: Step.Type.postgres_restore,
        connectionReference: "MY_POSTGRES_CONNECTION_URL",
        database: "",
      },
      {
        id: "agunfwvnftwr",
        previousId: "kwclogopzrec",
        object: "step",
        type: Step.Type.compression,
        algorithm: {
          implementation: "targzip",
          level: 9,
        },
      },
      {
        id: "yfdqipzrjpka",
        previousId: "agunfwvnftwr",
        object: "step",
        type: Step.Type.encryption,
        keyReference: "MY_TEST_ENCRYPTION_KEY",
        algorithm: {
          implementation: "aes256cbc",
        },
      },
      {
        id: "kwclogopzrec",
        previousId: null,
        object: "step",
        type: Step.Type.postgres_backup,
        connectionReference: "MY_POSTGRES_CONNECTION_URL",
        databaseSelection: {
          strategy: "all",
        },
      },
      {
        id: "httkqpjuluef",
        previousId: "agunfwvnftwr",
        object: "step",
        type: Step.Type.script_execution,
        path: "",
        passthrough: false,
      },
      {
        id: "qgbyxvjsfmhu",
        previousId: "httkqpjuluef",
        object: "step",
        type: Step.Type.folder_group,
      },
      {
        id: "amuhvjqcyrjn",
        previousId: "qgbyxvjsfmhu",
        object: "step",
        type: Step.Type.folder_flatten,
      },
    ],
  };

  export const RESTORE: Pipeline = {
    id: "539d032f-af2a-41f3-8c11-4759c6e73512",
    object: "pipeline",
    name: "My Restore Pipeline",
    steps: [
      {
        id: Bun.randomUUIDv7(),
        previousId: null,
        object: "step",
        type: Step.Type.s3_download,
        bucketReference: "s3+http://AK:SK@localhost/my-bucket",
        baseFolder: "some-random-parent-folder",
        selection: {
          target: "latest",
        },
      },
      {
        id: Bun.randomUUIDv7(),
        previousId: null,
        object: "step",
        type: Step.Type.decryption,
        keyReference: "MY_TEST_ENCRYPTION_KEY",
        algorithm: {
          implementation: "aes256cbc",
        },
      },
      {
        id: Bun.randomUUIDv7(),
        previousId: null,
        object: "step",
        type: Step.Type.decompression,
        algorithm: {
          implementation: "targzip",
        },
      },
    ],
  };
}
