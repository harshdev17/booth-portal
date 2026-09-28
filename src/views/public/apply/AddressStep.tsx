import { Controller, type Control } from 'react-hook-form'

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/LanguageContext'
import type { ApplicationFormValues } from '@/views/public/apply/form-values'

const AddressStep = ({ control }: { control: Control<ApplicationFormValues> }) => {
  const { lang } = useLanguage()

  return (
    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
      <Controller
        name='common.address'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className='md:col-span-2'>
            <FieldLabel htmlFor={field.name}>
              {lang === 'hi' ? 'पत्राचार का पता (Correspondence Address) *' : 'Correspondence Address *'}
            </FieldLabel>
            <Textarea
              {...field}
              id={field.name}
              placeholder={lang === 'hi' ? 'मकान/दुकान संख्या, गली, मोहल्ला, गांव या कस्बा' : 'House/shop number, street, locality or village'}
              className='min-h-24 resize-none'
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>
              {lang === 'hi' ? 'पूर्ण आवासीय अथवा व्यावसायिक पता' : 'House/shop number, street, locality or village'}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name='common.state'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>{lang === 'hi' ? 'राज्य (State) *' : 'State *'}</FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder={lang === 'hi' ? 'उदा. हरियाणा' : 'For example, Haryana'}
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>{lang === 'hi' ? 'जैसे, हरियाणा' : 'For example, Haryana'}</FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name='common.district'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>{lang === 'hi' ? 'ज़िला (District) *' : 'District *'}</FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder={lang === 'hi' ? 'उदा. कुरुक्षेत्र' : 'For example, Kurukshetra'}
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>{lang === 'hi' ? 'जैसे, कुरुक्षेत्र' : 'For example, Kurukshetra'}</FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name='common.pinCode'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>{lang === 'hi' ? 'पिन कोड (PIN Code) *' : 'PIN Code *'}</FieldLabel>
            <Input
              {...field}
              id={field.name}
              inputMode='numeric'
              maxLength={6}
              placeholder='136118'
              onChange={e => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>
              {lang === 'hi' ? '6 अंकों का पिन कोड (उदा. 136118)' : '6-digit PIN code, for example 136118'}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </div>
  )
}

export default AddressStep
