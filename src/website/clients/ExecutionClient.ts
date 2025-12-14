import { Execution } from "@/models/Execution";
import { PipelineView } from "@/views/PipelineView";
import { Yesttp } from "yesttp";

export class ExecutionClient {
  public constructor(private readonly yesttp: Yesttp) {}

  public async query(q: { pipelineId: string }): Promise<Execution[]> {
    const { body } = await this.yesttp.get<PipelineView[]>("/executions", {
      searchParams: { pipelineId: q.pipelineId },
    });
    return body.map(Execution.parse);
  }

  public async find(id: string): Promise<Execution> {
    const { body } = await this.yesttp.get<Execution>(`/executions/${id}`);
    return Execution.parse(body);
  }
}
