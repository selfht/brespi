import { dia } from "@joint/core";
import { Block } from "../../Block";
import { Sizing } from "../constants/Sizing";

export namespace CalloutHelper {
  // Text measurement using canvas (works synchronously)
  const measureText = (() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    return (text: string, font: string): number => {
      ctx.font = font;
      return ctx.measureText(text).width;
    };
  })();

  // Break long strings character-by-character (for break-all behavior)
  function breakAll(text: string, font: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let currentLine = "";

    for (const char of text) {
      const testLine = currentLine + char;
      if (measureText(testLine, font) > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines.length ? lines : [""];
  }

  // Wrap text to fit within maxWidth, returns array of lines
  function wrapText(text: string, font: string, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];

    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = measureText(testLine, font);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    return lines.length ? lines : [""];
  }

  // Styling constants
  const PADDING = 8;
  const GAP = 12;
  const LABEL_FONT_SIZE = 18;
  const KEY_FONT_SIZE = 14;
  const VALUE_FONT_SIZE = 14;
  const LINE_HEIGHT = 1.4;
  const BORDER_RADIUS = 8;
  const BORDER_WIDTH = 3;

  const COLORS: Record<Block["theme"], { border: string; label: string }> = {
    default: { border: "#3b82f6", label: "#9ca3af" },
    success: { border: "#22c55e", label: "#86efac" },
    error: { border: "#ef4444", label: "#fca5a5" },
    busy: { border: "#3b82f6", label: "#9ca3af" },
    unused: { border: "#6b7280", label: "#9ca3af" },
  };

  function createSvgElement<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
    return document.createElementNS(SVG_NS, tag);
  }

  function formatValue(v: Block.PrimitiveField | Block.CustomField | null): { text: string; isAbsent: boolean } {
    if (v === null) {
      return { text: "(absent)", isAbsent: true };
    }
    if (typeof v === "boolean") {
      return { text: v ? "Yes" : "No", isAbsent: false };
    }
    if (typeof v === "string" && v.trim() === "") {
      return { text: "\u00A0", isAbsent: false };
    }
    if (typeof v === "string" || typeof v === "number") {
      return { text: String(v), isAbsent: false };
    }
    if ((v as Block.CustomField).custom === "empty_array") {
      return { text: "(none)", isAbsent: true };
    }
    return { text: "", isAbsent: false };
  }

  // State
  let calloutLayer: SVGGElement | null = null;
  let currentCell: dia.Element | null = null;
  let positionListener: (() => void) | null = null;

  // SVG namespace
  const SVG_NS = "http://www.w3.org/2000/svg";

  export function initialize(paper: dia.Paper) {
    // Get the viewport (the <g> that transforms on pan/zoom)
    const viewport = paper.layers;
    if (!viewport) return;

    // Create callout layer if it doesn't exist
    calloutLayer = createSvgElement("g");
    calloutLayer.setAttribute("id", "callout-layer");
    calloutLayer.style.display = "none";
    viewport.appendChild(calloutLayer);
  }

  export function cleanup() {
    if (positionListener) {
      positionListener();
      positionListener = null;
    }
    currentCell = null;
    if (calloutLayer) {
      calloutLayer.remove();
      calloutLayer = null;
    }
  }

  type CalloutData = Pick<RequireNoNulls<Block & { details: Block.Details }>, "theme" | "label" | "details">;

  export function showDetails(cell: dia.Cell, data: CalloutData) {
    if (!calloutLayer) return;

    // Clean up previous listener
    if (positionListener) {
      positionListener();
      positionListener = null;
    }

    // Bring cell to front
    cell.toFront();

    const element = cell as dia.Element;
    currentCell = element;

    // Clear previous content
    calloutLayer.innerHTML = "";

    // Render the callout
    const { group } = renderCallout(data, Sizing.CALLOUT_WIDTH);
    calloutLayer.appendChild(group);

    // Position update function
    const updatePosition = () => {
      const position = element.position();
      const size = element.size();
      const calloutX = position.x + size.width / 2 - Sizing.CALLOUT_WIDTH / 2;
      const calloutY = position.y + size.height + Sizing.LABEL_Y_OFFSET + Sizing.CALLOUT_Y_OFFSET;
      group.setAttribute("transform", `translate(${calloutX}, ${calloutY})`);
    };

    // Initial position
    updatePosition();

    // Listen for position changes
    element.on("change:position", updatePosition);
    positionListener = () => element.off("change:position", updatePosition);

    // Show the layer
    calloutLayer.style.display = "block";
  }

  export function hideDetails(_cell?: dia.Cell) {
    // Clean up position listener
    if (positionListener) {
      positionListener();
      positionListener = null;
    }
    currentCell = null;

    if (calloutLayer) {
      calloutLayer.style.display = "none";
      calloutLayer.innerHTML = "";
    }
  }

  function renderCallout(data: CalloutData, width: number): { group: SVGGElement; height: number } {
    const { theme, label, details } = data;
    const colors = COLORS[theme];
    const contentWidth = width - PADDING * 2 - BORDER_WIDTH * 2;

    // Compute layout
    let y = PADDING + BORDER_WIDTH;

    // Label layout
    const labelFont = `300 ${LABEL_FONT_SIZE}px system-ui, sans-serif`;
    const labelLines = wrapText(label, labelFont, contentWidth);
    const labelY = y;
    y += labelLines.length * LABEL_FONT_SIZE * LINE_HEIGHT;

    // Details layout
    const entries = Object.entries(details).filter(([_, v]) => v !== undefined);
    const keyFont = `700 ${KEY_FONT_SIZE}px system-ui, sans-serif`;
    const valueFont = `400 ${VALUE_FONT_SIZE}px monospace`;

    const detailsLayout = entries.map(([key, value]) => {
      y += GAP;
      const keyLines = wrapText(key, keyFont, contentWidth);
      const keyY = y;
      y += keyLines.length * KEY_FONT_SIZE * LINE_HEIGHT;
      y += 4; // small gap between key and value

      // Handle arrays
      if (Array.isArray(value)) {
        const items = value
          .filter((v) => v !== undefined)
          .map((v) => {
            const formatted = formatValue(v);
            const lines = breakAll(formatted.text, valueFont, contentWidth - 16); // indent for bullet
            return { lines, isAbsent: formatted.isAbsent };
          });
        const itemsY = y;
        items.forEach((item) => {
          y += item.lines.length * VALUE_FONT_SIZE * LINE_HEIGHT;
        });
        return { key, keyLines, keyY, isArray: true as const, items, itemsY };
      }

      const formatted = formatValue(value as Block.PrimitiveField | Block.CustomField | null);
      const valueLines = breakAll(formatted.text, valueFont, contentWidth);
      const valueY = y;
      y += valueLines.length * VALUE_FONT_SIZE * LINE_HEIGHT;

      return { key, keyLines, keyY, isArray: false as const, valueLines, valueY, isAbsent: formatted.isAbsent };
    });

    const totalHeight = y + PADDING + BORDER_WIDTH;

    // Create SVG elements
    const group = createSvgElement("g");

    // Background rect
    const bg = createSvgElement("rect");
    bg.setAttribute("width", String(width));
    bg.setAttribute("height", String(totalHeight));
    bg.setAttribute("rx", String(BORDER_RADIUS));
    bg.setAttribute("fill", "#1f2937");
    bg.setAttribute("stroke", colors.border);
    bg.setAttribute("stroke-width", String(BORDER_WIDTH));
    group.appendChild(bg);

    // Label text
    const labelText = createSvgElement("text");
    labelText.setAttribute("x", String(PADDING + BORDER_WIDTH));
    labelText.setAttribute("y", String(labelY + LABEL_FONT_SIZE * 0.85));
    labelText.setAttribute("fill", colors.label);
    labelText.setAttribute("font-size", String(LABEL_FONT_SIZE));
    labelText.setAttribute("font-weight", "300");
    labelText.setAttribute("font-family", "system-ui, sans-serif");

    labelLines.forEach((line, i) => {
      const tspan = createSvgElement("tspan");
      tspan.setAttribute("x", String(PADDING + BORDER_WIDTH));
      if (i > 0) {
        tspan.setAttribute("dy", String(LABEL_FONT_SIZE * LINE_HEIGHT));
      }
      tspan.textContent = line;
      labelText.appendChild(tspan);
    });
    group.appendChild(labelText);

    // Details
    detailsLayout.forEach((detail) => {
      // Key text
      const keyText = createSvgElement("text");
      keyText.setAttribute("x", String(PADDING + BORDER_WIDTH));
      keyText.setAttribute("y", String(detail.keyY + KEY_FONT_SIZE * 0.85));
      keyText.setAttribute("fill", "white");
      keyText.setAttribute("font-size", String(KEY_FONT_SIZE));
      keyText.setAttribute("font-weight", "700");
      keyText.setAttribute("font-family", "system-ui, sans-serif");

      detail.keyLines.forEach((line, i) => {
        const tspan = createSvgElement("tspan");
        tspan.setAttribute("x", String(PADDING + BORDER_WIDTH));
        if (i > 0) {
          tspan.setAttribute("dy", String(KEY_FONT_SIZE * LINE_HEIGHT));
        }
        tspan.textContent = line;
        keyText.appendChild(tspan);
      });
      group.appendChild(keyText);

      // Value(s)
      if (detail.isArray) {
        let currentY = detail.itemsY;
        detail.items.forEach((item) => {
          item.lines.forEach((line, lineIndex) => {
            const lineY = currentY + lineIndex * VALUE_FONT_SIZE * LINE_HEIGHT;

            // Bullet point (only for first line of each item)
            if (lineIndex === 0) {
              const bullet = createSvgElement("text");
              bullet.setAttribute("x", String(PADDING + BORDER_WIDTH + 4));
              bullet.setAttribute("y", String(lineY + VALUE_FONT_SIZE * 0.85));
              bullet.setAttribute("fill", "white");
              bullet.setAttribute("font-size", String(VALUE_FONT_SIZE));
              bullet.textContent = "•";
              group.appendChild(bullet);
            }

            // Background for value (not for absent)
            if (!item.isAbsent) {
              const bgRect = createSvgElement("rect");
              const lineWidth = measureText(line, `400 ${VALUE_FONT_SIZE}px monospace`) + 4;
              bgRect.setAttribute("x", String(PADDING + BORDER_WIDTH + 14));
              bgRect.setAttribute("y", String(lineY));
              bgRect.setAttribute("width", String(lineWidth));
              bgRect.setAttribute("height", String(VALUE_FONT_SIZE * LINE_HEIGHT));
              bgRect.setAttribute("rx", "3");
              bgRect.setAttribute("fill", "rgba(156, 163, 175, 0.2)");
              group.appendChild(bgRect);
            }

            // Value text
            const valueText = createSvgElement("text");
            valueText.setAttribute("x", String(PADDING + BORDER_WIDTH + 16));
            valueText.setAttribute("y", String(lineY + VALUE_FONT_SIZE * 0.85));
            valueText.setAttribute("fill", item.isAbsent ? "#9ca3af" : "white");
            valueText.setAttribute("font-size", String(VALUE_FONT_SIZE));
            valueText.setAttribute("font-family", "monospace");
            if (item.isAbsent) {
              valueText.setAttribute("font-style", "italic");
            }
            valueText.textContent = line;
            group.appendChild(valueText);
          });
          currentY += item.lines.length * VALUE_FONT_SIZE * LINE_HEIGHT;
        });
      } else {
        detail.valueLines.forEach((line, i) => {
          const lineY = detail.valueY + i * VALUE_FONT_SIZE * LINE_HEIGHT;

          // Background for value (not for absent)
          if (!detail.isAbsent) {
            const bgRect = createSvgElement("rect");
            const lineWidth = measureText(line, `400 ${VALUE_FONT_SIZE}px monospace`) + 4;
            bgRect.setAttribute("x", String(PADDING + BORDER_WIDTH - 2));
            bgRect.setAttribute("y", String(lineY));
            bgRect.setAttribute("width", String(lineWidth));
            bgRect.setAttribute("height", String(VALUE_FONT_SIZE * LINE_HEIGHT));
            bgRect.setAttribute("rx", "3");
            bgRect.setAttribute("fill", "rgba(156, 163, 175, 0.2)");
            group.appendChild(bgRect);
          }

          // Value text
          const valueText = createSvgElement("text");
          valueText.setAttribute("x", String(PADDING + BORDER_WIDTH));
          valueText.setAttribute("y", String(lineY + VALUE_FONT_SIZE * 0.85));
          valueText.setAttribute("fill", detail.isAbsent ? "#9ca3af" : "white");
          valueText.setAttribute("font-size", String(VALUE_FONT_SIZE));
          valueText.setAttribute("font-family", "monospace");
          if (detail.isAbsent) {
            valueText.setAttribute("font-style", "italic");
          }
          valueText.textContent = line;
          group.appendChild(valueText);
        });
      }
    });

    return { group, height: totalHeight };
  }
}
