import clsx from "clsx";
import { useMemo } from "react";

type Props = {
  data: unknown;
  maxLines?: number;
  className?: string;
};

export function JsonPreview({ data, maxLines = 8, className }: Props) {
  const { visibleLines, hiddenCount } = useMemo(() => {
    const formatted = JSON.stringify(data, null, 2);
    const allLines = formatted.split("\n");
    const total = allLines.length;
    const visible = allLines.slice(0, maxLines).join("\n");
    return {
      visibleLines: visible,
      hiddenCount: Math.max(0, total - maxLines),
    };
  }, [data, maxLines]);

  const hasOverflow = hiddenCount > 0;

  return (
    <div className={clsx("relative overflow-hidden bg-c-dark p-5 border-2 border-c-dim rounded-xl", className)}>
      <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-all">{visibleLines}</pre>
      {hasOverflow && (
        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black to-transparent flex items-end justify-end pb-5 pr-5">
          <span className="text text-c-dim">+ {hiddenCount} lines</span>
        </div>
      )}
    </div>
  );
}
