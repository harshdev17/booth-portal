'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { AlertCircleIcon, CheckCircle2Icon, CheckIcon, CreditCardIcon, Loader2Icon, ShieldCheckIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/LanguageContext'
import { readApplicationAccess, storeApplicationAccess } from '@/views/public/apply/access-session'
import type { ReviewData } from '@/views/public/apply-review/types'

const ReviewRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null

  return (
    <div className='flex justify-between gap-4 border-b border-[#f1f5f9] py-3 text-sm last:border-b-0'>
      <span className='text-[#64748b]'>{label}</span>
      <span className='text-right font-bold text-[#0c2847]'>{value}</span>
    </div>
  )
}

const SectionCard = ({
  title,
  editHref,
  children
}: {
  title: string
  editHref: string
  children: React.ReactNode
}) => (
  <section className='rounded-2xl border border-[#e2e8f0] bg-white p-7 sm:p-9 shadow-xs'>
    <div className='mb-4 flex items-center justify-between border-b border-[#f1f5f9] pb-3'>
      <h2 className='text-xl font-black text-[#0c2847]'>{title}</h2>
      <Link href={editHref} className='inline-flex items-center gap-1 rounded-lg border border-[#0c2847]/20 bg-[#fafbfc] px-3.5 py-1 text-xs font-bold text-[#0c2847] transition hover:bg-[#0c2847] hover:text-white'>
        Edit Details ✎
      </Link>
    </div>
    <div className='rounded-xl border border-[#e2e8f0] bg-[#fafbfc] px-5 py-2'>{children}</div>
  </section>
)

/**
 * Review page — a real route, not an embedded section (per explicit
 * requirement). Reached only via the data-entry page's "Review Application"
 * button, which saves the applicant's real data to the draft first, then
 * hands the access token to this page via sessionStorage (never a URL — see
 * access-session.ts). If this page is opened directly (new tab, bookmark,
 * cleared storage) there is no token available and the applicant is sent
 * back to the data-entry page rather than shown a broken or insecure page.
 *
 * The Declaration lives here, not on the data-entry page, and gates the
 * only real "Submit Application" button in the whole flow. Submitting
 * re-runs full server-side validation (category window, required documents,
 * duplicate check) — this page is a UX convenience, never the security
 * boundary; see finalizeApplication in src/lib/applications/create-application.ts.
 */
const ReviewPageView = ({ categorySlug, applicationId }: { categorySlug: string; applicationId: number }) => {
  const router = useRouter()
  const { lang } = useLanguage()

  // Lazy initializer reads sessionStorage once, synchronously
  const [access] = useState<{ accessToken: string; applicationNumber: string } | null>(() =>
    readApplicationAccess(applicationId)
  )

  const [data, setData] = useState<ReviewData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [informationCorrect, setInformationCorrect] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Mobile OTP verification — required before submission (server-side
  // enforced independently in finalizeApplication; this is the UX gate).
  const [otpPhase, setOtpPhase] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'verified'>('idle')
  const [otpCode, setOtpCode] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)

  useEffect(() => {
    if (access === null) {
      router.replace(`/apply/${categorySlug}`)

      return
    }

    const loadReview = async () => {
      try {
        const response = await fetch(`/api/applications/${applicationId}/review`, {
          headers: { Authorization: `Bearer ${access.accessToken}` }
        })

        const body = await response.json()

        if (!response.ok) {
          setLoadError(
            body.error ??
              (lang === 'hi'
                ? 'आवेदन विवरण लोड नहीं हो सका। कृपया पुनः प्रयास करें।'
                : 'Could not load your application. Please try again.')
          )

          return
        }

        setData(body)
      } catch {
        setLoadError(
          lang === 'hi'
            ? 'सर्वर से संपर्क नहीं हो सका। कृपया अपना कनेक्शन जांचें।'
            : 'Could not reach the server. Please check your connection and try again.'
        )
      }
    }

    void loadReview()
  }, [access, applicationId, categorySlug, lang, router])

  const sendMobileOtp = async () => {
    if (!data?.common.mobileNumber) return

    setOtpError(null)
    setOtpPhase('sending')

    try {
      const response = await fetch('/api/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: data.common.mobileNumber, applicationId })
      })

      const body = await response.json()

      if (!response.ok) {
        setOtpError(body.error ?? (lang === 'hi' ? 'कोड नहीं भेजा जा सका। पुनः प्रयास करें।' : 'Could not send the code. Please try again.'))
        setOtpPhase('idle')

        return
      }

      setOtpCode('')
      setOtpPhase('sent')
    } catch {
      setOtpError(
        lang === 'hi'
          ? 'सर्वर से संपर्क नहीं हो सका। कृपया अपना कनेक्शन जांचें।'
          : 'Could not reach the server. Please check your connection and try again.'
      )
      setOtpPhase('idle')
    }
  }

  const verifyMobileOtp = async () => {
    if (!data?.common.mobileNumber || otpCode.length !== 6) return

    setOtpError(null)
    setOtpPhase('verifying')

    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: data.common.mobileNumber, code: otpCode })
      })

      const body = await response.json()

      if (!response.ok) {
        setOtpError(body.error ?? (lang === 'hi' ? 'गलत कोड। पुनः प्रयास करें।' : 'Incorrect code. Please try again.'))
        setOtpPhase('sent')

        return
      }

      setOtpPhase('verified')
    } catch {
      setOtpError(
        lang === 'hi'
          ? 'सर्वर से संपर्क नहीं हो सका। कृपया अपना कनेक्शन जांचें।'
          : 'Could not reach the server. Please check your connection and try again.'
      )
      setOtpPhase('sent')
    }
  }

  const handleSubmit = async () => {
    if (!access || !informationCorrect || !agreedToTerms || otpPhase !== 'verified') return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch(`/api/applications/${applicationId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: access.accessToken,
          declaration: { informationCorrect: true, agreedToTerms: true }
        })
      })

      const body = await response.json()

      if (!response.ok) {
        setSubmitError(
          body.error ??
            (lang === 'hi'
              ? 'वर्तमान में आवेदन सबमिट नहीं किया जा सका। कृपया पुनः प्रयास करें।'
              : "We couldn't submit your application right now. Please try again.")
        )
        setIsSubmitting(false)

        return
      }

      storeApplicationAccess(applicationId, access.accessToken, body.applicationNumber)

      // If category requires application fee, navigate to payment page
      if (body.feePaise && body.feePaise > 0) {
        router.push(`/apply/${categorySlug}/payment/${body.applicationNumber}`)
      } else {
        router.push(`/apply/${categorySlug}/success/${body.applicationNumber}`)
      }
    } catch {
      setSubmitError(
        lang === 'hi'
          ? 'सर्वर से संपर्क नहीं हो सका। कृपया अपना इंटरनेट कनेक्शन जांचें।'
          : 'Could not reach the server. Please check your connection and try again.'
      )
      setIsSubmitting(false)
    }
  }

  if (access && !data && !loadError) {
    return (
      <div className='mx-auto flex max-w-[1240px] items-center justify-center px-6 py-24 sm:px-8'>
        <Loader2Icon className='size-6 animate-spin text-[var(--kdb-primary)]' />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className='mx-auto max-w-[1240px] px-6 py-16 sm:px-8'>
        <Alert variant='destructive'>
          <AlertCircleIcon className='size-4' />
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <Link
          href={`/apply/${categorySlug}`}
          className='mt-4 inline-block text-sm font-semibold text-[var(--kdb-primary)] hover:underline'
        >
          Back to Application
        </Link>
      </div>
    )
  }

  if (!data) return null

  const canSubmit = informationCorrect && agreedToTerms && otpPhase === 'verified'

  return (
    <div className='min-h-screen bg-[#faf8f5] py-12 px-4 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-[1200px]'>
        {/* Header with Home Theme Ornamental Divider */}
        <div className='mb-8 text-left'>
          <div className='mb-3 inline-flex items-center gap-3'>
            <span className='text-xs sm:text-sm font-extrabold tracking-wider text-[#d8891d] uppercase shrink-0'>
              अंतर्राष्ट्रीय गीता महोत्सव 2026 — आवेदन समीक्षा
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
            {lang === 'hi' ? 'आवेदन की अंतिम समीक्षा (Review)' : 'Review Your Application'}
          </h1>
          <p className='text-sm sm:text-base text-[#526478]'>
            {lang === 'hi' ? 'श्रेणी: ' : 'Category: '}
            <strong className='text-[#0c2847]'>{data.categoryName}</strong> —{' '}
            {lang === 'hi'
              ? 'कृपया अंतिम रूप से सबमिट करने से पहले सभी विवरणों की जांच करें।'
              : 'Please double-check all details and confirm your declaration before final submission.'}
          </p>
        </div>

        {submitError && (
          <Alert variant='destructive' className='mb-6 rounded-xl border-red-200 bg-red-50 text-red-800'>
            <AlertCircleIcon className='size-5 text-red-600' />
            <AlertDescription className='font-semibold'>{submitError}</AlertDescription>
          </Alert>
        )}

        <div className='flex flex-col gap-8'>
          <SectionCard
            title={lang === 'hi' ? 'आवेदक / संस्था का विवरण' : 'Applicant Details'}
            editHref={`/apply/${categorySlug}`}
          >
            <ReviewRow label={lang === 'hi' ? 'ईमेल पता' : 'Email'} value={data.common.email} />
            <ReviewRow label={lang === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number'} value={data.common.mobileNumber} />
            <ReviewRow label={lang === 'hi' ? 'वैकल्पिक मोबाइल' : 'Alternate Mobile'} value={data.common.alternateMobile} />
            <ReviewRow label={lang === 'hi' ? 'फर्म / एनजीओ / संस्था' : 'Firm / NGO / Organisation'} value={data.common.organisationName} />
            <ReviewRow label={lang === 'hi' ? 'मालिक / प्रतिनिधि' : 'Representative Name'} value={data.common.representativeName} />
            <ReviewRow label={lang === 'hi' ? 'पिता का नाम' : "Father's Name"} value={data.common.fatherName} />
            <ReviewRow label={lang === 'hi' ? 'आधार संख्या' : 'Aadhaar Number'} value={data.common.aadhaarMasked} />
            <ReviewRow label={lang === 'hi' ? 'कार्य का प्रकार' : 'Type of Work'} value={data.common.workPurpose} />
            <ReviewRow label={lang === 'hi' ? 'अनुभव / उपलब्धि' : 'Experience / Award'} value={data.common.achievementExperience} />
            {data.common.remarks && (
              <ReviewRow label={lang === 'hi' ? 'टिप्पणी' : 'Remarks'} value={data.common.remarks} />
            )}
          </SectionCard>

          <SectionCard
            title={lang === 'hi' ? 'संपर्क एवं पता विवरण' : 'Contact & Address'}
            editHref={`/apply/${categorySlug}`}
          >
            <ReviewRow label={lang === 'hi' ? 'पत्राचार पता' : 'Address'} value={data.common.address} />
            <ReviewRow label={lang === 'hi' ? 'राज्य' : 'State'} value={data.common.state} />
            <ReviewRow label={lang === 'hi' ? 'ज़िला' : 'District'} value={data.common.district} />
            <ReviewRow label={lang === 'hi' ? 'पिन कोड' : 'PIN Code'} value={data.common.pinCode} />
          </SectionCard>

          {(data.shopOptionLabel || data.categoryFields.length > 0) && (
            <SectionCard
              title={lang === 'hi' ? 'श्रेणी विशिष्ट विवरण' : 'Category Details'}
              editHref={`/apply/${categorySlug}`}
            >
              <ReviewRow label={lang === 'hi' ? 'दुकान चयन' : 'Shop Selection'} value={data.shopOptionLabel} />
              {data.categoryFields.map(field => (
                <ReviewRow key={field.label} label={field.label} value={field.value} />
              ))}
            </SectionCard>
          )}

          {/* Fee Information Card */}
          {data.feePaise !== undefined && data.feePaise !== null && data.feePaise > 0 && (
            <section className='rounded-2xl border-2 border-[#e6cca4] bg-[#fdfbf7] p-7 sm:p-9 shadow-xs'>
              <div className='mb-4 flex items-center justify-between border-b border-[#e6cca4]/60 pb-3'>
                <h2 className='text-xl font-black text-[#0c2847]'>Application Fee Details</h2>
                <span className='rounded-full bg-[#d8891d]/15 px-3 py-1 text-xs font-bold text-[#8c5711]'>
                  Payment Required on Submit
                </span>
              </div>
              <div className='space-y-2.5 text-sm'>
                {data.feeBasePaise !== null && data.feeBasePaise !== undefined && (
                  <div className='flex justify-between border-b border-[#e2e8f0]/60 py-2'>
                    <span className='text-[#64748b]'>Base Application Fee:</span>
                    <span className='font-bold text-[#0c2847]'>₹{(data.feeBasePaise / 100).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {data.gstPercent !== null && data.gstPercent !== undefined && data.gstPercent > 0 && (
                  <div className='flex justify-between border-b border-[#e2e8f0]/60 py-2'>
                    <span className='text-[#64748b]'>Applicable GST ({data.gstPercent}%):</span>
                    <span className='font-bold text-[#0c2847]'>
                      ₹{(((data.feePaise - (data.feeBasePaise ?? data.feePaise))) / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className='flex justify-between pt-2 text-base font-extrabold text-[#0c2847]'>
                  <span>Total Payable Amount:</span>
                  <span className='text-lg font-black text-[#d8891d]'>₹{(data.feePaise / 100).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </section>
          )}

          <section className='rounded-2xl border border-[#e2e8f0] bg-white p-7 sm:p-9 shadow-xs'>
            <div className='mb-4 flex items-center justify-between border-b border-[#f1f5f9] pb-3'>
              <h2 className='text-xl font-black text-[#0c2847]'>Uploaded Documents</h2>
              <Link href={`/apply/${categorySlug}`} className='inline-flex items-center gap-1 rounded-lg border border-[#0c2847]/20 bg-[#fafbfc] px-3.5 py-1 text-xs font-bold text-[#0c2847] transition hover:bg-[#0c2847] hover:text-white'>
                Edit Documents ✎
              </Link>
            </div>
            <div className='rounded-xl border border-[#e2e8f0] bg-[#fafbfc] px-5 py-3 divide-y divide-[#f1f5f9]'>
              {data.documents.map(doc => (
                <div key={doc.label} className='flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2.5 text-sm'>
                  <div className='flex items-center gap-3'>
                    <CheckIcon className='size-4 text-emerald-600 shrink-0 stroke-[2.5]' />
                    <span className='font-bold text-[#0c2847]'>{doc.label}</span>
                  </div>
                  {doc.originalFilename && (
                    <span className='font-mono text-xs text-[#64748b] bg-white border border-[#e2e8f0] rounded-md px-2 py-0.5 truncate max-w-xs'>
                      {doc.originalFilename}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Mobile OTP Verification — required before submission */}
          <section className='rounded-2xl border border-[#e2e8f0] bg-white p-7 sm:p-9 shadow-xs'>
            <div className='mb-4 flex items-center gap-2 border-b border-[#f1f5f9] pb-3'>
              <ShieldCheckIcon className='size-5 text-[#0c2847]' />
              <h2 className='text-xl font-black text-[#0c2847]'>
                {lang === 'hi' ? 'मोबाइल नंबर सत्यापन' : 'Mobile Number Verification'}
              </h2>
            </div>

            {otpPhase === 'verified' ? (
              <div className='flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800'>
                <CheckCircle2Icon className='size-4.5 shrink-0' />
                {lang === 'hi'
                  ? `मोबाइल नंबर ${data.common.mobileNumber} सत्यापित हो गया है।`
                  : `Mobile number ${data.common.mobileNumber} has been verified.`}
              </div>
            ) : (
              <div className='flex flex-col gap-3'>
                <p className='text-xs sm:text-sm text-[#64748b]'>
                  {lang === 'hi'
                    ? `आवेदन सबमिट करने से पहले आपको अपने मोबाइल नंबर (${data.common.mobileNumber}) को OTP द्वारा सत्यापित करना होगा।`
                    : `You must verify your mobile number (${data.common.mobileNumber}) with an OTP before you can submit.`}
                </p>

                {otpError && (
                  <Alert variant='destructive'>
                    <AlertCircleIcon className='size-4' />
                    <AlertDescription>{otpError}</AlertDescription>
                  </Alert>
                )}

                {otpPhase === 'idle' || otpPhase === 'sending' ? (
                  <Button
                    type='button'
                    variant='outline'
                    disabled={otpPhase === 'sending'}
                    onClick={sendMobileOtp}
                    className='w-fit rounded-xl border-[#0c2847]/30 text-[#0c2847] font-bold'
                  >
                    {otpPhase === 'sending' && <Loader2Icon className='mr-2 size-4 animate-spin' />}
                    {lang === 'hi' ? 'OTP भेजें' : 'Send OTP'}
                  </Button>
                ) : (
                  <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                    <Input
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode='numeric'
                      placeholder='••••••'
                      maxLength={6}
                      className='sm:w-40'
                    />
                    <Button
                      type='button'
                      disabled={otpPhase === 'verifying' || otpCode.length !== 6}
                      onClick={verifyMobileOtp}
                      className='rounded-xl bg-[#0c2847] font-bold text-white hover:bg-[#06192e]'
                    >
                      {otpPhase === 'verifying' && <Loader2Icon className='mr-2 size-4 animate-spin' />}
                      {lang === 'hi' ? 'सत्यापित करें' : 'Verify'}
                    </Button>
                    <button
                      type='button'
                      onClick={sendMobileOtp}
                      disabled={otpPhase === 'verifying'}
                      className='text-xs font-semibold text-[#64748b] underline underline-offset-2 hover:text-[#0c2847]'
                    >
                      {lang === 'hi' ? 'कोड पुनः भेजें' : 'Resend code'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className='rounded-2xl border border-[#e2e8f0] bg-white p-7 sm:p-9 shadow-xs'>
            <h2 className='mb-2 text-xl font-black text-[#0c2847]'>
              {lang === 'hi' ? 'शपथ पत्र / घोषणा (Declaration)' : 'Declaration'}
            </h2>
            <p className='mb-5 text-xs sm:text-sm text-[#64748b]'>
              {lang === 'hi'
                ? 'आवेदन जमा करने हेतु निम्नलिखित दोनों घोषणाओं की पुष्टि करना अनिवार्य है।'
                : 'Please confirm the following declarations to enable application submission.'}
            </p>
            <div className='flex flex-col gap-3'>
              <label className='flex items-start gap-3.5 rounded-xl border border-[#e2e8f0] bg-[#fafbfc] p-4 cursor-pointer hover:bg-[#f8fafc] transition'>
                <Checkbox checked={informationCorrect} onCheckedChange={v => setInformationCorrect(Boolean(v))} className='mt-0.5' />
                <span className='text-xs sm:text-sm text-[#334155] leading-relaxed'>
                  {lang === 'hi'
                    ? 'मैं पुष्टि करता/करती हूँ कि इस आवेदन में दी गई समस्त जानकारी मेरी सर्वोत्तम जानकारी व विश्वास के अनुसार सत्य एवं सही है।'
                    : 'I confirm that the information provided in this application is true and correct to the best of my knowledge.'}
                </span>
              </label>
              <label className='flex items-start gap-3.5 rounded-xl border border-[#e2e8f0] bg-[#fafbfc] p-4 cursor-pointer hover:bg-[#f8fafc] transition'>
                <Checkbox checked={agreedToTerms} onCheckedChange={v => setAgreedToTerms(Boolean(v))} className='mt-0.5' />
                <span className='text-xs sm:text-sm text-[#334155] leading-relaxed'>
                  {lang === 'hi'
                    ? 'मैंने ऊपर दी गई जानकारी एवं दस्तावेजों की समीक्षा कर ली है तथा कुरुक्षेत्र विकास बोर्ड (KDB) के सभी लागू नियमों एवं शर्तों से पूर्णतः सहमत हूँ।'
                    : 'I have reviewed the information and documents provided above and agree to the applicable terms and conditions of the Kurukshetra Development Board (KDB).'}
                </span>
              </label>
            </div>
          </section>

          {/* Bottom Action Buttons */}
          <div className='flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs'>
            <Link
              href={`/apply/${categorySlug}`}
              className='w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-[#cbd5e1] bg-white px-7 text-sm font-bold text-[#0c2847] shadow-xs hover:bg-[#f8fafc] hover:border-[#94a3b8] transition active:scale-[0.98]'
            >
              {lang === 'hi' ? '← वापस संपादन पर जाएं' : '← Back to Edit'}
            </Link>
            <Button
              type='button'
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className='w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-[#0c2847] px-8 text-sm font-bold text-white shadow-sm hover:bg-[#06192e] transition active:scale-[0.98]'
            >
              {isSubmitting && <Loader2Icon className='mr-2 size-4 animate-spin text-[#d8891d]' />}
              <span>
                {data.feePaise && data.feePaise > 0
                  ? lang === 'hi'
                    ? `शुल्क भुगतान एवं सबमिट (₹${(data.feePaise / 100).toLocaleString('en-IN')})`
                    : `Proceed to Pay Fee (₹${(data.feePaise / 100).toLocaleString('en-IN')})`
                  : lang === 'hi'
                    ? 'आवेदन सबमिट करें (Submit)'
                    : 'Submit Application'}
              </span>
              {data.feePaise && data.feePaise > 0 ? (
                <CreditCardIcon className='ml-2 size-4' />
              ) : (
                <span className='ml-2 text-base font-bold'>✓</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReviewPageView
