import { Sqlite } from "@/drizzle/sqlite";
import { $action } from "@/drizzle/tables/$action";
import { $execution } from "@/drizzle/tables/$execution";
import { Execution } from "@/models/Execution";
import { and, desc, eq, inArray, isNotNull, isNull, max, SQL } from "drizzle-orm";
import { ExecutionConverter } from "./converters/ExecutionConverter";

export class ExecutionRepository {
  public constructor(private readonly sqlite: Sqlite) {}

  public async query(q: { pipelineId: string; completed?: boolean }): Promise<Execution[]> {
    let where: SQL | undefined = eq($execution.pipelineId, q.pipelineId);
    if (q.completed !== undefined) {
      where = and(where, q.completed ? isNotNull($execution.resultCompletedAt) : isNull($execution.resultCompletedAt));
    }
    const executions = await this.sqlite.query.$execution.findMany({
      where,
      with: {
        actions: true,
      },
      orderBy: [desc($execution.startedAt)],
      limit: 250,
    });
    return executions.map(ExecutionConverter.convert);
  }

  public async queryMostRecentExecutions(q: { pipelineIds: string[] }): Promise<Map<string, Execution | undefined>> {
    const result = new Map<string, Execution | undefined>(q.pipelineIds.map((id) => [id, undefined]));
    if (q.pipelineIds.length === 0) {
      return result;
    }
    // Query 1: Get the most recent execution ID per pipeline
    const latestPerPipeline = this.sqlite
      .select({
        pipelineId: $execution.pipelineId,
        maxStartedAt: max($execution.startedAt).as("maxStartedAt"),
      })
      .from($execution)
      .where(inArray($execution.pipelineId, q.pipelineIds))
      .groupBy($execution.pipelineId)
      .as("latest");
    const latestIds = await this.sqlite
      .select({ id: $execution.id })
      .from($execution)
      .innerJoin(
        latestPerPipeline,
        and(eq($execution.pipelineId, latestPerPipeline.pipelineId), eq($execution.startedAt, latestPerPipeline.maxStartedAt)),
      );
    if (latestIds.length === 0) {
      return result;
    }
    // Query 2: Load full executions with actions using relational API
    const executions = await this.sqlite.query.$execution.findMany({
      where: inArray(
        $execution.id,
        latestIds.map((r) => r.id),
      ),
      with: {
        actions: true,
      },
    });
    for (const execution of executions) {
      result.set(execution.pipelineId, ExecutionConverter.convert(execution));
    }
    return result;
  }

  public async findById(id: string): Promise<Execution | undefined> {
    const execution = await this.sqlite.query.$execution.findFirst({
      where: eq($execution.id, id),
      with: {
        actions: true,
      },
    });
    return execution ? ExecutionConverter.convert(execution) : undefined;
  }

  public async create(execution: Execution): Promise<Execution | undefined> {
    const db = ExecutionConverter.convert(execution);
    await this.sqlite.insert($execution).values(db);
    if (db.actions.length > 0) {
      await this.sqlite.insert($action).values(db.actions);
    }
    const result = await this.findById(execution.id);
    return result;
  }

  public async update(execution: Execution): Promise<Execution | undefined> {
    const db = ExecutionConverter.convert(execution);
    await this.sqlite.update($execution).set(db).where(eq($execution.id, execution.id));
    await this.sqlite.delete($action).where(eq($action.executionId, execution.id));
    if (db.actions.length > 0) {
      await this.sqlite.insert($action).values(db.actions);
    }
    return this.findById(execution.id);
  }

  public async remove(id: string): Promise<Execution | undefined> {
    const execution = await this.findById(id);
    if (execution) {
      await this.sqlite.delete($execution).where(eq($execution.id, id));
    }
    return execution;
  }
}
