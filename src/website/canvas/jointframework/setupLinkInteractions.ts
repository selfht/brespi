import { dia } from "@joint/core";
import { CanvasEvent } from "../CanvasEvent";

type Options = {
  graph: dia.Graph;
  notifyBlocksChange: (event: CanvasEvent) => void;
};
export function setupLinkInteractions({ graph, notifyBlocksChange }: Options) {
  graph.on("add", (cell) => {
    if (cell.isLink()) {
      // Listen for when this link gets a target
      cell.on("change:target", () => {
        const target = cell.get("target");
        // Only notify if target is an actual element (has id), not just mouse coordinates
        if (target && target.id) {
          console.log("Link connected to target, notifying parent");
          notifyBlocksChange(CanvasEvent.relation);
        }
      });
    }
  });

  // Notify when link is removed
  graph.on("remove", (cell) => {
    if (cell.isLink()) {
      console.log("Link removed, notifying parent");
      notifyBlocksChange(CanvasEvent.relation);
    }
  });
}
