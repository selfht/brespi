import { dia } from "@joint/core";
import { Block } from "../../Block";

export namespace StylingHelper {
  export function synchronizeBlockStylingWithCell({ selected, handles }: Block, cell: dia.Cell): dia.Cell {
    const hasInput = handles.includes(Block.Handle.input);
    const hasOutput = handles.includes(Block.Handle.output);

    const defaultClass = "fill-c-artifact-fill stroke-c-artifact-stroke";
    const defaultUnusedClass = "fill-gray-200 stroke-c-dim";
    const selectedClass = "fill-c-dark stroke-c-info";
    const selectedUnusedClass = "fill-gray-100 stroke-c-info";

    const className = {
      main: selected ? selectedClass : defaultClass,
      input: selected
        ? //
          hasInput
          ? selectedClass
          : selectedUnusedClass
        : //
          hasInput
          ? defaultClass
          : defaultUnusedClass,
      output: selected
        ? //
          hasOutput
          ? selectedClass
          : selectedUnusedClass
        : //
          hasOutput
          ? defaultClass
          : defaultUnusedClass,
    };

    cell.attr("body/class", className.main);
    (cell as dia.Element).portProp(Block.Handle.input, "attrs/rect/class", className.input);
    (cell as dia.Element).portProp(Block.Handle.output, "attrs/rect/class", className.output);
    return cell;
  }
}
