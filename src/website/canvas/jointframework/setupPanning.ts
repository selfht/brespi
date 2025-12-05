import { dia } from "@joint/core";
import { RefObject } from "react";

type Options = {
  paperRef: RefObject<dia.Paper | null>;
};
type Result = {
  cleanup: () => void;
};
export function setupPanning({ paperRef }: Options): Result {
  const paper = paperRef.current!;

  let dragStartPosition: { x: number; y: number } | null = null;
  let isPanning = false;
  const PAN_THRESHOLD = 5;

  paper.on("blank:pointerdown", (evt) => {
    dragStartPosition = { x: evt.clientX!, y: evt.clientY! };
    isPanning = false;
  });

  paper.on("blank:pointermove", (evt) => {
    if (dragStartPosition) {
      const deltaX = evt.clientX! - dragStartPosition.x;
      const deltaY = evt.clientY! - dragStartPosition.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (!isPanning && distance < PAN_THRESHOLD) {
        return;
      }

      if (!isPanning) {
        isPanning = true;
      }

      const currentTranslate = paper.translate();
      paper.translate(currentTranslate.tx + deltaX, currentTranslate.ty + deltaY);
      dragStartPosition = { x: evt.clientX!, y: evt.clientY! };
    }
  });

  const stopPanning = () => {
    dragStartPosition = null;
    isPanning = false;
  };

  paper.on("blank:pointerup", stopPanning);
  document.addEventListener("pointerup", stopPanning);

  return {
    cleanup() {
      document.removeEventListener("pointerup", stopPanning);
    },
  };
}
