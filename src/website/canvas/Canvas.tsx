import { OmitBetter } from "@/types/OmitBetter";
import { dia } from "@joint/core";
import { ReactElement, RefObject, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Block } from "./Block";
import "./Canvas.css";
import { CanvasEvent } from "./CanvasEvent";
import { Interactivity } from "./Interactivity";
import { createCell } from "./jointframework/createCell";
import { createLink } from "./jointframework/createLink";
import { createPaper } from "./jointframework/createPaper";
import { CalloutManager } from "./jointframework/visuals/CalloutManager";
import { PositioningHelper } from "./jointframework/visuals/BlockPositioningHelper";
import { StylingHelper } from "./jointframework/visuals/BlockStylingHelper";
import { setupBlockInteractions } from "./jointframework/setupBlockInteractions";
import { setupLinkInteractions } from "./jointframework/setupLinkInteractions";
import { setupPanning } from "./jointframework/setupPanning";
import { Dimensions } from "./jointframework/models/Dimensions";
import { JointBlock } from "./jointframework/models/JointBlock";
import { JointBlockWithProposedHandle } from "./jointframework/models/JointBlockWithProposedHandle";

/**
 * One-way databinding is strongly discouraged for the Canvas editor for performance reasons.
 * That's why the current implementation handles its own state, and reports back to the parent.
 */
type Props = {
  ref: RefObject<Canvas.Api | null>;
  interactivity: Interactivity;
  onBlocksChange?: (event: CanvasEvent, blocks: Block[]) => void;
  extraValidateArrow?: (source: JointBlockWithProposedHandle, target: JointBlockWithProposedHandle) => boolean;
  className?: string;
};
export function Canvas({ ref, interactivity, onBlocksChange = () => {}, extraValidateArrow = () => true, className }: Props): ReactElement {
  /**
   * Refs
   */
  const elementRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<dia.Graph>(null);
  const paperRef = useRef<dia.Paper>(null);
  const calloutManagerRef = useRef<CalloutManager>(null);
  const blocksRef = useRef<JointBlock[]>([]);
  const interactivityRef = useRef<Interactivity>(interactivity);
  const suppressEventsRef = useRef<boolean>(false);

  /**
   * Initialization
   */
  const [_, setDimensionsMeasured] = useState(false);
  const dimensionsMeasuredPromiseRef = useRef(Promise.withResolvers<void>());

  /**
   * Internal API
   */
  const internal = {
    notifyBlocksChange(event: CanvasEvent) {
      if (suppressEventsRef.current) {
        return; // Skip event notifications during imperative operations
      }
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
      calloutManagerRef.current?.hideDetails();
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
    validateArrow(source: JointBlockWithProposedHandle, target: JointBlockWithProposedHandle) {
      if (source.proposedHandle !== Block.Handle.output || target.proposedHandle !== Block.Handle.input) {
        return false; // Only allow links from input to output
      }
      if (target.incomingId) {
        return false; // Each block can only have a single incoming arrow
      }
      let subjectId = source.id;
      while (true) {
        const subject = blocksRef.current.find((b) => b.id === subjectId)!;
        if (subject.id === target.id) {
          return false; // No cycles (this includes self-linking)
        }
        if (subject.incomingId === null) {
          break;
        }
        subjectId = subject.incomingId;
      }
      if (!extraValidateArrow(source, target)) {
        return false; // Give the parent component a chance to validate the arrow
      }
      return true;
    },
  };

  /**
   * Public API
   */
  const api: Canvas.Api = {
    async reset(blocks) {
      await dimensionsMeasuredPromiseRef.current.promise;
      suppressEventsRef.current = true;
      blocksRef.current = internal.performInitialDraw(blocks);
      suppressEventsRef.current = false;
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
      block = {
        id: block.id,
        theme: block.theme,
        label: block.label,
        details: block.details,
        handles: block.handles,
        selected: block.selected,
        // manually copy to prevent extra properties
      };
      const panPosition = paperRef.current!.translate();
      const newBlock: JointBlock = {
        ...block,
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
      changes = {
        theme: changes.theme,
        label: changes.label,
        details: changes.details,
        // manually copy to prevent extra properties
      };
      Object.assign(block, changes);
      StylingHelper.synchronizeBlockStylingWithCell(cell, block);
      if (block.selected && changes.details) {
        calloutManagerRef.current?.showDetails(cell, {
          label: changes.label,
          theme: changes.theme,
          details: changes.details,
        });
      }
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
            StylingHelper.synchronizeBlockStylingWithCell(cell, block);
            if (block.id !== id) {
              calloutManagerRef.current?.hideDetails();
            }
          }
        });
        // Show callout for selected block after all others are hidden
        if (interactivityRef.current === Interactivity.viewing) {
          const targetCell = graphRef.current!.getCell(id);
          if (targetCell && targetBlock.details) {
            calloutManagerRef.current?.showDetails(targetCell, {
              theme: targetBlock.theme,
              label: targetBlock.label,
              details: targetBlock.details,
            });
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
          StylingHelper.synchronizeBlockStylingWithCell(cell, block);
          calloutManagerRef.current?.hideDetails();
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
      validateArrow: internal.validateArrow,
    });
    graphRef.current = graph;
    paperRef.current = paper;
    calloutManagerRef.current = new CalloutManager(paper);

    setupBlockInteractions({
      graph,
      paper,
      interactivityRef,
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
        setDimensionsMeasured((dimensionsMeasured) => {
          if (!dimensionsMeasured) {
            dimensionsMeasuredPromiseRef.current.resolve();
          }
          return true;
        });
      }
    });
    observer.observe(elementRef.current.parentElement!);

    return () => {
      calloutManagerRef.current?.cleanup();
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
  return <div data-testid="canvas" ref={elementRef} className={className} />;
}

export namespace Canvas {
  export type Api = {
    reset: (blocks: Block[]) => Promise<void>;
    format: () => void;
    // crud
    insert: (block: OmitBetter<Block, "incomingId">) => void;
    update: (id: string, changes: Pick<Block, "theme" | "label" | "details">) => void;
    remove: (id: string) => void;
    // selection
    select: (id: string) => void;
    deselect: (id: string) => void;
  };
}
