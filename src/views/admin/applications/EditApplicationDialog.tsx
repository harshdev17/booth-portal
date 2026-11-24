'use client'

import { useState } from 'react'

import { AlertTriangleIcon, Loader2Icon, PencilIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export type EditableField = { key: string; label: string; value: string | null; multiline?: boolean }
export type EditableCategoryField = { fieldDefinitionId: number; label: string; value: string; inputType: string }
export type EditableCategoryOption = { id: number; name: string; slug: string }

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
  categoryFields,
  categories,
  currentCategoryId,
  canChangeCategory
}: {
  applicationId: string
  fields: EditableField[]
  categoryFields: EditableCategoryField[]
  categories: EditableCategoryOption[]
  currentCategoryId: number
  canChangeCategory: boolean
}) => {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map(f => [f.key, f.value ?? '']))
  )
  const [categoryValues, setCategoryValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(categoryFields.map(f => [String(f.fieldDefinitionId), f.value]))
  )
  const [selectedCategoryId, setSelectedCategoryId] = useState(currentCategoryId)

  // The category-specific fields currently shown — starts as this
  // application's own fields, replaced with the picked category's own
  // (blank) fields once the admin actually changes the dropdown.
  const [categoryFieldDefs, setCategoryFieldDefs] = useState(categoryFields)
  const [isLoadingCategoryFields, setIsLoadingCategoryFields] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetToCurrent = () => {
    setValues(Object.fromEntries(fields.map(f => [f.key, f.value ?? ''])))
    setCategoryValues(Object.fromEntries(categoryFields.map(f => [String(f.fieldDefinitionId), f.value])))
    setCategoryFieldDefs(categoryFields)
    setSelectedCategoryId(currentCategoryId)
    setError(null)
  }

  const handleCategoryChange = async (nextCategoryId: number) => {
    setSelectedCategoryId(nextCategoryId)
    setError(null)

    if (nextCategoryId === currentCategoryId) {
      // Switched back to the original category — show its real saved values
      // again, not blank ones.
      setCategoryFieldDefs(categoryFields)
      setCategoryValues(Object.fromEntries(categoryFields.map(f => [String(f.fieldDefinitionId), f.value])))

      return
    }

    setIsLoadingCategoryFields(true)

    try {
      const response = await fetch(`/api/admin/categories/${nextCategoryId}/fields`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Could not load the fields for that category.')

        return
      }

      const newDefs: EditableCategoryField[] = (
        data.fields as Array<{ fieldDefinitionId: number; label: string; inputType: string }>
      ).map(f => ({ ...f, value: '' }))

      setCategoryFieldDefs(newDefs)
      setCategoryValues(Object.fromEntries(newDefs.map(f => [String(f.fieldDefinitionId), ''])))
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setIsLoadingCategoryFields(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: values,
          categoryFields: categoryValues,
          ...(selectedCategoryId !== currentCategoryId ? { categoryId: selectedCategoryId } : {})
        })
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
              Correct the applicant&apos;s submitted details{canChangeCategory ? ', or move this application to a different category, ' : ' '}
              — every change is recorded in the audit trail with the previous and new value.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {canChangeCategory && (
            <div className='flex flex-col gap-1.5 border-b pb-4'>
              <Label htmlFor='edit-category'>Category</Label>
              <Select
                value={String(selectedCategoryId)}
                onValueChange={value => value && handleCategoryChange(Number(value))}
              >
                <SelectTrigger id='edit-category' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCategoryId !== currentCategoryId && (
                <p className='mt-1 flex items-start gap-1.5 text-xs font-medium text-amber-700'>
                  <AlertTriangleIcon className='mt-0.5 size-3.5 shrink-0' />
                  Changing category clears the fields below for the new category — fill them in before saving. The
                  applicant&apos;s old category-specific answers are kept but will no longer be shown here.
                </p>
              )}
            </div>
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

          {isLoadingCategoryFields && (
            <div className='mt-2 flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground'>
              <Loader2Icon className='size-4 animate-spin' />
              Loading fields for the new category...
            </div>
          )}

          {!isLoadingCategoryFields && categoryFieldDefs.length > 0 && (
            <div className='mt-2 border-t pt-4'>
              <p className='mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                Category-Specific Fields
              </p>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {categoryFieldDefs.map(field => {
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
            <Button type='button' onClick={handleSave} disabled={isSaving || isLoadingCategoryFields}>
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
