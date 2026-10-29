'use client'

import Image from 'next/image'

import { useContactSettings } from '@/context/ContactSettingsContext'
import { useLanguage } from '@/context/LanguageContext'

/**
 * Standalone "About Us" page content — business-supplied text for
 * ThanesarInfo.com (2026-10-29), kept as plain content with no extra
 * cards/boxes/icons per explicit request. Contact details (phone/email/
 * address) are NOT hardcoded here — they come from useContactSettings(),
 * the same admin-configurable source (/admin/settings/contact) every other
 * public page uses, per CLAUDE.md §5.
 */
const AboutSection = () => {
  const { lang } = useLanguage()
  const { phone, email, address, addressHi } = useContactSettings()
  const displayAddress = (lang === 'hi' ? (addressHi ?? address) : (address ?? addressHi)) ?? '—'

  const services = [
    {
      en: 'Online booth/stall applications across the available categories.',
      hi: 'उपलब्ध श्रेणियों में ऑनलाइन बूथ/स्टॉल आवेदन।'
    },
    {
      en: 'Category-wise eligibility criteria and application guidelines.',
      hi: 'श्रेणी-वार पात्रता मानदंड और आवेदन दिशा-निर्देश।'
    },
    {
      en: 'Online submission of application forms and required documents.',
      hi: 'आवेदन फॉर्म और आवश्यक दस्तावेज़ों का ऑनलाइन सबमिशन।'
    },
    {
      en: 'Application fee payment, wherever applicable.',
      hi: 'जहां लागू हो, वहां आवेदन शुल्क का भुगतान।'
    },
    {
      en: 'Application verification updates and requests for additional information.',
      hi: 'आवेदन सत्यापन अपडेट और अतिरिक्त जानकारी के अनुरोध।'
    },
    {
      en: 'Application status tracking and result announcements.',
      hi: 'आवेदन की स्थिति ट्रैक करना और परिणाम की घोषणा।'
    },
    {
      en: 'Information about booth/stall allotment fees, deposits, and auction procedures.',
      hi: 'बूथ/स्टॉल आबंटन शुल्क, जमा राशि और नीलामी प्रक्रियाओं की जानकारी।'
    },
    {
      en: 'Access to allotment letters and booth/stall location details, as applicable.',
      hi: 'जहां लागू हो, वहां आबंटन पत्र और बूथ/स्टॉल स्थान के विवरण तक पहुंच।'
    },
    {
      en: 'Helpdesk support for application-related queries.',
      hi: 'आवेदन संबंधी प्रश्नों के लिए हेल्पडेस्क सहायता।'
    }
  ]

  return (
    <section className='py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white'>
      <div className='mx-auto max-w-3xl'>
        <div className='mb-3 inline-flex items-center gap-3'>
          <span className='text-xs sm:text-sm font-extrabold tracking-wider text-[#d8891d] uppercase shrink-0'>
            {lang === 'hi' ? 'पोर्टल के बारे में' : 'About the Portal'}
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

        <h1 className='mb-8 text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0c2847]'>
          {lang === 'hi' ? (
            <>
              हमारे <span className='text-[#d8891d]'>बारे में</span>
            </>
          ) : (
            <>
              About <span className='text-[#d8891d]'>Us</span>
            </>
          )}
        </h1>

        <h2 className='mb-2 border-l-4 border-[#d8891d] pl-3 text-xl sm:text-2xl font-extrabold text-[#0c2847]'>
          {lang === 'hi' ? 'ThanesarInfo.com के बारे में' : 'About ThanesarInfo.com'}
        </h2>
        <p className='mb-4 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi'
            ? 'ThanesarInfo.com अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 के बूथ/स्टॉल आवेदन और आबंटन प्रक्रिया के लिए कुरुक्षेत्र विकास बोर्ड (KDB) का एक समर्पित ऑनलाइन पोर्टल है।'
            : 'ThanesarInfo.com is a dedicated online portal of the Kurukshetra Development Board (KDB) for the International Gita Jayanti Mahotsav 2026 Booth/Stall Application and Allotment Process.'}
        </p>
        <p className='mb-4 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi'
            ? 'यह पोर्टल पूरी बूथ/स्टॉल आवेदन प्रक्रिया को सुविधाजनक बनाने के लिए विकसित किया गया है — ऑनलाइन आवेदन सबमिशन और दस्तावेज़ सत्यापन से लेकर आवेदन स्थिति ट्रैकिंग, परिणाम घोषणा, भुगतान औपचारिकताओं और अंतिम बूथ/स्टॉल आबंटन तक।'
            : 'The portal has been developed to facilitate the complete booth/stall application journey, from online application submission and document verification to application status tracking, result announcements, payment formalities, and final booth/stall allotment.'}
        </p>
        <p className='mb-4 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi'
            ? 'ThanesarInfo.com के माध्यम से, पात्र व्यक्ति, फर्म, कंपनियां, एजेंसियां, सामाजिक संगठन, कारीगर, सरकारी विभाग और अन्य आवेदक उपलब्ध बूथ/स्टॉल श्रेणियों को देख सकते हैं, पात्रता मानदंडों की समीक्षा कर सकते हैं, श्रेणी-वार दिशा-निर्देश पढ़ सकते हैं, ऑनलाइन आवेदन जमा कर सकते हैं, आवश्यक दस्तावेज़ अपलोड कर सकते हैं और आवेदन की प्रगति को ट्रैक कर सकते हैं।'
            : 'Through ThanesarInfo.com, eligible individuals, firms, companies, agencies, social organisations, artisans, government departments, and other applicants can explore available booth/stall categories, review eligibility criteria, read category-wise guidelines, submit applications online, upload the required documents, and track application progress.'}
        </p>
        <p className='mb-8 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi'
            ? 'पोर्टल अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 से संबंधित महत्वपूर्ण तिथियां, आवेदन शुल्क विवरण, आबंटन प्रक्रिया, भुगतान निर्देश, बूथ/स्टॉल स्थान की जानकारी, आबंटन पत्र और अन्य प्रासंगिक अपडेट भी प्रदान करता है।'
            : 'The portal also provides important dates, application fee details, allotment procedures, payment instructions, booth/stall location information, allotment letters, and other relevant updates related to International Gita Jayanti Mahotsav 2026.'}
        </p>

        <h2 className='mb-2 border-l-4 border-[#d8891d] pl-3 text-xl sm:text-2xl font-extrabold text-[#0c2847]'>
          {lang === 'hi' ? 'हमारा उद्देश्य' : 'Our Purpose'}
        </h2>
        <p className='mb-8 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi'
            ? 'हमारा उद्देश्य आवेदकों के लिए बूथ/स्टॉल आवेदन और आबंटन प्रक्रिया को अधिक सुलभ, व्यवस्थित और सुविधाजनक बनाना है। आवेदन संबंधी सेवाओं और जानकारी को एक ही डिजिटल प्लेटफॉर्म पर लाकर, हमारा लक्ष्य आवेदकों को हर चरण में आवश्यकताओं को समझने और निर्धारित प्रक्रियाओं का पालन करने में मदद करना है।'
            : 'Our purpose is to make the booth/stall application and allotment process more accessible, organised, and convenient for applicants. By bringing application-related services and information together on a single digital platform, we aim to help applicants understand the requirements and follow the prescribed procedures at every stage.'}
        </p>

        <h2 className='mb-2 border-l-4 border-[#d8891d] pl-3 text-xl sm:text-2xl font-extrabold text-[#0c2847]'>
          {lang === 'hi' ? 'हमारी सेवाएं' : 'Our Services'}
        </h2>
        <p className='mb-3 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi'
            ? 'ThanesarInfo.com निम्नलिखित के लिए डिजिटल सुविधाएं प्रदान करता है:'
            : 'ThanesarInfo.com provides digital facilities for:'}
        </p>
        <ul className='mb-8 space-y-2 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {services.map((item, idx) => (
            <li key={idx} className='flex items-baseline gap-2.5'>
              <span className='mt-1 size-1.5 shrink-0 rounded-full bg-[#d8891d]' />
              <span>{lang === 'hi' ? item.hi : item.en}</span>
            </li>
          ))}
        </ul>

        <h2 className='mb-2 border-l-4 border-[#d8891d] pl-3 text-xl sm:text-2xl font-extrabold text-[#0c2847]'>
          {lang === 'hi' ? 'बूथ/स्टॉल श्रेणियां' : 'Booth/Stall Categories'}
        </h2>
        <p className='mb-4 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi'
            ? 'यह पोर्टल सामाजिक संगठन, जलपान एवं आइसक्रीम, मिष्ठान एवं विशेष खाद्य वस्तुएं, SARAS, आर्टिजन कार्ड धारक, राष्ट्रीय पुरस्कार विजेता, विशेष आर्ट एंड क्राफ्ट, वुडन क्राफ्ट एवं कारपेट, सरकारी विभाग और ब्रांड प्रमोशन एवं कॉर्पोरेट सहित श्रेणियों के तहत पात्र प्रतिभागियों के लिए आवेदन की सुविधा देता है।'
            : 'The portal facilitates applications for eligible participants under categories including Social Organisations, Refreshment and Ice Cream, Sweets and Special Food Items, SARAS, Artisan Card Holders, National Awardees, Special Art and Craft, Wooden Craft and Carpets, Government Departments, and Brand Promotion and Corporate.'}
        </p>
        <p className='mb-8 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi'
            ? 'प्रत्येक श्रेणी की विशिष्ट पात्रता आवश्यकताएं, दस्तावेज़ीकरण, भुगतान शर्तें और आबंटन प्रक्रियाएं हैं। आवेदकों को आवेदन जमा करने से पहले संबंधित दिशा-निर्देशों को ध्यानपूर्वक पढ़ना चाहिए।'
            : 'Each category has specific eligibility requirements, documentation, payment terms, and allotment procedures. Applicants must carefully read the relevant guidelines before submitting their applications.'}
        </p>

        <h2 className='mb-2 border-l-4 border-[#d8891d] pl-3 text-xl sm:text-2xl font-extrabold text-[#0c2847]'>
          {lang === 'hi' ? 'आवेदन और आबंटन प्रक्रिया' : 'Application and Allotment Process'}
        </h2>
        <p className='mb-4 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi'
            ? 'इस प्रक्रिया में आम तौर पर ऑनलाइन आवेदन सबमिशन, दस्तावेज़ सत्यापन, लागू श्रेणी नियमों के अनुसार चयन या आबंटन, परिणाम घोषणा, आवश्यक भुगतान पूर्ण करना और अंतिम आबंटन की पुष्टि शामिल है।'
            : 'The process generally includes online application submission, document verification, selection or allotment according to the applicable category rules, result announcements, completion of required payments, and final allotment confirmation.'}
        </p>
        <p className='mb-4 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi'
            ? 'श्रेणी के आधार पर, आबंटन सीधे आबंटन, ड्रॉ, नीलामी या किसी अन्य निर्धारित प्रक्रिया के माध्यम से हो सकता है। सभी आवेदन और आबंटन लागू पात्रता शर्तों, सत्यापन, उपलब्धता और स्वीकृति आवश्यकताओं के अधीन रहते हैं।'
            : 'Depending on the category, allotment may take place through direct allotment, a draw, an auction, or another prescribed procedure. All applications and allotments remain subject to the applicable eligibility conditions, verification, availability, and approval requirements.'}
        </p>
        <p className='mb-8 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi'
            ? 'आवेदन जमा करना या आवेदन शुल्क का भुगतान करना बूथ/स्टॉल आबंटन की गारंटी नहीं देता।'
            : 'Submitting an application or paying the application fee does not guarantee booth/stall allotment.'}
        </p>

        <h2 className='mb-2 border-l-4 border-[#d8891d] pl-3 text-xl sm:text-2xl font-extrabold text-[#0c2847]'>
          {lang === 'hi' ? 'हमारी प्रतिबद्धता' : 'Our Commitment'}
        </h2>
        <p className='mb-4 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi'
            ? 'कुरुक्षेत्र विकास बोर्ड का लक्ष्य अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 से जुड़े बूथ/स्टॉल आवेदनों के लिए एक व्यवस्थित डिजिटल प्रक्रिया प्रदान करना है। ThanesarInfo.com आवश्यक आवेदन सुविधाओं और जानकारी को एक साथ लाता है ताकि पात्र प्रतिभागी आवश्यक चरणों को पूरा कर सकें और अपने आवेदनों के बारे में जानकारी रख सकें।'
            : 'The Kurukshetra Development Board aims to provide an organised digital process for booth/stall applications associated with International Gita Jayanti Mahotsav 2026. ThanesarInfo.com brings essential application facilities and information together to help eligible participants complete the required steps and stay informed about their applications.'}
        </p>
        <p className='mb-8 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi'
            ? 'हम सभी आवेदकों को सही जानकारी देने, आवश्यक दस्तावेज़ अपलोड करने, आवेदन की समय-सीमा का पालन करने और अपनी चुनी हुई श्रेणी पर लागू दिशा-निर्देशों का अनुपालन करने के लिए प्रोत्साहित करते हैं।'
            : 'We encourage all applicants to provide accurate information, upload the required documents, follow application deadlines, and comply with the guidelines applicable to their selected category.'}
        </p>

        <h2 className='mb-2 border-l-4 border-[#d8891d] pl-3 text-xl sm:text-2xl font-extrabold text-[#0c2847]'>
          {lang === 'hi' ? 'संपर्क करें' : 'Contact Us'}
        </h2>
        <p className='mb-4 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi'
            ? 'ऑनलाइन आवेदन, दस्तावेज़ सबमिशन, आवेदन स्थिति, भुगतान या आबंटन संबंधी प्रक्रियाओं में सहायता के लिए, कृपया पोर्टल हेल्पडेस्क से संपर्क करें।'
            : 'For assistance with online applications, document submission, application status, payments, or allotment-related procedures, please contact the portal helpdesk.'}
        </p>
        <p className='text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi' ? 'फोन: ' : 'Phone: '}
          <a href={phone ? `tel:${phone}` : undefined} className='font-semibold text-[#0c2847] hover:text-[#b8761b]'>
            {phone ?? '—'}
          </a>
          <br />
          {lang === 'hi' ? 'ईमेल: ' : 'Email: '}
          <a href={email ? `mailto:${email}` : undefined} className='font-semibold text-[#0c2847] hover:text-[#b8761b]'>
            {email ?? '—'}
          </a>
          <br />
          {lang === 'hi' ? 'पता: ' : 'Address: '}
          {displayAddress}
          <br />
          {lang === 'hi' ? 'सहायता समय: ' : 'Support Hours: '}
          {lang === 'hi' ? 'सोमवार से शुक्रवार, सुबह 10:00 बजे से शाम 5:00 बजे तक' : 'Monday to Friday, 10:00 AM to 5:00 PM'}
        </p>

        <p className='mt-8 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi'
            ? 'ThanesarInfo.com पर आने के लिए धन्यवाद। हम अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 के प्रतिभागियों के लिए एक सुविधाजनक और व्यवस्थित आवेदन अनुभव प्रदान करने के लिए तत्पर हैं।'
            : 'Thank you for visiting ThanesarInfo.com. We look forward to facilitating a convenient and organised application experience for participants of International Gita Jayanti Mahotsav 2026.'}
        </p>
      </div>
    </section>
  )
}

export default AboutSection
