'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * NextTopLoader — Lightweight, zero-dependency, premium top progress loader
 * for Next.js App Router.
 *
 * Automatically triggers on internal route transitions, showing a glowing
 * saffron/gold progress bar across the top of the browser viewport.
 */
export default function NextTopLoader({
  color = '#ea580c',
  height = 3,
  showSpinner = false
}: {
  color?: string
  height?: number
  showSpinner?: boolean
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const activeRef = useRef(false)

  // Start progress animation
  const start = () => {
    if (activeRef.current) return
    activeRef.current = true
    setVisible(true)
    setProgress(15)

    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev < 50) return prev + 15
        if (prev < 75) return prev + 8
        if (prev < 90) return prev + 3
        return prev
      })
    }, 150)
  }

  // Complete progress animation
  const complete = () => {
    if (!activeRef.current) return
    activeRef.current = false

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setProgress(100)

    setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        setProgress(0)
      }, 200)
    }, 250)
  }

  // Complete loading whenever route pathname or search params change
  useEffect(() => {
    complete()
  }, [pathname, searchParams])

  // Intercept click on internal links
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      try {
        const target = event.target as HTMLElement | null
        const anchor = target?.closest('a')

        if (!anchor) return
        const href = anchor.getAttribute('href')

        if (!href) return

        // Skip non-navigation anchors
        if (
          href.startsWith('#') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('javascript:') ||
          anchor.target === '_blank' ||
          anchor.hasAttribute('download') ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return
        }

        const currentUrl = new URL(window.location.href)
        const targetUrl = new URL(href, window.location.href)

        // Only start if navigating to a different page within the same origin
        if (
          targetUrl.origin === currentUrl.origin &&
          (targetUrl.pathname !== currentUrl.pathname || targetUrl.search !== currentUrl.search)
        ) {
          start()
        }
      } catch {
        // Fallback safely if URL constructor fails on special strings
      }
    }

    document.addEventListener('click', handleAnchorClick, { capture: true })

    return () => {
      document.removeEventListener('click', handleAnchorClick, { capture: true })
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (!visible && progress === 0) return null

  return (
    <div
      aria-hidden='true'
      className='pointer-events-none fixed top-0 right-0 left-0 z-[999999]'
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 250ms ease-in-out'
      }}
    >
      <div
        className='h-full'
        style={{
          width: `${progress}%`,
          height: `${height}px`,
          background: `linear-gradient(to right, ${color}, #f59e0b, #fbbf24)`,
          boxShadow: `0 0 10px ${color}, 0 0 5px #f59e0b`,
          transition: progress === 100 ? 'width 150ms ease-out' : 'width 300ms ease'
        }}
      >
        {/* Glow peg at leading edge */}
        <div
          className='absolute top-0 right-0 h-full w-24'
          style={{
            boxShadow: `0 0 12px ${color}, 0 0 6px #f59e0b`,
            opacity: 0.85,
            transform: 'rotate(3deg) translate(0px, -2px)'
          }}
        />
      </div>

      {showSpinner && (
        <div className='fixed top-3 right-3.5 z-[999999]'>
          <div
            className='size-4 animate-spin rounded-full border-2 border-[#f59e0b]/30'
            style={{ borderTopColor: color }}
          />
        </div>
      )}
    </div>
  )
}
