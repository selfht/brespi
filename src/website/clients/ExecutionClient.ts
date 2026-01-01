import { Execution } from "@/models/Execution";
import { PipelineView } from "@/views/PipelineView";
import { Yesttp } from "yesttp";

export class ExecutionClient {
  public constructor(private readonly yesttp: Yesttp) {}

  public async query(q: { pipelineId: string }): Promise<Execution[]> {
    const { body } = await this.yesttp.get("/executions", {
      searchParams: { pipelineId: q.pipelineId },
    });
    return body.map(Execution.parse);
  }

  public async find(id: string): Promise<Execution> {
    const { body } = await this.yesttp.get(`/executions/${id}`);
    return Execution.parse(body);
  }

  public async create(q: { pipelineId: string }): Promise<Execution> {
    const { body } = await this.yesttp.post("/executions", {
      body: { pipelineId: q.pipelineId },
    });
    return Execution.parse(body);
  }
}
