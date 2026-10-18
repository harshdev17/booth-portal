'use client'

import { useMemo } from 'react'

import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  return (
    <fieldset
      data-slot='field-set'
      className={cn(
        'flex flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
        className
      )}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = 'legend',
  ...props
}: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
  return (
    <legend
      data-slot='field-legend'
      data-variant={variant}
      className={cn('mb-3 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base', className)}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='field-group'
      className={cn(
        'group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4',
        className
      )}
      {...props}
    />
  )
}

const fieldVariants = cva('group/field data-[invalid=true]:text-destructive flex w-full gap-3', {
  variants: {
    orientation: {
      vertical: 'flex-col *:w-full [&>.sr-only]:w-auto',
      horizontal:
        'flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      responsive:
        'flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px'
    }
  },
  defaultVariants: {
    orientation: 'vertical'
  }
})

function Field({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role='group'
      data-slot='field'
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='field-content'
      className={cn('group/field-content flex flex-1 flex-col gap-1 leading-snug', className)}
      {...props}
    />
  )
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot='field-label'
      className={cn(
        'group/field-label peer/field-label has-data-checked:border-primary/30 has-data-checked:bg-primary/5 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10 flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border *:data-[slot=field]:p-3',
        'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
        className
      )}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='field-label'
      className={cn(
        'flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50',
        className
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot='field-description'
      className={cn(
        'text-muted-foreground text-left text-sm leading-normal font-normal group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5',
        'last:mt-0 nth-last-2:-mt-1',
        '[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
        className
      )}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot='field-separator'
      data-content={!!children}
      className={cn('relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2', className)}
      {...props}
    >
      <Separator className='absolute inset-0 top-1/2' />
      {children && (
        <span
          className='bg-background text-muted-foreground relative mx-auto block w-fit px-2'
          data-slot='field-separator-content'
        >
          {children}
        </span>
      )}
    </div>
  )
}

const HINDI_ERROR_TRANSLATIONS: Record<string, string> = {
  'Enter at least 2 letters.': 'कम से कम 2 अक्षर दर्ज करें।',
  'Too long (maximum 100 characters).': 'अत्यधिक लंबा (अधिकतम 100 अक्षर)।',
  'Use letters only — no numbers or symbols.': 'केवल अक्षरों का उपयोग करें — अंक या प्रतीक मान्य नहीं हैं।',
  'Email address is required.': 'ईमेल पता आवश्यक है।',
  'Enter a valid email address, for example name@example.com.': 'मान्य ईमेल पता दर्ज करें (उदा. name@example.com)।',
  'Aadhaar number must be exactly 12 digits': 'आधार संख्या ठीक 12 अंकों की होनी चाहिए।',
  'Enter a valid 12-digit Aadhaar number.': 'मान्य 12-अंकों का आधार नंबर दर्ज करें।',
  'PIN code must be a 6-digit number': 'पिन कोड 6 अंकों का होना चाहिए।',
  'Enter a valid 6-digit PIN code.': 'मान्य 6 अंकों का पिन कोड दर्ज करें।',
  'Enter a valid 10-digit mobile number.': 'मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।',
  'Mobile number cannot be all the same digits.': 'मोबाइल नंबर के सभी अंक समान नहीं हो सकते।',
  'This field is required.': 'यह फ़ील्ड अनिवार्य है।',
  'Please select an option': 'कृपया एक विकल्प चुनें।',
  'Alternate number must be different from your WhatsApp number.': 'वैकल्पिक नंबर आपके व्हाट्सएप नंबर से अलग होना चाहिए।'
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<'div'> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors?.length) {
      return null
    }

    const uniqueErrors = [...new Map(errors.map(error => [error?.message, error])).values()]

    if (uniqueErrors?.length == 1) {
      const msg = uniqueErrors[0]?.message
      return msg ? (HINDI_ERROR_TRANSLATIONS[msg] ?? msg) : null
    }

    return (
      <ul className='ml-4 flex list-disc flex-col gap-1'>
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{HINDI_ERROR_TRANSLATIONS[error.message] ?? error.message}</li>
        )}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div
      role='alert'
      data-slot='field-error'
      className={cn('text-destructive text-sm font-normal', className)}
      {...props}
    >
      {content}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle
}
