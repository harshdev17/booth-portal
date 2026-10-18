'use client'

import { useState } from 'react'

import { Loader2Icon, PrinterIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

type Kind = 'receipt' | 'summary' | 'allotment-letter'

/**
 * Admin-side Print buttons for the application summary, payment receipt, and official allotment letter.
 * Fetches the same templates as the PDF routes (api/admin/applications/[id]/
 * receipt|summary|allotment-letter/pdf?format=html, admin-authorized) and prints them from a
 * hidden iframe.
 */
const ApplicationPdfDownloads = ({
  applicationId,
  hasAllotment
}: {
  applicationId: string
  hasAllotment?: boolean
}) => {
  const [printing, setPrinting] = useState<Kind | null>(null)
  const [error, setError] = useState<string | null>(null)

  const print = async (kind: Kind) => {
    setError(null)
    setPrinting(kind)

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/${kind}/pdf?format=html`)

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))

        setError(
          body.error ??
            `Could not load the ${
              kind === 'receipt'
                ? 'receipt'
                : kind === 'allotment-letter'
                  ? 'allotment letter'
                  : 'application summary'
            } for printing.`
        )

        return
      }

      const html = await response.text()
      const frame = document.createElement('iframe')

      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
      frame.srcdoc = html

      frame.onload = () => {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()

        // Removed after the dialog has had time to take its snapshot.
        setTimeout(() => frame.remove(), 60_000)
      }

      document.body.appendChild(frame)
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setPrinting(null)
    }
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-wrap gap-2'>
        <Button type='button' variant='outline' size='sm' disabled={printing !== null} onClick={() => print('summary')}>
          {printing === 'summary' ? <Loader2Icon className='animate-spin' /> : <PrinterIcon />}
          Print Application
        </Button>
        <Button type='button' variant='outline' size='sm' disabled={printing !== null} onClick={() => print('receipt')}>
          {printing === 'receipt' ? <Loader2Icon className='animate-spin' /> : <PrinterIcon />}
          Print Receipt
        </Button>
        {hasAllotment && (
          <Button
            type='button'
            variant='default'
            size='sm'
            className='bg-[#0c2847] text-white hover:bg-[#0c2847]/90'
            disabled={printing !== null}
            onClick={() => print('allotment-letter')}
          >
            {printing === 'allotment-letter' ? <Loader2Icon className='animate-spin' /> : <PrinterIcon />}
            Print Allotment Letter
          </Button>
        )}
      </div>

      {error && (
        <Alert variant='destructive' className='w-fit'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default ApplicationPdfDownloads
