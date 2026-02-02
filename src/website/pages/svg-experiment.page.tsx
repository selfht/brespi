// TEMPORARY: SVG experiment (no foreignObject) for Safari compatibility testing

import { useMemo } from "react";
import { JointBlock } from "../canvas/jointframework/models/JointBlock";

// Text measurement using canvas (works synchronously)
const measureText = (() => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  return (text: string, font: string): number => {
    ctx.font = font;
    return ctx.measureText(text).width;
  };
})();

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

// Styling constants (matching CalloutHelper)
const PADDING = 8;
const GAP = 12;
const LABEL_FONT_SIZE = 18;
const KEY_FONT_SIZE = 14;
const VALUE_FONT_SIZE = 14;
const LINE_HEIGHT = 1.4;
const BORDER_RADIUS = 8;
const BORDER_WIDTH = 3;

const COLORS = {
  default: { border: "#3b82f6", label: "#9ca3af" },
  success: { border: "#22c55e", label: "#86efac" },
  error: { border: "#ef4444", label: "#fca5a5" },
  busy: { border: "#3b82f6", label: "#9ca3af" },
  unused: { border: "#6b7280", label: "#9ca3af" },
};

type CalloutData = Pick<RequireNoNulls<JointBlock>, "theme" | "label" | "details">;

/**
 * SVG Spinner - equivalent to the CSS border spinner
 * Uses stroke-dasharray to create a 3/4 arc and animateTransform for rotation
 */
function SvgSpinner({ size = 20, strokeWidth = 2, color = "#3b82f6" }: { size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Show 3/4 of the circle (like border-t-transparent)
  const dashArray = `${circumference * 0.75} ${circumference * 0.25}`;

  return (
    <g>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`0 ${size / 2} ${size / 2}`}
          to={`360 ${size / 2} ${size / 2}`}
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  );
}

/**
 * Block with spinner inside (like the "busy" state)
 */
function SvgBlockWithSpinner({ width = 60, height = 45 }: { width?: number; height?: number }) {
  return (
    <g>
      <rect width={width} height={height} rx={8} fill="#f3f4f6" stroke="#3b82f6" strokeWidth={2} />
      <g transform={`translate(${width / 2 - 10}, ${height / 2 - 10})`}>
        <SvgSpinner size={20} strokeWidth={2} color="#3b82f6" />
      </g>
    </g>
  );
}

function SvgCallout({ data, width }: { data: CalloutData; width: number }) {
  const { theme, label, details } = data;
  const colors = COLORS[theme];
  const contentWidth = width - PADDING * 2 - BORDER_WIDTH * 2;

  // Pre-compute all text layout
  const layout = useMemo(() => {
    let y = PADDING + BORDER_WIDTH;

    // Label
    const labelFont = `300 ${LABEL_FONT_SIZE}px system-ui, sans-serif`;
    const labelLines = wrapText(label, labelFont, contentWidth);
    const labelY = y;
    y += labelLines.length * LABEL_FONT_SIZE * LINE_HEIGHT;

    // Details
    const entries = Object.entries(details).filter(([_, v]) => v !== undefined);
    const keyFont = `700 ${KEY_FONT_SIZE}px system-ui, sans-serif`;
    const valueFont = `400 ${VALUE_FONT_SIZE}px monospace`;

    const detailsLayout = entries.map(([key, value]) => {
      y += GAP;
      const keyLines = wrapText(key, keyFont, contentWidth);
      const keyY = y;
      y += keyLines.length * KEY_FONT_SIZE * LINE_HEIGHT;
      y += 4; // small gap between key and value

      const valueText =
        value === null
          ? "(absent)"
          : typeof value === "boolean"
            ? value
              ? "Yes"
              : "No"
            : typeof value === "string" && value.trim() === ""
              ? "\u00A0"
              : String(value);

      const valueLines = breakAll(valueText, valueFont, contentWidth);
      const valueY = y;
      y += valueLines.length * VALUE_FONT_SIZE * LINE_HEIGHT;

      return { key, keyLines, keyY, valueLines, valueY, value };
    });

    const totalHeight = y + PADDING + BORDER_WIDTH;

    return { labelLines, labelY, detailsLayout, totalHeight };
  }, [label, details, contentWidth]);

  return (
    <g>
      {/* Background */}
      <rect width={width} height={layout.totalHeight} rx={BORDER_RADIUS} fill="#1f2937" stroke={colors.border} strokeWidth={BORDER_WIDTH} />

      {/* Label */}
      <text
        x={PADDING + BORDER_WIDTH}
        y={layout.labelY + LABEL_FONT_SIZE * 0.85}
        fill={colors.label}
        fontSize={LABEL_FONT_SIZE}
        fontWeight={300}
        fontFamily="system-ui, sans-serif"
      >
        {layout.labelLines.map((line, i) => (
          <tspan key={i} x={PADDING + BORDER_WIDTH} dy={i === 0 ? 0 : LABEL_FONT_SIZE * LINE_HEIGHT}>
            {line}
          </tspan>
        ))}
      </text>

      {/* Details */}
      {layout.detailsLayout.map(({ key, keyLines, keyY, valueLines, valueY, value }) => (
        <g key={key}>
          {/* Key */}
          <text
            x={PADDING + BORDER_WIDTH}
            y={keyY + KEY_FONT_SIZE * 0.85}
            fill="white"
            fontSize={KEY_FONT_SIZE}
            fontWeight={700}
            fontFamily="system-ui, sans-serif"
          >
            {keyLines.map((line, i) => (
              <tspan key={i} x={PADDING + BORDER_WIDTH} dy={i === 0 ? 0 : KEY_FONT_SIZE * LINE_HEIGHT}>
                {line}
              </tspan>
            ))}
          </text>

          {/* Value background + text */}
          {valueLines.map((line, i) => {
            const lineY = valueY + i * VALUE_FONT_SIZE * LINE_HEIGHT;
            const lineWidth = measureText(line, `400 ${VALUE_FONT_SIZE}px monospace`) + 4;
            const isAbsent = value === null;
            return (
              <g key={i}>
                {!isAbsent && (
                  <rect
                    x={PADDING + BORDER_WIDTH - 2}
                    y={lineY}
                    width={lineWidth}
                    height={VALUE_FONT_SIZE * LINE_HEIGHT}
                    rx={3}
                    fill="rgba(156, 163, 175, 0.2)"
                  />
                )}
                <text
                  x={PADDING + BORDER_WIDTH}
                  y={lineY + VALUE_FONT_SIZE * 0.85}
                  fill={isAbsent ? "#9ca3af" : "white"}
                  fontSize={VALUE_FONT_SIZE}
                  fontFamily="monospace"
                  fontStyle={isAbsent ? "italic" : "normal"}
                >
                  {line}
                </text>
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

export function svgExperimentPage() {
  const calloutData: CalloutData = {
    theme: "default",
    label: "MariaDB Backup",
    details: {
      "Connection reference": "MY_MARIADB_URL",
      "Toolkit resolution": "automatic",
      "Database selection method": "all",
    },
  };

  // Test with longer text that needs wrapping
  const calloutData2: CalloutData = {
    theme: "success",
    label: "PostgreSQL Full Database Backup with Compression",
    details: {
      "Connection reference": "VERY_LONG_CONNECTION_STRING_THAT_SHOULD_WRAP_ASD_AS_D _AS_SD _AD_ SA_D_ A_DDS",
      "Toolkit resolution": "automatic",
      "Database selection method": "specific databases only",
    },
  };

  const calloutData3: CalloutData = {
    theme: "error",
    label: "Failed Task",
    details: {
      Error: "Connection timeout after 30 seconds",
      "Missing value": null,
    },
  };

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 16 }}>SVG Experiment (no foreignObject)</h1>
      <svg width="800" height="700" style={{ border: "1px solid #ccc", background: "#fafafa" }}>
        {/* Callout examples */}
        <g transform="translate(20, 20)">
          <SvgCallout data={calloutData} width={220} />
        </g>

        <g transform="translate(270, 20)">
          <SvgCallout data={calloutData2} width={250} />
        </g>

        <g transform="translate(550, 20)">
          <SvgCallout data={calloutData3} width={200} />
        </g>

        {/* Spinner examples */}
        <g transform="translate(20, 400)">
          <text y={-10} fontSize={14} fontWeight="bold" fill="#333">
            Spinners (native SVG)
          </text>

          {/* Standalone spinners */}
          <g transform="translate(0, 10)">
            <SvgSpinner size={20} color="#3b82f6" />
          </g>
          <g transform="translate(40, 10)">
            <SvgSpinner size={30} strokeWidth={3} color="#22c55e" />
          </g>
          <g transform="translate(90, 10)">
            <SvgSpinner size={40} strokeWidth={4} color="#ef4444" />
          </g>

          {/* Block with spinner (busy state) */}
          <g transform="translate(160, 0)">
            <SvgBlockWithSpinner />
            <text x={30} y={65} fontSize={12} textAnchor="middle" fill="#666">
              Busy block
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
