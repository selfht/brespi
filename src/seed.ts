import { Step } from "./models/Step";
import { ServerRegistry } from "./ServerRegistry";
import { PipelineService } from "./services/PipelineService";
import { RestrictedService } from "./services/RestrictedService";
import { ScheduleService } from "./services/ScheduleService";

export async function seed(registry: ServerRegistry) {
  // cleanup
  await registry.get(RestrictedService).deleteEverything();
  // services
  const pipelineService = registry.get(PipelineService);
  const scheduleService = registry.get(ScheduleService);
  // seed
  await createPostgresBackupAndRestoreWithSchedule(pipelineService, scheduleService);
  await createMariadbBackup(pipelineService);
}

async function createPostgresBackupAndRestoreWithSchedule(pipelineService: PipelineService, scheduleService: ScheduleService) {
  const backup = await pipelineService.create({
    name: "PostgreSQL Backup",
    steps: [
      {
        id: "A",
        previousId: null,
        object: "step",
        type: Step.Type.postgres_backup,
        connectionReference: "MY_POSTGRES_URL",
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
  await pipelineService.create({
    name: "PostgreSQL Restore",
    steps: [
      {
        id: "A",
        previousId: null,
        object: "step",
        type: Step.Type.filesystem_read,
        path: "opt/backups_postgresql",
        managedStorage: {
          target: "latest",
        },
        filterCriteria: null,
      },
      {
        id: "B",
        previousId: "hbnijprgbhjg",
        object: "step",
        type: Step.Type.postgres_restore,
        connectionReference: "MY_POSTGRES_URL",
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
        type: Step.Type.postgres_restore,
        connectionReference: "MY_POSTGRES_URL",
        toolkit: {
          resolution: "automatic",
        },
        database: "gamingworld",
      },
      {
        id: "reqyjvrxxdmz",
        previousId: "khtdstqezwyh",
        object: "step",
        type: Step.Type.postgres_restore,
        connectionReference: "MY_POSTGRES_URL",
        toolkit: {
          resolution: "automatic",
        },
        database: "musicworld",
      },
    ],
  });
  await scheduleService.create({
    pipelineId: backup.id,
    cron: "*/5 * * * * *",
    active: false,
  });
}

async function createMariadbBackup(pipelineService: PipelineService) {
  await pipelineService.create({
    name: "MariaDB Backup",
    steps: [
      {
        id: "A",
        previousId: null,
        object: "step",
        type: Step.Type.mariadb_backup,
        connectionReference: "MY_MARIADB_URL",
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
  await pipelineService.create({
    name: "MariaDB Restore",
    steps: [
      {
        id: "A",
        previousId: null,
        object: "step",
        type: Step.Type.filesystem_read,
        path: "opt/backups_mariadb",
        managedStorage: {
          target: "latest",
        },
        filterCriteria: null,
      },
      {
        id: "B",
        previousId: "hbnijprgbhjg",
        object: "step",
        type: Step.Type.mariadb_restore,
        connectionReference: "MY_MARIADB_URL",
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
        connectionReference: "MY_MARIADB_URL",
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
        connectionReference: "MY_MARIADB_URL",
        toolkit: {
          resolution: "automatic",
        },
        database: "musicworld",
      },
    ],
  });
}
