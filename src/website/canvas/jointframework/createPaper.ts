import { dia, shapes } from "@joint/core";
import { RefObject } from "react";
import { Block } from "../Block";
import { JointBlockWithProposedHandle } from "./models/JointBlockWithProposedHandle";
import { JointBlock } from "./models/JointBlock";
import { createLink } from "./createLink";

type Options = {
  elementRef: RefObject<HTMLElement | null>;
  blocksRef: RefObject<JointBlock[]>;
  validateArrow: (source: JointBlockWithProposedHandle, target: JointBlockWithProposedHandle) => boolean;
};

export function createPaper({ elementRef, blocksRef, validateArrow }: Options) {
  const namespace = { ...shapes };
  const graph = new dia.Graph({}, { cellNamespace: namespace });

  const paper = new dia.Paper({
    el: elementRef.current!,
    model: graph,
    width: 10, // updated dynamically
    height: 10, // updated dynamically
    background: { color: "transparent" },
    cellViewNamespace: namespace,
    gridSize: 1, // Free-form movement (no snapping)
    clickThreshold: 10, // Allow 10px movement and still count as click
    magnetThreshold: 5, // Require 5px movement before starting link creation
    defaultLink: createLink,
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

  return { graph, paper };
}
