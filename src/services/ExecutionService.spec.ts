import { Test } from "@/helpers/Test.spec";
import { Pipeline } from "@/models/Pipeline";
import { Step } from "@/models/Step";
import { beforeEach, describe, expect, it } from "bun:test";
import { ExecutionService } from "./ExecutionService";

describe(ExecutionService.name, () => {
  const { inMemoryExecutionRepository, inMemoryPipelineRepository } = Test.InMemoryRepositoryRegistry;
  const { adapterService } = Test.MockRegistry;
  const service = new ExecutionService(inMemoryExecutionRepository, inMemoryPipelineRepository, Test.impl(adapterService));

  beforeEach(() => {
    inMemoryPipelineRepository.clear();
    inMemoryExecutionRepository.clear();
  });

  it("initializes", () => {
    expect(service).toBeDefined();
  });

  it("executes a simple linear pipeline", async () => {
    // given
    const pipeline = await inMemoryPipelineRepository.create(linearPipeline());
    // when
    await service.create({ pipelineId: pipeline!.id });
    // TODO
    // TODO
    // TODO
  });

  function linearPipeline(): Pipeline {
    return {
      id: "-",
      name: "my pipeline",
      steps: [
        {
          id: "A",
          previousId: null,
          type: Step.Type.postgres_backup,
          databaseSelection: {
            strategy: "all",
          },
        },
        {
          id: "B",
          previousId: "A",
          type: Step.Type.compression,
          algorithm: {
            implementation: "targzip",
            level: 9,
          },
        },
        {
          id: "C",
          previousId: "B",
          type: Step.Type.encryption,
          keyReference: "MY_KEY",
          algorithm: {
            implementation: "aes256cbc",
          },
        },
        {
          id: "D",
          previousId: "C",
          type: Step.Type.s3_upload,
          baseFolder: "/backups",
          accessKeyReference: "AK",
          secretKeyReference: "SK",
        },
      ],
    };
  }
});
