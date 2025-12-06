import { Block } from "../../Block";
import { Coordinates } from "../types/Coordinates";
import { Dimensions } from "../types/Dimensions";
import { JointBlock } from "../types/JointBlock";

export namespace PositioningHelper {
  export function performSmartPositioning(blocks: Block[], paperDimensions: Dimensions): JointBlock[] {
    return blocks.map<JointBlock>((b, index) => ({
      ...b,
      coordinates: {
        y: 50,
        x: 80 + index * 200,
      },
    }));
  }

  export function findOptimalFreeSpot(blocks: Block[], paperDimensions: Dimensions): Coordinates {
    return {
      y: 100,
      x: 80,
    };
  }
}
