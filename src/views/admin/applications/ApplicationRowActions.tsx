'use client'

import { useRef } from 'react'

import Link from 'next/link'

import { CheckIcon, ChevronDownIcon, EyeIcon, HelpCircleIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { RejectButton } from '@/views/admin/applications/ApplicationDecisionActions'
import ApproveApplicationDialog, { type DialogHandle } from '@/views/admin/applications/ApproveApplicationDialog'
import { RaiseListQueryButton, type DocumentOption } from '@/views/admin/documents/DocumentDecisionActions'

type Props = {
  applicationId: string

  /** Raw numeric id — RaiseListQueryButton's server action takes this, not the opaque id used in links. */
  rawApplicationId: number
  canApprove: boolean
  canReject: boolean
  canRaiseQuery: boolean
  documents: DocumentOption[]
}

/**
 * Single "Actions" menu for an Applications-list row: View, Approve, Reject,
 * Raise Query. Approve/Reject/Raise Query stay visible but disabled when the
 * application's current status (or the admin's permissions) doesn't allow
 * them, so the menu shape is the same on every row. The dialogs are mounted
 * OUTSIDE the menu and opened through refs — menu content unmounts on
 * close, which would take an in-menu dialog down with it. The server
 * routes independently re-check status, permission and document
 * verification; this is UI only.
 */
const ApplicationRowActions = ({ applicationId, rawApplicationId, canApprove, canReject, canRaiseQuery, documents }: Props) => {
  const approveRef = useRef<DialogHandle>(null)
  const rejectRef = useRef<DialogHandle>(null)
  const queryRef = useRef<DialogHandle>(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type='button' variant='outline' size='sm' className='whitespace-nowrap' />}>
          Actions
          <ChevronDownIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-40'>
          <DropdownMenuItem render={<Link href={`/admin/applications/${applicationId}`} />}>
            <EyeIcon />
            View
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!canApprove} onClick={() => approveRef.current?.open()}>
            <CheckIcon />
            Approve
          </DropdownMenuItem>
          <DropdownMenuItem variant='destructive' disabled={!canReject} onClick={() => rejectRef.current?.open()}>
            <XIcon />
            Reject
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canRaiseQuery} onClick={() => queryRef.current?.open()}>
            <HelpCircleIcon />
            Raise Query
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canApprove && <ApproveApplicationDialog applicationId={applicationId} hideTrigger ref={approveRef} />}
      {canReject && <RejectButton applicationId={applicationId} hideTrigger ref={rejectRef} />}
      {canRaiseQuery && (
        <RaiseListQueryButton rawApplicationId={rawApplicationId} documents={documents} hideTrigger ref={queryRef} />
      )}
    </>
  )
}

export default ApplicationRowActions
