import { shapes } from "@joint/core";

export function createLink() {
  return new shapes.standard.Link({
    attrs: {
      line: {
        stroke: "#34495e",
        strokeWidth: 2.5,
        strokeLinecap: "round",
        targetMarker: {
          type: "path",
          d: "M 10 -5 -2.5 0 10 5 z",
          fill: "#34495e",
        },
      },
    },
    connector: { name: "rounded" },
    router: { name: "normal" },
  });
}
