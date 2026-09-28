import { useMemo } from 'react'

type UsePaginationProps = {
  currentPage: number
  totalPages: number
  paginationItemsToDisplay?: number
}

/**
 * Computes the page numbers to render for a pagination control, always
 * including the first and last page, with a window of
 * `paginationItemsToDisplay` pages on each side of the current page, and
 * `showLeftEllipsis`/`showRightEllipsis` flags for where a gap should be
 * rendered between the first/last page and the middle window.
 *
 * Example (currentPage=5, totalPages=20, paginationItemsToDisplay=2):
 * pages = [1, 3, 4, 5, 6, 7, 20], showLeftEllipsis=true, showRightEllipsis=true
 */
export function usePagination({ currentPage, totalPages, paginationItemsToDisplay = 1 }: UsePaginationProps) {
  const { pages, showLeftEllipsis, showRightEllipsis } = useMemo(() => {
    if (totalPages <= 0) {
      return { pages: [], showLeftEllipsis: false, showRightEllipsis: false }
    }

    // First page, last page, and a window around the current page.
    const totalNumbers = paginationItemsToDisplay * 2 + 3

    if (totalPages <= totalNumbers) {
      return {
        pages: Array.from({ length: totalPages }, (_, i) => i + 1),
        showLeftEllipsis: false,
        showRightEllipsis: false
      }
    }

    const leftSiblingIndex = Math.max(currentPage - paginationItemsToDisplay, 1)
    const rightSiblingIndex = Math.min(currentPage + paginationItemsToDisplay, totalPages)

    const shouldShowLeftEllipsis = leftSiblingIndex > 2
    const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1

    const middleStart = shouldShowLeftEllipsis ? leftSiblingIndex : 2
    const middleEnd = shouldShowRightEllipsis ? rightSiblingIndex : totalPages - 1

    const pageSet = new Set<number>([1, totalPages])

    for (let page = middleStart; page <= middleEnd; page++) {
      pageSet.add(page)
    }

    return {
      pages: Array.from(pageSet).sort((a, b) => a - b),
      showLeftEllipsis: shouldShowLeftEllipsis,
      showRightEllipsis: shouldShowRightEllipsis
    }
  }, [currentPage, totalPages, paginationItemsToDisplay])

  return { pages, showLeftEllipsis, showRightEllipsis, totalPages }
}
