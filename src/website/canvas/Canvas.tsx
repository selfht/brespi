import { dia } from "@joint/core";
import { ReactElement, RefObject, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Block } from "./Block";
import { createPaper } from "./jointframework/createPaper";
import { setupBlockInteractions } from "./jointframework/setupBlockInteractions";
import { setupLinkInteractions } from "./jointframework/setupLinkInteractions";
import { setupPanning } from "./jointframework/setupPanning";
import { JointBlockWithProposedHandle } from "./jointframework/helpers/JointBlockWithProposedHandle";
import { JointBlock } from "./jointframework/helpers/JointBlock";

/**
 * One-way databinding is strongly discouraged for the Canvas editor for performance reasons.
 * That's why the current implementation handles its own state, and reports back to the parent.
 */
type Props = {
  ref: RefObject<Canvas.Api | null>;
  mode: "viewing" | "editing";
  initialBlocks: Block[];
  onBlocksChange: (blocks: Block[]) => void;
  className?: string;
};

export function Canvas({ ref, mode, initialBlocks, onBlocksChange, className }: Props): ReactElement {
  const element = useRef<HTMLDivElement>(null);
  const [paper, setPaper] = useState<dia.Paper>();
  const [activeBlockId, setActiveBlockId] = useState<string>();

  // Keep track of blocks internally to report changes upwards
  const blocksRef = useRef(Internal.performSmartPositioning(initialBlocks));

  // Helper to notify parent of changes - takes graph as parameter to avoid closure issues
  const notifyBlocksChange = (graphInstance: dia.Graph) => {
    const links = graphInstance.getLinks();
    const updatedBlocks = blocksRef.current.map((block) => {
      const cell = graphInstance.getCell(block.id);
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
    onBlocksChange(Internal.stripCoords(updatedBlocks));
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

  // Initialize graph and paper (once)
  useEffect(() => {
    if (!element.current) return;

    const { graph, paper } = createPaper({
      element: element.current,
      blocksRef,
      validateArrow,
      initialBlocks: blocksRef.current,
    });

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
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        paper.setDimensions(width, height);
      }
    });
    resizeObserver.observe(element.current.parentElement!);

    setPaper(paper);
    return () => {
      cleanupPanning();
      resizeObserver.disconnect();
      paper.remove();
    };
  }, []);

  // Update interactivity when the mode changes
  useEffect(() => {
    if (paper) {
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
      paper.setInteractivity(interactivity);
    }
  }, [paper, mode]);

  // Expose the API
  useImperativeHandle(ref, () => {
    return {
      format: () => {
        console.log("~formatting~");
      },
    };
  });

  return <div ref={element} className={className} />;
}

export namespace Canvas {
  export type Api = {
    format: () => void;
  };
}

namespace Internal {
  export function stripCoords(blocks: JointBlock[]): Block[] {
    return blocks.map(({ coordinates: _, ...block }) => ({
      ...block,
    }));
  }

  export function performSmartPositioning(blocks: Block[]): JointBlock[] {
    return blocks.map<JointBlock>((b, index) => ({
      ...b,
      coordinates: {
        y: 50,
        x: 50 + index * 200,
      },
    }));
  }
}
