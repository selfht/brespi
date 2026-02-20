import { Event } from "@/events/Event";
import { Step } from "@/models/Step";
import { NotificationService } from "./NotificationService";
import { PipelineService } from "./PipelineService";
import { ScheduleService } from "./ScheduleService";
import { ConfigurationService } from "./ConfigurationService";

export class RestrictedService {
  public constructor(
    private readonly pipelineService: PipelineService,
    private readonly scheduleService: ScheduleService,
    private readonly notificationService: NotificationService,
    private readonly configurationService: ConfigurationService,
  ) {}

  public async purge(): Promise<void> {
    const policies = await this.notificationService.queryPolicies();
    await Promise.all(policies.map(({ id }) => this.notificationService.deletePolicy(id)));
    const schedules = await this.scheduleService.query();
    await Promise.all(schedules.map(({ id }) => this.scheduleService.delete(id)));
    const pipelines = await this.pipelineService.query();
    await Promise.all(pipelines.map(({ id }) => this.pipelineService.delete(id)));
    await this.configurationService.saveChanges();
  }

  public async seed(): Promise<void> {
    await this.purge();
    const { backup: postgresql } = await this.createPostgresqlBackupAndRestore();
    const { backup: mariadb } = await this.createMariadbBackupAndRestore();
    await this.createEverythingPipeline();
    await this.createSchedule(postgresql);
    await this.createSchedule(mariadb);
    await this.createSlackNotificationPolicy();
  }

  private async createPostgresqlBackupAndRestore() {
    const backup = await this.pipelineService.create({
      name: "PostgreSQL Backup",
      steps: [
        {
          id: "A",
          object: "step",
          type: Step.Type.postgresql_backup,
          connection: "${MY_POSTGRESQL_URL}",
          toolkit: {
            resolution: "automatic",
          },
          databaseSelection: {
            method: "all",
          },
        },
        {
          id: "zbkxwmuhozdm",
          previousId: "A",
          object: "step",
          type: Step.Type.compression,
          algorithm: {
            implementation: "targzip",
            level: 9,
          },
        },
        {
          id: "sinhdzokmdpw",
          previousId: "zbkxwmuhozdm",
          object: "step",
          type: Step.Type.encryption,
          key: "${MY_ENCRYPTION_KEY}",
          algorithm: {
            implementation: "aes256cbc",
          },
        },
        {
          id: "iehgpzmjuxax",
          previousId: "sinhdzokmdpw",
          object: "step",
          type: Step.Type.s3_upload,
          connection: {
            bucket: "bucko",
            endpoint: "http://s3:4566",
            accessKey: "${MY_S3_ACCESS_KEY}",
            secretKey: "${MY_S3_SECRET_KEY}",
          },
          basePrefix: "postgresql-backups",
          retention: {
            policy: "last_n_versions",
            maxVersions: 3,
          },
        },
      ],
    });
    const restore = await this.pipelineService.create({
      name: "PostgreSQL Restore",
      steps: [
        {
          id: "B",
          previousId: "hbnijprgbhjg",
          object: "step",
          type: Step.Type.postgresql_restore,
          connection: "${MY_POSTGRESQL_URL}",
          toolkit: {
            resolution: "automatic",
          },
          database: "bakingworld",
        },
        {
          id: "hbnijprgbhjg",
          previousId: "njlaccoyvxts",
          object: "step",
          type: Step.Type.filter,
          filterCriteria: {
            method: "exact",
            name: "bakingworld.dump",
          },
        },
        {
          id: "ytnzxdfmegvi",
          previousId: "njlaccoyvxts",
          object: "step",
          type: Step.Type.filter,
          filterCriteria: {
            method: "exact",
            name: "gamingworld.dump",
          },
        },
        {
          id: "khtdstqezwyh",
          previousId: "njlaccoyvxts",
          object: "step",
          type: Step.Type.filter,
          filterCriteria: {
            method: "exact",
            name: "musicworld.dump",
          },
        },
        {
          id: "otaifqxwlrfi",
          previousId: "ytnzxdfmegvi",
          object: "step",
          type: Step.Type.postgresql_restore,
          connection: "${MY_POSTGRESQL_URL}",
          toolkit: {
            resolution: "automatic",
          },
          database: "gamingworld",
        },
        {
          id: "reqyjvrxxdmz",
          previousId: "khtdstqezwyh",
          object: "step",
          type: Step.Type.postgresql_restore,
          connection: "${MY_POSTGRESQL_URL}",
          toolkit: {
            resolution: "automatic",
          },
          database: "musicworld",
        },
        {
          id: "joopkaddqrzo",
          object: "step",
          type: Step.Type.s3_download,
          connection: {
            bucket: "bucko",
            endpoint: "http://s3:4566",
            accessKey: "${MY_S3_ACCESS_KEY}",
            secretKey: "${MY_S3_SECRET_KEY}",
          },
          basePrefix: "postgresql-backups",
          managedStorage: {
            target: "latest",
          },
        },
        {
          id: "kpgvkdlzmdqk",
          previousId: "joopkaddqrzo",
          object: "step",
          type: Step.Type.decryption,
          key: "${MY_ENCRYPTION_KEY}",
          algorithm: {
            implementation: "aes256cbc",
          },
        },
        {
          id: "njlaccoyvxts",
          previousId: "kpgvkdlzmdqk",
          object: "step",
          type: Step.Type.decompression,
          algorithm: {
            implementation: "targzip",
          },
        },
      ],
    });
    return { backup, restore };
  }

  private async createMariadbBackupAndRestore() {
    const backup = await this.pipelineService.create({
      name: "MariaDB Backup",
      steps: [
        {
          id: "A",
          previousId: undefined,
          object: "step",
          type: Step.Type.mariadb_backup,
          connection: "${MY_MARIADB_URL}",
          toolkit: {
            resolution: "automatic",
          },
          databaseSelection: {
            method: "all",
          },
        },
        {
          id: "B",
          previousId: "A",
          object: "step",
          type: Step.Type.filesystem_write,
          folderPath: "opt/backups_mariadb",
          managedStorage: true,
          retention: {
            policy: "last_n_versions",
            maxVersions: 3,
          },
        },
      ],
    });
    const restore = await this.pipelineService.create({
      name: "MariaDB Restore",
      steps: [
        {
          id: "A",
          previousId: undefined,
          object: "step",
          type: Step.Type.filesystem_read,
          path: "opt/backups_mariadb",
          managedStorage: {
            target: "latest",
          },
          filterCriteria: undefined,
        },
        {
          id: "B",
          previousId: "hbnijprgbhjg",
          object: "step",
          type: Step.Type.mariadb_restore,
          connection: "${MY_MARIADB_URL}",
          toolkit: {
            resolution: "automatic",
          },
          database: "bakingworld",
        },
        {
          id: "hbnijprgbhjg",
          previousId: "A",
          object: "step",
          type: Step.Type.filter,
          filterCriteria: {
            method: "exact",
            name: "bakingworld.sql",
          },
        },
        {
          id: "ytnzxdfmegvi",
          previousId: "A",
          object: "step",
          type: Step.Type.filter,
          filterCriteria: {
            method: "exact",
            name: "gamingworld.sql",
          },
        },
        {
          id: "khtdstqezwyh",
          previousId: "A",
          object: "step",
          type: Step.Type.filter,
          filterCriteria: {
            method: "exact",
            name: "musicworld.sql",
          },
        },
        {
          id: "otaifqxwlrfi",
          previousId: "ytnzxdfmegvi",
          object: "step",
          type: Step.Type.mariadb_restore,
          connection: "${MY_MARIADB_URL}",
          toolkit: {
            resolution: "automatic",
          },
          database: "gamingworld",
        },
        {
          id: "reqyjvrxxdmz",
          previousId: "khtdstqezwyh",
          object: "step",
          type: Step.Type.mariadb_restore,
          connection: "${MY_MARIADB_URL}",
          toolkit: {
            resolution: "automatic",
          },
          database: "musicworld",
        },
      ],
    });
    return { backup, restore };
  }

  private async createEverythingPipeline() {
    await this.pipelineService.create({
      name: "The-Everything-Pipeline",
      steps: [
        {
          id: "vuyrysklhiwt",
          object: "step",
          type: Step.Type.mariadb_backup,
          connection: "",
          toolkit: {
            resolution: "automatic",
          },
          databaseSelection: {
            method: "all",
          },
        },
        {
          id: "blgivzxexrwu",
          previousId: "vuyrysklhiwt",
          object: "step",
          type: Step.Type.mariadb_restore,
          connection: "",
          toolkit: {
            resolution: "automatic",
          },
          database: "",
        },
        {
          id: "woivjjqictlp",
          previousId: "blgivzxexrwu",
          object: "step",
          type: Step.Type.postgresql_backup,
          connection: "",
          toolkit: {
            resolution: "automatic",
          },
          databaseSelection: {
            method: "all",
          },
        },
        {
          id: "mezdgpxhyqug",
          previousId: "woivjjqictlp",
          object: "step",
          type: Step.Type.postgresql_restore,
          connection: "",
          toolkit: {
            resolution: "automatic",
          },
          database: "",
        },
        {
          id: "lcpahlzwahfr",
          previousId: "kynhwokfgxuj",
          object: "step",
          type: Step.Type.filesystem_read,
          path: "",
        },
        {
          id: "kynhwokfgxuj",
          previousId: "vuyrysklhiwt",
          object: "step",
          type: Step.Type.filesystem_write,
          folderPath: "",
          managedStorage: false,
        },
        {
          id: "zorlwlxpgtlw",
          previousId: "lcpahlzwahfr",
          object: "step",
          type: Step.Type.s3_upload,
          connection: {
            bucket: "",
            endpoint: "",
            accessKey: "",
            secretKey: "",
          },
          basePrefix: "",
        },
        {
          id: "pzgqfknwiqqy",
          previousId: "zorlwlxpgtlw",
          object: "step",
          type: Step.Type.s3_download,
          connection: {
            bucket: "",
            endpoint: "",
            accessKey: "",
            secretKey: "",
          },
          basePrefix: "",
          managedStorage: {
            target: "latest",
          },
        },
        {
          id: "ybejyolapxwj",
          previousId: "vuyrysklhiwt",
          object: "step",
          type: Step.Type.compression,
          algorithm: {
            implementation: "targzip",
            level: 9,
          },
        },
        {
          id: "czwjcjrflywe",
          previousId: "ybejyolapxwj",
          object: "step",
          type: Step.Type.decompression,
          algorithm: {
            implementation: "targzip",
          },
        },
        {
          id: "inwyhlqpmhkz",
          previousId: "czwjcjrflywe",
          object: "step",
          type: Step.Type.encryption,
          key: "",
          algorithm: {
            implementation: "aes256cbc",
          },
        },
        {
          id: "kgjvphzfwgod",
          previousId: "inwyhlqpmhkz",
          object: "step",
          type: Step.Type.decryption,
          key: "",
          algorithm: {
            implementation: "aes256cbc",
          },
        },
        {
          id: "rqyghmfuyrua",
          previousId: "ywcsyqlawrlw",
          object: "step",
          type: Step.Type.folder_flatten,
        },
        {
          id: "ywcsyqlawrlw",
          previousId: "vuyrysklhiwt",
          object: "step",
          type: Step.Type.folder_group,
        },
        {
          id: "wbxjqcedkpgp",
          previousId: "rqyghmfuyrua",
          object: "step",
          type: Step.Type.filter,
          filterCriteria: {
            method: "exact",
            name: "",
          },
        },
        {
          id: "bkvoiikxiuui",
          previousId: "wbxjqcedkpgp",
          object: "step",
          type: Step.Type.custom_script,
          path: "",
          passthrough: true,
        },
      ],
    });
  }

  private async createSchedule({ id: pipelineId }: { id: string }) {
    await this.scheduleService.create({
      pipelineId,
      cron: "*/5 * * * * *",
      active: false,
    });
  }

  private async createSlackNotificationPolicy() {
    await this.notificationService.createPolicy({
      active: false,
      channel: {
        type: "slack",
        webhookUrl: "${MY_SLACK_WEBHOOK_URL}",
      },
      eventSubscriptions: [
        { type: Event.Type.execution_started, triggers: ["ad_hoc", "schedule"] },
        { type: Event.Type.execution_completed, triggers: ["ad_hoc", "schedule"] },
      ],
    });
  }
}
