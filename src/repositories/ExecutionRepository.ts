import { Sqlite } from "@/drizzle/sqlite";
import { $action } from "@/drizzle/tables/$action";
import { $execution } from "@/drizzle/tables/$execution";
import { Execution } from "@/models/Execution";
import { and, eq, isNotNull, isNull, SQL } from "drizzle-orm";
import { ExecutionConverter } from "./converters/ExecutionConverter";

export class ExecutionRepository {
  public constructor(private readonly sqlite: Sqlite) {}

  public async list(): Promise<Execution[]> {
    const executions = await this.sqlite.query.$execution.findMany({
      with: {
        actions: true,
      },
    });
    return executions.map(ExecutionConverter.convert);
  }

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
    });
    return executions.map(ExecutionConverter.convert);
  }

  public async queryMostRecentExecutions(q: { pipelineIds: string[] }): Promise<Map<string, Execution | null>> {
    const result = new Map<string, Execution | null>();
    for (const pipelineId of q.pipelineIds) {
      const executions = await this.sqlite.query.$execution.findMany({
        where: eq($execution.pipelineId, pipelineId),
        with: {
          actions: true,
        },
      });
      const converted = executions.map(ExecutionConverter.convert);
      const mostRecent = converted.toSorted(Execution.sort)[0] || null;
      result.set(pipelineId, mostRecent);
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
