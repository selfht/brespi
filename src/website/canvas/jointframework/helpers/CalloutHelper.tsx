import { dia } from "@joint/core";
import clsx from "clsx";
import { renderToString } from "react-dom/server";
import { JointBlock } from "../types/JointBlock";

export namespace CalloutHelper {
  export function showBlockDetails(cell: dia.Cell, block: JointBlock) {
    console.log(block.label, block.details);
    // Hide label
    cell.attr("label/display", "none");
    // Show callout
    cell.attr("callout/display", "block");
    cell.attr(
      "callout/html",
      renderToString(
        <div className="flex flex-col gap-3 border-3 border-c-info rounded-lg bg-c-dark p-2 pb-4">
          <h1 className="font-light text-lg text-c-dim">{block.label}</h1>
          {Object.entries(block.details).map(([key, value]) => (
            <div key={key} className="text-sm flex flex-col">
              <strong className="pb-1">{key}</strong>
              {Array.isArray(value) ? (
                <ul className="list-disc list-inside pl-1 flex flex-col gap-1">
                  {value.map((v, index) => (
                    <li key={index}>
                      <code
                        className={clsx("break-all p-0.5 bg-c-dim/20 rounded", {
                          "text-c-info": typeof v === "number",
                          "text-c-success": typeof v === "boolean" && v,
                          "text-c-error": typeof v === "boolean" && !v,
                        })}
                      >
                        {typeof v === "boolean" ? (v ? "Yes" : "No") : v}
                      </code>
                    </li>
                  ))}
                </ul>
              ) : (
                <code
                  className={clsx("break-all p-0.5 bg-c-dim/20 rounded", {
                    "text-c-info": typeof value === "number",
                    "text-c-success": typeof value === "boolean" && value,
                    "text-c-error": typeof value === "boolean" && !value,
                  })}
                >
                  {typeof value === "boolean" ? (value ? "Yes" : "No") : value}
                </code>
              )}
            </div>
          ))}
        </div>,
      ),
    );
  }

  export function showExecutionDetails(cell: dia.Cell) {
    throw new Error("not implemented");
  }

  export function hideDetails(cell: dia.Cell) {
    // Hide callout
    cell.attr("callout/display", "none");
    cell.attr("callout/html", "");
    // Show label
    cell.attr("label/display", "block");
  }
}
