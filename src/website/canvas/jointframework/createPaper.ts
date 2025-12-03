import { dia, shapes } from "@joint/core";
import { RefObject } from "react";
import { Block } from "../Block";
import { createCell } from "./createCell";
import { JointBlockWithProposedHandle } from "./helpers/JointBlockWithProposedHandle";
import { JointBlock } from "./helpers/JointBlock";

type Options = {
  element: HTMLElement;
  blocksRef: RefObject<JointBlock[]>;
  validateArrow: (source: JointBlockWithProposedHandle, target: JointBlockWithProposedHandle) => boolean;
  initialBlocks: JointBlock[];
};

export function createPaper({ element, blocksRef, validateArrow, initialBlocks }: Options) {
  const namespace = { ...shapes };
  const graph = new dia.Graph({}, { cellNamespace: namespace });

  const paper = new dia.Paper({
    el: element,
    model: graph,
    width: element.clientWidth || 10,
    height: element.clientHeight || 10,
    background: { color: "transparent" },
    cellViewNamespace: namespace,
    gridSize: 1, // Free-form movement (no snapping)
    clickThreshold: 10, // Allow 10px movement and still count as click
    magnetThreshold: 5, // Require 5px movement before starting link creation
    defaultLink: () =>
      new shapes.standard.Link({
        attrs: {
          line: {
            stroke: "#34495e",
            strokeWidth: 2.5,
            strokeLinecap: "round",
            targetMarker: {
              type: "path",
              d: "M 10 -5 -2.5 0 10 5 z",
              fill: "#34495e",
            },
          },
        },
        connector: { name: "rounded" },
        router: { name: "normal" },
      }),
    linkPinning: false,
    defaultConnectionPoint: {
      name: "boundary",
      args: { offset: 8 },
    },
    interactive: {
      elementMove: false,
    },
    validateConnection: (sourceView, sourceMagnet, targetView, targetMagnet) => {
      const sourceId = sourceView.model.id as string;
      const targetId = targetView.model.id as string;

      const sourceBlock = blocksRef.current.find((b) => b.id === sourceId);
      const targetBlock = blocksRef.current.find((b) => b.id === targetId);

      const sourceHandle = sourceMagnet?.getAttribute("port") as Block.Handle;
      const targetHandle = targetMagnet?.getAttribute("port") as Block.Handle;

      const allowedHandles = Object.values(Block.Handle);
      if (sourceBlock && targetBlock && allowedHandles.includes(sourceHandle) && allowedHandles.includes(targetHandle)) {
        return validateArrow({ ...sourceBlock, proposedHandle: sourceHandle }, { ...targetBlock, proposedHandle: targetHandle });
      }

      return false;
    },
  });

  const cells = initialBlocks.map(createCell);
  graph.addCells(cells);

  return { graph, paper };
}
