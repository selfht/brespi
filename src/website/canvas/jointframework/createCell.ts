import { dia, shapes } from "@joint/core";
import { Block } from "../Block";
import { JointBlock } from "./helpers/JointBlock";

export function createCell(block: JointBlock) {
  const items: dia.Element.Port[] = [];
  const groups: Record<string, dia.Element.PortGroup> = {};

  // TODO: doesn't belong here
  const hasInput = block.handles.includes(Block.Handle.input);
  const hasOutput = block.handles.includes(Block.Handle.output);

  const sideConnector = {
    width: 16,
    height: 16,
    borderRadius: 4,
    offset: 6,
  };
  if (hasInput) {
    items.push({ id: Block.Handle.input, group: Block.Handle.input });
    groups.input = {
      position: "left",
      markup: [{ tagName: "rect", selector: "rect" }],
      attrs: {
        rect: {
          width: sideConnector.width,
          height: sideConnector.height,
          x: -sideConnector.width - sideConnector.offset, // Position fully outside to the left
          y: -(sideConnector.height / 2), // Center vertically
          rx: sideConnector.borderRadius,
          ry: sideConnector.borderRadius,
          class: "fill-c-artifact-fill stroke-c-artifact-stroke",
          strokeWidth: 3,
          magnet: "passive",
        },
      },
    };
  }
  if (hasOutput) {
    items.push({ group: Block.Handle.output, id: Block.Handle.output });
    groups.output = {
      position: "right",
      markup: [{ tagName: "rect", selector: "rect" }],
      attrs: {
        rect: {
          width: sideConnector.width,
          height: sideConnector.height,
          x: sideConnector.offset, // Position fully outside to the right
          y: -(sideConnector.height / 2), // Center vertically
          rx: sideConnector.borderRadius,
          ry: sideConnector.borderRadius,
          class: "fill-c-artifact-fill stroke-c-artifact-stroke",
          strokeWidth: 3,
          magnet: true,
        },
      },
    };
  }

  return new shapes.standard.Rectangle({
    id: block.id,
    position: block.coordinates,
    size: { width: 80, height: 60 },
    markup: [
      { tagName: "rect", selector: "body" },
      { tagName: "text", selector: "label" },
    ],
    attrs: {
      body: {
        class: "fill-c-artifact-fill stroke-c-artifact-stroke",
        strokeWidth: 3,
        rx: 8, // Rounded corners (scaled down)
        ry: 8,
        width: "calc(w)",
        height: "calc(h)",
      },
      label: {
        text: block.label,
        // fill: "#000",
        class: "fill-c-dark",
        fontSize: 14,
        x: "calc(0.5*w)", // Center horizontally
        y: "calc(h+18)", // Below block
        textAnchor: "middle",
      },
    },
    ports: {
      groups,
      items,
    },
  });
}
