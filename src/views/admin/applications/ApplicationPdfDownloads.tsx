'use client'

import { useState } from 'react'

import { Loader2Icon, ReceiptIcon, FileTextIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { downloadBlob } from '@/lib/browser/download-blob'

type Kind = 'receipt' | 'summary'

/**
 * Admin-side equivalent of the applicant's "Download PDF" buttons on the
 * Payment Receipt / Print Application pages — same renderer and templates
 * (src/lib/pdf), just pulled through the admin-authorized routes
 * (api/admin/applications/[id]/receipt|summary/pdf) instead of the
 * applicant's own access-token/OTP-gated ones, so an admin can hand someone
 * a copy without needing the applicant's own credentials.
 */
const ApplicationPdfDownloads = ({ applicationId, applicationNumber }: { applicationId: string; applicationNumber: string }) => {
  const [downloading, setDownloading] = useState<Kind | null>(null)
  const [error, setError] = useState<string | null>(null)

  const download = async (kind: Kind) => {
    setError(null)
    setDownloading(kind)

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/${kind === 'receipt' ? 'receipt' : 'summary'}/pdf`)

      if (!response.ok) {
        const body = await response.json()

        setError(body.error ?? `Could not download the ${kind === 'receipt' ? 'receipt' : 'application summary'}.`)

        return
      }

      const filePrefix = kind === 'receipt' ? 'Receipt' : 'Application'

      downloadBlob(await response.blob(), `${filePrefix}-${applicationNumber}.pdf`)
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-wrap gap-2'>
        <Button type='button' variant='outline' size='sm' disabled={downloading !== null} onClick={() => download('summary')}>
          {downloading === 'summary' ? <Loader2Icon className='animate-spin' /> : <FileTextIcon />}
          Download Application PDF
        </Button>
        <Button type='button' variant='outline' size='sm' disabled={downloading !== null} onClick={() => download('receipt')}>
          {downloading === 'receipt' ? <Loader2Icon className='animate-spin' /> : <ReceiptIcon />}
          Download Receipt PDF
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
