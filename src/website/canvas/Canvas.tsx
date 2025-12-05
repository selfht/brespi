import { dia } from "@joint/core";
import { ReactElement, RefObject, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Block } from "./Block";
import { CanvasEvent } from "./CanvasEvent";
import { createCell } from "./jointframework/createCell";
import { createPaper } from "./jointframework/createPaper";
import { PositioningHelper } from "./jointframework/helpers/PositioningHelper";
import { StylingHelper } from "./jointframework/helpers/StylingHelper";
import { setupBlockInteractions } from "./jointframework/setupBlockInteractions";
import { setupLinkInteractions } from "./jointframework/setupLinkInteractions";
import { setupPanning } from "./jointframework/setupPanning";
import { Dimensions } from "./jointframework/types/Dimensions";
import { JointBlock } from "./jointframework/types/JointBlock";
import { Interactivity } from "./Interactivity";

/**
 * One-way databinding is strongly discouraged for the Canvas editor for performance reasons.
 * That's why the current implementation handles its own state, and reports back to the parent.
 */
type Props = {
  ref: RefObject<Canvas.Api | null>;
  interactivity: Interactivity;
  initialBlocks: Block[];
  onBlocksChange?: (event: CanvasEvent, blocks: Block[]) => void;
  className?: string;
};

export function Canvas({ ref, interactivity, initialBlocks, onBlocksChange = (_, __) => {}, className }: Props): ReactElement {
  const element = useRef<HTMLDivElement>(null);
  const [initiallyDrawn, setInitiallyDrawn] = useState(false);

  const graphRef = useRef<dia.Graph>(null);
  const paperRef = useRef<dia.Paper>(null);
  const blocksRef = useRef<JointBlock[]>([]);
  const interactivityRef = useRef<Interactivity>(interactivity);

  const notifyBlocksChange = (event: CanvasEvent) => {
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

    onBlocksChange(
      event,
      updatedBlocks.map(({ coordinates: _, ...block }) => block),
    );
  };

  const initialDraw = () => {
    const dimensions: Dimensions = {
      width: Number(paperRef.current!.options.width),
      height: Number(paperRef.current!.options.height),
    };
    blocksRef.current = PositioningHelper.performSmartPositioning(initialBlocks, dimensions);
    graphRef.current!.addCells(blocksRef.current.map(createCell));
  };

  const api: Canvas.Api = {
    format() {
      blocksRef.current = PositioningHelper.performSmartPositioning(blocksRef.current, {
        width: Number(paperRef.current!.options.width),
        height: Number(paperRef.current!.options.height),
      });
      blocksRef.current.forEach((block) => {
        const cell = graphRef.current!.getCell(block.id);
        if (cell && block.coordinates) {
          cell.set("position", { x: block.coordinates.x, y: block.coordinates.y });
        }
      });
    },
    insert(block: Block) {
      const newBlock: JointBlock = {
        ...block,
        coordinates: PositioningHelper.findOptimalFreeSpot(blocksRef.current, {
          width: Number(paperRef.current!.options.width),
          height: Number(paperRef.current!.options.height),
        }),
      };
      blocksRef.current.push(newBlock);
      graphRef.current!.addCell(createCell(newBlock));
      notifyBlocksChange("insert");
    },
    remove(id: string) {
      blocksRef.current = blocksRef.current.filter((block) => block.id !== id);
      const cell = graphRef.current!.getCell(id);
      if (cell) {
        cell.remove();
        notifyBlocksChange("remove");
      }
    },
    select(id: string) {
      const block = blocksRef.current.find((b) => b.id === id);
      if (block) {
        blocksRef.current.forEach((b) => {
          b.selected = b.id === id ? true : false;
          const cell = graphRef.current!.getCell(b.id);
          if (cell) {
            StylingHelper.synchronizeBlockStylingWithCell(b, cell);
          }
        });
        notifyBlocksChange("select");
      }
    },
    deselect(id: string) {
      const block = blocksRef.current.find((b) => b.id === id);
      if (block) {
        block.selected = false;
        const cell = graphRef.current!.getCell(id);
        if (cell) {
          StylingHelper.synchronizeBlockStylingWithCell(block, cell);
          notifyBlocksChange("deselect");
        }
      }
    },
  };
  useImperativeHandle(ref, () => api);

  // Initialize graph and paper (once)
  useEffect(() => {
    if (!element.current) return;

    const { graph, paper } = createPaper({
      element: element.current,
      blocksRef,
      validateArrow: (source, target) => {
        if (source.id === target.id) {
          return false; // Prevent self-linking
        }
        if (source.proposedHandle !== Block.Handle.output || target.proposedHandle !== Block.Handle.input) {
          return false; // Only allow links from input to output
        }
        if (target.incomingId !== undefined) {
          return false; // Each block can only have a single incoming arrow
        }
        return true;
      },
    });
    graphRef.current = graph;
    paperRef.current = paper;

    setupBlockInteractions({ graph, paper, interactivityRef: interactivityRef, blocksRef, select: api.select, deselect: api.deselect });
    setupLinkInteractions({ graph, notifyBlocksChange });
    const panning = setupPanning({ paperRef });

    // Setup ResizeObserver to make canvas responsive
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        paper.setDimensions(width, height);
        setInitiallyDrawn((alreadyDrawn) => {
          if (!alreadyDrawn) {
            initialDraw();
          }
          return true;
        });
      }
    });
    observer.observe(element.current.parentElement!);

    return () => {
      panning.cleanup();
      observer.disconnect();
      paper.remove();
    };
  }, []);

  // Monitor changes in interactivity
  useEffect(() => {
    interactivityRef.current = interactivity;
    if (paperRef.current) {
      const options: dia.CellView.InteractivityOptions =
        interactivity === Interactivity.editing
          ? {
              elementMove: true,
              addLinkFromMagnet: true,
              stopDelegation: false, // Allow event delegation for magnets
            }
          : {
              elementMove: true, // Allow moving in read mode
              addLinkFromMagnet: false, // But no link creation
            };
      paperRef.current.setInteractivity(options);
    }
  }, [interactivity]);

  return <div ref={element} className={className} />;
}

export namespace Canvas {
  export type Api = {
    format: () => void;
    insert: (block: Omit<Block, "incomingId">) => void;
    remove: (id: string) => void;
    select: (id: string) => void;
    deselect: (id: string) => void;
  };
}
