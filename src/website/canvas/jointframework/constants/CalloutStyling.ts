import { Block } from "../../Block";

/**
 * Color constants for the callout (details popup) rendered in native SVG.
 */
export namespace CalloutStyling {
  export const COLORS: Record<Block["theme"], { border: string; label: string }> = {
    default: { border: "#3b82f6", label: "#9ca3af" },
    success: { border: "#22c55e", label: "#86efac" },
    error: { border: "#ef4444", label: "#fca5a5" },
    busy: { border: "#3b82f6", label: "#9ca3af" },
    unused: { border: "#6b7280", label: "#9ca3af" },
  };
}
