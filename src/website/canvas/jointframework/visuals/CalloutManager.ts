import { dia } from "@joint/core";
import { Block } from "../../Block";
import { Color } from "../../../Color";
import { Sizing } from "../constants/Sizing";

export type CalloutData = Pick<
  RequireNoNulls<
    Block & {
      details: Block.Details;
    }
  >,
  "theme" | "label" | "details"
>;

export class CalloutManager {
  /**
   * Color helpers for callout styling.
   */
  private static readonly colors = {
    background: () => Color.gray(800),
    valueBackground: () => `color-mix(in srgb, ${Color.gray(400)} 20%, transparent)`,
    forTheme: (theme: Block["theme"]): { border: string; label: string } => {
      const map: Record<Block["theme"], { border: string; label: string }> = {
        default: { border: Color.accent(), label: Color.gray(400) },
        success: { border: Color.green(500), label: Color.green(300) },
        error: { border: Color.red(500), label: Color.red(300) },
        busy: { border: Color.accent(), label: Color.gray(400) },
        unused: { border: Color.dim(), label: Color.gray(400) },
      };
      return map[theme];
    },
  };

  /**
   * Text measurement using canvas (works synchronously).
   */
  private static readonly measureText = (() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    return (text: string, font: string): number => {
      ctx.font = font;
      return ctx.measureText(text).width;
    };
  })();

  private layer: SVGGElement;
  private currentCell: dia.Element | null = null;
  private positionListener: (() => void) | null = null;

  constructor(paper: dia.Paper) {
    const viewport = paper.layers;
    if (!viewport) {
      throw new Error("Paper viewport not found");
    }
    this.layer = this.createSvgElement("g");
    this.layer.setAttribute("id", "callout-layer");
    this.layer.style.display = "none";
    viewport.appendChild(this.layer);
  }

  public showDetails(cell: dia.Cell, data: CalloutData): void {
    this.clearPositionListener();
    cell.toFront();

    const element = cell as dia.Element;
    this.currentCell = element;
    this.layer.innerHTML = "";

    const group = this.renderCallout(data, Sizing.CALLOUT_WIDTH);
    this.layer.appendChild(group);

    const updatePosition = () => {
      const position = element.position();
      const size = element.size();
      const calloutX = position.x + size.width / 2 - Sizing.CALLOUT_WIDTH / 2;
      const calloutY = position.y + size.height + Sizing.LABEL_Y_OFFSET + Sizing.CALLOUT_Y_OFFSET;
      group.setAttribute("transform", `translate(${calloutX}, ${calloutY})`);
    };

    updatePosition();
    element.on("change:position", updatePosition);
    this.positionListener = () => element.off("change:position", updatePosition);

    this.layer.style.display = "block";
  }

  public hideDetails(): void {
    this.clearPositionListener();
    this.currentCell = null;

    this.layer.style.display = "none";
    this.layer.innerHTML = "";
  }

  public cleanup(): void {
    this.clearPositionListener();
    this.currentCell = null;
    this.layer.remove();
  }

  private clearPositionListener(): void {
    if (this.positionListener) {
      this.positionListener();
      this.positionListener = null;
    }
  }

  private createSvgElement<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
  }

  private formatValue(v: Block.PrimitiveField | Block.CustomField | null): { text: string; isAbsent: boolean } {
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

  private breakAll(text: string, font: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let currentLine = "";

    for (const char of text) {
      const testLine = currentLine + char;
      if (CalloutManager.measureText(testLine, font) > maxWidth && currentLine) {
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

  private wrapText(text: string, font: string, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = CalloutManager.measureText(testLine, font);
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

  private renderCallout(data: CalloutData, width: number): SVGGElement {
    const { theme, label, details } = data;
    const themeColors = CalloutManager.colors.forTheme(theme);
    const contentWidth = width - Sizing.CALLOUT_PADDING * 2 - Sizing.CALLOUT_BORDER_WIDTH * 2;

    // Compute layout
    let y = Sizing.CALLOUT_PADDING + Sizing.CALLOUT_BORDER_WIDTH;

    // Label layout
    const labelFont = `300 ${Sizing.CALLOUT_LABEL_FONT_SIZE}px system-ui, sans-serif`;
    const labelLines = this.wrapText(label, labelFont, contentWidth);
    const labelY = y;
    y += labelLines.length * Sizing.CALLOUT_LABEL_FONT_SIZE * Sizing.CALLOUT_LINE_HEIGHT;

    // Details layout
    const entries = Object.entries(details).filter(([_, v]) => v !== undefined);
    const keyFont = `700 ${Sizing.CALLOUT_KEY_FONT_SIZE}px system-ui, sans-serif`;
    const valueFont = `400 ${Sizing.CALLOUT_VALUE_FONT_SIZE}px monospace`;

    const detailsLayout = entries.map(([key, value]) => {
      y += Sizing.CALLOUT_GAP;
      const keyLines = this.wrapText(key, keyFont, contentWidth);
      const keyY = y;
      y += keyLines.length * Sizing.CALLOUT_KEY_FONT_SIZE * Sizing.CALLOUT_LINE_HEIGHT;
      y += 4; // small gap between key and value

      // Handle arrays
      if (Array.isArray(value)) {
        const items = value
          .filter((v) => v !== undefined)
          .map((v) => {
            const formatted = this.formatValue(v);
            const lines = this.breakAll(formatted.text, valueFont, contentWidth - 16);
            return { lines, isAbsent: formatted.isAbsent };
          });
        const itemsY = y;
        items.forEach((item) => {
          y += item.lines.length * Sizing.CALLOUT_VALUE_FONT_SIZE * Sizing.CALLOUT_LINE_HEIGHT;
        });
        return { key, keyLines, keyY, isArray: true as const, items, itemsY };
      }

      const formatted = this.formatValue(value as Block.PrimitiveField | Block.CustomField | null);
      const valueLines = this.breakAll(formatted.text, valueFont, contentWidth);
      const valueY = y;
      y += valueLines.length * Sizing.CALLOUT_VALUE_FONT_SIZE * Sizing.CALLOUT_LINE_HEIGHT;

      return { key, keyLines, keyY, isArray: false as const, valueLines, valueY, isAbsent: formatted.isAbsent };
    });

    const totalHeight = y + Sizing.CALLOUT_PADDING + Sizing.CALLOUT_BORDER_WIDTH;

    // Create SVG elements
    const group = this.createSvgElement("g");

    // Background rect
    const bg = this.createSvgElement("rect");
    bg.setAttribute("width", String(width));
    bg.setAttribute("height", String(totalHeight));
    bg.setAttribute("rx", String(Sizing.CALLOUT_BORDER_RADIUS));
    bg.setAttribute("fill", CalloutManager.colors.background());
    bg.setAttribute("stroke", themeColors.border);
    bg.setAttribute("stroke-width", String(Sizing.CALLOUT_BORDER_WIDTH));
    group.appendChild(bg);

    // Label text
    const labelText = this.createSvgElement("text");
    labelText.setAttribute("x", String(Sizing.CALLOUT_PADDING + Sizing.CALLOUT_BORDER_WIDTH));
    labelText.setAttribute("y", String(labelY + Sizing.CALLOUT_LABEL_FONT_SIZE * 0.85));
    labelText.setAttribute("fill", themeColors.label);
    labelText.setAttribute("font-size", String(Sizing.CALLOUT_LABEL_FONT_SIZE));
    labelText.setAttribute("font-weight", "300");
    labelText.setAttribute("font-family", "system-ui, sans-serif");

    labelLines.forEach((line, i) => {
      const tspan = this.createSvgElement("tspan");
      tspan.setAttribute("x", String(Sizing.CALLOUT_PADDING + Sizing.CALLOUT_BORDER_WIDTH));
      if (i > 0) {
        tspan.setAttribute("dy", String(Sizing.CALLOUT_LABEL_FONT_SIZE * Sizing.CALLOUT_LINE_HEIGHT));
      }
      tspan.textContent = line;
      labelText.appendChild(tspan);
    });
    group.appendChild(labelText);

    // Details
    detailsLayout.forEach((detail) => {
      // Key text
      const keyText = this.createSvgElement("text");
      keyText.setAttribute("x", String(Sizing.CALLOUT_PADDING + Sizing.CALLOUT_BORDER_WIDTH));
      keyText.setAttribute("y", String(detail.keyY + Sizing.CALLOUT_KEY_FONT_SIZE * 0.85));
      keyText.setAttribute("fill", "white");
      keyText.setAttribute("font-size", String(Sizing.CALLOUT_KEY_FONT_SIZE));
      keyText.setAttribute("font-weight", "700");
      keyText.setAttribute("font-family", "system-ui, sans-serif");

      detail.keyLines.forEach((line, i) => {
        const tspan = this.createSvgElement("tspan");
        tspan.setAttribute("x", String(Sizing.CALLOUT_PADDING + Sizing.CALLOUT_BORDER_WIDTH));
        if (i > 0) {
          tspan.setAttribute("dy", String(Sizing.CALLOUT_KEY_FONT_SIZE * Sizing.CALLOUT_LINE_HEIGHT));
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
            const lineY = currentY + lineIndex * Sizing.CALLOUT_VALUE_FONT_SIZE * Sizing.CALLOUT_LINE_HEIGHT;

            // Bullet point (only for first line of each item)
            if (lineIndex === 0) {
              const bullet = this.createSvgElement("text");
              bullet.setAttribute("x", String(Sizing.CALLOUT_PADDING + Sizing.CALLOUT_BORDER_WIDTH + 4));
              bullet.setAttribute("y", String(lineY + Sizing.CALLOUT_VALUE_FONT_SIZE * 0.85));
              bullet.setAttribute("fill", "white");
              bullet.setAttribute("font-size", String(Sizing.CALLOUT_VALUE_FONT_SIZE));
              bullet.textContent = "•";
              group.appendChild(bullet);
            }

            // Background for value (not for absent)
            if (!item.isAbsent) {
              const bgRect = this.createSvgElement("rect");
              const lineWidth = CalloutManager.measureText(line, `400 ${Sizing.CALLOUT_VALUE_FONT_SIZE}px monospace`) + 4;
              bgRect.setAttribute("x", String(Sizing.CALLOUT_PADDING + Sizing.CALLOUT_BORDER_WIDTH + 14));
              bgRect.setAttribute("y", String(lineY));
              bgRect.setAttribute("width", String(lineWidth));
              bgRect.setAttribute("height", String(Sizing.CALLOUT_VALUE_FONT_SIZE * Sizing.CALLOUT_LINE_HEIGHT));
              bgRect.setAttribute("rx", "3");
              bgRect.setAttribute("fill", CalloutManager.colors.valueBackground());
              group.appendChild(bgRect);
            }

            // Value text
            const valueText = this.createSvgElement("text");
            valueText.setAttribute("x", String(Sizing.CALLOUT_PADDING + Sizing.CALLOUT_BORDER_WIDTH + 16));
            valueText.setAttribute("y", String(lineY + Sizing.CALLOUT_VALUE_FONT_SIZE * 0.85));
            valueText.setAttribute("fill", item.isAbsent ? Color.gray(400) : "white");
            valueText.setAttribute("font-size", String(Sizing.CALLOUT_VALUE_FONT_SIZE));
            valueText.setAttribute("font-family", "monospace");
            if (item.isAbsent) {
              valueText.setAttribute("font-style", "italic");
            }
            valueText.textContent = line;
            group.appendChild(valueText);
          });
          currentY += item.lines.length * Sizing.CALLOUT_VALUE_FONT_SIZE * Sizing.CALLOUT_LINE_HEIGHT;
        });
      } else {
        detail.valueLines.forEach((line, i) => {
          const lineY = detail.valueY + i * Sizing.CALLOUT_VALUE_FONT_SIZE * Sizing.CALLOUT_LINE_HEIGHT;

          // Background for value (not for absent)
          if (!detail.isAbsent) {
            const bgRect = this.createSvgElement("rect");
            const lineWidth = CalloutManager.measureText(line, `400 ${Sizing.CALLOUT_VALUE_FONT_SIZE}px monospace`) + 4;
            bgRect.setAttribute("x", String(Sizing.CALLOUT_PADDING + Sizing.CALLOUT_BORDER_WIDTH - 2));
            bgRect.setAttribute("y", String(lineY));
            bgRect.setAttribute("width", String(lineWidth));
            bgRect.setAttribute("height", String(Sizing.CALLOUT_VALUE_FONT_SIZE * Sizing.CALLOUT_LINE_HEIGHT));
            bgRect.setAttribute("rx", "3");
            bgRect.setAttribute("fill", CalloutManager.colors.valueBackground());
            group.appendChild(bgRect);
          }

          // Value text
          const valueText = this.createSvgElement("text");
          valueText.setAttribute("x", String(Sizing.CALLOUT_PADDING + Sizing.CALLOUT_BORDER_WIDTH));
          valueText.setAttribute("y", String(lineY + Sizing.CALLOUT_VALUE_FONT_SIZE * 0.85));
          valueText.setAttribute("fill", detail.isAbsent ? Color.gray(400) : "white");
          valueText.setAttribute("font-size", String(Sizing.CALLOUT_VALUE_FONT_SIZE));
          valueText.setAttribute("font-family", "monospace");
          if (detail.isAbsent) {
            valueText.setAttribute("font-style", "italic");
          }
          valueText.textContent = line;
          group.appendChild(valueText);
        });
      }
    });

    return group;
  }
}
