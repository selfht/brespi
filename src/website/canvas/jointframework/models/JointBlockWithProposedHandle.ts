import { Block } from "../../Block";
import { JointBlock } from "./JointBlock";

export type JointBlockWithProposedHandle = JointBlock & {
  proposedHandle: Block.Handle;
};
