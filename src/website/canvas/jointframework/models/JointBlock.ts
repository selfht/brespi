import { Block } from "../../Block";

export type JointBlock = Block & {
  coordinates: {
    x: number;
    y: number;
  };
};
