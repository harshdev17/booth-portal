'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

export default function ContactBannerSection() {
  const { lang } = useLanguage()

  return (
    <section id='contact' className='py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white border-t border-[#ede5db]/60'>
      <div className='mx-auto max-w-7xl'>
        {/* Header matching portal standard with official gold divider */}
        <div className='mb-10 sm:mb-12 text-left'>
          {/* Saffron Label with Official Gold Ornamental Divider Image */}
          <div className='mb-3 inline-flex items-center gap-3'>
            <span className='text-xs sm:text-sm font-extrabold tracking-wider text-[#d8891d] uppercase shrink-0'>
              {lang === 'hi' ? 'संपर्क एवं सहायता केंद्र' : 'CONTACT & HELPDESK'}
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

          {/* Heading */}
          <h2 className='text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0c2847]'>
            {lang === 'hi' ? (
              <>
                सहायता की <span className='text-[#d8891d]'>आवश्यकता है?</span>
              </>
            ) : (
              <>
                Need Any <span className='text-[#d8891d]'>Assistance?</span>
              </>
            )}
          </h2>

          {/* Subtitle */}
          <p className='mt-3 max-w-2xl text-sm sm:text-base text-[#475569] leading-relaxed'>
            {lang === 'hi'
              ? 'आवेदन प्रक्रिया, दस्तावेज, भुगतान, स्टॉल आवंटन या किसी अन्य समस्या के लिए हमारी हेल्पडेस्क टीम से संपर्क करें।'
              : 'Contact our official helpdesk team for any queries regarding application process, documents, payment, or stall allotment.'}
          </p>
        </div>

        {/* 4-Box Row Layout matching reference */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch'>
          {/* Card 1: Phone Support */}
          <div className='flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7 shadow-2xs hover:shadow-xs transition'>
            <div>
              <div className='flex items-center justify-between pb-3 mb-4 border-b border-[#f1f5f9]'>
                <span className='text-xs sm:text-sm font-bold text-[#b8761b] tracking-wide'>
                  {lang === 'hi' ? 'फोन सहायता' : 'Phone Support'}
                </span>
                <div className='relative size-6 shrink-0 opacity-90'>
                  <Image
                    src='/images/public/helpdesk-icons/phone.svg'
                    alt='Phone'
                    fill
                    className='object-contain'
                  />
                </div>
              </div>
              <a
                href='tel:+919876543210'
                className='block text-xl sm:text-2xl font-black text-[#0c2847] hover:text-[#b8761b] transition tracking-tight mb-2'
              >
                +91 98765 43210
              </a>
              <p className='text-xs sm:text-sm text-[#64748b] leading-relaxed'>
                {lang === 'hi' ? 'सोमवार – शुक्रवार' : 'Monday – Friday'}
                <br />
                {lang === 'hi' ? 'सुबह 10:00 बजे – शाम 5:00 बजे' : '10:00 AM – 5:00 PM'}
              </p>
            </div>
          </div>

          {/* Card 2: Email Support */}
          <div className='flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7 shadow-2xs hover:shadow-xs transition'>
            <div>
              <div className='flex items-center justify-between pb-3 mb-4 border-b border-[#f1f5f9]'>
                <span className='text-xs sm:text-sm font-bold text-[#b8761b] tracking-wide'>
                  {lang === 'hi' ? 'ईमेल सहायता' : 'Email Support'}
                </span>
                <div className='relative size-6 shrink-0 opacity-90'>
                  <Image
                    src='/images/public/helpdesk-icons/email.svg'
                    alt='Email'
                    fill
                    className='object-contain'
                  />
                </div>
              </div>
              <a
                href='mailto:helpdesk@stallportal.in'
                className='block text-lg sm:text-xl font-black text-[#0c2847] hover:text-[#b8761b] transition break-all tracking-tight mb-2'
              >
                helpdesk@stallportal.in
              </a>
              <p className='text-xs sm:text-sm text-[#64748b] leading-relaxed'>
                {lang === 'hi'
                  ? 'हम आपके प्रश्नों का उत्तर यथाशीघ्र देंगे।'
                  : 'We will respond to your queries as soon as possible.'}
              </p>
            </div>
          </div>

          {/* Card 3: Office Address */}
          <div className='flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7 shadow-2xs hover:shadow-xs transition'>
            <div>
              <div className='flex items-center justify-between pb-3 mb-4 border-b border-[#f1f5f9]'>
                <span className='text-xs sm:text-sm font-bold text-[#b8761b] tracking-wide'>
                  {lang === 'hi' ? 'कार्यालय पता' : 'Office Address'}
                </span>
                <div className='relative size-6 shrink-0 opacity-90'>
                  <Image
                    src='/images/public/helpdesk-icons/location.svg'
                    alt='Location'
                    fill
                    className='object-contain'
                  />
                </div>
              </div>
              <h3 className='text-base sm:text-lg font-black text-[#0c2847] leading-snug mb-1'>
                {lang === 'hi' ? 'जिला प्रशासन कार्यालय' : 'District Administration Office'}
              </h3>
              <p className='text-sm sm:text-[15px] font-bold text-[#0c2847] mb-1'>
                {lang === 'hi' ? 'कुरुक्षेत्र, हरियाणा – 136118' : 'Kurukshetra, Haryana – 136118'}
              </p>
              <p className='text-xs text-[#64748b]'>
                {lang === 'hi' ? '(स्टॉल आवंटन हेल्पडेस्क)' : '(Stall Allotment Helpdesk)'}
              </p>
            </div>
          </div>

          {/* Card 4: Action Card with Headset */}
          <div className='flex flex-col justify-between rounded-2xl border border-[#f3ddb3]/80 bg-[#fffaf0] p-6 sm:p-7 shadow-xs'>
            <div>
              <div className='flex items-center gap-4 mb-4'>
                <div className='flex size-14 shrink-0 items-center justify-center rounded-full bg-[#fdeece] border border-[#f5d89f] p-2.5 shadow-2xs'>
                  <div className='relative size-9'>
                    <Image
                      src='/images/public/helpdesk-icons/headset.svg'
                      alt='Helpdesk Headset'
                      fill
                      className='object-contain'
                    />
                  </div>
                </div>
                <div>
                  <h3 className='text-base sm:text-lg font-black text-[#0c2847] leading-tight'>
                    {lang === 'hi' ? 'अभी भी सहायता चाहिए?' : 'Still Need Help?'}
                  </h3>
                  <p className='text-xs text-[#64748b] mt-1 leading-snug'>
                    {lang === 'hi'
                      ? 'अपनी समस्या बताएं, हमारी टीम आपसे संपर्क करेगी।'
                      : 'Share your issue, our team will get back to you.'}
                  </p>
                </div>
              </div>
            </div>

            <Link
              href='tel:+919876543210'
              className='mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#9e6315] hover:bg-[#85520d] px-6 py-3.5 text-sm sm:text-[15px] font-bold text-white shadow-xs transition active:scale-[0.98]'
            >
              <span>{lang === 'hi' ? 'संपर्क करें' : 'Contact Us'}</span>
              <ArrowRightIcon className='size-4' />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
