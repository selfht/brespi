import { Pipeline } from "../models/Pipeline";
import { Step } from "../models/Step";
import { StepData } from "./StepData";

export namespace PipelineData {
  export const WORK_IN_PROGRESS: Pipeline = {
    id: "2c4204f8-e503-48dd-9ba6-33caa572920a",
    object: "pipeline",
    name: "This is just a work in progress",
    steps: [
      StepData.createStep(Step.Type.filesystem_read, {
        path: "/etc",
      }),
    ],
  };

  export const POSTGRES: Pipeline = {
    id: "e8b97a79-c187-477e-a03d-bb16a4560e72",
    object: "pipeline",
    name: "My Postgres Backup Pipeline",
    steps: [
      StepData.createStep(Step.Type.postgres_backup, {
        id: "019b1e40-bc72-7001-80e4-c76ff6f1244e",
        connectionReference: "MY_POSTGRES_CONNECTION_URL",
      }),
      StepData.createStep(Step.Type.compression, {
        id: "019b1e40-bc72-7002-8177-3d26094656c8",
        previousId: "019b1e40-bc72-7001-80e4-c76ff6f1244e",
      }),
      StepData.createStep(Step.Type.encryption, {
        id: "019b1e40-bc72-7003-af23-dd2773f7bc70",
        previousId: "019b1e40-bc72-7002-8177-3d26094656c8",
      }),
      StepData.createStep(Step.Type.s3_upload, {
        id: "019b1e40-bc72-7004-a622-09aaf21057ba",
        previousId: "019b1e40-bc72-7003-af23-dd2773f7bc70",
      }),
    ],
  };

  export const WORDPRESS: Pipeline = {
    id: "6c827a56-be44-498e-8891-4d6cdde32e81",
    object: "pipeline",
    name: "My Wordpress Pipeline for /wp-uploads",
    steps: [
      StepData.createStep(Step.Type.filesystem_write, {
        id: "kpwmqemdrxyz",
        previousId: "yfdqipzrjpka",
        path: "",
      }),
      StepData.createStep(Step.Type.s3_upload, {
        id: "dlxhvcsgumze",
        previousId: "yfdqipzrjpka",
        baseFolder: "",
      }),
      StepData.createStep(Step.Type.postgres_restore, {
        id: "xalkneycatmp",
        previousId: "yfdqipzrjpka",
        connectionReference: "MY_POSTGRES_CONNECTION_URL",
      }),
      StepData.createStep(Step.Type.compression, {
        id: "agunfwvnftwr",
        previousId: "kwclogopzrec",
      }),
      StepData.createStep(Step.Type.encryption, {
        id: "yfdqipzrjpka",
        previousId: "agunfwvnftwr",
      }),
      StepData.createStep(Step.Type.postgres_backup, {
        id: "kwclogopzrec",
        connectionReference: "MY_POSTGRES_CONNECTION_URL",
      }),
      StepData.createStep(Step.Type.script_execution, {
        id: "httkqpjuluef",
        previousId: "agunfwvnftwr",
        path: "",
      }),
      StepData.createStep(Step.Type.folder_group, {
        id: "qgbyxvjsfmhu",
        previousId: "httkqpjuluef",
      }),
      StepData.createStep(Step.Type.folder_flatten, {
        id: "amuhvjqcyrjn",
        previousId: "qgbyxvjsfmhu",
      }),
    ],
  };

  export const RESTORE: Pipeline = {
    id: "539d032f-af2a-41f3-8c11-4759c6e73512",
    object: "pipeline",
    name: "My Restore Pipeline",
    steps: [
      StepData.createStep(Step.Type.s3_download, {
        connection: {
          bucket: "my-bucket",
          endpoint: "http://localhost",
          region: null,
          accessKeyReference: "S3_ACCESS_KEY",
          secretKeyReference: "S3_SECRET_KEY",
        },
        baseFolder: "some-random-parent-folder",
      }),
      StepData.createStep(Step.Type.decryption),
      StepData.createStep(Step.Type.decompression),
    ],
  };
}
