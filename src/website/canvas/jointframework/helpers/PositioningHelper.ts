import { Block } from "../../Block";
import { Coordinates } from "../types/Coordinates";
import { Dimensions } from "../types/Dimensions";
import { JointBlock } from "../types/JointBlock";

export namespace PositioningHelper {
  const BLOCK_WIDTH = 200;
  const BLOCK_HEIGHT = 100;
  const HORIZONTAL_SPACING = 50;
  const VERTICAL_SPACING = 30;
  const START_X = 80;
  const START_Y = 50;

  export function performSmartPositioning(blocks: Block[], paperDimensions: Dimensions): JointBlock[] {
    const childrenMap = new Map<string | null, Block[]>();
    blocks.forEach((block) => {
      const parent = block.incomingId;
      if (!childrenMap.has(parent)) {
        childrenMap.set(parent, []);
      }
      childrenMap.get(parent)!.push(block);
    });

    type Tree = {
      leaf: Block;
      children: Tree[];
    };
    const buildTree = (block: Block): Tree => {
      return {
        leaf: block,
        children: (childrenMap.get(block.id) || []).map(buildTree),
      };
    };

    const startingBlocks = blocks.filter((b) => b.incomingId === null);
    const trees: Tree[] = startingBlocks.map(buildTree);

    const grid: Block[][] = [];
    const insert = (tree: Tree, row = 0, column = 0): void => {
      if (!grid[row]) {
        grid[row] = [];
      }
      grid[row][column] = tree.leaf;
      tree.children.forEach((childTree, childIndex) => {
        insert(childTree, row + childIndex, column + 1);
      });
    };
    trees.forEach((tree) => insert(tree));

    // Convert positioned blocks to JointBlocks
    const result: JointBlock[] = [];
    for (let row = 0; row < grid.length; row++) {
      for (let column = 0; column < grid[row].length; column++) {
        const block = grid[row][column];
        if (block) {
          result.push({
            ...block,
            coordinates: {
              x: START_X + (BLOCK_WIDTH + HORIZONTAL_SPACING) * column,
              y: START_Y + (BLOCK_HEIGHT + VERTICAL_SPACING) * row,
            },
          });
        }
      }
    }
    console.log(result);
    return result;
  }

  export function findNewSpot(blocks: Block[], paperDimensions: Dimensions, panPosition: Coordinates): Coordinates {
    return {
      x: panPosition.x + 0.1 * paperDimensions.width,
      y: panPosition.y + 0.7 * paperDimensions.height,
    };
  }
}
