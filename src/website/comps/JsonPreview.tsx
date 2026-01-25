import clsx from "clsx";
import { useMemo, useState } from "react";

type Props = {
  data: unknown;
  maxLines?: number;
  className?: string;
};

export function JsonPreview({ data, maxLines = 8, className }: Props) {
  const [expanded, setExpanded] = useState(false);

  const { visibleLines, hiddenCount } = useMemo(() => {
    const formatted = JSON.stringify(data, null, 2);
    const allLines = formatted.split("\n");
    const total = allLines.length;
    const visible = expanded ? formatted : allLines.slice(0, maxLines).join("\n");
    return {
      visibleLines: visible,
      hiddenCount: Math.max(0, total - maxLines),
    };
  }, [data, maxLines, expanded]);

  const showOverlay = !expanded && hiddenCount > 0;

  return (
    <div className={clsx("relative overflow-hidden bg-c-dark p-5 border-2 border-c-dim rounded-xl", className)}>
      <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-all">{visibleLines}</pre>
      {showOverlay && (
        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black to-transparent flex items-end justify-end">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="p-5 text-c-dim hover:text-white transition-colors cursor-pointer"
          >
            + {hiddenCount} lines
          </button>
        </div>
      )}
    </div>
  );
}
