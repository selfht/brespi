import { Pipeline } from "@/models/Pipeline";
import { OmitBetter } from "@/types/OmitBetter";
import { PipelineView } from "@/views/PipelineView";
import { Yesttp } from "yesttp";

export class PipelineClient {
  public constructor(private readonly yesttp: Yesttp) {}

  public async query(): Promise<PipelineView[]> {
    const { body } = await this.yesttp.get("/pipelines");
    return body.map(PipelineView.parse);
  }

  public async find(id: string): Promise<PipelineView> {
    const { body } = await this.yesttp.get(`/pipelines/${id}`);
    return PipelineView.parse(body);
  }

  public async create(pipeline: OmitBetter<Pipeline, "id" | "object">): Promise<PipelineView> {
    const { body } = await this.yesttp.post(`/pipelines`, {
      body: pipeline,
    });
    return PipelineView.parse(body);
  }

  public async update(id: string, pipeline: OmitBetter<Pipeline, "id" | "object">): Promise<PipelineView> {
    const { body } = await this.yesttp.put(`/pipelines/${id}`, {
      body: pipeline,
    });
    return PipelineView.parse(body);
  }

  public async delete(id: string): Promise<PipelineView> {
    const { body } = await this.yesttp.delete(`/pipelines/${id}`);
    return PipelineView.parse(body);
  }
}
