import { Block } from "../../Block";
import { Coordinates } from "../models/Coordinates";
import { Dimensions } from "../models/Dimensions";
import { JointBlock } from "../models/JointBlock";
import { Sizing } from "../constants/Sizing";

export namespace PositioningHelper {
  export function performSmartPositioning(blocks: Block[], paperDimensions: Dimensions): JointBlock[] {
    const childrenMap = new Map<string | undefined, Block[]>();
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

    const startingBlocks = blocks.filter((b) => !b.incomingId);
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

  export function findNewSpot(
    blocks: Array<Pick<JointBlock, "id" | "coordinates">>,
    paperDimensions: Dimensions,
    panPosition: Coordinates,
  ): Coordinates {
    const fullBlockWidth = Sizing.BLOCK_WIDTH + 2 * (Sizing.CONNECTOR_WIDTH + Sizing.CONNECTOR_OFFSET);
    const paddingX = 20;
    const paddingY = 35;
    const cellWidth = fullBlockWidth + paddingX;
    const cellHeight = Sizing.BLOCK_HEIGHT + paddingY;

    const marginX = 40;
    const marginTop = 10;
    const marginBottom = 30;
    const areaX = panPosition.x + marginX;
    const areaWidth = paperDimensions.width - 2 * marginX;
    const areaHeight = paperDimensions.height - marginTop - marginBottom;
    const areaBottom = panPosition.y + paperDimensions.height - marginBottom;

    const columns = Math.max(1, Math.floor(areaWidth / cellWidth));
    const rows = Math.max(1, Math.floor(areaHeight / cellHeight));

    // Anchor grid to the bottom of the area so the bottom row is stable
    const cellY = (row: number) => areaBottom - (rows - row) * cellHeight;

    const isOccupied = (x: number, y: number): boolean => {
      return blocks.some(
        (block) => Math.abs(block.coordinates.x - x) < fullBlockWidth && Math.abs(block.coordinates.y - y) < Sizing.BLOCK_HEIGHT,
      );
    };

    // Scan bottom-left to top-right:
    //   9  10 11 12
    //   5  6  7  8
    //   1  2  3  4
    for (let row = rows - 1; row >= 0; row--) {
      for (let col = 0; col < columns; col++) {
        const x = areaX + col * cellWidth;
        const y = cellY(row);

        if (!isOccupied(x, y)) {
          return { x, y };
        }
      }
    }

    // Grid is full — stack at bottom-left cell, cascading toward top-right
    const gridCapacity = rows * columns;
    const overflowIndex = Math.max(0, blocks.length - gridCapacity) + 1;
    const offset = overflowIndex * 5;
    return {
      x: areaX + offset,
      y: cellY(rows - 1) - offset,
    };
  }
}
