'use client'

import { useState } from 'react'

import { Loader2Icon, PrinterIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

type Kind = 'receipt' | 'summary'

/**
 * Admin-side Print buttons for the application summary and payment receipt.
 * Fetches the same templates as the PDF routes (api/admin/applications/[id]/
 * receipt|summary/pdf?format=html, admin-authorized) and prints them from a
 * hidden iframe — printing needs no server-side headless browser, which the
 * PDF download did (and which failed on the host). "Save as PDF" is still
 * available from the browser's print dialog.
 */
const ApplicationPdfDownloads = ({ applicationId }: { applicationId: string }) => {
  const [printing, setPrinting] = useState<Kind | null>(null)
  const [error, setError] = useState<string | null>(null)

  const print = async (kind: Kind) => {
    setError(null)
    setPrinting(kind)

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/${kind}/pdf?format=html`)

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))

        setError(body.error ?? `Could not load the ${kind === 'receipt' ? 'receipt' : 'application summary'} for printing.`)

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
