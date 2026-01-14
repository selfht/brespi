import { ScheduleError } from "@/errors/ScheduleError";
import { ServerError } from "@/errors/ServerError";
import { ZodProblem } from "@/helpers/ZodIssues";
import { Schedule } from "@/models/Schedule";
import { ScheduleRepository } from "@/repositories/ScheduleRepository";
import { Cron } from "croner";
import z from "zod/v4";
import { ExecutionService } from "./ExecutionService";

export class ScheduleService {
  private readonly activeCronJobs = new Map<string, Cron>();

  public constructor(
    private readonly repository: ScheduleRepository,
    private readonly executionService: ExecutionService,
  ) {}

  public async initializeSchedules() {
    const schedules = await this.repository.list();
    schedules.forEach((schedule) => this.start(schedule));
  }

  public async create(unknown: z.output<typeof ScheduleService.Create>): Promise<Schedule> {
    const { pipelineId, active, cron } = ScheduleService.Create.parse(unknown);
    const result = await this.repository.create({
      id: Bun.randomUUIDv7(),
      object: "schedule",
      pipelineId,
      active,
      cron: this.ensureValidCronExpression(cron),
    });
    this.start(result);
    return result;
  }

  public async update(id: string, unknown: z.output<typeof ScheduleService.Update>): Promise<Schedule> {
    const { pipelineId, active, cron } = ScheduleService.Update.parse(unknown);
    const result = await this.repository.update(id, (schedule) => {
      const result: Schedule = { ...schedule };
      if (pipelineId !== undefined) {
        result.pipelineId = pipelineId;
      }
      if (active !== undefined) {
        result.active = active;
      }
      if (cron !== undefined) {
        result.cron = this.ensureValidCronExpression(cron);
      }
      return schedule;
    });
    this.stop(id);
    this.start(result);
    return result;
  }

  public async delete(id: string): Promise<Schedule> {
    const result = await this.repository.remove(id);
    this.stop(id);
    return result;
  }

  private ensureValidCronExpression(expression: string): string {
    try {
      new Cron(expression).stop();
      return expression;
    } catch (e) {
      throw ScheduleError.invalid_cron_expression();
    }
  }

  private start(schedule: Schedule) {
    if (schedule.active) {
      const cron = new Cron(schedule.cron, () => {
        this.executionService.create({ pipelineId: schedule.pipelineId });
      });
      this.activeCronJobs.set(schedule.id, cron);
    }
  }

  private stop(id: string) {
    this.activeCronJobs.get(id)?.stop();
    this.activeCronJobs.delete(id);
  }
}

export namespace ScheduleService {
  export const Create = z
    .object({
      pipelineId: z.string(),
      active: z.boolean(),
      cron: z.string(),
    })
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });

  export const Update = z
    .object({
      pipelineId: z.string().optional(),
      active: z.boolean().optional(),
      cron: z.string().optional(),
    })
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });
}
