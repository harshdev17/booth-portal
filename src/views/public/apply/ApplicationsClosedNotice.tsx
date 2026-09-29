'use client'

import { useLanguage } from '@/context/LanguageContext'

/**
 * Shown instead of the application form when a category is not currently
 * accepting applications (per isCategoryAcceptingApplications). Split out
 * as a client component, following the same server-fetch/client-render
 * split used elsewhere (see src/views/public/home/index.tsx +
 * PublicHomeClient.tsx), since the parent page is a Server Component with
 * no lang-plumbing of its own.
 */
const ApplicationsClosedNotice = ({
  categoryName,
  categoryNameHi
}: {
  categoryName: string
  categoryNameHi: string | null
}) => {
  const { lang } = useLanguage()
  const displayName = lang === 'hi' && categoryNameHi ? categoryNameHi : categoryName

  return (
    <div className='mx-auto max-w-xl px-4 py-20 text-center sm:px-6'>
      <h1 className='mb-3 text-2xl font-extrabold text-[var(--kdb-primary)]'>
        {lang === 'hi' ? 'आवेदन बंद हैं' : 'Applications Closed'}
      </h1>
      <p className='text-[var(--kdb-muted)]'>
        {lang === 'hi'
          ? `${displayName} वर्तमान में आवेदन के लिए स्वीकार नहीं कर रही है। कृपया अन्य खुली श्रेणियों के लिए मुख्य पृष्ठ देखें।`
          : `${displayName} is not currently accepting applications. Please check the homepage for other open categories.`}
      </p>
    </div>
  )
}

export default ApplicationsClosedNotice
