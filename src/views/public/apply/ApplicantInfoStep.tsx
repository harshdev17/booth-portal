import { Controller, type Control, type FieldErrors, type UseFormSetError, type UseFormClearErrors } from 'react-hook-form'

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { useLanguage } from '@/context/LanguageContext'
import type { ApplicationFormValues } from '@/views/public/apply/form-values'
import { useAvailabilityCheck } from '@/views/public/apply/useAvailabilityCheck'

/**
 * India-only mobile number input: a fixed "+91" prefix, not a full country
 * picker. The stored/submitted value remains the plain 10-digit number.
 */
const MobileNumberInput = ({
  id,
  name,
  value,
  onChange,
  onBlur,
  invalid,
  autoComplete
}: {
  id: string
  name: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  invalid: boolean
  autoComplete: string
}) => (
  <InputGroup>
    <InputGroupAddon align='inline-start'>
      <InputGroupText>+91</InputGroupText>
    </InputGroupAddon>
    <InputGroupInput
      id={id}
      // Chrome autofills based on the `name`/`id` TEXT CONTENT (e.g.
      // anything containing "mobile"/"phone"), not primarily on the
      // `autocomplete` attribute — it has deliberately ignored
      // autocomplete="off" on contact-like fields since ~2014. Giving the
      // Alternate Mobile field a name/id that doesn't look like a phone
      // field (see the 'contact-alt' call site below) is what actually
      // stops Chrome from offering the same saved phone number for both
      // fields (reported live: both fields filled with the identical
      // autofilled value despite autoComplete='off').
      name={name}
      type='tel'
      inputMode='numeric'
      autoComplete={autoComplete}
      maxLength={10}
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
      onBlur={onBlur}
      aria-invalid={invalid}
    />
  </InputGroup>
)

const ApplicantInfoStep = ({
  control,
  setError,
  clearErrors,
  applicationId
}: {
  control: Control<ApplicationFormValues>
  errors: FieldErrors<ApplicationFormValues>
  setError: UseFormSetError<ApplicationFormValues>
  clearErrors: UseFormClearErrors<ApplicationFormValues>
  applicationId?: number
}) => {
  const { lang } = useLanguage()
  const checkAvailability = useAvailabilityCheck(setError, clearErrors, lang, applicationId)

  return (
    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
      <Controller
        name='common.email'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {lang === 'hi' ? 'ईमेल पता (Email Address) *' : 'Email Address *'}
            </FieldLabel>
            <Input
              {...field}
              id={field.name}
              type='email'
              autoComplete='email'
              placeholder='example@domain.com'
              aria-invalid={fieldState.invalid}
              onBlur={e => {
                field.onBlur()
                void checkAvailability('email', e.target.value.trim(), 'common.email')
              }}
            />
            <FieldDescription>
              {lang === 'hi'
                ? 'हम आवेदन की महत्वपूर्ण सूचनाएं इस ईमेल पर भेजेंगे।'
                : 'We will use this to send you updates about your application.'}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name='common.mobileNumber'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {lang === 'hi' ? 'मोबाइल नंबर (Mobile Number) *' : 'Mobile Number *'}
            </FieldLabel>
            <MobileNumberInput
              id={field.name}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={() => {
                field.onBlur()
                void checkAvailability('mobileNumber', field.value, 'common.mobileNumber')
              }}
              invalid={fieldState.invalid}
              autoComplete='tel-national'
            />
            <FieldDescription>
              {lang === 'hi' ? '10 अंकों का मोबाइल नंबर (उदा. 9876543210)' : '10-digit number, for example 9876543210'}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name='common.alternateMobile'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {lang === 'hi' ? 'वैकल्पिक मोबाइल नंबर (Alternate Mobile)' : 'Alternate Mobile Number (Optional)'}
            </FieldLabel>
            <MobileNumberInput
              id={field.name}
              name='contact-alt'
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={fieldState.invalid}
              autoComplete='off'
            />
            <FieldDescription>
              {lang === 'hi'
                ? 'कोई दूसरा संपर्क नंबर, यदि उपलब्ध हो'
                : 'A second number we can reach you on, if needed'}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name='common.organisationName'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {lang === 'hi' ? 'फर्म / एनजीओ / संस्था का नाम *' : 'Name of Firm / NGO / Organisation *'}
            </FieldLabel>
            <Input
              {...field}
              id={field.name}
              autoComplete='off'
              placeholder={lang === 'hi' ? 'संस्था या व्यापारिक प्रतिष्ठान का नाम' : 'Enter registered name'}
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>
              {lang === 'hi'
                ? 'दस्तावेज में पंजीकृत नाम के अनुसार दर्ज करें'
                : 'Enter the registered name, exactly as on your documents'}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name='common.representativeName'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {lang === 'hi' ? 'मालिक / प्रोप्राइटर / प्रतिनिधि का नाम *' : 'Name of Owner / Proprietor / Representative *'}
            </FieldLabel>
            <Input
              {...field}
              id={field.name}
              autoComplete='name'
              placeholder={lang === 'hi' ? 'पूर्ण नाम (पहचान पत्र अनुसार)' : 'Full name, as on ID'}
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>
              {lang === 'hi' ? 'पहचान पत्र पर उल्लिखित पूरा नाम' : 'Full name, as it appears on your identity document'}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name='common.fatherName'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {lang === 'hi' ? "पिता का नाम (Father's Name) *" : "Father's Name *"}
            </FieldLabel>
            <Input
              {...field}
              id={field.name}
              autoComplete='off'
              placeholder={lang === 'hi' ? 'पिता का नाम' : "Father's name"}
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>
              {lang === 'hi' ? 'पहचान पत्र के अनुसार दर्ज करें' : 'As it appears on your identity document'}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name='common.aadhaarNumber'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {lang === 'hi' ? 'आधार संख्या (Aadhaar Number) *' : 'Aadhaar Number *'}
            </FieldLabel>
            <Input
              {...field}
              id={field.name}
              inputMode='numeric'
              maxLength={12}
              autoComplete='off'
              placeholder='123456789012'
              aria-invalid={fieldState.invalid}
              onBlur={e => {
                field.onBlur()
                void checkAvailability('aadhaarNumber', e.target.value.trim(), 'common.aadhaarNumber')
              }}
            />
            <FieldDescription>
              {lang === 'hi'
                ? '12 अंकों का आधार नंबर। यह सुरक्षित एन्क्रिप्टेड रहता है।'
                : '12-digit number, for example 123456789012. Stored securely, encrypted.'}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name='common.workPurpose'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className='md:col-span-2'>
            <FieldLabel htmlFor={field.name}>
              {lang === 'hi' ? 'कार्य का प्रकार / उद्देश्य (Type of Work / Purpose) *' : 'Type of Work / Purpose *'}
            </FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder={lang === 'hi' ? 'उदा. हस्तशिल्प बिक्री, पारंपरिक परिधान, खान-पान स्टॉल' : 'e.g. Handicraft sale or Food stall'}
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>
              {lang === 'hi'
                ? 'जो सामग्री आप बेचना या प्रदर्शित करना चाहते हैं'
                : 'What you intend to sell or display, for example "Handicraft sale" or "Food stall"'}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name='common.achievementExperience'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className='md:col-span-2'>
            <FieldLabel htmlFor={field.name}>
              {lang === 'hi' ? 'पुरस्कार / उपलब्धि / अनुभव *' : 'Award / Achievement / Experience *'}
            </FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder={lang === 'hi' ? 'उदा. राज्य/राष्ट्रीय पुरस्कार, 5 वर्षों का अनुभव' : 'e.g. State award or 5 years experience'}
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>
              {lang === 'hi'
                ? 'इस क्षेत्र में कोई प्राप्त पुरस्कार, मान्यता या अनुभव के वर्ष'
                : 'Any relevant award, recognition, or years of experience in this field'}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name='common.remarks'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className='md:col-span-2'>
            <FieldLabel htmlFor={field.name}>
              {lang === 'hi' ? 'अन्य विवरण / टिप्पणी (वैकल्पिक)' : 'Other Remarks (Optional)'}
            </FieldLabel>
            <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
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

export default ApplicantInfoStep
