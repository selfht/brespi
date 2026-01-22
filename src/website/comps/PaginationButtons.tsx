import clsx from "clsx";
import { Icon } from "./Icon";

type Props = {
  className?: string;
  currentPage: number;
  totalPages: number;
  onFlipRequest: (page: number) => void;
};
export function PaginationButtons({ className, currentPage, totalPages, onFlipRequest }: Props) {
  const getPageItems = (): Array<number | "..."> => {
    const pages: Set<number> = new Set();
    pages.add(currentPage);
    pages.add(Math.max(1, currentPage - 1));
    pages.add(Math.min(totalPages, currentPage + 1));

    if (pages.size < 3) {
      if (pages.has(1)) {
        pages.add(Math.min(totalPages, 3));
      }
      if (pages.has(totalPages)) {
        pages.add(Math.max(1, totalPages - 2));
      }
    }

    const items: Array<number | "..."> = Array.from(pages).sort();
    if (items.length === 3) {
      const first = items.at(0) as number;
      const last = items.at(-1) as number;
      if (first > 1) {
        items.unshift("...");
      }
      if (last < totalPages) {
        items.push("...");
      }
    }
    return items;
  };

  const pageItems = getPageItems();
  const prevButton = {
    visible: pageItems.length > 3,
    enabled: currentPage > 1,
    onClick: () => onFlipRequest(currentPage - 1),
  };
  const nextButton = {
    visible: pageItems.length > 3,
    enabled: currentPage < totalPages,
    onClick: () => onFlipRequest(currentPage + 1),
  };

  return (
    <div className={clsx("flex items-center", className)}>
      {prevButton.visible && (
        <button disabled={!prevButton.enabled} onClick={prevButton.onClick} className="group cursor-pointer">
          <Icon.Triangle innerClassName="fill-c-dim! hover:group-not-disabled:fill-white!" />
        </button>
      )}
      <div className={clsx("w-52 flex items-center", prevButton.visible || nextButton.visible ? "justify-center" : "justify-start")}>
        {pageItems.map((item, index) =>
          item === "..." ? (
            <span key={`ellipsis-${index}`} className="px-2 text-c-dim">
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onFlipRequest(item)}
              className={clsx("min-w-8 px-2 py-1 rounded text-sm cursor-pointer", {
                "bg-white text-black font-medium": item === currentPage,
                "text-c-dim hover:text-white": item !== currentPage,
              })}
            >
              {item}
            </button>
          ),
        )}
      </div>
      {nextButton.visible && (
        <button disabled={!nextButton.enabled} onClick={nextButton.onClick} className="group cursor-pointer">
          <Icon.Triangle className="rotate-180" innerClassName="fill-c-dim! hover:group-not-disabled:fill-white!" />
        </button>
      )}
    </div>
  );
}
