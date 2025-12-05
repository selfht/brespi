import { dia } from "@joint/core";
import { RefObject } from "react";
import { Block } from "../Block";
import { Interactivity } from "../Interactivity";

type Options = {
  paper: dia.Paper;
  graph: dia.Graph;
  interactivityRef: RefObject<Interactivity>;
  blocksRef: RefObject<Block[]>;
  select: (id: string) => void;
  deselect: (id: string) => void;
};

export function setupBlockInteractions({ graph, paper, interactivityRef, blocksRef, select, deselect }: Options) {
  // Handle block clicks (activate/highlight)
  paper.on("element:pointerclick", (elementView, evt) => {
    const clickedElement = elementView.model;
    const elementId = clickedElement.id as string;

    // Check if click was on a port
    const target = evt.target as Element;
    const portElement = target.closest("[port]");

    if (portElement) {
      const portName = portElement.getAttribute("port");
      console.log("Clicked on port:", portName);

      // If clicking on input port, delete incoming link (only in editing mode)
      if (portName === "input" && interactivityRef.current === Interactivity.editing) {
        const incomingLinks = graph.getConnectedLinks(clickedElement, { inbound: true });
        if (incomingLinks.length > 0) {
          incomingLinks[0].remove();
          return;
        }
      }
      return;
    }

    // Check if clicking an already selected block (deselect)
    const clickedBlock = blocksRef.current!.find((b) => b.id === elementId);
    if (clickedBlock?.selected) {
      deselect(elementId);
      console.log("Deselected block:", elementId);
      return;
    }

    // Select the clicked block (automatically deselects others)
    select(elementId);
    console.log("Selected block:", {
      id: elementId,
      type: clickedElement.attr("label/text"),
    });
  });
}
