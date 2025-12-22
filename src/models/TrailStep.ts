import { Json } from "@/types/Json";
import { Step } from "./Step";

export type TrailStep = Step & {
  runtimeInformation: Record<string, Json> | null;
};
