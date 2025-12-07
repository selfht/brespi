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

  export function findNewSpot(blocks: Block[], paperDimensions: Dimensions, panPosition: Coordinates): Coordinates {
    // Position in the center of the visible canvas area
    // Account for pan position (negative because translate moves the viewport, not the content)
    return {
      x: panPosition.x + 0.1 * paperDimensions.width,
      y: panPosition.y + 0.7 * paperDimensions.height,
    };
  }
}
