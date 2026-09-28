import { Controller, type Control } from 'react-hook-form'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/LanguageContext'
import type { ApplicationFormValues } from '@/views/public/apply/form-values'
import type { CategoryFieldDto, ShopOptionDto } from '@/views/public/apply/types'

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
                {lang === 'hi' ? 'दुकान / स्थान चयन (Shop Selection) *' : 'Shop Selection *'}
              </FieldLabel>
              <Select
                name='shopOptionId'
                value={field.value ? String(field.value) : ''}
                onValueChange={value => field.onChange(Number(value))}
              >
                <SelectTrigger id='shopOptionId' className='w-full' aria-invalid={fieldState.invalid}>
                  <SelectValue
                    placeholder={lang === 'hi' ? 'दुकान का विकल्प चुनें' : 'Select a shop option'}
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

      {fields.map(field => {
        const fieldDisplayName = lang === 'hi' && field.labelHi ? field.labelHi : field.label

        return (
          <Controller
            key={field.key}
            name={`categoryFields.${field.key}`}
            control={control}
            render={({ field: rhfField, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                className={field.inputType === 'textarea' ? 'md:col-span-2' : undefined}
              >
                <FieldLabel htmlFor={rhfField.name}>
                  {fieldDisplayName}
                  {field.required && ' *'}
                </FieldLabel>

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
                <Select
                  name={rhfField.name}
                  value={rhfField.value ?? ''}
                  onValueChange={rhfField.onChange}
                >
                  <SelectTrigger id={rhfField.name} className='w-full' aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder='Select an option' />
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
                  maxLength={field.maxLength ?? undefined}
                  aria-invalid={fieldState.invalid}
                />
              )}

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        )
      })}
    </div>
  )
}

export default CategoryFieldsStep
