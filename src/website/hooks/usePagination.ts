import { useEffect, useState } from "react";

export function usePagination<T extends { id: string }>({
  items,
  selectedId,
  deselect,
  pageSize = 5,
}: usePagination.Options<T>): usePagination.Result<T> {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil((items?.length || 0) / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleItems = items?.slice(startIndex, startIndex + pageSize) || [];

  const determineSelectedIdPage = (): number | undefined => {
    if (selectedId && items) {
      const index = items.findIndex((item) => item.id === selectedId);
      if (index >= 0) {
        return Math.floor(index / pageSize) + 1;
      }
    }
    return undefined;
  };
  const selectedIdPage = determineSelectedIdPage();

  useEffect(() => {
    if (typeof selectedIdPage === "number" && selectedIdPage !== currentPage) {
      setCurrentPage(selectedIdPage);
    }
  }, [selectedIdPage, currentPage]);

  return {
    currentPage,
    setCurrentPage: (destinationPage) => {
      if (selectedIdPage !== destinationPage) {
        deselect();
      }
      setCurrentPage(destinationPage);
    },
    totalPages,
    visibleItems,
  };
}

export namespace usePagination {
  export type Options<T> = {
    items: T[] | undefined;
    selectedId: string | undefined;
    deselect: () => unknown;
    pageSize?: number;
  };
  export type Result<T> = {
    currentPage: number;
    setCurrentPage: (page: number) => void;
    totalPages: number;
    visibleItems: T[];
  };
}
