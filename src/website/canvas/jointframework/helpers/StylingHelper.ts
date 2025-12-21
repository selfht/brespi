import { dia } from "@joint/core";
import { Block } from "../../Block";

export namespace StylingHelper {
  export function synchronizeBlockStylingWithCell({ theme, selected, handles }: Block, cell: dia.Cell): dia.Cell {
    const hasInput = handles.includes(Block.Handle.input);
    const hasOutput = handles.includes(Block.Handle.output);

    const catalogue = {
      default: "fill-c-canvasblock-default-inner stroke-c-canvasblock-default-outer",
      selected: "fill-c-dark stroke-c-info",
      success: "fill-green-300 stroke-green-500",
      error: "fill-red-300 stroke-red-500",
      busy: "fill-gray-100 stroke-c-info",
      unused: "fill-c-canvasblock-unused-inner stroke-c-canvasblock-unused-outer",
    } satisfies { selected: string } & Record<typeof theme, string>;

    const activeStyle: "selected" | typeof theme = theme === "default" && selected ? "selected" : theme;

    const className = {
      main: catalogue[activeStyle],
      input: catalogue[hasInput ? activeStyle : "unused"],
      output: catalogue[hasOutput ? activeStyle : "unused"],
    };

    cell.attr("body/class", className.main);
    (cell as dia.Element).portProp(Block.Handle.input, "attrs/rect/class", className.input);
    (cell as dia.Element).portProp(Block.Handle.output, "attrs/rect/class", className.output);
    cell.attr("spinner/display", theme === "busy" ? "block" : "none");

    return cell;
  }
}
