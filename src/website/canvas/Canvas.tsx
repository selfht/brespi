import { dia } from "@joint/core";
import { ReactElement, RefObject, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Block } from "./Block";
import { createCell } from "./jointframework/createCell";
import { createPaper } from "./jointframework/createPaper";
import { JointBlock } from "./jointframework/helpers/JointBlock";
import { JointBlockWithProposedHandle } from "./jointframework/helpers/JointBlockWithProposedHandle";
import { setupBlockInteractions } from "./jointframework/setupBlockInteractions";
import { setupLinkInteractions } from "./jointframework/setupLinkInteractions";
import { setupPanning } from "./jointframework/setupPanning";
import { Dimensions } from "./jointframework/helpers/Dimensions";
import { Coordinates } from "./jointframework/helpers/Coordinates";

/**
 * One-way databinding is strongly discouraged for the Canvas editor for performance reasons.
 * That's why the current implementation handles its own state, and reports back to the parent.
 */
type Props = {
  ref: RefObject<Canvas.Api | null>;
  mode: "viewing" | "editing";
  initialBlocks: Block[];
  onBlocksRelationChange: (blocks: Block[]) => void;
  className?: string;
};

export function Canvas({ ref, mode, initialBlocks, onBlocksRelationChange, className }: Props): ReactElement {
  const element = useRef<HTMLDivElement>(null);
  const [activeBlockId, setActiveBlockId] = useState<string>();
  const [initiallyDrawn, setInitiallyDrawn] = useState(false);

  const graphRef = useRef<dia.Graph>(null);
  const paperRef = useRef<dia.Paper>(null);
  const blocksRef = useRef<JointBlock[]>([]);

  // Helper to notify parent of changes - takes graph as parameter to avoid closure issues
  const notifyBlocksChange = () => {
    const graph = graphRef.current!;

    const links = graph.getLinks();
    const updatedBlocks = blocksRef.current.map((block) => {
      const cell = graph.getCell(block.id);
      if (!cell) {
        return block;
      }
      const incomingLink = links.find((link) => {
        const target = link.target();
        return target.id === block.id;
      });
      const position = cell.position();
      return {
        ...block,
        coordinates: {
          x: position.x,
          y: position.y,
        },
        incomingId: incomingLink ? (incomingLink.source().id as string) : undefined,
      };
    });
    blocksRef.current = updatedBlocks;
    onBlocksRelationChange(Internal.stripCoords(updatedBlocks));
  };

  // Function which determines whether an arrow is allowed to be drawn
  const validateArrow = (source: JointBlockWithProposedHandle, target: JointBlockWithProposedHandle): boolean => {
    // Prevent self-linking
    if (source.id === target.id) {
      return false;
    }
    // Validate port types: source must have output, target must have input
    if (!source.handles.includes(Block.Handle.output) || !target.handles.includes(Block.Handle.input)) {
      return false;
    }
    // Only allow links from input to output
    if (source.proposedHandle !== Block.Handle.output || target.proposedHandle !== Block.Handle.input) {
      return false;
    }
    // Each block can only have a single incoming arrow
    if (target.incomingId !== undefined) {
      return false;
    }
    // All good!
    return true;
  };

  const initialDraw = (graph: dia.Graph, paper: dia.Paper) => {
    const dimensions: Dimensions = {
      width: Number(paper.options.width),
      height: Number(paper.options.height),
    };
    blocksRef.current = Internal.performSmartPositioning(initialBlocks, dimensions);
    graph.addCells(blocksRef.current.map(createCell));
  };

  // Initialize graph and paper (once)
  useEffect(() => {
    if (!element.current) return;

    const { graph, paper } = createPaper({
      element: element.current,
      blocksRef,
      validateArrow,
    });
    graphRef.current = graph;
    paperRef.current = paper;

    const notifyBlocksChangeWithGraph = () => notifyBlocksChange(graph);
    setupBlockInteractions({
      graph,
      paper,
      blocksRef,
      notifyBlocksChange: notifyBlocksChangeWithGraph,
      activeBlockId,
      setActiveBlockId,
    });
    setupLinkInteractions(graph, notifyBlocksChangeWithGraph);
    const cleanupPanning = setupPanning(paper);

    // Setup ResizeObserver to make canvas responsive
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        paper.setDimensions(width, height);
        setInitiallyDrawn((alreadyDrawn) => {
          if (!alreadyDrawn) {
            initialDraw(graph, paper);
          }
          return true;
        });
      }
    });
    observer.observe(element.current.parentElement!);

    return () => {
      cleanupPanning();
      observer.disconnect();
      paper.remove();
    };
  }, []);

  // Update interactivity when the mode changes
  useEffect(() => {
    if (paperRef.current) {
      const interactivity: dia.CellView.InteractivityOptions =
        mode === "editing"
          ? {
              elementMove: true,
              addLinkFromMagnet: true,
            }
          : {
              elementMove: false,
              addLinkFromMagnet: false,
            };
      paperRef.current.setInteractivity(interactivity);
    }
  }, [mode]);

  // Expose the API
  const format = () => {
    blocksRef.current = Internal.performSmartPositioning(blocksRef.current, {
      width: Number(paperRef.current!.options.width),
      height: Number(paperRef.current!.options.height),
    });
    blocksRef.current.forEach((block) => {
      const cell = graphRef.current!.getCell(block.id);
      if (cell && block.coordinates) {
        cell.set("position", { x: block.coordinates.x, y: block.coordinates.y });
      }
    });
  };
  const createBlock = (block: Block) => {
    const newBlock: JointBlock = {
      ...block,
      coordinates: Internal.findOptimalNewSpot(blocksRef.current, {
        width: Number(paperRef.current!.options.width),
        height: Number(paperRef.current!.options.height),
      }),
    };
    blocksRef.current.push(newBlock);
    graphRef.current!.addCell(createCell(newBlock));
  };
  const deleteBlock = (id: string) => {
    graphRef.current!.getCell(id)?.remove();
    blocksRef.current = blocksRef.current.filter((block) => block.id !== id);
  };
  useImperativeHandle(ref, () => {
    return {
      format,
      createBlock,
      deleteBlock,
    };
  });

  return <div ref={element} className={className} />;
}

export namespace Canvas {
  export type Api = {
    format: () => void;
    createBlock: (block: Omit<Block, "incomingId">) => void;
    deleteBlock: (id: string) => void;
  };
}

namespace Internal {
  export function stripCoords(blocks: JointBlock[]): Block[] {
    return blocks.map(({ coordinates: _, ...block }) => ({
      ...block,
    }));
  }

  export function performSmartPositioning(blocks: Block[], paperDimensions: Dimensions): JointBlock[] {
    return blocks.map<JointBlock>((b, index) => ({
      ...b,
      coordinates: {
        y: 50,
        x: 50 + index * 200,
      },
    }));
  }

  export function findOptimalNewSpot(blocks: Block[], paperDimensions: Dimensions): Coordinates {
    return {
      y: 100,
      x: 50,
    };
  }
}
