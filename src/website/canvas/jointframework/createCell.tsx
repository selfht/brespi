import { dia, shapes } from "@joint/core";
import { Block } from "../Block";
import { StylingHelper } from "./visuals/BlockStylingHelper";
import { JointBlock } from "./models/JointBlock";
import { Sizing } from "./constants/Sizing";

// SVG spinner constants
const SPINNER_SIZE = 20;
const SPINNER_STROKE_WIDTH = 2;
const SPINNER_RADIUS = (SPINNER_SIZE - SPINNER_STROKE_WIDTH) / 2;
const SPINNER_CIRCUMFERENCE = 2 * Math.PI * SPINNER_RADIUS;
const SPINNER_DASH_ARRAY = `${SPINNER_CIRCUMFERENCE * 0.75} ${SPINNER_CIRCUMFERENCE * 0.25}`;

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
        "data-testid": Block.Handle.input,
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
        "data-testid": Block.Handle.output,
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
        {
          tagName: "g",
          selector: "spinner",
          children: [
            {
              tagName: "circle",
              selector: "spinnerCircle",
              children: [{ tagName: "animateTransform", selector: "spinnerAnimation" }],
            },
          ],
        },
        { tagName: "text", selector: "label" },
      ],
      attrs: {
        root: {
          "data-testid": block.id,
        },
        body: {
          strokeWidth: Sizing.BLOCK_STROKE_WIDTH,
          rx: Sizing.BLOCK_BORDER_RADIUS,
          ry: Sizing.BLOCK_BORDER_RADIUS,
          width: "calc(w)",
          height: "calc(h)",
        },
        spinner: {
          display: "none",
          transform: `translate(calc(0.5*w - ${SPINNER_SIZE / 2}), calc(0.5*h - ${SPINNER_SIZE / 2}))`,
        },
        spinnerCircle: {
          cx: SPINNER_SIZE / 2,
          cy: SPINNER_SIZE / 2,
          r: SPINNER_RADIUS,
          fill: "none",
          stroke: "#3b82f6", // c-info color
          strokeWidth: SPINNER_STROKE_WIDTH,
          strokeDasharray: SPINNER_DASH_ARRAY,
          strokeLinecap: "round",
        },
        spinnerAnimation: {
          attributeName: "transform",
          type: "rotate",
          from: `0 ${SPINNER_SIZE / 2} ${SPINNER_SIZE / 2}`,
          to: `360 ${SPINNER_SIZE / 2} ${SPINNER_SIZE / 2}`,
          dur: "1s",
          repeatCount: "indefinite",
        },
        label: {
          text: block.label,
          class: "fill-c-dark font-base",
          fontSize: Sizing.LABEL_FONT_SIZE,
          x: "calc(0.5*w)", // Center horizontally
          y: `calc(h+${Sizing.LABEL_Y_OFFSET})`, // Below block
          textAnchor: "middle",
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
