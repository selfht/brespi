import { PipelineStep } from "./PipelineStep";

export type Pipeline = {
  name: string;
  steps: PipelineStep[];
};
