'use client'

import { useEffect, useState } from 'react'

// Third-party-hosted chat widget, embedded via iframe — not a KDB-controlled
// origin, kept in sync with the CSP frame-src allowlist in src/proxy.ts.
// [TBC – Business Confirmation Required]: this is the source given for
// testing; an officially approved chatbot provider should replace it before
// go-live.
const CHATBOT_SRC = 'https://vksinglakkr.github.io/IGM2025'

const MESSAGES = ['👋 Hi! Need help?', '💬 Ask me anything!', "🤝 I'm here to assist!", '✨ How can I help you?', '📋 Have questions?']

/**
 * Floating chat launcher, bottom-right (the Call/WhatsApp buttons occupy
 * bottom-left — see FloatingContactButtons.tsx). A rotating message bubble
 * and unread badge draw attention until the visitor opens it; both disappear
 * once opened for this page view.
 */
const FloatingChatbot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % MESSAGES.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const toggleChatbot = () => {
    setIsOpen(prev => !prev)
    setHasOpened(true)
  }

  return (
    <div className='fixed right-4 bottom-5 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6'>
      {isOpen && (
        <iframe
          src={CHATBOT_SRC}
          title='Chat with us'
          className='h-[70vh] max-h-[600px] w-[90vw] max-w-sm rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl'
        />
      )}

      {!isOpen && !hasOpened && (
        <button
          type='button'
          onClick={toggleChatbot}
          className='animate-in fade-in relative max-w-56 rounded-2xl rounded-br-sm bg-white px-4 py-2.5 text-left text-sm font-semibold text-[#0c2847] shadow-lg transition hover:scale-[1.03]'
        >
          {MESSAGES[messageIndex]}
        </button>
      )}

      <button
        type='button'
        onClick={toggleChatbot}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        className='group relative flex size-13 items-center justify-center rounded-full bg-[#d8891d] text-2xl shadow-lg transition hover:scale-105 active:scale-95'
      >
        {!isOpen && (
          <span className='absolute inset-0 -z-10 animate-ping rounded-full bg-[#d8891d] opacity-60 [animation-duration:2.2s]' />
        )}
        <span aria-hidden>{isOpen ? '✕' : '💬'}</span>
        {!isOpen && !hasOpened && (
          <span className='absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white'>
            1
          </span>
        )}
      </button>
    </div>
  )
}

export default FloatingChatbot
