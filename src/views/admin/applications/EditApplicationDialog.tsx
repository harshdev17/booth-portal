'use client'

import { useState } from 'react'

import { Loader2Icon, PencilIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type EditableField = { key: string; label: string; value: string | null; multiline?: boolean }
export type EditableCategoryField = { fieldDefinitionId: number; label: string; value: string; inputType: string }

/**
 * Lets an authorized admin (application:edit) correct an applicant's
 * submitted form data directly from the admin panel — typos, a misheard
 * phone number, an address typed wrong — per explicit request (2026-11-03).
 * Deliberately a flat form of plain text fields (no re-validation against
 * the original apply-form's Zod schemas, e.g. PIN code format) — an admin
 * fixing a specific known mistake is trusted here the same way the existing
 * approve/reject actions already trust admin judgement; the one thing this
 * route does enforce server-side is the application:edit permission itself
 * and a full before/after audit log entry per field changed.
 */
const EditApplicationDialog = ({
  applicationId,
  fields,
  categoryFields
}: {
  applicationId: number
  fields: EditableField[]
  categoryFields: EditableCategoryField[]
}) => {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map(f => [f.key, f.value ?? '']))
  )
  const [categoryValues, setCategoryValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(categoryFields.map(f => [String(f.fieldDefinitionId), f.value]))
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetToCurrent = () => {
    setValues(Object.fromEntries(fields.map(f => [f.key, f.value ?? ''])))
    setCategoryValues(Object.fromEntries(categoryFields.map(f => [String(f.fieldDefinitionId), f.value])))
    setError(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: values, categoryFields: categoryValues })
      })

      const body = await response.json()

      if (!response.ok) {
        setError(body.error ?? 'Could not save changes.')

        return
      }

      setOpen(false)

      // A full reload is simplest and safest here — this page is an
      // uncached server component that re-queries fresh on every request
      // (see the existing comment on revalidatePath not being needed
      // elsewhere on this page), so a reload is guaranteed to show the
      // saved values rather than risking a stale client-side merge.
      window.location.reload()
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => {
          resetToCurrent()
          setOpen(true)
        }}
      >
        <PencilIcon className='size-3.5' />
        Edit Application Data
      </Button>

      <Dialog open={open} onOpenChange={next => !isSaving && setOpen(next)}>
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Edit Application Data</DialogTitle>
            <DialogDescription>
              Correct the applicant&apos;s submitted details. Every change is recorded in the audit trail with the
              previous and new value.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {fields.map(field => (
              <div key={field.key} className={field.multiline ? 'sm:col-span-2 flex flex-col gap-1.5' : 'flex flex-col gap-1.5'}>
                <Label htmlFor={`field-${field.key}`}>{field.label}</Label>
                {field.multiline ? (
                  <Textarea
                    id={`field-${field.key}`}
                    value={values[field.key] ?? ''}
                    onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    rows={3}
                  />
                ) : (
                  <Input
                    id={`field-${field.key}`}
                    value={values[field.key] ?? ''}
                    onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>

          {categoryFields.length > 0 && (
            <div className='mt-2 border-t pt-4'>
              <p className='mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                Category-Specific Fields
              </p>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {categoryFields.map(field => {
                  const key = String(field.fieldDefinitionId)
                  const multiline = field.inputType === 'textarea'

                  return (
                    <div key={key} className={multiline ? 'sm:col-span-2 flex flex-col gap-1.5' : 'flex flex-col gap-1.5'}>
                      <Label htmlFor={`category-field-${key}`}>{field.label}</Label>
                      {multiline ? (
                        <Textarea
                          id={`category-field-${key}`}
                          value={categoryValues[key] ?? ''}
                          onChange={e => setCategoryValues(prev => ({ ...prev, [key]: e.target.value }))}
                          rows={3}
                        />
                      ) : (
                        <Input
                          id={`category-field-${key}`}
                          value={categoryValues[key] ?? ''}
                          onChange={e => setCategoryValues(prev => ({ ...prev, [key]: e.target.value }))}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type='button' onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2Icon className='animate-spin' />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default EditApplicationDialog
