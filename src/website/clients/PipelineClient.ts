import { Pipeline } from "@/models/Pipeline";
import { PipelineView } from "@/views/PipelineView";
import { Yesttp } from "yesttp";

export class PipelineClient {
  public constructor(private readonly yesttp: Yesttp) {}

  public async query(): Promise<PipelineView[]> {
    const { body } = await this.yesttp.get<PipelineView[]>("/pipelines");
    return body.map(PipelineView.parse);
  }

  public async find(id: string): Promise<PipelineView> {
    const { body } = await this.yesttp.get<PipelineView>(`/pipelines/${id}`);
    return PipelineView.parse(body);
  }

  public async create(pipeline: Omit<Pipeline, "id">): Promise<PipelineView> {
    const { body } = await this.yesttp.post<PipelineView>(`/pipelines`, {
      body: pipeline,
    });
    return PipelineView.parse(body);
  }

  public async update(id: string, pipeline: Pipeline): Promise<PipelineView> {
    const { body } = await this.yesttp.put<PipelineView>(`/pipelines/${id}`, {
      body: pipeline,
    });
    return PipelineView.parse(body);
  }
}
