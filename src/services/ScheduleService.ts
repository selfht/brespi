import { ScheduleError } from "@/errors/ScheduleError";
import { ServerError } from "@/errors/ServerError";
import { Event } from "@/events/Event";
import { EventBus } from "@/events/EventBus";
import { ZodProblem } from "@/helpers/ZodIssues";
import { Configuration } from "@/models/Configuration";
import { Schedule } from "@/models/Schedule";
import { PipelineRepository } from "@/repositories/PipelineRepository";
import { ScheduleRepository } from "@/repositories/ScheduleRepository";
import { Temporal } from "@js-temporal/polyfill";
import { Cron } from "croner";
import z from "zod/v4";
import { ExecutionService } from "./ExecutionService";

export class ScheduleService {
  private readonly activeCronJobs = new Map<string, Cron>();

  public constructor(
    private readonly eventBus: EventBus,
    private readonly scheduleRepository: ScheduleRepository,
    private readonly pipelineRepository: PipelineRepository,
    private readonly executionService: ExecutionService,
  ) {
    eventBus.subscribe(Event.Type.pipeline_deleted, ({ data: { pipeline } }) => {
      this.deleteForPipeline(pipeline.id).catch(console.error);
    });
    eventBus.subscribe(Event.Type.configuration_updated, ({ data: { configuration, trigger } }) => {
      if (trigger === "disk_synchronization") {
        this.synchronizeWithUpdatedConfiguration(configuration);
      }
      // otherwise, any change would've ocurred through application services
    });
  }

  public async query(): Promise<Schedule[]> {
    return await this.scheduleRepository.query();
  }

  public async create(unknown: z.output<typeof ScheduleService.Upsert>): Promise<Schedule> {
    const { pipelineId, active, cron } = ScheduleService.Upsert.parse(unknown);
    const schedule = await this.scheduleRepository.create({
      id: Bun.randomUUIDv7(),
      object: "schedule",
      pipelineId: await this.ensureValidPipeline(pipelineId),
      active,
      cron: this.ensureValidCronExpression(cron),
    });
    this.start(schedule);
    this.eventBus.publish(Event.Type.schedule_created, { schedule });
    return schedule;
  }

  public async update(id: string, unknown: z.output<typeof ScheduleService.Upsert>): Promise<Schedule> {
    const { pipelineId, active, cron } = ScheduleService.Upsert.parse(unknown);
    const schedule = await this.scheduleRepository.update({
      id,
      object: "schedule",
      pipelineId: await this.ensureValidPipeline(pipelineId),
      active: active,
      cron: this.ensureValidCronExpression(cron),
    });
    this.stop(id);
    this.start(schedule);
    this.eventBus.publish(Event.Type.schedule_updated, { schedule });
    return schedule;
  }

  public async delete(id: string): Promise<Schedule> {
    const schedule = await this.scheduleRepository.delete(id);
    this.stop(id);
    this.eventBus.publish(Event.Type.schedule_deleted, { schedule });
    return schedule;
  }

  public evaluateCronExpression(unknown: z.output<typeof ScheduleService.EvaluateCronExpression>): Temporal.PlainDateTime[] {
    const { expression, amount } = ScheduleService.EvaluateCronExpression.parse(unknown);
    let cron: Cron | undefined = undefined;
    try {
      cron = new Cron(expression);
      const roundedNow = new Date(Math.floor(Date.now() / 1000) * 1000); // Round down to current second for stable results within the same second
      return cron.nextRuns(amount, roundedNow).map((date) =>
        Temporal.Instant.fromEpochMilliseconds(date.getTime())
          .toZonedDateTimeISO(Temporal.Now.timeZoneId()) //
          .toPlainDateTime(),
      );
    } catch (e) {
      throw ScheduleError.invalid_cron_expression();
    } finally {
      cron?.stop();
    }
  }

  private async deleteForPipeline(pipelineId: string) {
    const schedules = await this.scheduleRepository.query({ pipelineId });
    for (const { id } of schedules) {
      await this.delete(id);
    }
  }

  private async synchronizeWithUpdatedConfiguration({ schedules: coreSchedules }: Configuration) {
    const schedules = await this.scheduleRepository.synchronizeWithUpdatedConfiguration(coreSchedules);
    schedules.forEach((schedule) => {
      const shouldBeStarted = schedule.active && !this.activeCronJobs.has(schedule.id);
      const shouldBeStopped = !schedule.active && this.activeCronJobs.has(schedule.id);
      if (shouldBeStarted) {
        this.start(schedule);
      }
      if (shouldBeStopped) {
        this.stop(schedule.id);
      }
    });
    // some schedules may have been deleted; so stop them
    this.activeCronJobs
      .keys()
      .filter((id) => !schedules.some((s) => s.id === id))
      .forEach((id) => this.stop(id));
  }

  private async ensureValidPipeline(pipelineId: string): Promise<string> {
    if (await this.pipelineRepository.findById(pipelineId)) {
      return pipelineId;
    }
    throw ScheduleError.pipeline_not_found();
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
      const cron = new Cron(schedule.cron, async () => {
        await this.executionService.create({ pipelineId: schedule.pipelineId, trigger: "schedule" }).catch(console.error);
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
  export const Upsert = z
    .object({
      pipelineId: z.string(),
      active: z.boolean(),
      cron: z.string(),
    })
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });
  export const EvaluateCronExpression = z
    .object({
      expression: z.string(),
      amount: z.number(),
    })
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });
}
