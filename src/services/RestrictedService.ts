import * as schema from "@/drizzle/schema";
import { Sqlite } from "@/drizzle/sqlite";
import { Event } from "@/events/Event";
import { Configuration } from "@/models/Configuration";
import { Step } from "@/models/Step";
import { ConfigurationRepository } from "@/repositories/ConfigurationRepository";
import { isTable } from "drizzle-orm";
import { NotificationService } from "./NotificationService";
import { PipelineService } from "./PipelineService";
import { ScheduleService } from "./ScheduleService";

export class RestrictedService {
  public constructor(
    private readonly sqlite: Sqlite,
    private readonly configurationRepository: ConfigurationRepository,
    private readonly pipelineService: PipelineService,
    private readonly scheduleService: ScheduleService,
    private readonly notificationService: NotificationService,
  ) {}

  public async purge(): Promise<void> {
    for (const table of Object.values(schema)) {
      if (isTable(table)) {
        await this.sqlite.delete(table);
      }
    }
    await this.configurationRepository.write((_) => ({
      configuration: Configuration.Core.empty(),
    }));
    await this.configurationRepository.saveChanges();
  }

  public async seed(): Promise<void> {
    await this.purge();
    const { backup: postgresql } = await this.createPostgresqlBackupAndRestore();
    const { backup: mariadb } = await this.createMariadbBackupAndRestore();
    await this.createSchedule(postgresql);
    await this.createSchedule(mariadb);
    await this.createSlackNotificationPolicy();
  }

  private async createPostgresqlBackupAndRestore() {
    const backup = () =>
      this.pipelineService.create({
        name: "PostgreSQL Backup",
        steps: [
          {
            id: "A",
            previousId: undefined,
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
            id: "B",
            previousId: "A",
            object: "step",
            type: Step.Type.filesystem_write,
            folderPath: "opt/backups_postgresql",
            managedStorage: true,
            retention: {
              policy: "last_n_versions",
              maxVersions: 3,
            },
          },
        ],
      });
    const restore = () =>
      this.pipelineService.create({
        name: "PostgreSQL Restore",
        steps: [
          {
            id: "A",
            previousId: undefined,
            object: "step",
            type: Step.Type.filesystem_read,
            path: "opt/backups_postgresql",
            managedStorage: {
              target: "latest",
            },
            filterCriteria: undefined,
          },
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
            previousId: "A",
            object: "step",
            type: Step.Type.filter,
            filterCriteria: {
              method: "exact",
              name: "bakingworld.dump",
            },
          },
          {
            id: "ytnzxdfmegvi",
            previousId: "A",
            object: "step",
            type: Step.Type.filter,
            filterCriteria: {
              method: "exact",
              name: "gamingworld.dump",
            },
          },
          {
            id: "khtdstqezwyh",
            previousId: "A",
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
        ],
      });
    return {
      restore: await restore(),
      backup: await backup(),
    };
  }

  private async createMariadbBackupAndRestore() {
    const backup = () =>
      this.pipelineService.create({
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
    const restore = () =>
      this.pipelineService.create({
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
    return {
      restore: await restore(),
      backup: await backup(),
    };
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
