'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type StickyHorizontalTableScrollProps = {
  children: ReactNode
}

/**
 * Keeps an obvious horizontal scrollbar available at the bottom of a wide
 * operational table while its rows are being read. The table's native bar is
 * visually hidden; this synced bar is the single visible horizontal control.
 */
export default function StickyHorizontalTableScroll({ children }: StickyHorizontalTableScrollProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollbarRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState(0)

  useEffect(() => {
    const content = contentRef.current
    const scrollbar = scrollbarRef.current

    if (!content || !scrollbar) return

    const syncWidth = () => setContentWidth(content.scrollWidth)
    const syncFromContent = () => {
      scrollbar.scrollLeft = content.scrollLeft
    }
    const syncFromScrollbar = () => {
      content.scrollLeft = scrollbar.scrollLeft
    }

    syncWidth()
    content.addEventListener('scroll', syncFromContent, { passive: true })
    scrollbar.addEventListener('scroll', syncFromScrollbar, { passive: true })

    const observer = new ResizeObserver(syncWidth)
    observer.observe(content)

    return () => {
      content.removeEventListener('scroll', syncFromContent)
      scrollbar.removeEventListener('scroll', syncFromScrollbar)
      observer.disconnect()
    }
  }, [])

  return (
    <div className='relative min-w-0 w-full max-w-full'>
      <div
        ref={contentRef}
        className='min-w-0 w-full max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      >
        {children}
      </div>
      <div
        ref={scrollbarRef}
        aria-label='Scroll application table horizontally'
        className='sticky bottom-0 z-20 h-5 overflow-x-scroll border-t border-slate-300 bg-white shadow-[0_-2px_5px_rgba(15,23,42,0.08)]'
      >
        <div aria-hidden className='h-px' style={{ width: contentWidth }} />
      </div>
    </div>
  )
}
