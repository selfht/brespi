import { Spinner } from "@/website/comps/Spinner";
import { dia, shapes } from "@joint/core";
import { renderToString } from "react-dom/server";
import { Block } from "../Block";
import { StylingHelper } from "./helpers/StylingHelper";
import { JointBlock } from "./models/JointBlock";
import { Sizing } from "./sizing/Sizing";

export function createCell(block: JointBlock) {
  const items: dia.Element.Port[] = [];
  const groups: Record<string, dia.Element.PortGroup> = {};

  // Input side
  items.push({ id: Block.Handle.input, group: Block.Handle.input });
  groups[Block.Handle.input] = {
    position: "left",
    markup: [{ tagName: "rect", selector: "rect" }],
    attrs: {
      rect: {
        width: Sizing.CONNECTOR_WIDTH,
        height: Sizing.CONNECTOR_HEIGHT,
        x: -Sizing.CONNECTOR_WIDTH - Sizing.CONNECTOR_OFFSET, // Position fully outside to the left
        y: -(Sizing.CONNECTOR_HEIGHT / 2), // Center vertically
        rx: Sizing.CONNECTOR_BORDER_RADIUS,
        ry: Sizing.CONNECTOR_BORDER_RADIUS,
        class: "",
        strokeWidth: Sizing.CONNECTOR_STROKE_WIDTH,
        magnet: "passive",
      },
    },
  };

  // Output side
  items.push({ group: Block.Handle.output, id: Block.Handle.output });
  groups[Block.Handle.output] = {
    position: "right",
    markup: [{ tagName: "rect", selector: "rect" }],
    attrs: {
      rect: {
        width: Sizing.CONNECTOR_WIDTH,
        height: Sizing.CONNECTOR_HEIGHT,
        x: Sizing.CONNECTOR_OFFSET, // Position fully outside to the right
        y: -(Sizing.CONNECTOR_HEIGHT / 2), // Center vertically
        rx: Sizing.CONNECTOR_BORDER_RADIUS,
        ry: Sizing.CONNECTOR_BORDER_RADIUS,
        class: "",
        strokeWidth: Sizing.CONNECTOR_STROKE_WIDTH,
        magnet: true,
      },
    },
  };

  // Main
  return StylingHelper.synchronizeBlockStylingWithCell(
    new shapes.standard.Rectangle({
      id: block.id,
      position: block.coordinates,
      size: {
        width: Sizing.BLOCK_WIDTH,
        height: Sizing.BLOCK_HEIGHT,
      },
      markup: [
        { tagName: "rect", selector: "body" },
        { tagName: "foreignObject", selector: "spinner" },
        { tagName: "text", selector: "label" },
        { tagName: "foreignObject", selector: "callout" },
      ],
      attrs: {
        body: {
          strokeWidth: Sizing.BLOCK_STROKE_WIDTH,
          rx: Sizing.BLOCK_BORDER_RADIUS,
          ry: Sizing.BLOCK_BORDER_RADIUS,
          width: "calc(w)",
          height: "calc(h)",
        },
        spinner: {
          display: "none",
          x: 0,
          y: 0,
          width: "calc(w)",
          height: "calc(h)",
          html: renderToString(
            <div className="h-full flex justify-center items-center border-transparent" style={{ borderWidth: Sizing.BLOCK_STROKE_WIDTH }}>
              <Spinner className="border-c-info! border-t-c-info/0!" />
            </div>,
          ),
        },
        label: {
          text: block.label,
          class: "fill-c-dark font-base",
          fontSize: Sizing.LABEL_FONT_SIZE,
          x: "calc(0.5*w)", // Center horizontally
          y: `calc(h+${Sizing.LABEL_Y_OFFSET})`, // Below block
          textAnchor: "middle",
        },
        callout: {
          display: "none", // Hidden by default
          x: `calc(0.5*w-${Sizing.CALLOUT_WIDTH / 2})`,
          y: `calc(h+${Sizing.CALLOUT_Y_OFFSET})`, // Below label with spacing
          width: Sizing.CALLOUT_WIDTH,
          height: 1, // Will grow based on content
          style: {
            overflow: "visible",
          },
          html: "",
        },
      },
      ports: {
        groups,
        items,
      },
    }),
    block,
  );
}
