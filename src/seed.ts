import { Pipeline } from "./models/Pipeline";
import { Schedule } from "./models/Schedule";
import { PipelineRepository } from "./repositories/PipelineRepository";
import { ScheduleRepository } from "./repositories/ScheduleRepository";
import { ServerRegistry } from "./ServerRegistry";
import { RestrictedService } from "./services/RestrictedService";

export async function seed(registry: ServerRegistry) {
  // cleanup
  await registry.get(RestrictedService).deleteEverything();
  // insert pipelines
  const pipelineRepository = registry.get(PipelineRepository);
  await Promise.all(pipelines.map((p) => pipelineRepository.create(p)));
  // insert schedules
  const scheduleRepository = registry.get(ScheduleRepository);
  await Promise.all(schedules.map((s) => scheduleRepository.create(s)));
}

const pipelines: Pipeline[] = JSON.parse(`
  [
    {
      "id": "019bda4b-e6f6-7000-99e6-d808bf7e7aed",
      "object": "pipeline",
      "name": "Decrypt and Decompress",
      "steps": [
        {
          "id": "thcdxatkfirs",
          "previousId": null,
          "object": "step",
          "type": "filesystem_read",
          "path": "opt/scratchpad/forward/original.txt.tar.gz.enc",
          "managedStorage": null,
          "filterCriteria": null
        },
        {
          "id": "espyhtjwwuvy",
          "previousId": "thcdxatkfirs",
          "object": "step",
          "type": "decryption",
          "keyReference": "MY_ENCRYPTION_KEY",
          "algorithm": {
            "implementation": "aes256cbc"
          }
        },
        {
          "id": "iawrplnnkwcs",
          "previousId": "espyhtjwwuvy",
          "object": "step",
          "type": "decompression",
          "algorithm": {
            "implementation": "targzip"
          }
        },
        {
          "id": "lipwizedmlez",
          "previousId": "iawrplnnkwcs",
          "object": "step",
          "type": "filesystem_write",
          "folderPath": "opt/scratchpad/backward",
          "managedStorage": false,
          "retention": null
        }
      ]
    },
    {
      "id": "019bda4b-d9ff-7000-bae0-2e9c003dd595",
      "object": "pipeline",
      "name": "Compress And Encrypt",
      "steps": [
        {
          "id": "wljdhullkldr",
          "previousId": null,
          "object": "step",
          "type": "filesystem_read",
          "path": "opt/scratchpad/original.txt",
          "managedStorage": null,
          "filterCriteria": null
        },
        {
          "id": "mngpsddoclhc",
          "previousId": "wljdhullkldr",
          "object": "step",
          "type": "compression",
          "algorithm": {
            "implementation": "targzip",
            "level": 9
          }
        },
        {
          "id": "xqaqsieklckn",
          "previousId": "mngpsddoclhc",
          "object": "step",
          "type": "encryption",
          "keyReference": "MY_ENCRYPTION_KEY",
          "algorithm": {
            "implementation": "aes256cbc"
          }
        },
        {
          "id": "gkzzicdhxoux",
          "previousId": "xqaqsieklckn",
          "object": "step",
          "type": "filesystem_write",
          "folderPath": "opt/scratchpad/forward",
          "managedStorage": false,
          "retention": null
        }
      ]
    }
  ]
`);

const schedules: Schedule[] = JSON.parse(`
  [
    {
      "id": "019bda50-a059-7000-807f-2eb8da9ed927",
      "object": "schedule",
      "pipelineId": "019bda4b-e6f6-7000-99e6-d808bf7e7aed",
      "cron": "0 12 * * FRI",
      "active": true
    }
  ]
`);
