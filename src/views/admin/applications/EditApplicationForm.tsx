'use client'

import { useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { AlertTriangleIcon, ArrowLeftIcon, Loader2Icon, SaveIcon } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import AddressStep from '@/views/public/apply/AddressStep'
import ApplicantInfoStep from '@/views/public/apply/ApplicantInfoStep'
import CategoryFieldsStep from '@/views/public/apply/CategoryFieldsStep'
import { APPLICATION_FORM_DEFAULT_VALUES, type ApplicationFormValues } from '@/views/public/apply/form-values'
import type { CategoryFieldDto } from '@/views/public/apply/types'

export type EditCategoryFieldItem = {
  fieldDefinitionId: number
  key: string
  label: string
  labelHi: string | null
  section: string | null
  sectionHi: string | null
  inputType: CategoryFieldDto['inputType']
  required: boolean
  maxLength: number | null
  options?: Array<{ value: string; label: string }>
  value: string
}

export type EditCategoryOption = { id: number; name: string }

type CommonFields = {
  email: string
  organisationName: string
  representativeName: string
  fatherName: string
  policeStationName: string
  policeStationAddress: string
  address: string
  state: string
  district: string
  pinCode: string
  mobileNumber: string
  alternateMobile: string
  workPurpose: string
  achievementExperience: string
  remarks: string
}

type Props = {
  applicationId: string
  applicationNumber: string
  currentCategoryId: number
  currentStatus: string

  /**
   * True when this application has already moved past review (payment
   * seeded, stall allotted, etc.) — category change is still allowed (per
   * explicit request, 2026-11-25) but shows a warning, since the OLD
   * category's fee/stall/payment records don't get automatically
   * reconciled by the swap.
   */
  categoryChangeIsRisky: boolean
  categories: EditCategoryOption[]
  categoryFields: EditCategoryFieldItem[]
  common: CommonFields
  backHref: string
}

// No duplicate-check here — unlike the applicant's own live /check-availability
// (which guards against a NEW application colliding with ANY existing one),
// an admin editing an already-submitted application is expected to see its
// own existing mobile/email/Aadhaar unchanged; a false "already in use"
// warning against itself would be confusing, not useful.
const noopCheckAvailability = async () => undefined

/**
 * Admin's "Edit Application Data" page — deliberately laid out and labelled
 * exactly like the applicant's own multi-step apply form (Personal Details,
 * Address, Category Details sections, same field components/hints/styling),
 * per explicit request (2026-11-25): "jesa user ke liye layout hai vaise hi
 * rakho same". Unlike the applicant's form, there is no reCAPTCHA, payment,
 * or document upload here — documents are managed from the application
 * detail page's own Documents/Verification tab, and this is purely a data
 * correction tool (typos, a misheard phone number) for an application that
 * already exists.
 *
 * Replaces the old EditApplicationDialog popup (flat fields in a modal,
 * removed) — submits to the SAME existing /api/admin/applications/[id]/edit
 * route, unchanged.
 */
const EditApplicationForm = ({
  applicationId,
  applicationNumber,
  currentCategoryId,
  currentStatus,
  categoryChangeIsRisky,
  categories,
  categoryFields: initialCategoryFields,
  common,
  backHref
}: Props) => {
  const router = useRouter()

  const [selectedCategoryId, setSelectedCategoryId] = useState(currentCategoryId)
  const [categoryFieldDefs, setCategoryFieldDefs] = useState(initialCategoryFields)
  const [isLoadingCategoryFields, setIsLoadingCategoryFields] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Admin-only flat fields not part of the applicant's shared form schema
  // (organisation_name, work_purpose, achievement_experience) — edited
  // alongside the reused step components rather than inside them, since
  // ApplicantInfoStep/AddressStep only know the applicant's own field set.
  const [organisationName, setOrganisationName] = useState(common.organisationName)
  const [workPurpose, setWorkPurpose] = useState(common.workPurpose)
  const [achievementExperience, setAchievementExperience] = useState(common.achievementExperience)

  const form = useForm<ApplicationFormValues>({
    defaultValues: {
      ...APPLICATION_FORM_DEFAULT_VALUES,
      common: {
        email: common.email,
        representativeName: common.representativeName,
        fatherName: common.fatherName,
        policeStationName: common.policeStationName,
        policeStationAddress: common.policeStationAddress,
        aadhaarNumber: '',
        address: common.address,
        state: common.state,
        district: common.district,
        pinCode: common.pinCode,
        mobileNumber: common.mobileNumber,
        alternateMobile: common.alternateMobile,
        remarks: common.remarks
      },
      categoryFields: Object.fromEntries(initialCategoryFields.map(f => [f.key, f.value]))
    }
  })

  const categoryFieldDtos: CategoryFieldDto[] = categoryFieldDefs.map(f => ({
    key: f.key,
    label: f.label,
    labelHi: f.labelHi,
    section: f.section,
    sectionHi: f.sectionHi,
    inputType: f.inputType,
    required: f.required,
    maxLength: f.maxLength,
    options: f.options
  }))

  const handleCategoryChange = async (nextCategoryId: number) => {
    setSelectedCategoryId(nextCategoryId)
    setError(null)

    if (nextCategoryId === currentCategoryId) {
      setCategoryFieldDefs(initialCategoryFields)
      form.setValue('categoryFields', Object.fromEntries(initialCategoryFields.map(f => [f.key, f.value])))

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

      // This admin-categories/[id]/fields route returns the lean shape
      // (fieldDefinitionId/label/inputType) — fine here since a freshly
      // switched category always starts blank (no key-based lookups needed
      // against a key this route doesn't return).
      const newDefs: EditCategoryFieldItem[] = (
        data.fields as Array<{ fieldDefinitionId: number; label: string; inputType: string }>
      ).map((f, index) => ({
        fieldDefinitionId: f.fieldDefinitionId,
        key: `new_category_field_${index}`,
        label: f.label,
        labelHi: null,
        section: null,
        sectionHi: null,
        inputType: f.inputType as CategoryFieldDto['inputType'],
        required: false,
        maxLength: null,
        value: ''
      }))

      setCategoryFieldDefs(newDefs)
      form.setValue('categoryFields', Object.fromEntries(newDefs.map(f => [f.key, ''])))
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setIsLoadingCategoryFields(false)
    }
  }

  const handleSave = form.handleSubmit(async values => {
    setIsSaving(true)
    setError(null)

    try {
      const categoryFieldsPayload = Object.fromEntries(
        categoryFieldDefs.map(f => [String(f.fieldDefinitionId), values.categoryFields?.[f.key] ?? ''])
      )

      const response = await fetch(`/api/admin/applications/${applicationId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            email: values.common.email,
            organisation_name: organisationName,
            representative_name: values.common.representativeName,
            father_name: values.common.fatherName,
            police_station_name: values.common.policeStationName,
            police_station_address: values.common.policeStationAddress,
            address: values.common.address,
            state: values.common.state,
            district: values.common.district,
            pin_code: values.common.pinCode,
            mobile_number: values.common.mobileNumber,
            alternate_mobile: values.common.alternateMobile || null,
            work_purpose: workPurpose,
            achievement_experience: achievementExperience,
            remarks: values.common.remarks || null
          },
          categoryFields: categoryFieldsPayload,
          ...(selectedCategoryId !== currentCategoryId ? { categoryId: selectedCategoryId } : {})
        })
      })

      const body = await response.json()

      if (!response.ok) {
        setError(body.error ?? 'Could not save changes.')

        return
      }

      router.push(backHref)
      router.refresh()
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setIsSaving(false)
    }
  })

  return (
    <div className='mx-auto max-w-4xl px-4 py-8 sm:px-6'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <Link
            href={backHref}
            className='mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0c2847] hover:underline'
          >
            <ArrowLeftIcon className='size-3.5' />
            Back to Application
          </Link>
          <h1 className='text-2xl sm:text-3xl font-black text-[#0c2847]'>Edit Application Data</h1>
          <p className='text-sm text-[#64748b] mt-1'>
            {applicationNumber} — correct the applicant&apos;s submitted details. Every change is recorded in the
            audit trail with the previous and new value.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant='destructive' className='mb-6'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSave} className='flex flex-col gap-8'>
        <section className='relative pl-12 sm:pl-16'>
          <div className='absolute left-4 sm:left-5 top-10 -bottom-8 w-0.5 bg-[#e2e8f0]' />
          <div className='absolute left-0 top-0 flex size-8 sm:size-10 items-center justify-center rounded-full bg-[#fdfbf7] border-2 border-[#e6cca4] shadow-xs text-sm sm:text-base font-sans font-bold leading-none text-[#8c5711] z-10 select-none'>
            1
          </div>

          <div className='rounded-2xl border border-[#eeddb8] bg-[#fcf6e8] p-7 sm:p-9 shadow-xs'>
            <div className='mb-5 border-b border-[#f0e4c4] pb-4'>
              <h2 className='text-xl sm:text-2xl font-black text-[#0c2847]'>Category</h2>
              <p className='text-sm text-[#64748b] mt-1'>Move this application to a different category, if needed.</p>
            </div>

            {categoryChangeIsRisky && (
              <p className='mb-4 flex items-start gap-1.5 text-xs font-medium text-red-700'>
                <AlertTriangleIcon className='mt-0.5 size-3.5 shrink-0' />
                This application is already &ldquo;{currentStatus}&rdquo; — it may have a fee, payment, or stall
                tied to its current category. Changing category here does NOT automatically update or reverse
                those; please check the Payments/Allotment tabs and fix them manually if needed.
              </p>
            )}

            <Field className='max-w-sm'>
              <FieldLabel htmlFor='edit-category'>Category</FieldLabel>
              <Select
                value={String(selectedCategoryId)}
                onValueChange={value => value && handleCategoryChange(Number(value))}
              >
                <SelectTrigger id='edit-category' className='w-full'>
                  <SelectValue>{categories.find(c => c.id === selectedCategoryId)?.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {selectedCategoryId !== currentCategoryId && (
              <p className='mt-3 flex items-start gap-1.5 text-xs font-medium text-amber-700'>
                <AlertTriangleIcon className='mt-0.5 size-3.5 shrink-0' />
                Changing category clears the Category Details section below for the new category — fill it in
                before saving. The applicant&apos;s old category-specific answers are kept but will no longer be
                shown here.
              </p>
            )}
          </div>
        </section>

        <section className='relative pl-12 sm:pl-16'>
          <div className='absolute left-4 sm:left-5 top-10 -bottom-8 w-0.5 bg-[#e2e8f0]' />
          <div className='absolute left-0 top-0 flex size-8 sm:size-10 items-center justify-center rounded-full bg-[#fdfbf7] border-2 border-[#e6cca4] shadow-xs text-sm sm:text-base font-sans font-bold leading-none text-[#8c5711] z-10 select-none'>
            2
          </div>

          <div className='rounded-2xl border border-[#e2e8f0] bg-white p-7 sm:p-9 shadow-xs'>
            <div className='mb-5 border-b border-[#f1f5f9] pb-4'>
              <h2 className='text-xl sm:text-2xl font-black text-[#0c2847]'>Personal Details</h2>
              <p className='text-xs sm:text-sm text-[#64748b] mt-1'>
                Name, father&apos;s name, contact details, as on the applicant&apos;s ID.
              </p>
            </div>

            <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
              <Field>
                <FieldLabel htmlFor='organisation-name'>Organisation / Firm Name</FieldLabel>
                <Input
                  id='organisation-name'
                  value={organisationName}
                  onChange={e => setOrganisationName(e.target.value)}
                />
              </Field>
            </div>

            <div className='mt-5'>
              <ApplicantInfoStep control={form.control} duplicateFields={{}} checkAvailability={noopCheckAvailability} />
            </div>
          </div>
        </section>

        <section className='relative pl-12 sm:pl-16'>
          <div className='absolute left-4 sm:left-5 top-10 -bottom-8 w-0.5 bg-[#e2e8f0]' />
          <div className='absolute left-0 top-0 flex size-8 sm:size-10 items-center justify-center rounded-full bg-[#fdfbf7] border-2 border-[#e6cca4] shadow-xs text-sm sm:text-base font-sans font-bold leading-none text-[#8c5711] z-10 select-none'>
            3
          </div>

          <div className='rounded-2xl border border-[#e2e8f0] bg-white p-7 sm:p-9 shadow-xs'>
            <div className='mb-5 border-b border-[#f1f5f9] pb-4'>
              <h2 className='text-xl sm:text-2xl font-black text-[#0c2847]'>Address</h2>
              <p className='text-xs sm:text-sm text-[#64748b] mt-1'>Current correspondence and verification address.</p>
            </div>
            <AddressStep control={form.control} />
          </div>
        </section>

        {(categoryFieldDtos.length > 0 || workPurpose || achievementExperience) && (
          <section className='relative pl-12 sm:pl-16'>
            <div className='absolute left-4 sm:left-5 top-10 -bottom-8 w-0.5 bg-[#e2e8f0]' />
            <div className='absolute left-0 top-0 flex size-8 sm:size-10 items-center justify-center rounded-full bg-[#fdfbf7] border-2 border-[#e6cca4] shadow-xs text-sm sm:text-base font-sans font-bold leading-none text-[#8c5711] z-10 select-none'>
              4
            </div>

            <div className='rounded-2xl border border-[#e2e8f0] bg-white p-7 sm:p-9 shadow-xs'>
              <div className='mb-5 border-b border-[#f1f5f9] pb-4'>
                <h2 className='text-xl sm:text-2xl font-black text-[#0c2847]'>Category Details</h2>
                <p className='text-xs sm:text-sm text-[#64748b] mt-1'>
                  Additional information specific to this application&apos;s category.
                </p>
              </div>

              {isLoadingCategoryFields ? (
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <Loader2Icon className='size-4 animate-spin' />
                  Loading fields for the new category...
                </div>
              ) : (
                <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                  <WorkPurposeAndExperience
                    workPurpose={workPurpose}
                    setWorkPurpose={setWorkPurpose}
                    achievementExperience={achievementExperience}
                    setAchievementExperience={setAchievementExperience}
                  />
                </div>
              )}

              {!isLoadingCategoryFields && categoryFieldDtos.length > 0 && (
                <div className='mt-5'>
                  <CategoryFieldsStep
                    control={form.control}
                    fields={categoryFieldDtos}
                    shopOptions={[]}
                    showRemarks={false}
                    notice={null}
                  />
                </div>
              )}
            </div>
          </section>
        )}

        <section className='relative pl-12 sm:pl-16'>
          <div className='absolute left-0 top-0 flex size-8 sm:size-10 items-center justify-center rounded-full bg-[#fdfbf7] border-2 border-[#e6cca4] shadow-xs text-sm sm:text-base font-sans font-bold leading-none text-[#8c5711] z-10 select-none'>
            5
          </div>

          <div className='rounded-2xl border border-[#e2e8f0] bg-white p-7 sm:p-9 shadow-xs'>
            <div className='mb-5 border-b border-[#f1f5f9] pb-4'>
              <h2 className='text-xl sm:text-2xl font-black text-[#0c2847]'>Remarks</h2>
            </div>
            <Controller
              name='common.remarks'
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Other Remarks</FieldLabel>
                  <Textarea {...field} value={field.value ?? ''} id={field.name} className='min-h-20 resize-none' />
                  <FieldDescription>Anything else worth noting about this application.</FieldDescription>
                </Field>
              )}
            />
          </div>
        </section>

        <div className='flex items-center justify-end gap-3 pl-12 sm:pl-16'>
          <Link
            href={backHref}
            className='inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground'
          >
            Cancel
          </Link>
          <Button type='submit' disabled={isSaving || isLoadingCategoryFields} className='gap-1.5'>
            {isSaving ? <Loader2Icon className='size-4 animate-spin' /> : <SaveIcon className='size-4' />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}

const WorkPurposeAndExperience = ({
  workPurpose,
  setWorkPurpose,
  achievementExperience,
  setAchievementExperience
}: {
  workPurpose: string
  setWorkPurpose: (value: string) => void
  achievementExperience: string
  setAchievementExperience: (value: string) => void
}) => (
  <>
    <Field className='md:col-span-2'>
      <FieldLabel htmlFor='work-purpose'>Work Purpose</FieldLabel>
      <Textarea
        id='work-purpose'
        value={workPurpose}
        onChange={e => setWorkPurpose(e.target.value)}
        className='min-h-20 resize-none'
      />
    </Field>
    <Field className='md:col-span-2'>
      <FieldLabel htmlFor='achievement-experience'>Achievement / Experience</FieldLabel>
      <Textarea
        id='achievement-experience'
        value={achievementExperience}
        onChange={e => setAchievementExperience(e.target.value)}
        className='min-h-20 resize-none'
      />
    </Field>
  </>
)

export default EditApplicationForm
