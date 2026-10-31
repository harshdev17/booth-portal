'use client'

import { useState } from 'react'
import {
  ChevronDownIcon,
  CreditCardIcon,
  DownloadIcon,
  FileTextIcon,
  Loader2Icon,
  PrinterIcon,
  ReceiptIcon,
  StoreIcon
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

type Kind = 'receipt' | 'summary' | 'allotment-letter'

type Props = {
  applicationId: string
  hasRegistrationReceipt?: boolean
  hasAllotment?: boolean
  hasAllotmentReceipt?: boolean
  hasReceipt?: boolean // backward compatibility
}

/**
 * Admin-side Downloads dropdown positioned at the top-right of the application header.
 * Consolidates all official downloadable documents:
 * - Application Form Summary (Print & PDF)
 * - Registration Payment Receipt (Print & PDF)
 * - Official Stall Allotment Letter (Print & PDF)
 * - Allotment Fee Payment Receipt (Print & PDF)
 */
const ApplicationPdfDownloads = ({
  applicationId,
  hasRegistrationReceipt,
  hasAllotment,
  hasAllotmentReceipt,
  hasReceipt
}: Props) => {
  const [printing, setPrinting] = useState<Kind | null>(null)
  const [error, setError] = useState<string | null>(null)

  const showRegReceipt = hasRegistrationReceipt ?? hasReceipt ?? false

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
                  : 'application form'
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
    <div className='relative inline-flex flex-col items-end gap-1'>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={printing !== null}
              className='gap-1.5 border-slate-300 font-semibold text-[#0c2847] hover:bg-slate-50 shadow-2xs'
            >
              {printing !== null ? (
                <Loader2Icon className='size-3.5 animate-spin' />
              ) : (
                <DownloadIcon className='size-3.5 text-[#8c5711]' />
              )}
              Downloads
              <ChevronDownIcon className='size-3.5 text-muted-foreground' />
            </Button>
          }
        />
        <DropdownMenuContent align='end' className='w-72 p-1.5 shadow-md border-slate-200'>
          <div className='px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-slate-100'>
            Available Documents &amp; Receipts
          </div>

          {/* 1. Application Form */}
          <div className='flex items-center justify-between rounded-sm px-2 py-2 text-xs hover:bg-slate-50 transition'>
            <button
              type='button'
              onClick={() => print('summary')}
              className='flex items-center gap-2 text-left flex-1 hover:text-[#0c2847]'
            >
              <FileTextIcon className='size-4 text-[#0c2847] shrink-0' />
              <div>
                <span className='font-semibold text-slate-900 block'>Application Form</span>
                <span className='text-[10px] text-muted-foreground block'>Submitted particulars</span>
              </div>
            </button>
            <div className='flex items-center gap-1 shrink-0'>
              <button
                type='button'
                onClick={() => print('summary')}
                className='rounded p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition'
                title='Print Form'
              >
                <PrinterIcon className='size-3.5' />
              </button>
              <a
                href={`/api/admin/applications/${applicationId}/summary/pdf`}
                target='_blank'
                rel='noopener noreferrer'
                className='rounded p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition'
                title='Download PDF'
              >
                <DownloadIcon className='size-3.5' />
              </a>
            </div>
          </div>



          {/* 3. Official Allotment Letter */}
          {hasAllotment && (
            <div className='flex items-center justify-between rounded-sm px-2 py-2 text-xs hover:bg-slate-50 transition border-t border-slate-100'>
              <button
                type='button'
                onClick={() => print('allotment-letter')}
                className='flex items-center gap-2 text-left flex-1 hover:text-[#0c2847]'
              >
                <StoreIcon className='size-4 text-blue-700 shrink-0' />
                <div>
                  <span className='font-semibold text-slate-900 block'>Allotment Letter</span>
                  <span className='text-[10px] text-muted-foreground block'>Official order &amp; QR verification</span>
                </div>
              </button>
              <div className='flex items-center gap-1 shrink-0'>
                <button
                  type='button'
                  onClick={() => print('allotment-letter')}
                  className='rounded p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition'
                  title='Print Allotment Letter'
                >
                  <PrinterIcon className='size-3.5' />
                </button>
                <a
                  href={`/api/admin/applications/${applicationId}/allotment-letter/pdf`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='rounded p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition'
                  title='Download PDF'
                >
                  <DownloadIcon className='size-3.5' />
                </a>
              </div>
            </div>
          )}

          {/* 4. Allotment Payment Receipt */}
          {hasAllotmentReceipt && (
            <div className='flex items-center justify-between rounded-sm px-2 py-2 text-xs hover:bg-slate-50 transition border-t border-slate-100'>
              <button
                type='button'
                onClick={() => print('receipt')}
                className='flex items-center gap-2 text-left flex-1 hover:text-[#0c2847]'
              >
                <CreditCardIcon className='size-4 text-amber-700 shrink-0' />
                <div>
                  <span className='font-semibold text-slate-900 block'>Allotment Fee Receipt</span>
                  <span className='text-[10px] text-muted-foreground block'>Booth allotment payment voucher</span>
                </div>
              </button>
              <div className='flex items-center gap-1 shrink-0'>
                <button
                  type='button'
                  onClick={() => print('receipt')}
                  className='rounded p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition'
                  title='Print Allotment Receipt'
                >
                  <PrinterIcon className='size-3.5' />
                </button>
                <a
                  href={`/api/admin/applications/${applicationId}/receipt/pdf`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='rounded p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition'
                  title='Download PDF'
                >
                  <DownloadIcon className='size-3.5' />
                </a>
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <Alert variant='destructive' className='absolute right-0 top-10 z-50 w-72 shadow-lg'>
          <AlertDescription className='text-xs'>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default ApplicationPdfDownloads
