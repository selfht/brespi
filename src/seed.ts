import { Step } from "./models/Step";
import { ServerRegistry } from "./ServerRegistry";
import { PipelineService } from "./services/PipelineService";
import { RestrictedService } from "./services/RestrictedService";
import { ScheduleService } from "./services/ScheduleService";

export async function seed(registry: ServerRegistry) {
  // cleanup
  await registry.get(RestrictedService).deleteEverything();
  // insert pipeline
  const pipelineService = registry.get(PipelineService);
  const backup = await pipelineService.create({
    name: "Backup",
    steps: [
      {
        id: "fqknnktrztyh",
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
        id: "cenavpbqdils",
        previousId: "fqknnktrztyh",
        object: "step",
        type: Step.Type.filesystem_write,
        folderPath: "/app/opt/backups",
        managedStorage: true,
        retention: {
          policy: "last_n_versions",
          maxVersions: 3,
        },
      },
    ],
  });
  // insert schedules
  const scheduleService = registry.get(ScheduleService);
  await scheduleService.create({
    pipelineId: backup.id,
    cron: "*/5 * * * * *",
    active: false,
  });
}
