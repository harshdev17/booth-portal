'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { AlertTriangleIcon, Loader2Icon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

/**
 * Super-admin-only: cancels every overdue unpaid allotment in one category
 * and auto-promotes the same number of waitlisted candidates into the
 * freed stalls, under a new payment deadline the admin picks here. See
 * src/lib/allotment/cancel-and-promote.ts for the full mechanics.
 */
const CancelOverdueAndPromoteDialog = ({
  categoryId,
  categoryName,
  overdueCount
}: {
  categoryId: number
  categoryName: string
  overdueCount: number
}) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newDeadline, setNewDeadline] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ cancelled: number; promoted: number } | null>(null)

  const handleSubmit = async () => {
    if (!newDeadline) {
      setError('Please choose a new payment deadline.')

      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/categories/${categoryId}/cancel-overdue-and-promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDeadline: new Date(newDeadline).toISOString() })
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ cancelled: data.cancelled, promoted: data.promoted })
        router.refresh()
      } else {
        setError(data.error ?? 'Failed to process overdue allotments.')
      }
    } catch {
      setError('Could not connect to server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)

    if (!next) {
      setNewDeadline('')
      setError(null)
      setResult(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size='sm' variant='outline' className='text-xs font-bold rounded-lg text-red-700 border-red-200 hover:bg-red-50'>
            <AlertTriangleIcon className='size-3.5 mr-1.5' />
            Cancel Overdue & Set New Deadline
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Overdue Allotments — {categoryName}</DialogTitle>
          <DialogDescription>
            {overdueCount} allotment(s) in this category are past their payment deadline and still unpaid. This will
            cancel all of them, auto-promote the same number of waitlisted applicants into the freed booths/stalls,
            send each cancelled/promoted applicant a notification, and set a new payment deadline for this category.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <Alert className='border-emerald-300 bg-emerald-50 text-emerald-800'>
            <AlertDescription className='font-semibold'>
              {result.cancelled} allotment(s) cancelled, {result.promoted} waitlisted applicant(s) promoted.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Field>
              <FieldLabel htmlFor='new-deadline'>New Payment Deadline</FieldLabel>
              <Input
                id='new-deadline'
                type='datetime-local'
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
              />
            </Field>

            {error && (
              <Alert variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => handleOpenChange(false)}>Close</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} variant='destructive'>
              {isSubmitting && <Loader2Icon className='size-3.5 animate-spin mr-1.5' />}
              Confirm & Run
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CancelOverdueAndPromoteDialog
