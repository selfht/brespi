import { Block } from "../../Block";
import { Coordinates } from "../models/Coordinates";
import { Dimensions } from "../models/Dimensions";
import { JointBlock } from "../models/JointBlock";
import { Sizing } from "../sizing/Sizing";

export namespace PositioningHelper {
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

    // Returns the height of the subtree (how many rows it occupies)
    const insert = (tree: Tree, row: number, column: number): number => {
      if (!grid[row]) {
        grid[row] = [];
      }
      grid[row][column] = tree.leaf;

      if (tree.children.length === 0) {
        return 1; // A leaf node occupies 1 row
      }

      let currentRow = row;
      tree.children.forEach((childTree) => {
        const childHeight = insert(childTree, currentRow, column + 1);
        currentRow += childHeight; // Next child starts after this child's subtree
      });

      return currentRow - row; // Total height is the difference
    };

    let currentStartRow = 0;
    trees.forEach((tree) => {
      const treeHeight = insert(tree, currentStartRow, 0);
      currentStartRow += treeHeight; // Next tree starts after this tree
    });

    // Convert positioned blocks to JointBlocks
    const result: JointBlock[] = [];
    for (let row = 0; row < grid.length; row++) {
      for (let column = 0; column < grid[row].length; column++) {
        const block = grid[row][column];
        if (block) {
          result.push({
            ...block,
            coordinates: {
              x: Sizing.GRID_START_X + (Sizing.BLOCK_WIDTH + Sizing.GRID_HORIZONTAL_SPACING) * column,
              y: Sizing.GRID_START_Y + (Sizing.BLOCK_HEIGHT + Sizing.GRID_VERTICAL_SPACING) * row,
            },
          });
        }
      }
    }
    return result;
  }

  export function findNewSpot(blocks: Block[], paperDimensions: Dimensions, panPosition: Coordinates): Coordinates {
    return {
      x: panPosition.x + 0.1 * paperDimensions.width,
      y: panPosition.y + 0.7 * paperDimensions.height,
    };
  }
}
