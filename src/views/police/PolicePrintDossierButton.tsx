'use client'

import { PrinterIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PolicePrintDossierButton() {
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      onClick={() => window.print()}
      className='gap-1.5 border-slate-300 font-semibold text-slate-800 hover:bg-slate-100 shadow-2xs print:hidden'
    >
      <PrinterIcon className='size-3.5 text-blue-700' />
      Print Dossier
    </Button>
  )
}
