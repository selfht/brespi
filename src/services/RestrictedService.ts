import { ServerError } from "@/errors/ServerError";
import { ZodProblem } from "@/helpers/ZodIssues";
import { PipelineRepository } from "@/repositories/PipelineRepository";
import { S3Client } from "bun";
import z from "zod/v4";

export class RestrictedService {
  public constructor(private readonly pipelineRepository: PipelineRepository) {}

  public async deleteAllPipelines(): Promise<void> {
    await this.pipelineRepository.removeAll();
  }

  public async emptyBucket(unknown: z.infer<typeof RestrictedService.EmptyBucket>): Promise<void> {
    const request = RestrictedService.EmptyBucket.parse(unknown);
    const client = new S3Client({
      endpoint: request.endpoint,
      bucket: request.bucket,
      region: request.region || undefined,
      accessKeyId: request.accessKey,
      secretAccessKey: request.secretKey,
    });
    const keys = await client.list().then(({ contents }) => contents!.map((c) => c.key));
    await Promise.all(keys.map((key) => client.delete(key)));
  }
}

export namespace RestrictedService {
  export const EmptyBucket = z
    .object({
      bucket: z.string(),
      endpoint: z.string(),
      region: z.string().nullable(),
      accessKey: z.string(),
      secretKey: z.string(),
    })
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });
}
