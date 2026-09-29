'use client'

import { useEffect, useRef, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircleIcon, BookOpenIcon, Loader2Icon, TriangleAlertIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import AddressStep from '@/views/public/apply/AddressStep'
import ApplicantInfoStep from '@/views/public/apply/ApplicantInfoStep'
import { storeApplicationAccess } from '@/views/public/apply/access-session'
import ApplicationSummaryPanel from '@/views/public/apply/ApplicationSummaryPanel'
import CategoryFieldsStep from '@/views/public/apply/CategoryFieldsStep'
import DocumentsStep, { type DocumentUploadState } from '@/views/public/apply/DocumentsStep'
import { applicationFormSchema, APPLICATION_FORM_DEFAULT_VALUES, type ApplicationFormValues } from '@/views/public/apply/form-values'
import { useLanguage } from '@/context/LanguageContext'
import InstructionsStep from '@/views/public/apply/InstructionsStep'
import type { CategoryConfigResponse } from '@/views/public/apply/types'

type DraftState = { applicationId: number; applicationNumber: string; accessToken: string } | null

/**
 * Data-entry page. A draft application is created silently in the
 * background as soon as the page loads (needed so document uploads have an
 * application id + access token to attach to — see .ai/DECISIONS.md), but
 * the applicant sees every data-entry section at once and fills them in any
 * order.
 *
 * IMPORTANT: this page does NOT submit the application. Its only action is
 * "Review Application", which (1) runs full client-side validation, (2)
 * saves the real entered data onto the draft via PATCH, (3) hands the
 * access token to the Review page via sessionStorage (never a URL — see
 * access-session.ts), and (4) navigates to /apply/[category]/review/[id].
 * The actual "Submit Application" button lives only on that Review page —
 * see ReviewPageView.tsx.
 */
const ApplicationFormOrchestrator = ({ config }: { config: CategoryConfigResponse }) => {
  const { lang } = useLanguage()
  const router = useRouter()
  const [draft, setDraft] = useState<DraftState>(null)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [isCreatingDraft, setIsCreatingDraft] = useState(true)
  const [uploadState, setUploadState] = useState<DocumentUploadState>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isProceeding, setIsProceeding] = useState(false)
  const draftRequested = useRef(false)

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: APPLICATION_FORM_DEFAULT_VALUES,
    mode: 'onBlur'
  })

  // Create the draft application once, silently, on mount. A ref guards
  // against React Strict Mode's double-invoke in development creating two
  // drafts. This is a placeholder-data draft (the real values are captured
  // only when "Review Application" is clicked, via PATCH) purely so
  // document uploads have somewhere to attach to.
  const createDraft = async () => {
    setIsCreatingDraft(true)
    setDraftError(null)

    try {
      // If category has shop options, prefill the first one for the placeholder draft
      const shopOptionPayload = config.shopOptions.length > 0 ? { shop_option_id: config.shopOptions[0].id } : {}

      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorySlug: config.category.slug,
          common: {
            email: 'pending@pending.local',
            organisationName: 'Pending',
            representativeName: 'Pending',
            fatherName: 'Pending',
            aadhaarNumber: '000000000000',
            address: 'Pending',
            state: 'Pending',
            district: 'Pending',
            pinCode: '000000',
            mobileNumber: '9999999999',
            workPurpose: 'Pending',
            achievementExperience: 'Pending'
          },
          categoryFields: shopOptionPayload,
          declaration: { informationCorrect: true, agreedToTerms: true }
        })
      })

      const body = await response.json()

      if (!response.ok) {
        setDraftError(body.error ?? 'Could not start the application. Please refresh and try again.')
        setIsCreatingDraft(false)

        return
      }

      setDraft({ applicationId: body.applicationId, applicationNumber: body.applicationNumber, accessToken: body.accessToken })
    } catch {
      setDraftError('Could not reach the server. Please refresh and try again.')
    } finally {
      setIsCreatingDraft(false)
    }
  }

  useEffect(() => {
    if (draftRequested.current) return
    draftRequested.current = true

    void createDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpload = async (documentKey: string, file: File) => {
    // If a client-side validation error was attached, set the error state directly
    if ('__clientError' in file && typeof (file as { __clientError?: string }).__clientError === 'string') {
      setUploadState(prev => ({
        ...prev,
        [documentKey]: {
          status: 'error',
          error: (file as { __clientError: string }).__clientError
        }
      }))

      return
    }

    if (!draft) return

    setUploadState(prev => ({ ...prev, [documentKey]: { status: 'uploading' } }))

    try {
      const formData = new FormData()

      formData.append('documentKey', documentKey)
      formData.append('file', file)

      const response = await fetch(`/api/applications/${draft.applicationId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${draft.accessToken}` },
        body: formData
      })

      const body = await response.json()

      if (!response.ok) {
        setUploadState(prev => ({ ...prev, [documentKey]: { status: 'error', error: body.error } }))

        return
      }

      setUploadState(prev => ({
        ...prev,
        [documentKey]: {
          status: 'uploaded',
          fileName: body.originalFilename ?? file.name
        }
      }))
    } catch {
      setUploadState(prev => ({
        ...prev,
        [documentKey]: { status: 'error', error: 'Upload failed. Please try again.' }
      }))
    }
  }

  const requiredDocsUploaded = config.documents
    .filter(d => d.required)
    .every(d => uploadState[d.key]?.status === 'uploaded')

  const handleReviewApplication = form.handleSubmit(async values => {
    if (!draft) return
    setSubmitError(null)

    if (!requiredDocsUploaded) {
      setSubmitError(
        lang === 'hi'
          ? 'आगे बढ़ने से पहले कृपया सभी अनिवार्य दस्तावेज अपलोड करें।'
          : 'Please upload all required documents before continuing.'
      )

      return
    }

    setIsProceeding(true)

    try {
      // Save the applicant's real data onto the draft now (the initial draft
      // created on page load used placeholder values purely to obtain an
      // application id for document uploads).
      const updateResponse = await fetch(`/api/applications/${draft.applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: draft.accessToken,
          categorySlug: config.category.slug,
          shopOptionId: values.shopOptionId,
          common: values.common,
          categoryFields: values.categoryFields
        })
      })

      if (!updateResponse.ok) {
        const body = await updateResponse.json()

        setSubmitError(
          body.error ??
            (lang === 'hi'
              ? 'कुछ गड़बड़ हुई। कृपया पुनः प्रयास करें।'
              : 'Something went wrong. Please try again.')
        )
        setIsProceeding(false)

        return
      }

      storeApplicationAccess(draft.applicationId, draft.accessToken, draft.applicationNumber)
      router.push(`/apply/${config.category.slug}/review/${draft.applicationId}`)
    } catch {
      setSubmitError(
        lang === 'hi'
          ? 'सर्वर से संपर्क नहीं हो सका। कृपया अपना इंटरनेट कनेक्शन जांचें।'
          : 'Could not reach the server. Please check your connection and try again.'
      )
      setIsProceeding(false)
    }
  }, () => {
    setSubmitError(
      lang === 'hi'
        ? 'कृपया आगे बढ़ने से पहले हाइलाइट किए गए फ़ील्ड्स की समीक्षा करें।'
        : 'Please review the highlighted fields before continuing.'
    )
  })

  return (
    <div className='kdb-apply-form min-h-screen bg-[#faf8f5] py-12 px-4 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-[1200px]'>
        {/* Header with Home Theme Ornamental Divider */}
        <div className='mb-8 text-left'>
          <div className='mb-3 inline-flex items-center gap-3'>
            <span className='text-xs sm:text-sm font-extrabold tracking-wider text-[#d8891d] uppercase shrink-0'>
              अंतर्राष्ट्रीय गीता महोत्सव 2026 — स्टॉल आवेदन
            </span>
            <div className='relative h-3.5 w-32 sm:w-44 shrink-0'>
              <Image
                src='/images/public/gita-mahotsav-gold-ornamental-divider.png'
                alt=''
                fill
                className='object-contain object-left'
                priority
              />
            </div>
          </div>
          <h1 className='text-3xl sm:text-4xl font-black text-[#0c2847] tracking-tight mb-2'>
            {lang === 'hi' ? 'चयनित स्टॉल श्रेणी: ' : 'Selected Category: '}
            <span className='text-[#b8761b]'>
              {lang === 'hi' && config.category.nameHi ? config.category.nameHi : config.category.name}
            </span>
          </h1>
          <p className='text-sm sm:text-base text-[#526478]'>
            {lang === 'hi'
              ? 'कृपया नियमों और पात्रता की समीक्षा करें, आवश्यक विवरण सही-सही भरें और संबंधित दस्तावेज अपलोड करें।'
              : 'Please review the requirements, fill in your details accurately, and upload the requested documents.'}
          </p>
        </div>

        <ApplicationSummaryPanel config={config} />

        <div className='mb-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-5 py-4 sm:flex-row sm:items-center'>
          <div className='flex items-start gap-2.5'>
            <TriangleAlertIcon className='mt-0.5 size-5 shrink-0 text-[#dc2626]' />
            <div>
              <p className='text-sm sm:text-base font-extrabold text-[#991b1b]'>
                {lang === 'hi' ? 'आवेदन से पूर्व अवश्य पढ़ें!' : 'Read Before You Apply!'}
              </p>
              <p className='text-xs sm:text-sm text-[#7f1d1d]'>
                {lang === 'hi'
                  ? 'कृपया आवेदन करने से पहले सभी दिशा-निर्देश और शर्तें ध्यानपूर्वक पढ़ें।'
                  : 'Please read all guidelines and terms carefully before submitting your application.'}
              </p>
            </div>
          </div>
          <Link
            href='/guidelines'
            target='_blank'
            className='inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#dc2626] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#b91c1c]'
          >
            <BookOpenIcon className='size-4' />
            {lang === 'hi' ? 'दिशा-निर्देश देखें' : 'View Guidelines'}
          </Link>
        </div>

        {draftError ? (
          <div className='rounded-2xl border border-[#e2e8f0] bg-white p-10 text-center shadow-sm'>
            <AlertCircleIcon className='mx-auto mb-3 size-10 text-red-600' />
            <p className='mb-6 text-base font-semibold text-[#0c2847]'>{draftError}</p>
            <div className='flex flex-col justify-center gap-3 sm:flex-row'>
              <Link
                href='/status'
                className='inline-flex items-center justify-center rounded-xl bg-[#0c2847] px-7 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#06192e]'
              >
                Check Application Status
              </Link>
              <Link
                href='/'
                className='inline-flex items-center justify-center rounded-xl border border-[#cbd5e1] bg-white px-7 py-3 text-sm font-bold text-[#0c2847] hover:bg-[#f8fafc]'
              >
                Return to Home
              </Link>
            </div>
          </div>
        ) : (
          <>
            {submitError && (
              <Alert variant='destructive' className='mb-6 rounded-xl border-red-200 bg-red-50 text-red-800'>
                <AlertCircleIcon className='size-5 text-red-600' />
                <AlertDescription className='font-semibold'>{submitError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleReviewApplication} className='flex flex-col gap-8'>
              {/* 1. Before You Start */}
              <section className='relative pl-12 sm:pl-16'>
                {/* Vertical connecting line to next section */}
                <div className='absolute left-4 sm:left-5 top-10 -bottom-8 w-0.5 bg-[#e2e8f0]' />

                {/* Circle badge */}
                <div className='absolute left-0 top-0 flex size-8 sm:size-10 items-center justify-center rounded-full bg-[#fdfbf7] border-2 border-[#e6cca4] shadow-xs text-sm sm:text-base font-sans font-bold leading-none text-[#8c5711] z-10 select-none'>
                  1
                </div>

                <div className='rounded-2xl border border-[#eeddb8] bg-[#fcf6e8] p-7 sm:p-9 shadow-xs'>
                  <div className='mb-5 border-b border-[#f0e4c4] pb-4'>
                    <h2 className='text-xl sm:text-2xl font-black text-[#0c2847]'>
                      {lang === 'hi' ? 'आवेदन से पूर्व निर्देश' : 'Before You Start'}
                    </h2>
                    <p className='text-sm sm:text-base text-[#64748b] mt-1'>
                      {lang === 'hi'
                        ? 'आवेदन पत्र भरने हेतु अनिवार्य दिशा-निर्देश एवं आवश्यक दस्तावेज।'
                        : 'Mandatory prerequisites and guidelines for your application.'}
                    </p>
                  </div>
                  <InstructionsStep config={config} />
                </div>
              </section>

              {/* 2. Applicant Details */}
              <section className='relative pl-12 sm:pl-16'>
                {/* Vertical connecting line to next section */}
                <div className='absolute left-4 sm:left-5 top-10 -bottom-8 w-0.5 bg-[#e2e8f0]' />

                {/* Circle badge */}
                <div className='absolute left-0 top-0 flex size-8 sm:size-10 items-center justify-center rounded-full bg-[#fdfbf7] border-2 border-[#e6cca4] shadow-xs text-sm sm:text-base font-sans font-bold leading-none text-[#8c5711] z-10 select-none'>
                  2
                </div>

                <div className='rounded-2xl border border-[#e2e8f0] bg-white p-7 sm:p-9 shadow-xs'>
                  <div className='mb-5 border-b border-[#f1f5f9] pb-4'>
                    <h2 className='text-xl sm:text-2xl font-black text-[#0c2847]'>
                      {lang === 'hi' ? 'आवेदक / संस्था का विवरण' : 'Applicant Details'}
                    </h2>
                    <p className='text-xs sm:text-sm text-[#64748b] mt-1'>
                      {lang === 'hi'
                        ? 'स्टॉल या दुकान आवंटन हेतु आवेदक व्यक्ति अथवा संस्था का विवरण भरें।'
                        : 'Please enter the details of the person or organisation applying for the booth or shop.'}
                    </p>
                  </div>
                  <ApplicantInfoStep control={form.control} errors={form.formState.errors} />
                </div>
              </section>

              {/* 3. Contact & Address */}
              <section className='relative pl-12 sm:pl-16'>
                {/* Vertical connecting line to next section */}
                <div className='absolute left-4 sm:left-5 top-10 -bottom-8 w-0.5 bg-[#e2e8f0]' />

                {/* Circle badge */}
                <div className='absolute left-0 top-0 flex size-8 sm:size-10 items-center justify-center rounded-full bg-[#fdfbf7] border-2 border-[#e6cca4] shadow-xs text-sm sm:text-base font-sans font-bold leading-none text-[#8c5711] z-10 select-none'>
                  3
                </div>

                <div className='rounded-2xl border border-[#e2e8f0] bg-white p-7 sm:p-9 shadow-xs'>
                  <div className='mb-5 border-b border-[#f1f5f9] pb-4'>
                    <h2 className='text-xl sm:text-2xl font-black text-[#0c2847]'>
                      {lang === 'hi' ? 'संपर्क एवं पता विवरण' : 'Contact & Address'}
                    </h2>
                    <p className='text-xs sm:text-sm text-[#64748b] mt-1'>
                      {lang === 'hi'
                        ? 'पत्राचार और सत्यापन हेतु अपना वर्तमान पता व संपर्क सूत्र दर्ज करें।'
                        : 'Please provide your current correspondence and verification address.'}
                    </p>
                  </div>
                  <AddressStep control={form.control} />
                </div>
              </section>

              {/* 4. Category Details (if dynamic fields exist) */}
              {(config.fields.length > 0 || config.shopOptions.length > 0) && (
                <section className='relative pl-12 sm:pl-16'>
                  {/* Vertical connecting line to next section */}
                  <div className='absolute left-4 sm:left-5 top-10 -bottom-8 w-0.5 bg-[#e2e8f0]' />

                  {/* Circle badge */}
                  <div className='absolute left-0 top-0 flex size-8 sm:size-10 items-center justify-center rounded-full bg-[#fdfbf7] border-2 border-[#e6cca4] shadow-xs text-sm sm:text-base font-sans font-bold leading-none text-[#8c5711] z-10 select-none'>
                    4
                  </div>

                  <div className='rounded-2xl border border-[#e2e8f0] bg-white p-7 sm:p-9 shadow-xs'>
                    <div className='mb-5 border-b border-[#f1f5f9] pb-4'>
                      <h2 className='text-xl sm:text-2xl font-black text-[#0c2847]'>
                        {lang === 'hi' ? 'श्रेणी विशिष्ट विवरण' : 'Category Details'}
                      </h2>
                      <p className='text-xs sm:text-sm text-[#64748b] mt-1'>
                        {lang === 'hi'
                          ? `${config.category.nameHi || config.category.name} हेतु आवश्यक अतिरिक्त जानकारी।`
                          : `Additional information specifically required for ${config.category.name}.`}
                      </p>
                    </div>
                    <CategoryFieldsStep control={form.control} fields={config.fields} shopOptions={config.shopOptions} />
                  </div>
                </section>
              )}

              {/* 5. Required Documents (Final Section with terminating line) */}
              <section className='relative pl-12 sm:pl-16'>
                {/* Clean end terminal for the timeline */}
                <div className='absolute left-4 sm:left-5 top-10 h-10 w-0.5 bg-gradient-to-b from-[#e2e8f0] to-transparent' />

                {/* Circle badge */}
                <div className='absolute left-0 top-0 flex size-8 sm:size-10 items-center justify-center rounded-full bg-[#fdfbf7] border-2 border-[#e6cca4] shadow-xs text-sm sm:text-base font-sans font-bold leading-none text-[#8c5711] z-10 select-none'>
                  {config.fields.length > 0 || config.shopOptions.length > 0 ? 5 : 4}
                </div>

                <div className='rounded-2xl border border-[#e2e8f0] bg-white p-7 sm:p-9 shadow-xs'>
                  <div className='mb-5 border-b border-[#f1f5f9] pb-4'>
                    <h2 className='text-xl sm:text-2xl font-black text-[#0c2847]'>
                      {lang === 'hi' ? 'आवश्यक दस्तावेज (अपलोड)' : 'Required Documents'}
                    </h2>
                    <p className='text-xs sm:text-sm text-[#64748b] mt-1'>
                      {lang === 'hi'
                        ? 'स्वीकृत प्रारूप: PDF, JPG, JPEG या PNG। कृपया स्पष्ट एवं पठनीय दस्तावेज अपलोड करें।'
                        : 'Accepted formats: PDF, JPG, JPEG or PNG. Please upload clear and readable documents.'}
                    </p>
                  </div>
                  {isCreatingDraft ? (
                    <div className='flex items-center gap-3 rounded-xl border border-[#fbd38d]/60 bg-[#fffaf0] p-5 text-sm text-[#8c5711]'>
                      <Loader2Icon className='size-5 animate-spin text-[#d8891d]' />
                      <span>
                        {lang === 'hi'
                          ? 'दस्तावेज अपलोड सिस्टम तैयार हो रहा है...'
                          : 'Preparing document upload system...'}
                      </span>
                    </div>
                  ) : draft ? (
                    <DocumentsStep documents={config.documents} uploadState={uploadState} onUpload={handleUpload} />
                  ) : (
                    <div className='flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700'>
                      <p>
                        {draftError ||
                          (lang === 'hi'
                            ? 'दस्तावेज अपलोड प्रारंभ नहीं हो सका। कृपया पुनः प्रयास करें।'
                            : 'We could not prepare document upload for this application. Please try again.')}
                      </p>
                      <button
                        type='button'
                        onClick={() => void createDraft()}
                        className='shrink-0 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition'
                      >
                        {lang === 'hi' ? 'पुनः प्रयास करें (Retry)' : 'Retry'}
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Form Action Button */}
              <div className='flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs'>
                <p className='text-xs sm:text-sm text-[#64748b] text-center sm:text-left'>
                  {lang === 'hi'
                    ? 'समीक्षा स्क्रीन (Review) पर जाने से पहले सुनिश्चित करें कि सभी जानकारी सही है।'
                    : 'Please ensure all details are verified before proceeding to the review screen.'}
                </p>
                <Button
                  type='submit'
                  size='lg'
                  disabled={!draft || isProceeding || isCreatingDraft}
                  className='w-full sm:w-auto rounded-xl bg-[#0c2847] px-8 py-4 text-sm font-bold text-white shadow-sm hover:bg-[#06192e] transition active:scale-[0.98]'
                >
                  {isProceeding ? <Loader2Icon className='mr-2 size-4 animate-spin text-[#d8891d]' /> : null}
                  <span>{lang === 'hi' ? 'आवेदन की समीक्षा करें (Review)' : 'Review Application'}</span>
                  <span className='ml-2 text-base font-bold'>→</span>
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default ApplicationFormOrchestrator
