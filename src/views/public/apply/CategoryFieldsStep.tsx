import { Fragment } from 'react'

import { Controller, type Control } from 'react-hook-form'

import { AlertTriangleIcon } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/LanguageContext'
import type { ApplicationFormValues } from '@/views/public/apply/form-values'
import type { CategoryFieldDto, ShopOptionDto } from '@/views/public/apply/types'

/**
 * Multiselect values are stored as a single comma-joined string (the EAV
 * value column is a flat VARCHAR — see categoryFieldValueSchema), not an
 * array, so the checkbox group reads/writes that string directly rather than
 * needing a different field shape in the form state.
 */
// Count / years style answers were seeded as plain 'text'; render them as number
// inputs (keyed on the field key, like the date inputs below) so mobile keyboards
// show digits and letters can't be typed.
const NUMERIC_FIELD_KEY = /^(years_|award_year$|.*_count$|approximate_staff$|products_count$)/

function parseMultiselectValue(value: string | null | undefined): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

function toggleMultiselectValue(value: string | null | undefined, option: string, checked: boolean): string {
  const current = new Set(parseMultiselectValue(value))

  if (checked) current.add(option)
  else current.delete(option)

  return Array.from(current).join(',')
}

/**
 * Renders category-specific fields purely from the config fetched for the
 * selected category. Whatever is rendered/submitted here is independently
 * re-validated server-side against the same configuration at submit time.
 */
const CategoryFieldsStep = ({
  control,
  fields,
  shopOptions
}: {
  control: Control<ApplicationFormValues>
  fields: CategoryFieldDto[]
  shopOptions: ShopOptionDto[]
}) => {
  const { lang } = useLanguage()
  const hasShopOptions = shopOptions.length > 0

  if (fields.length === 0 && !hasShopOptions) {
    return (
      <p className='text-[var(--kdb-muted)]'>
        {lang === 'hi'
          ? 'इस श्रेणी के लिए कोई अतिरिक्त जानकारी आवश्यक नहीं है।'
          : 'No additional information is required for this category.'}
      </p>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
      {hasShopOptions && (
        <Controller
          name='shopOptionId'
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className='md:col-span-2'>
              <FieldLabel htmlFor='shopOptionId'>
                {lang === 'hi' ? 'बूथ/स्टॉल / स्थान चयन *' : 'Booth/Stall Selection *'}
              </FieldLabel>
              <Select
                name='shopOptionId'
                value={field.value ? String(field.value) : ''}
                onValueChange={value => field.onChange(Number(value))}
              >
                <SelectTrigger id='shopOptionId' className='w-full' aria-invalid={fieldState.invalid}>
                  <SelectValue
                    placeholder={lang === 'hi' ? 'बूथ/स्टॉल का विकल्प चुनें' : 'Select a booth/stall option'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {shopOptions.map(option => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.label}
                      {option.feePaise !== null ? ` — ₹${(option.feePaise / 100).toLocaleString('en-IN')}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      )}

      {fields.map((field, index) => {
        const fieldDisplayName = lang === 'hi' && field.labelHi ? field.labelHi : field.label
        const sectionTitle = lang === 'hi' ? (field.sectionHi ?? field.section) : field.section
        const startsSection = !!sectionTitle && (index === 0 || fields[index - 1].section !== field.section)

        return (
          <Fragment key={field.key}>
            {startsSection && (
              <h3 className='border-b border-[#e6dccb] pt-3 pb-2 text-lg font-extrabold text-[#0c2847] md:col-span-2'>
                {sectionTitle}
              </h3>
            )}
            <Controller
              name={`categoryFields.${field.key}`}
              control={control}
              render={({ field: rhfField, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className={
                    field.inputType === 'textarea' || field.inputType === 'multiselect' ? 'md:col-span-2' : undefined
                  }
                >
                  <FieldLabel htmlFor={rhfField.name}>
                    {fieldDisplayName}
                    {field.required && ' *'}
                  </FieldLabel>

                  {field.inputType === 'multiselect' && (
                    <div className='flex flex-wrap gap-x-5 gap-y-2'>
                      {(field.options ?? []).map(option => {
                        const selected = parseMultiselectValue(rhfField.value).includes(option.value)

                        return (
                          <label key={option.value} className='flex items-center gap-2 text-sm text-[#334155]'>
                            <Checkbox
                              checked={selected}
                              onCheckedChange={checked =>
                                rhfField.onChange(
                                  toggleMultiselectValue(rhfField.value, option.value, checked === true)
                                )
                              }
                            />
                            <span>{option.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {field.inputType === 'textarea' && (
                    <Textarea
                      {...rhfField}
                      value={rhfField.value ?? ''}
                      id={rhfField.name}
                      className='min-h-20 resize-none'
                      maxLength={field.maxLength ?? undefined}
                      aria-invalid={fieldState.invalid}
                    />
                  )}

                  {(field.inputType === 'select' || field.inputType === 'radio') && (
                    <Select name={rhfField.name} value={rhfField.value ?? ''} onValueChange={rhfField.onChange}>
                      <SelectTrigger id={rhfField.name} className='w-full' aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder={lang === 'hi' ? 'विकल्प चुनें' : 'Select an option'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.options ?? []).map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {field.inputType === 'text' && (
                    <Input
                      {...rhfField}
                      value={rhfField.value ?? ''}
                      id={rhfField.name}

                      // Date-like fields (registration_date, fssai_validity_date,
                      // artisan_card_validity, etc.) were seeded as plain 'text'
                      // since category_field_definitions has no dedicated 'date'
                      // input_type — rendering them as a native date input gives
                      // a real calendar picker (reported live: a free-text date
                      // field is error-prone) without a DB migration, since every
                      // modern browser renders type='date' with a built-in picker.
                      type={
                        /date|validity/i.test(field.key)
                          ? 'date'
                          : NUMERIC_FIELD_KEY.test(field.key)
                            ? 'number'
                            : 'text'
                      }
                      min={NUMERIC_FIELD_KEY.test(field.key) ? 0 : undefined}
                      inputMode={NUMERIC_FIELD_KEY.test(field.key) ? 'numeric' : undefined}
                      maxLength={field.maxLength ?? undefined}
                      aria-invalid={fieldState.invalid}
                    />
                  )}

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}

                  {field.warnOnValue && rhfField.value === field.warnOnValue.value && (
                    <div className='flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800'>
                      <AlertTriangleIcon className='mt-0.5 size-3.5 shrink-0' />
                      <span>{lang === 'hi' ? field.warnOnValue.messageHi : field.warnOnValue.messageEn}</span>
                    </div>
                  )}
                </Field>
              )}
            />
          </Fragment>
        )
      })}

      <Controller
        name='common.remarks'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className='md:col-span-2'>
            <FieldLabel htmlFor={field.name}>
              {lang === 'hi' ? 'अन्य विवरण / टिप्पणी (वैकल्पिक)' : 'Other Remarks (Optional)'}
            </FieldLabel>
            <Input {...field} value={field.value ?? ''} id={field.name} aria-invalid={fieldState.invalid} />
            <FieldDescription>
              {lang === 'hi' ? 'यदि कोई अन्य विवरण देना चाहें' : 'Anything else you would like to mention'}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </div>
  )
}

export default CategoryFieldsStep
