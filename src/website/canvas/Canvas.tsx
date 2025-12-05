import { dia } from "@joint/core";
import { ReactElement, RefObject, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Block } from "./Block";
import { CanvasEvent } from "./CanvasEvent";
import { Interactivity } from "./Interactivity";
import { createCell } from "./jointframework/createCell";
import { createPaper } from "./jointframework/createPaper";
import { PositioningHelper } from "./jointframework/helpers/PositioningHelper";
import { StylingHelper } from "./jointframework/helpers/StylingHelper";
import { setupBlockInteractions } from "./jointframework/setupBlockInteractions";
import { setupLinkInteractions } from "./jointframework/setupLinkInteractions";
import { setupPanning } from "./jointframework/setupPanning";
import { Dimensions } from "./jointframework/types/Dimensions";
import { JointBlock } from "./jointframework/types/JointBlock";

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
  /**
   * Refs
   */
  const elementRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<dia.Graph>(null);
  const paperRef = useRef<dia.Paper>(null);
  const blocksRef = useRef<JointBlock[]>([]);
  const interactivityRef = useRef<Interactivity>(interactivity);

  /**
   * State
   */
  const [initiallyDrawn, setInitiallyDrawn] = useState(false);

  /**
   * Internal API
   */
  const internal = {
    notifyBlocksChange(event: CanvasEvent) {
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
        updatedBlocks.map(({ coordinates, ...block }) => block), // strip coordinates
      );
    },
    performInitialDraw() {
      const dimensions: Dimensions = {
        width: Number(paperRef.current!.options.width),
        height: Number(paperRef.current!.options.height),
      };
      blocksRef.current = PositioningHelper.performSmartPositioning(initialBlocks, dimensions);
      graphRef.current!.addCells(blocksRef.current.map(createCell));
    },
    showBlockDetails(cell: dia.Cell) {
      cell.attr("label/display", "none");
      cell.attr("callout/display", "block");
    },
    hideBlockDetails(cell: dia.Cell) {
      cell.attr("callout/display", "none");
      cell.attr("label/display", "block");
    },
  };

  /**
   * Public API
   */
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
      internal.notifyBlocksChange(CanvasEvent.insert);
    },
    remove(id: string) {
      blocksRef.current = blocksRef.current.filter((block) => block.id !== id);
      const cell = graphRef.current!.getCell(id);
      if (cell) {
        cell.remove();
        internal.notifyBlocksChange(CanvasEvent.remove);
      }
    },
    select(id: string) {
      const exists = blocksRef.current.some((block) => block.id === id);
      if (exists) {
        blocksRef.current.forEach((block) => {
          block.selected = block.id === id ? true : false;
          const cell = graphRef.current!.getCell(block.id);
          if (cell) {
            StylingHelper.synchronizeBlockStylingWithCell(block, cell);
            if (block.id === id) {
              internal.showBlockDetails(cell);
            } else {
              internal.hideBlockDetails(cell);
            }
          }
        });
        internal.notifyBlocksChange(CanvasEvent.select);
      }
    },
    deselect(id: string) {
      const block = blocksRef.current.find((b) => b.id === id);
      if (block) {
        block.selected = false;
        const cell = graphRef.current!.getCell(id);
        if (cell) {
          StylingHelper.synchronizeBlockStylingWithCell(block, cell);
          internal.hideBlockDetails(cell);
          internal.notifyBlocksChange(CanvasEvent.deselect);
        }
      }
    },
  };
  useImperativeHandle(ref, () => api);

  /**
   * Initialization
   */
  useEffect(() => {
    if (!elementRef.current) return;

    const { graph, paper } = createPaper({
      elementRef,
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

    setupBlockInteractions({
      graph,
      paper,
      interactivityRef: interactivityRef,
      blocksRef,
      select: api.select,
      deselect: api.deselect,
    });
    setupLinkInteractions({ graph, notifyBlocksChange: internal.notifyBlocksChange });
    const panning = setupPanning({ paperRef });

    // Setup a ResizeObserver to make the canvas dimensions responsive
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        paper.setDimensions(width, height);
        setInitiallyDrawn((alreadyDrawn) => {
          if (!alreadyDrawn) {
            internal.performInitialDraw();
          }
          return true;
        });
      }
    });
    observer.observe(elementRef.current.parentElement!);

    return () => {
      panning.cleanup();
      observer.disconnect();
      paper.remove();
    };
  }, []);

  /**
   * Monitor interactivity changes
   */
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

  /**
   * Render
   */
  return <div ref={elementRef} className={className} />;
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
