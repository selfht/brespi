import { BetterOmit } from "@/types/BetterOmit";
import { dia } from "@joint/core";
import { ReactElement, RefObject, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Block } from "./Block";
import "./Canvas.css";
import { CanvasEvent } from "./CanvasEvent";
import { Interactivity } from "./Interactivity";
import { createCell } from "./jointframework/createCell";
import { createLink } from "./jointframework/createLink";
import { createPaper } from "./jointframework/createPaper";
import { CalloutHelper } from "./jointframework/helpers/CalloutHelper";
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
  onBlocksChange?: (event: CanvasEvent, blocks: Block[]) => void;
  className?: string;
};
export function Canvas({ ref, interactivity, onBlocksChange = (_, __) => {}, className }: Props): ReactElement {
  /**
   * Refs
   */
  const elementRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<dia.Graph>(null);
  const paperRef = useRef<dia.Paper>(null);
  const blocksRef = useRef<JointBlock[]>([]);
  const interactivityRef = useRef<Interactivity>(interactivity);

  /**
   * Initialization
   */
  const [parentDimensionsMeasured, setParentDimensionsMeasured] = useState(false);
  const parentDimensionsPromiseRef = useRef(Promise.withResolvers<void>());

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
          incomingId: incomingLink ? (incomingLink.source().id as string) : null,
        };
      });
      blocksRef.current = updatedBlocks;
      onBlocksChange(
        event,
        updatedBlocks.map(({ coordinates, ...block }) => block), // strip coordinates
      );
    },
    performInitialDraw(blocks: Block[]): JointBlock[] {
      /**
       * Part 1/2: cleanup
       */
      paperRef.current!.translate(0, 0);
      graphRef.current!.clear();
      /**
       * Part 2/2: setup
       */
      const dimensions: Dimensions = {
        width: Number(paperRef.current!.options.width),
        height: Number(paperRef.current!.options.height),
      };
      const jointBlocks: JointBlock[] = PositioningHelper.performSmartPositioning(blocks, dimensions);
      // Add blocks
      const cells = jointBlocks.map(createCell);
      graphRef.current!.addCells(cells);
      // Add links
      jointBlocks.forEach((block) => {
        if (block.incomingId) {
          const sourceCell = graphRef.current!.getCell(block.incomingId);
          const targetCell = graphRef.current!.getCell(block.id);
          if (sourceCell && targetCell) {
            const link = createLink();
            link.set({
              source: { id: block.incomingId, port: Block.Handle.output },
              target: { id: block.id, port: Block.Handle.input },
            });
            graphRef.current!.addCell(link);
          }
        }
      });
      return jointBlocks;
    },
  };

  /**
   * Public API
   */
  const api: Canvas.Api = {
    async reset(blocks) {
      await parentDimensionsPromiseRef.current.promise;
      blocksRef.current = internal.performInitialDraw(blocks);
    },
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
    insert(block) {
      const safeBlockWithoutTheRiskOfExtraProperties: typeof block = {
        id: block.id,
        label: block.label,
        details: block.details,
        handles: block.handles,
        selected: block.selected,
      };
      const panPosition = paperRef.current!.translate();
      const newBlock: JointBlock = {
        ...safeBlockWithoutTheRiskOfExtraProperties,
        incomingId: null,
        coordinates: PositioningHelper.findNewSpot(
          blocksRef.current,
          {
            width: Number(paperRef.current!.options.width),
            height: Number(paperRef.current!.options.height),
          },
          {
            x: -panPosition.tx,
            y: -panPosition.ty,
          },
        ),
      };
      blocksRef.current.push(newBlock);
      graphRef.current!.addCell(createCell(newBlock));
      internal.notifyBlocksChange(CanvasEvent.insert);
    },
    update(id, changes) {
      const block = blocksRef.current.find((block) => block.id === id);
      const cell = graphRef.current!.getCell(id);
      if (!block || !cell) {
        throw new Error(`Could not find block or cell; block=${Boolean(block)}, cell=${Boolean(cell)}`);
      }
      const safeChangesWithoutTheRiskOfExtraProperties: typeof changes = {
        label: changes.label,
        details: changes.details,
      };
      Object.assign(block, safeChangesWithoutTheRiskOfExtraProperties);
      internal.notifyBlocksChange(CanvasEvent.update);
    },
    remove(id) {
      const block = blocksRef.current.find((block) => block.id === id);
      const cell = graphRef.current!.getCell(id);
      if (!block || !cell) {
        throw new Error(`Could not find block or cell; block=${Boolean(block)}, cell=${Boolean(cell)}`);
      }
      blocksRef.current.splice(blocksRef.current.indexOf(block), 1);
      cell.remove();
      internal.notifyBlocksChange(CanvasEvent.remove);
    },
    select(id: string) {
      const targetBlock = blocksRef.current.find((block) => block.id === id);
      if (targetBlock) {
        blocksRef.current.forEach((block) => {
          block.selected = block.id === id ? true : false;
          const cell = graphRef.current!.getCell(block.id);
          if (cell) {
            StylingHelper.synchronizeBlockStylingWithCell(block, cell);
            if (block.id !== id) {
              CalloutHelper.hideDetails(cell);
            }
          }
        });
        // Show callout for selected block after all others are hidden
        if (interactivityRef.current === Interactivity.viewing) {
          const targetCell = graphRef.current!.getCell(id);
          if (targetCell) {
            CalloutHelper.showBlockDetails(targetCell, targetBlock);
          }
        }
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
          CalloutHelper.hideDetails(cell);
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
        if (target.incomingId) {
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
        setParentDimensionsMeasured((parentDimensionsMeasured) => {
          if (!parentDimensionsMeasured) {
            parentDimensionsPromiseRef.current.resolve();
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
      let options: dia.CellView.InteractivityOptions;
      if (interactivity === Interactivity.viewing) {
        options = {
          elementMove: true, // Allow moving in read mode
          addLinkFromMagnet: false, // But no link creation
        };
      } else {
        options = {
          elementMove: true,
          addLinkFromMagnet: true,
          stopDelegation: false, // Allow event delegation for magnets
        };
        blocksRef.current.forEach((block) => {
          api.deselect(block.id);
        });
      }
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
    reset: (blocks: Block[]) => Promise<void>;
    format: () => void;
    insert: (block: BetterOmit<Block, "incomingId">) => void;
    update: (id: string, changes: Pick<Block, "label" | "details">) => void;
    remove: (id: string) => void;
    select: (id: string) => void;
    deselect: (id: string) => void;
  };
}
