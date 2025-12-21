import { dia } from "@joint/core";
import clsx from "clsx";
import { renderToString } from "react-dom/server";
import { JointBlock } from "../models/JointBlock";

export namespace CalloutHelper {
  function Value({ v }: { v: string | number | boolean | null }) {
    const displayValue =
      v === null
        ? "(absent)"
        : typeof v === "boolean"
          ? v
            ? "Yes"
            : "No"
          : typeof v === "string" && v.trim() === ""
            ? "\u00A0" // Non-breaking space to preserve vertical height
            : v;
    return (
      <code
        className={clsx("break-all p-0.5 bg-c-dim/20 rounded", {
          italic: v === null,
          "text-c-info": typeof v === "number",
          "text-c-success": typeof v === "boolean" && v,
          "text-c-error": typeof v === "boolean" && !v,
        })}
      >
        {displayValue}
      </code>
    );
  }

  export function showDetails(cell: dia.Cell, { theme, label, details }: Pick<RequireNoNulls<JointBlock>, "theme" | "label" | "details">) {
    // Bring to front
    cell.toFront();
    // Hide label
    cell.attr("label/display", "none");
    // Show callout
    cell.attr("callout/display", "block");
    cell.attr(
      "callout/html",
      renderToString(
        <div
          className={clsx(
            "flex flex-col gap-3 border-3 rounded-lg bg-c-dark p-2 pb-4",
            theme === "success" ? "border-green-500" : theme === "error" ? "border-red-500" : "border-c-info",
          )}
        >
          <h1
            className={clsx(
              "font-light text-lg",
              theme === "success" ? "text-green-300" : theme === "error" ? "text-red-300" : "text-c-dim",
            )}
          >
            {label}
          </h1>
          {Object.entries(details)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => (
              <div key={key} className="text-sm flex flex-col">
                <strong className="pb-1">{key}</strong>
                {Array.isArray(value) ? (
                  <ul className="list-disc list-inside pl-1 flex flex-col gap-1">
                    {value
                      .filter((v) => v !== undefined)
                      .map((v, index) => (
                        <li key={index}>
                          <Value v={v} />
                        </li>
                      ))}
                  </ul>
                ) : (
                  <Value v={value as string | number | boolean | null} /> /* undefined is already filtered out */
                )}
              </div>
            ))}
        </div>,
      ),
    );
  }

  export function hideDetails(cell: dia.Cell) {
    // Hide callout
    cell.attr("callout/display", "none");
    cell.attr("callout/html", "");
    // Show label
    cell.attr("label/display", "block");
  }
}
