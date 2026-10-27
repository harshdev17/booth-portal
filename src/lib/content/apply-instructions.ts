export type ApplyInstructions = {
  slug: string
  bullets: Array<{ en: string; hi: string }>

  // Optional verbatim overrides for the "Before You Start" panel: when set
  // they replace the document list built from the upload slots and the
  // generic "Important Instructions" list for this category.
  requiredDocuments?: Array<{ en: string; hi: string }>

  /** Heading for `bullets` when it should differ from the default "Before You Apply". */
  bulletsHeading?: { en: string; hi: string }
  importantInstructions?: Array<{ en: string; hi: string }>

  /** Hide the DB-driven "last date / auction" box when the dates are given in `sections` instead. */
  hideScheduleBox?: boolean

  /** Extra titled blocks (e.g. "Eligibility Criteria"), shown after the document list. */
  sections?: Array<{
    title: { en: string; hi: string }
    intro?: { en: string; hi: string }
    items?: Array<{ en: string; hi: string }>
    note?: { en: string; hi: string }
  }>
}

// Category-specific "Before You Start" instruction bullets, shown on the
// apply form's InstructionsStep.tsx, directly above the data-entry fields.
// Supplied verbatim by the business per category — distinct from, and
// shorter than, the full guideline text in category-guidelines.ts (which
// covers the complete rules on /guidelines and /categories/[slug]). This is
// the quick "read before you fill this in" checklist for the form itself.
// Previously InstructionsStep.tsx showed one identical generic 7-bullet list
// for every category; this makes that list category-specific instead.
//
// Hindi text here is translated, not transliterated — the business's source
// mixed English technical/legal terms directly into Hindi sentences (common
// in Indian government documents), but on a clean language toggle that
// reads as broken Hindi with English words sitting unrelated inside it. Per
// explicit instruction, the Hindi below uses plain, everyday words for
// translatable terms (e.g. "पंजीकरण प्रमाणपत्र" for Registration Certificate,
// "ड्रॉ निकालना" for Draw of Lots, "वापस नहीं की जाएगी" for Non-Refundable) —
// not literary/शुद्ध Hindi, which would be harder to read than the mixed
// original. Official acronyms and names with no common Hindi equivalent
// (KDB, GST, FSSAI, Aadhaar, DD, LPG) are kept as-is in both languages.
export const APPLY_INSTRUCTIONS: ApplyInstructions[] = [
  {
    slug: 'ngos-social-organizations',
    requiredDocuments: [
      {
        en: 'Applicant / Authorized Representative Aadhaar Card',
        hi: 'आवेदक / अधिकृत प्रतिनिधि का आधार कार्ड'
      },
      {
        en: 'Valid NGO Registration Certificate',
        hi: 'वैध NGO पंजीकरण प्रमाणपत्र'
      },
      {
        en: 'Authorization Letter',
        hi: 'प्राधिकरण पत्र'
      }
    ],
    bullets: [
      {
        en: 'The organisation must have a valid NGO Registration Certificate.',
        hi: 'संगठन के पास वैध NGO पंजीकरण प्रमाणपत्र होना अनिवार्य है।'
      },
      {
        en: 'The application must be submitted by the organisation\'s authorized representative.',
        hi: 'आवेदन संगठन के अधिकृत प्रतिनिधि द्वारा किया जाना चाहिए।'
      },
      {
        en: 'Enter all details exactly as they appear on your government-issued identity documents.',
        hi: 'अपनी सभी जानकारी सरकारी पहचान दस्तावेज़ों में दर्ज जानकारी के अनुसार ही भरें।'
      },
      {
        en: 'Upload clear, complete, and readable documents. Unclear or incomplete documents may result in rejection.',
        hi: 'सभी दस्तावेज़ स्पष्ट, पूर्ण और पढ़ने योग्य अपलोड करें। अस्पष्ट या अधूरे दस्तावेज़ के कारण आवेदन अस्वीकार किया जा सकता है।'
      },
      {
        en: 'The ₹236 application fee (₹200 + 18% GST) is mandatory for all applicants and is Non-Refundable, whether the application is accepted, rejected, or a Booth/Stall is allotted.',
        hi: '₹236 आवेदन शुल्क (₹200 + 18% GST) सभी आवेदकों के लिए अनिवार्य है और यह गैर-वापसी योग्य है। आवेदन स्वीकार हो, अस्वीकार हो या बूथ/स्टॉल आबंटित हो, किसी भी स्थिति में यह शुल्क वापस नहीं किया जाएगा।'
      },
      {
        en: 'Only the documents required for the selected Booth/Stall category will be verified.',
        hi: 'केवल चयनित बूथ/स्टॉल श्रेणी के लिए आवश्यक दस्तावेज़ों का सत्यापन किया जाएगा।'
      },
      {
        en: 'Only verified and eligible organisations will be included in the Booth/Stall allotment process.',
        hi: 'केवल सत्यापित और पात्र संगठनों को बूथ/स्टॉल आबंटन प्रक्रिया में शामिल किया जाएगा।'
      },
      {
        en: 'If eligible applications are within the available Booth/Stall limit, Booths/Stalls will be allotted directly.',
        hi: 'यदि पात्र आवेदनों की संख्या उपलब्ध बूथ/स्टॉल की सीमा के भीतर रहती है, तो बूथ/स्टॉल सीधे आबंटित किए जाएंगे।'
      },
      {
        en: 'If eligible applications exceed the available Booth/Stall limit, allotment will be made through a Draw.',
        hi: 'यदि पात्र आवेदनों की संख्या उपलब्ध बूथ/स्टॉल की सीमा से अधिक होती है, तो बूथ/स्टॉल का आबंटन ड्रॉ के माध्यम से किया जाएगा।'
      },
      {
        en: 'The NGO Booth/Stall will be provided free of cost to the selected organisation.',
        hi: 'चयनित संगठन को NGO बूथ/स्टॉल निःशुल्क प्रदान किया जाएगा।'
      },
      {
        en: 'The Booth/Stall may be used only for social awareness, publicity, and social-service activities.',
        hi: 'बूथ/स्टॉल का उपयोग केवल सामाजिक जागरूकता, प्रचार-प्रसार और सामाजिक सेवा संबंधी गतिविधियों के लिए किया जा सकेगा।'
      },
      {
        en: 'No commercial activity or product selling is permitted.',
        hi: 'किसी भी प्रकार की व्यावसायिक गतिविधि या उत्पाद की बिक्री की अनुमति नहीं होगी।'
      },
      {
        en: 'Once submitted, the application cannot be modified.',
        hi: 'आवेदन जमा करने के बाद उसमें कोई बदलाव नहीं किया जा सकेगा।'
      },
      {
        en: 'Applications containing incomplete, incorrect, or misleading information may be rejected.',
        hi: 'अधूरी, गलत या भ्रामक जानकारी वाले आवेदन अस्वीकार किए जा सकते हैं।'
      }
    ],
    importantInstructions: [
      {
        en: 'The final decision to accept or reject any application rests with the Kurukshetra Development Board (KDB).',
        hi: 'किसी भी आवेदन को स्वीकार या अस्वीकार करने का अंतिम निर्णय कुरुक्षेत्र विकास बोर्ड (KDB) का होगा।'
      },
      {
        en: 'The Board reserves the right to verify the submitted documents and application form based on the organisation\'s eligibility.',
        hi: 'बोर्ड को संगठन की पात्रता के अनुसार जमा किए गए दस्तावेज़ों और आवेदन फॉर्म का सत्यापन करने का अधिकार है।'
      },
      {
        en: 'The allotment process will be carried out as per the prescribed rules and guidelines.',
        hi: 'बूथ/स्टॉल आबंटन प्रक्रिया निर्धारित नियमों और दिशानिर्देशों के अनुसार की जाएगी।'
      },
      {
        en: 'KDB has the right to change the number of available Booths/Stalls, Booth/Stall locations, allotment process, or other arrangements if required for the International Gita Jayanti Mahotsav 2026.',
        hi: 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 के लिए आवश्यकता अनुसार KDB उपलब्ध बूथ/स्टॉलों की संख्या, बूथ/स्टॉल के स्थान, आबंटन प्रक्रिया या अन्य व्यवस्थाओं में बदलाव कर सकता है।'
      },
      {
        en: 'Please regularly check ThanesarInfo.com for the latest updates and announcements related to the International Gita Jayanti Mahotsav 2026, Booth/Stall application, and allotment process.',
        hi: 'बूथ/स्टॉल आवेदन और आबंटन प्रक्रिया से संबंधित नवीनतम अपडेट और घोषणाओं के लिए ThanesarInfo.com को नियमित रूप से चेक करते रहें।'
      }
    ]
  },
  {
    slug: 'govt-departments',
    requiredDocuments: [
      {
        en: 'Valid Government ID of the authorized officer or representative.',
        hi: 'अधिकृत अधिकारी या प्रतिनिधि का वैध सरकारी पहचान पत्र।'
      },
      {
        en: 'Authorization Letter issued by the concerned government department.',
        hi: 'संबंधित सरकारी विभाग द्वारा जारी प्राधिकरण पत्र (Department Authorization Letter)।'
      }
    ],
    sections: [
      {
        title: { en: 'Eligibility Criteria', hi: 'पात्रता' },
        intro: { en: 'The following departments may apply, subject to verification and approval by KDB:', hi: 'नीचे दिए गए विभाग KDB द्वारा दस्तावेजों की जांच और स्वीकृति के अधीन आवेदन कर सकते हैं:' },
        items: [
          {
            en: 'Police Department',
            hi: 'पुलिस विभाग'
          },
          {
            en: 'Health Department',
            hi: 'स्वास्थ्य विभाग'
          },
          {
            en: 'Education Department',
            hi: 'शिक्षा विभाग'
          },
          {
            en: 'Women and Child Development Department',
            hi: 'महिला एवं बाल विकास विभाग'
          },
          {
            en: 'Agriculture Department',
            hi: 'कृषि विभाग'
          },
          {
            en: 'Other eligible Central Government, Haryana Government, or State Government departments working for public services, citizen guidance, government schemes, or public awareness.',
            hi: 'अन्य पात्र केंद्र सरकार, हरियाणा सरकार या राज्य सरकार के विभाग, जो सरकारी योजनाओं, नागरिक सेवाओं, जनहित या जन जागरूकता से जुड़े कार्य करते हैं।'
          }
        ],
        note: { en: 'The application must be submitted by an authorized officer or representative of the concerned department. A valid Government ID and an official Department Authorization Letter are required.', hi: 'आवेदन संबंधित विभाग के अधिकृत अधिकारी या प्रतिनिधि द्वारा ही किया जाना चाहिए। इसके लिए वैध सरकारी पहचान पत्र और विभाग द्वारा जारी प्राधिकरण पत्र जमा करना अनिवार्य है।' }
      },
      {
        title: { en: 'Who Cannot Apply Under This Category?', hi: 'कौन इस श्रेणी में आवेदन नहीं कर सकता?' },
        intro: { en: 'Private companies, commercial banks, insurance companies, financial institutions, and other commercial businesses cannot apply under this category to promote their products, policies, or commercial services. Eligible commercial organizations may apply under the Brand Promotion category, subject to its separate eligibility criteria, fees, and rules.', hi: 'निजी कंपनियां, वाणिज्यिक बैंक, बीमा कंपनियां, वित्तीय संस्थान और अन्य व्यावसायिक संस्थाएं अपने उत्पादों, पॉलिसियों या व्यावसायिक सेवाओं के प्रचार के लिए इस श्रेणी में आवेदन नहीं कर सकतीं। पात्र व्यावसायिक संस्थाएं अपनी अलग पात्रता, शुल्क और नियमों के अनुसार Brand Promotion श्रेणी में आवेदन कर सकती हैं।' }
      }
    ],
    bullets: [
      {
        en: 'Apply only on behalf of an eligible government department.',
        hi: 'आवेदन केवल किसी पात्र सरकारी विभाग की ओर से करें।'
      },
      {
        en: 'Upload the required Government ID and Department Authorization Letter.',
        hi: 'अधिकृत अधिकारी या प्रतिनिधि का सरकारी पहचान पत्र और विभाग का प्राधिकरण पत्र अपलोड करें।'
      },
      {
        en: 'Use the booth/stall only for government schemes, citizen services, public information, public awareness, and departmental activities related to public interest.',
        hi: 'बूथ/स्टॉल का उपयोग केवल सरकारी योजनाओं, नागरिक सेवाओं, सरकारी जानकारी, जन जागरूकता और जनहित से जुड़ी विभागीय गतिविधियों के लिए करें।'
      },
      {
        en: 'KDB will verify the submitted documents and the proposed activities.',
        hi: 'जमा किए गए दस्तावेजों और प्रस्तावित गतिविधियों की जांच KDB द्वारा की जाएगी।'
      },
      {
        en: 'The final booth/stall location will be decided by KDB according to the approved layout and available space. A preferred location is not guaranteed.',
        hi: 'बूथ/स्टॉल का अंतिम स्थान KDB द्वारा स्वीकृत लेआउट और उपलब्ध जगह के अनुसार तय किया जाएगा। पसंद का स्थान मिलना सुनिश्चित नहीं है।'
      },
      {
        en: 'The booth/stall cannot be transferred, rented out, or sublet to another person or organization without KDB\'s permission.',
        hi: 'KDB की अनुमति के बिना बूथ/स्टॉल किसी अन्य व्यक्ति या संस्था को हस्तांतरित, किराए पर या सबलेट नहीं किया जा सकता।'
      }
    ],
    importantInstructions: [
      {
        en: 'Enter correct details and upload clear, complete, and readable documents.',
        hi: 'आवेदन में सही जानकारी भरें और सभी दस्तावेज स्पष्ट, पूर्ण तथा पढ़ने योग्य अपलोड करें।'
      },
      {
        en: 'Once submitted, the application cannot be modified.',
        hi: 'आवेदन जमा करने के बाद उसमें बदलाव नहीं किया जा सकेगा।'
      },
      {
        en: 'Applications containing incomplete, incorrect, misleading, or false information may be rejected or cancelled.',
        hi: 'अधूरी, गलत, भ्रामक या झूठी जानकारी देने पर आवेदन अस्वीकार किया जा सकता है या आबंटन रद्द किया जा सकता है।'
      },
      {
        en: 'KDB may ask for additional documents or information if required.',
        hi: 'आवश्यकता पड़ने पर KDB अतिरिक्त दस्तावेज या जानकारी मांग सकता है।'
      },
      {
        en: 'Follow all rules related to cleanliness, safety, public movement, and booth/stall operations.',
        hi: 'बूथ/स्टॉल के संचालन, साफ-सफाई, सुरक्षा और सार्वजनिक आवागमन से जुड़े सभी नियमों का पालन करें।'
      },
      {
        en: 'Violation of the applicable rules may result in cancellation of the booth/stall allotment.',
        hi: 'नियमों का उल्लंघन करने पर बूथ/स्टॉल का आबंटन रद्द किया जा सकता है।'
      },
      {
        en: 'The final decision regarding eligibility, verification, and booth/stall allotment will rest with KDB.',
        hi: 'पात्रता, दस्तावेज सत्यापन और बूथ/स्टॉल आबंटन से संबंधित अंतिम निर्णय KDB का होगा।'
      },
      {
        en: 'For updates about the application, verification, and allotment process, regularly visit ThanesarInfo.com.',
        hi: 'आवेदन, दस्तावेज सत्यापन और आबंटन से जुड़े नवीनतम अपडेट के लिए नियमित रूप से ThanesarInfo.com देखें।'
      },
      {
        en: 'Any dispute will be subject to the jurisdiction of courts at Kurukshetra, as applicable.',
        hi: 'सभी विवादों पर लागू कानून के अनुसार कुरुक्षेत्र स्थित न्यायालयों का क्षेत्राधिकार होगा।'
      }
    ]
  },
  {
    slug: 'refreshment-stalls',
    requiredDocuments: [
      {
        en: 'Aadhaar Card or valid identity proof of the applicant/authorized representative',
        hi: 'आवेदक / अधिकृत प्रतिनिधि का आधार कार्ड या वैध पहचान पत्र'
      },
      {
        en: 'Business/Firm Registration Certificate, GST Certificate, or PAN Card',
        hi: 'व्यवसाय / फर्म पंजीकरण प्रमाणपत्र / GST प्रमाणपत्र या PAN कार्ड'
      },
      {
        en: 'Valid FSSAI License',
        hi: 'वैध FSSAI लाइसेंस'
      }
    ],
    bulletsHeading: { en: 'Important Instructions Before Applying', hi: 'आवेदन करने से पहले' },
    bullets: [
      {
        en: 'Applicants must have an active WhatsApp mobile number and email ID to apply.',
        hi: 'आवेदन करने के लिए आवेदक के पास एक WhatsApp मोबाइल नंबर और ईमेल आईडी होना अनिवार्य है।'
      },
      {
        en: 'All applicants must pay a non-refundable application fee of ₹236 (₹200 + 18% GST) online. This fee will not be refunded, whether the application is accepted or rejected.',
        hi: 'सभी आवेदकों को ₹236 आवेदन शुल्क (₹200 + 18% GST) ऑनलाइन जमा करना होगा। यह शुल्क गैर-वापसी योग्य है। आवेदन स्वीकार हो या अस्वीकार, किसी भी स्थिति में आवेदन शुल्क वापस नहीं किया जाएगा।'
      },
      {
        en: 'The application fee is separate from the booth/stall allotment and auction-related charges.',
        hi: 'आवेदन शुल्क बूथ/स्टॉल आबंटन और नीलामी से संबंधित अन्य शुल्कों से अलग है।'
      },
      {
        en: 'Fill in all application details correctly according to your government-issued identity proof and official business documents. Applications containing incorrect, incomplete, or misleading information may be rejected.',
        hi: 'आवेदन फॉर्म में सभी जानकारी सरकारी पहचान पत्रों और आधिकारिक व्यवसाय दस्तावेजों के अनुसार सही-सही भरें। गलत, अधूरी या भ्रामक जानकारी मिलने पर आवेदन अस्वीकार किया जा सकता है।'
      },
      {
        en: 'Upload all required documents clearly and ensure they are complete and readable so that the information provided in the application can be verified.',
        hi: 'सभी आवश्यक दस्तावेज स्पष्ट और पढ़ने योग्य अपलोड करें, ताकि आवेदन में दी गई जानकारी का सत्यापन किया जा सके।'
      },
      {
        en: 'After verification of the application and documents, applicants will receive an acceptance or rejection message on their registered WhatsApp number. If you do not receive a message due to technical issues, check your application status on the website 48 hours after submitting your application.',
        hi: 'आवेदन और दस्तावेजों का सत्यापन होने के बाद आवेदन स्वीकार या अस्वीकार होने की सूचना आपके दिए गए WhatsApp नंबर पर भेजी जाएगी। यदि तकनीकी कारण से आपको सूचना नहीं मिलती है, तो आवेदन जमा करने के 48 घंटे बाद वेबसाइट पर अपने आवेदन की स्थिति चेक करें।'
      },
      {
        en: 'Only applicants verified and declared eligible by the Kurukshetra Development Board (KDB) will be allowed to participate in the physical auction. Eligible applicants must submit an auction participation fee of ₹50,000 through a Demand Draft (DD). This amount will be refunded according to the prescribed procedure to applicants who are not allotted a booth/stall.',
        hi: 'केवल कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा सत्यापित और पात्र घोषित आवेदक ही प्रत्यक्ष नीलामी में भाग ले सकेंगे। पात्र आवेदकों को ₹50,000 नीलामी भागीदारी शुल्क डिमांड ड्राफ्ट (DD) के माध्यम से जमा करना होगा। जिन आवेदकों को बूथ/स्टॉल आबंटित नहीं होगा, उन्हें यह राशि निर्धारित प्रक्रिया के अनुसार वापस कर दी जाएगी।'
      },
      {
        en: 'For the successful bidder, the ₹50,000 participation fee will serve as the security deposit. No additional security deposit of ₹50,000 will be required.',
        hi: 'सफल बोलीदाता के लिए ₹50,000 की भागीदारी राशि ही सिक्योरिटी डिपॉजिट मानी जाएगी। इसके लिए अलग से ₹50,000 जमा नहीं करने होंगे।'
      },
      {
        en: 'The base bid for each booth/stall is ₹2,00,000 (Rupees Two Lakh only). The final bid amount will be determined during the auction.',
        hi: 'बूथ/स्टॉल की बेस बिड ₹2,00,000 (दो लाख रुपये) निर्धारित की गई है। अंतिम बोली राशि नीलामी में तय होगी।'
      },
      {
        en: 'The successful bidder must pay the full final bid amount online within 4 days of the auction. Failure to make the payment within the prescribed time may result in cancellation of the booth/stall allotment.',
        hi: 'सफल बोलीदाता को नीलामी में तय हुई पूरी अंतिम बोली राशि नीलामी के 4 दिनों के भीतर ऑनलाइन जमा करनी होगी। निर्धारित समय में भुगतान नहीं करने पर बूथ/स्टॉल आबंटन रद्द किया जा सकता है।'
      },
      {
        en: 'Only permitted, pre-packaged food products that are ready for sale and packaged beverages may be sold at the booth/stall. Cooking, frying, heating, or preparing food in any form at the booth/stall is not allowed.',
        hi: 'बूथ/स्टॉल पर केवल अनुमति प्राप्त, पहले से पैक किए गए और बिक्री के लिए तैयार खाद्य पदार्थ तथा पैक किए हुए पेय पदार्थ ही बेचे जा सकेंगे। बूथ/स्टॉल पर खाना पकाने, तलने, गर्म करने या किसी भी प्रकार से खाद्य पदार्थ तैयार करने की अनुमति नहीं होगी।'
      },
      {
        en: 'The use of LPG cylinders, gas stoves, burners, coal, wood, open flames, or any other cooking equipment is strictly prohibited.',
        hi: 'LPG सिलेंडर, गैस चूल्हे, बर्नर, कोयला, लकड़ी, खुली आग और खाना पकाने वाले अन्य उपकरणों का उपयोग पूरी तरह प्रतिबंधित है।'
      },
      {
        en: 'All booth/stall operators must follow the food safety, cleanliness, waste disposal, and other rules issued by KDB.',
        hi: 'सभी बूथ/स्टॉल संचालकों को KDB द्वारा निर्धारित खाद्य सुरक्षा, साफ-सफाई, कचरा निपटान और अन्य नियमों का पालन करना अनिवार्य होगा।'
      }
    ]
  },
  {
    slug: 'artisan-card-holders',
    requiredDocuments: [
      {
        en: 'Aadhaar Card or valid identity proof of the applicant',
        hi: 'आवेदक का आधार कार्ड या वैध पहचान पत्र'
      },
      {
        en: 'Valid Artisan Card, Artisan Registration Card, or Artisan Certificate',
        hi: 'वैध आर्टिजन कार्ड, आर्टिजन रजिस्ट्रेशन कार्ड या आर्टिजन प्रमाणपत्र'
      },
      {
        en: 'Passport-size photograph of the applicant',
        hi: 'आवेदक का पासपोर्ट साइज फोटो'
      },
      {
        en: 'Clear photographs of the applicant\'s own handicraft products or artwork',
        hi: 'आवेदक द्वारा स्वयं बनाए गए हस्तशिल्प या कलाकृतियों की स्पष्ट तस्वीरें'
      }
    ],
    sections: [
      {
        title: { en: 'Key Dates', hi: 'महत्वपूर्ण तिथियां' },
        items: [
          {
            en: 'Draw / Result Date: 5 November 2026',
            hi: 'ड्रॉ / परिणाम की तिथि: 5 नवंबर 2026'
          },
          {
            en: 'Payment Deadline: 10 November 2026',
            hi: 'भुगतान की अंतिम तिथि: 10 नवंबर 2026'
          }
        ]
      }
    ],
    bulletsHeading: { en: 'Important Instructions Before Applying', hi: 'आवेदन करने से पहले महत्वपूर्ण निर्देश' },
    bullets: [
      {
        en: 'Please read all the guidelines for this category carefully before applying.',
        hi: 'आवेदन करने से पहले इस श्रेणी के सभी दिशानिर्देशों को ध्यानपूर्वक पढ़ें।'
      },
      {
        en: 'Applicants must have an active WhatsApp mobile number and email ID.',
        hi: 'आवेदन करने के लिए सक्रिय WhatsApp मोबाइल नंबर और ईमेल आईडी होना अनिवार्य है।'
      },
      {
        en: 'Enter all details correctly as they appear on your government-issued identity proof and Artisan Card.',
        hi: 'आवेदन फॉर्म में सभी जानकारी अपने सरकारी पहचान पत्र और आर्टिजन कार्ड के अनुसार सही-सही भरें।'
      },
      {
        en: 'Upload all required documents clearly and make sure they are complete and readable.',
        hi: 'सभी आवश्यक दस्तावेज़ स्पष्ट और पढ़ने योग्य अपलोड करें।'
      },
      {
        en: 'Applicants must be genuinely engaged in artisan or handicraft work.',
        hi: 'आवेदक का वास्तव में आर्टिजन या हस्तशिल्प कार्य से जुड़ा होना अनिवार्य है।'
      },
      {
        en: 'Upload photographs of your own handicraft products or artwork only. Images taken from the internet or photographs of another person\'s work will not be accepted.',
        hi: 'केवल आवेदक द्वारा स्वयं बनाए गए हस्तशिल्प या कलाकृतियों की तस्वीरें ही अपलोड करें। इंटरनेट से ली गई या किसी अन्य व्यक्ति के काम की तस्वीरें स्वीकार नहीं की जाएंगी।'
      },
      {
        en: 'Review all details and documents carefully before submitting your application, as changes cannot be made after submission.',
        hi: 'आवेदन जमा करने से पहले सभी जानकारी और दस्तावेज़ों की अच्छी तरह जाँच कर लें। आवेदन जमा होने के बाद उसमें बदलाव नहीं किया जा सकेगा।'
      },
      {
        en: 'Only applicants verified and declared eligible by the Kurukshetra Development Board (KDB) will be considered for allotment.',
        hi: 'केवल कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा सत्यापित और पात्र घोषित आवेदकों को ही आबंटन प्रक्रिया में शामिल किया जाएगा।'
      },
      {
        en: 'Booths/stalls will be allotted directly or through a Draw, depending on availability and the number of eligible applications.',
        hi: 'उपलब्ध बूथ / बूथ/स्टॉल की संख्या और पात्र आवेदनों के आधार पर सीधे आबंटन या ड्रॉ के माध्यम से आबंटन किया जाएगा।'
      },
      {
        en: 'The Kurukshetra Development Board (KDB) will have the final authority to accept or reject applications and approve booth/stall allotments.',
        hi: 'आवेदन स्वीकार या अस्वीकार करने तथा बूथ / बूथ/स्टॉल आबंटन का अंतिम निर्णय कुरुक्षेत्र विकास बोर्ड (KDB) का होगा।'
      }
    ]
  },
  {
    slug: 'sweets-special-items',
    requiredDocuments: [
      {
        en: 'Aadhaar Card or valid identity proof of the applicant',
        hi: 'आवेदक का आधार कार्ड या वैध पहचान पत्र'
      },
      {
        en: 'Business / Firm Registration Certificate / GST Certificate / PAN Card',
        hi: 'व्यवसाय / फर्म पंजीकरण प्रमाणपत्र / जीएसटी प्रमाणपत्र / पैन कार्ड'
      },
      {
        en: 'Valid FSSAI License',
        hi: 'वैध FSSAI लाइसेंस'
      },
      {
        en: 'Clear photographs of the sweets / special items proposed for sale',
        hi: 'बिक्री हेतु प्रस्तावित मिष्ठान/विशेष वस्तुओं की स्पष्ट तस्वीरें'
      }
    ],
    bulletsHeading: { en: 'Important Instructions Before Applying', hi: 'आवेदन करने से पहले महत्वपूर्ण निर्देश' },
    bullets: [
      {
        en: 'Please read all the guidelines for this category carefully before applying.',
        hi: 'आवेदन करने से पहले इस श्रेणी के सभी दिशानिर्देशों को ध्यानपूर्वक पढ़ें।'
      },
      {
        en: 'Applicants must have an active WhatsApp mobile number and email ID.',
        hi: 'आवेदन करने के लिए सक्रिय WhatsApp मोबाइल नंबर और ईमेल आईडी होना अनिवार्य है।'
      },
      {
        en: 'Enter all details correctly as they appear on your government-issued identity proof and FSSAI license.',
        hi: 'आवेदन फॉर्म में सभी जानकारी अपने सरकारी पहचान पत्र और FSSAI लाइसेंस के अनुसार सही-सही भरें।'
      },
      {
        en: 'Upload all required documents clearly and make sure they are complete and readable.',
        hi: 'सभी आवश्यक दस्तावेज़ स्पष्ट और पढ़ने योग्य अपलोड करें।'
      },
      {
        en: 'The FSSAI license must be valid and must remain valid until the last date of application.',
        hi: 'FSSAI लाइसेंस वैध होना चाहिए और आवेदन की अंतिम तिथि तक वैध रहना चाहिए।'
      },
      {
        en: 'Upload photographs of the sweets / special items proposed for sale only. Images taken from the internet will not be accepted.',
        hi: 'केवल बिक्री हेतु प्रस्तावित मिष्ठान/विशेष वस्तुओं की तस्वीरें ही अपलोड करें। इंटरनेट से ली गई तस्वीरें स्वीकार नहीं की जाएंगी।'
      },
      {
        en: 'Only pre-made, ready-to-sell sweets and special items (e.g. barfi and similar items prepared off-site/at the vendor\'s own premises) may be sold. Cooking, frying, heating, or any kind of food preparation at the booth/stall during the Mahotsav is strictly not permitted.',
        hi: 'केवल पहले से बनी हुई, बिक्री हेतु तैयार मिष्ठान एवं विशेष वस्तुएं (जैसे बर्फी और इसी प्रकार की अन्य वस्तुएं, जो स्टॉल के बाहर/विक्रेता के अपने परिसर में तैयार की गई हों) ही बेची जा सकती हैं। महोत्सव के दौरान बूथ/स्टॉल पर खाना पकाना, तलना, गर्म करना या किसी भी प्रकार की खाद्य तैयारी करना सख्त वर्जित है।'
      },
      {
        en: 'Review all details and documents carefully before submitting your application, as changes cannot be made after submission.',
        hi: 'आवेदन जमा करने से पहले सभी जानकारी और दस्तावेज़ों की अच्छी तरह जाँच कर लें। आवेदन जमा होने के बाद उसमें बदलाव नहीं किया जा सकेगा।'
      },
      {
        en: 'Only applicants verified and declared eligible by the Kurukshetra Development Board (KDB) will be considered for allotment.',
        hi: 'केवल कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा सत्यापित और पात्र घोषित आवेदकों को ही आबंटन प्रक्रिया में शामिल किया जाएगा।'
      },
      {
        en: 'Booths/stalls will be allotted directly or through a Draw, depending on availability and the number of eligible applications.',
        hi: 'उपलब्ध बूथ / बूथ/स्टॉल की संख्या और पात्र आवेदनों के आधार पर सीधे आबंटन या ड्रॉ के माध्यम से आबंटन किया जाएगा।'
      },
      {
        en: 'The booth/stall allotment amount is ₹50,000.',
        hi: 'बूथ/स्टॉल आबंटन राशि ₹50,000 है।'
      },
      {
        en: 'The Kurukshetra Development Board (KDB) will have the final authority to accept or reject applications and approve booth/stall allotments.',
        hi: 'आवेदन स्वीकार या अस्वीकार करने तथा बूथ / बूथ/स्टॉल आबंटन का अंतिम निर्णय कुरुक्षेत्र विकास बोर्ड (KDB) का होगा।'
      }
    ]
  },
  {
    slug: 'national-awardees',
    requiredDocuments: [
      {
        en: 'Aadhaar Card or valid identity proof of the applicant',
        hi: 'आवेदक का आधार कार्ड या वैध पहचान पत्र'
      },
      {
        en: 'Valid National or State Award Certificate',
        hi: 'वैध राष्ट्रीय या राज्य पुरस्कार प्रमाणपत्र'
      },
      {
        en: 'Passport-size photograph of the applicant',
        hi: 'आवेदक का पासपोर्ट साइज फोटो'
      },
      {
        en: "Clear photographs of the applicant's own handicraft products or artwork",
        hi: 'आवेदक द्वारा स्वयं बनाए गए हस्तशिल्प या कलाकृतियों की स्पष्ट तस्वीरें'
      }
    ],
    sections: [
      {
        title: { en: 'Key Dates', hi: 'महत्वपूर्ण तिथियां' },
        items: [
          { en: 'Draw / Result Date: 5 November 2026', hi: 'ड्रॉ / परिणाम की तिथि: 5 नवंबर 2026' },
          { en: 'Payment Deadline: 10 November 2026', hi: 'भुगतान की अंतिम तिथि: 10 नवंबर 2026' }
        ]
      }
    ],
    bulletsHeading: { en: 'Important Instructions Before Applying', hi: 'आवेदन करने से पहले महत्वपूर्ण निर्देश' },
    bullets: [
      {
        en: 'Please read all the guidelines for this category carefully before applying.',
        hi: 'आवेदन करने से पहले इस श्रेणी के सभी दिशानिर्देशों को ध्यानपूर्वक पढ़ें।'
      },
      {
        en: 'Applicants must have an active WhatsApp mobile number and email ID.',
        hi: 'आवेदन करने के लिए सक्रिय WhatsApp मोबाइल नंबर और ईमेल आईडी होना अनिवार्य है।'
      },
      {
        en: 'Enter all details correctly as they appear on your government-issued identity proof and award certificate.',
        hi: 'आवेदन फॉर्म में सभी जानकारी अपने सरकारी पहचान पत्र और पुरस्कार प्रमाणपत्र के अनुसार सही-सही भरें।'
      },
      {
        en: 'Upload all required documents clearly and ensure they are complete and readable.',
        hi: 'सभी आवश्यक दस्तावेज़ स्पष्ट और पढ़ने योग्य अपलोड करें।'
      },
      {
        en: 'Applicants must meet the prescribed eligibility conditions for this category.',
        hi: 'आवेदक के लिए इस श्रेणी की निर्धारित पात्रता शर्तों को पूरा करना अनिवार्य है।'
      },
      {
        en: "Upload genuine and relevant photographs of your own handicraft products or artwork only. Images taken from the internet or photographs of another person's work will not be accepted.",
        hi: 'केवल अपने बनाए हस्तशिल्प उत्पादों या कलाकृतियों की वास्तविक और संबंधित तस्वीरें अपलोड करें। इंटरनेट से ली गई या किसी अन्य व्यक्ति के काम की तस्वीरें स्वीकार नहीं की जाएंगी।'
      },
      {
        en: 'Review all details and documents carefully before submitting your application, as changes cannot be made after submission.',
        hi: 'आवेदन जमा करने से पहले सभी जानकारी और दस्तावेज़ों की अच्छी तरह जाँच कर लें, क्योंकि आवेदन जमा होने के बाद उसमें बदलाव नहीं किया जा सकेगा।'
      },
      {
        en: 'Only applicants verified and declared eligible by the Kurukshetra Development Board (KDB) will be considered for the Draw.',
        hi: 'केवल कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा सत्यापित और पात्र घोषित आवेदकों को ही ड्रॉ में शामिल किया जाएगा।'
      },
      {
        en: 'Booths/stalls will be allotted through an official Draw as per the procedure prescribed by KDB.',
        hi: 'स्टॉल/बूथ का आबंटन KDB द्वारा निर्धारित प्रक्रिया के अनुसार आधिकारिक ड्रॉ के माध्यम से किया जाएगा।'
      },
      {
        en: 'The application fee is ₹236 and is non-refundable.',
        hi: 'आवेदन शुल्क ₹236 है और यह गैर-वापसी योग्य है।'
      },
      {
        en: 'The booth/stall allotment amount is ₹30,000.',
        hi: 'स्टॉल/बूथ आबंटन राशि ₹30,000 है।'
      },
      {
        en: 'Paying the application fee does not guarantee selection or booth/stall allotment.',
        hi: 'आवेदन शुल्क जमा करने से चयन या स्टॉल/बूथ मिलना सुनिश्चित नहीं होता।'
      },
      {
        en: 'The Kurukshetra Development Board (KDB) will have the final authority to verify eligibility, accept or reject applications, and approve booth/stall allotments as per the prescribed rules.',
        hi: 'पात्रता का सत्यापन करने, आवेदन स्वीकार या अस्वीकार करने तथा निर्धारित नियमों के अनुसार स्टॉल/बूथ आबंटन की मंजूरी देने का अंतिम अधिकार कुरुक्षेत्र विकास बोर्ड (KDB) के पास होगा।'
      }
    ]
  },
  {
    slug: 'brand-promotions',
    requiredDocuments: [
      {
        en: "Owner's or Authorised Representative's Aadhaar Card or valid government-issued identity proof",
        hi: 'मालिक या अधिकृत प्रतिनिधि का आधार कार्ड या वैध सरकारी पहचान पत्र'
      },
      {
        en: 'Business/Firm/Company Registration Certificate, where applicable',
        hi: 'जहाँ लागू हो, व्यवसाय/फर्म/कंपनी का पंजीकरण प्रमाणपत्र'
      },
      {
        en: 'Authorisation Letter, if applying through a representative',
        hi: 'प्रतिनिधि के माध्यम से आवेदन करने पर प्राधिकरण पत्र'
      }
    ],
    bullets: [],
    importantInstructions: [
      {
        en: 'Read the category guidelines carefully before applying.',
        hi: 'आवेदन करने से पहले श्रेणी के दिशानिर्देश ध्यानपूर्वक पढ़ें।'
      },
      {
        en: 'Enter correct details and upload clear, readable documents.',
        hi: 'सही जानकारी भरें और दस्तावेज़ साफ तथा पढ़ने योग्य अपलोड करें।'
      },
      {
        en: 'Provide an active contact number and email address.',
        hi: 'सक्रिय संपर्क नंबर और ईमेल आईडी दें।'
      },
      {
        en: 'Pay the application fee of ₹236, including GST. The fee is non-refundable.',
        hi: 'GST सहित ₹236 आवेदन शुल्क जमा करें। यह शुल्क गैर-वापसी योग्य है।'
      },
      {
        en: 'After submitting the application, wait for the agency appointed by KDB to review your application and contact you directly.',
        hi: 'आवेदन जमा करने के बाद KDB द्वारा नियुक्त एजेंसी के आवेदन की जाँच करने और आपसे सीधे संपर्क करने का इंतजार करें।'
      },
      {
        en: 'The appointed agency will explain the available booth/stall options, applicable rates, payment terms, and allotment process.',
        hi: 'नियुक्त एजेंसी उपलब्ध स्टॉल/बूथ के विकल्प, लागू दरें, भुगतान की शर्तें और आबंटन प्रक्रिया बताएगी।'
      },
      {
        en: 'No fixed booth/stall allotment rate is specified in advance.',
        hi: 'स्टॉल/बूथ आबंटन की कोई निश्चित दर पहले से निर्धारित नहीं है।'
      },
      {
        en: 'Confirm the applicable rates and payment instructions with the appointed agency before making any booth/stall payment.',
        hi: 'स्टॉल/बूथ का भुगतान करने से पहले लागू दरों और भुगतान संबंधी निर्देशों की पुष्टि नियुक्त एजेंसी से करें।'
      },
      {
        en: 'Application submission does not guarantee booth/stall allotment.',
        hi: 'आवेदन जमा करने से स्टॉल/बूथ मिलना सुनिश्चित नहीं होता।'
      }
    ]
  },
  {
    slug: 'self-help-groups',
    requiredDocuments: [
      {
        en: 'Authorized Representative Aadhaar Card',
        hi: 'अधिकृत प्रतिनिधि का आधार कार्ड'
      },
      {
        en: 'SARAS Registration Certificate / Registration Proof',
        hi: 'सेल (ऑफ आर्टिकल्स ऑफ रूरल आर्टिजन्स सोसाइटी) (SARAS) का पंजीकरण प्रमाणपत्र / पंजीकरण का प्रमाण'
      },
      {
        en: 'Authorization Letter',
        hi: 'प्राधिकरण पत्र'
      },
      {
        en: 'Product Photographs',
        hi: 'उत्पादों की तस्वीरें'
      }
    ],
    bulletsHeading: { en: 'Before You Apply', hi: 'आवेदन करने से पहले' },
    bullets: [
      {
        en: 'Only registered SARAS (Sale of Articles of Rural Artisans Society) members with valid registration proof can apply. The application must be submitted by an authorized member or representative of the society.',
        hi: 'इस श्रेणी में केवल पंजीकृत सेल (ऑफ आर्टिकल्स ऑफ रूरल आर्टिजन्स सोसाइटी) (SARAS) के सदस्य ही आवेदन कर सकते हैं। सोसाइटी की ओर से आवेदन किसी अधिकृत सदस्य या प्रतिनिधि द्वारा किया जाना चाहिए।'
      },
      {
        en: 'All applicants must pay a non-refundable application fee of ₹236 (₹200 + 18% GST) online. This fee will not be refunded, whether the application is accepted or rejected.',
        hi: 'सभी आवेदकों को ₹236 आवेदन शुल्क (₹200 + 18% GST) ऑनलाइन जमा करना अनिवार्य है। यह शुल्क वापस नहीं किया जाएगा, चाहे आवेदन स्वीकार हो या अस्वीकार।'
      },
      {
        en: 'Fill in all details correctly according to your official documents. Upload clear, complete, and readable documents. Incorrect information or unclear documents may result in rejection.',
        hi: 'आवेदन फॉर्म में सभी जानकारी सही-सही भरें और आवश्यक दस्तावेज स्पष्ट एवं पढ़ने योग्य अपलोड करें। गलत, अधूरी या भ्रामक जानकारी देने पर आवेदन अस्वीकार किया जा सकता है।'
      },
      {
        en: 'Only SARAS members verified and declared eligible by the Kurukshetra Development Board (KDB) will be considered for stall allotment.',
        hi: 'केवल कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा सत्यापित और पात्र घोषित SARAS सदस्यों को ही स्टॉल आबंटन प्रक्रिया में शामिल किया जाएगा।'
      },
      {
        en: 'A total of 60 stalls are reserved under this category: 40 for Haryana and 20 for outside Haryana. If eligible applications exceed the available stalls in a region, allotment will be made through a transparent draw. Otherwise, stalls may be allotted directly according to the prescribed process.',
        hi: 'इस श्रेणी में कुल 60 स्टॉल आरक्षित हैं, जिनमें 40 हरियाणा और 20 हरियाणा के बाहर के आवेदकों के लिए हैं। यदि पात्र आवेदनों की संख्या उपलब्ध स्टॉलों से अधिक होती है, तो पारदर्शी ड्रॉ के माध्यम से आबंटन किया जाएगा। अन्यथा, निर्धारित प्रक्रिया के अनुसार सीधे स्टॉल आबंटित किए जा सकते हैं।'
      },
      {
        en: 'The stall will be provided free of cost to the selected applicant. No separate stall allotment fee will be charged.',
        hi: 'चयनित आवेदक को स्टॉल निःशुल्क दिया जाएगा। इसके लिए कोई अलग स्टॉल आबंटन शुल्क नहीं देना होगा।'
      },
      {
        en: 'Only products made or manufactured by the applicant\'s own SARAS society may be displayed and sold at the stall. Permitted products may include achar, masale, uncooked papad, and other eligible food and non-food products.',
        hi: 'स्टॉल पर केवल आवेदक की अपनी SARAS सोसाइटी द्वारा बनाए या तैयार किए गए उत्पाद ही प्रदर्शित और बेचे जा सकेंगे। इनमें अचार, मसाले, बिना पके पापड़ तथा अन्य अनुमत खाद्य और गैर-खाद्य उत्पाद शामिल हो सकते हैं।'
      },
      {
        en: 'Cooking, frying, roasting, heating food, or preparing and serving ready-to-eat refreshments at the stall is strictly prohibited. All food products must meet applicable food safety, packaging, and labelling requirements.',
        hi: 'स्टॉल पर खाना पकाने, तलने, भूनने, गर्म करने या तुरंत खाने के लिए तैयार खाद्य पदार्थ और जलपान तैयार करके परोसने की अनुमति नहीं होगी। सभी खाद्य उत्पादों के लिए लागू खाद्य सुरक्षा, पैकेजिंग और लेबलिंग नियमों का पालन करना अनिवार्य है।'
      },
      {
        en: 'The stall cannot be transferred, rented, or sublet to another person or organization without permission from KDB.',
        hi: 'KDB की अनुमति के बिना आबंटित स्टॉल किसी अन्य व्यक्ति या संस्था को हस्तांतरित, किराए पर या सबलेट नहीं किया जा सकता।'
      },
      {
        en: 'Once submitted, the application cannot be modified. Applications containing incomplete, incorrect, misleading, or false information may be rejected. If such information is discovered after allotment, the stall allotment may be cancelled.',
        hi: 'आवेदन जमा करने के बाद उसमें बदलाव नहीं किया जा सकेगा। आवेदन में गलत, अधूरी, भ्रामक या झूठी जानकारी पाए जाने पर आवेदन अस्वीकार किया जा सकता है। आबंटन के बाद ऐसी जानकारी सामने आने पर स्टॉल आबंटन रद्द किया जा सकता है।'
      },
      {
        en: 'KDB reserves the right to verify the submitted documents and inspect allotted stalls. All selected applicants must follow the prescribed rules and guidelines.',
        hi: 'KDB को जमा किए गए दस्तावेजों की जाँच करने और आबंटित स्टॉल का निरीक्षण करने का अधिकार होगा। सभी चयनित आवेदकों को KDB द्वारा निर्धारित नियमों और दिशा-निर्देशों का पालन करना होगा।'
      },
      {
        en: 'KDB may change the number of stalls, stall locations, allotment process, or other arrangements for the International Gita Jayanti Mahotsav 2026, if required.',
        hi: 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 के लिए आवश्यकता पड़ने पर KDB स्टॉलों की संख्या, स्थान, आबंटन प्रक्रिया या अन्य व्यवस्थाओं में बदलाव कर सकता है।'
      },
      {
        en: 'The final decision regarding application acceptance, eligibility, and stall allotment will rest with KDB. Any disputes will be subject to the jurisdiction of the competent courts at Kurukshetra, as applicable.',
        hi: 'आवेदन स्वीकार करने, पात्रता तय करने और स्टॉल आबंटन से संबंधित अंतिम निर्णय कुरुक्षेत्र विकास बोर्ड (KDB) का होगा। किसी भी विवाद की स्थिति में, जहाँ लागू हो, कुरुक्षेत्र के सक्षम न्यायालयों का क्षेत्राधिकार होगा।'
      },
      {
        en: 'Please regularly check ThanesarInfo.com for the latest updates regarding SARAS applications, document verification, eligibility, draw, and stall allotment.',
        hi: 'कृपया SARAS आवेदन, दस्तावेज सत्यापन, पात्रता, ड्रॉ और स्टॉल आबंटन से संबंधित नवीनतम अपडेट के लिए नियमित रूप से ThanesarInfo.com देखते रहें।'
      }
    ]
  },
  {
    slug: 'special-art-craft',
    requiredDocuments: [
      {
        en: 'Aadhaar Card or valid identity proof of the applicant',
        hi: 'आवेदक का आधार कार्ड या वैध पहचान पत्र'
      },
      {
        en: 'Recent passport-size photograph of the applicant',
        hi: 'आवेदक का हाल का पासपोर्ट साइज फोटो'
      },
      {
        en: "Clear photographs of the applicant's own art and craft products or artwork",
        hi: 'आवेदक द्वारा स्वयं बनाए गए आर्ट एंड क्राफ्ट उत्पादों या कलाकृतियों की स्पष्ट तस्वीरें'
      },
      {
        en: "Accurate details and description of the applicant's art and craft work",
        hi: 'आवेदक के आर्ट एंड क्राफ्ट कार्य का सही विवरण'
      },
      {
        en: 'Note: an Artisan Card or National/State Award Certificate is not required for this category.',
        hi: 'ध्यान दें: इस श्रेणी में आर्टिजन कार्ड या राष्ट्रीय/राज्य पुरस्कार प्रमाणपत्र की आवश्यकता नहीं है।'
      }
    ],
    sections: [
      {
        title: { en: 'Key Dates', hi: 'महत्वपूर्ण तिथियां' },
        items: [
          { en: 'Draw / Result Date: 5 November 2026', hi: 'ड्रॉ / परिणाम की तिथि: 5 नवंबर 2026' },
          { en: 'Payment Deadline: 10 November 2026', hi: 'भुगतान की अंतिम तिथि: 10 नवंबर 2026' }
        ]
      }
    ],
    bulletsHeading: { en: 'Important Instructions Before Applying', hi: 'आवेदन करने से पहले महत्वपूर्ण निर्देश' },
    bullets: [
      {
        en: 'Please read all the guidelines for this category carefully before applying.',
        hi: 'आवेदन करने से पहले इस श्रेणी के सभी दिशानिर्देशों को ध्यानपूर्वक पढ़ें।'
      },
      {
        en: 'Applicants must have an active WhatsApp mobile number and email ID.',
        hi: 'आवेदन करने के लिए सक्रिय WhatsApp मोबाइल नंबर और ईमेल आईडी होना अनिवार्य है।'
      },
      {
        en: 'Enter all details correctly as they appear on your government-issued identity proof.',
        hi: 'आवेदन फॉर्म में सभी जानकारी अपने सरकारी पहचान पत्र के अनुसार सही-सही भरें।'
      },
      {
        en: 'Upload all required documents clearly and ensure they are complete and readable.',
        hi: 'सभी आवश्यक दस्तावेज़ स्पष्ट और पढ़ने योग्य अपलोड करें।'
      },
      {
        en: 'Applicants must genuinely create art and craft products or artwork.',
        hi: 'आवेदक का वास्तव में आर्ट एंड क्राफ्ट उत्पाद या कलाकृतियाँ बनाने से जुड़ा होना अनिवार्य है।'
      },
      {
        en: 'An Artisan Card or National/State Award Certificate is not mandatory.',
        hi: 'इस श्रेणी में आर्टिजन कार्ड या राष्ट्रीय/राज्य पुरस्कार प्रमाणपत्र अनिवार्य नहीं है।'
      },
      {
        en: "Upload photographs of your own art and craft products or artwork only. Images taken from the internet or photographs of another person's work will not be accepted.",
        hi: 'केवल अपने बनाए आर्ट एंड क्राफ्ट उत्पादों या कलाकृतियों की तस्वीरें अपलोड करें। इंटरनेट से ली गई या किसी अन्य व्यक्ति के काम की तस्वीरें स्वीकार नहीं की जाएंगी।'
      },
      {
        en: 'Provide accurate details about your work, the products you create, and the materials you use.',
        hi: 'अपने काम, बनाए जाने वाले उत्पादों और उपयोग की जाने वाली सामग्री का सही विवरण दें।'
      },
      {
        en: 'Review all details and documents carefully before submitting your application, as changes cannot be made after submission.',
        hi: 'आवेदन जमा करने से पहले सभी जानकारी और दस्तावेज़ों की अच्छी तरह जाँच कर लें, क्योंकि आवेदन जमा होने के बाद उसमें बदलाव नहीं किया जा सकेगा।'
      },
      {
        en: 'Only applicants whose work and documents are verified and who meet the prescribed eligibility conditions will be considered for allotment.',
        hi: 'केवल उन्हीं आवेदकों को आबंटन प्रक्रिया में शामिल किया जाएगा, जिनके काम और दस्तावेज़ सत्यापन के बाद सही पाए जाएंगे और जो निर्धारित पात्रता शर्तों को पूरा करेंगे।'
      },
      {
        en: 'Booths/stalls will be allotted through Direct Allotment or a Draw, depending on the number of eligible applications and the availability of booths/stalls.',
        hi: 'पात्र आवेदनों की संख्या और उपलब्ध स्टॉल/बूथ के आधार पर सीधे आबंटन या ड्रॉ के माध्यम से स्टॉल/बूथ आबंटित किए जाएंगे।'
      },
      {
        en: 'The application fee is ₹236 and is non-refundable.',
        hi: 'आवेदन शुल्क ₹236 है और यह गैर-वापसी योग्य है।'
      },
      {
        en: 'The booth/stall allotment amount is ₹50,000 (including GST).',
        hi: 'बूथ/स्टॉल आबंटन राशि ₹50,000 (जीएसटी सहित) है।'
      },
      {
        en: 'Paying the application fee does not guarantee selection or booth/stall allotment.',
        hi: 'आवेदन शुल्क जमा करने से चयन या स्टॉल/बूथ मिलना सुनिश्चित नहीं होता।'
      },
      {
        en: 'The Kurukshetra Development Board (KDB) will have the final authority to verify eligibility, accept or reject applications, and approve booth/stall allotments as per the prescribed rules.',
        hi: 'पात्रता का सत्यापन करने, आवेदन स्वीकार या अस्वीकार करने तथा निर्धारित नियमों के अनुसार स्टॉल/बूथ आबंटन की मंजूरी देने का अंतिम अधिकार कुरुक्षेत्र विकास बोर्ड (KDB) के पास होगा।'
      }
    ]
  },
  {
    slug: 'wooden-craft-carpets',
    requiredDocuments: [
      {
        en: 'Aadhaar Card / Valid Government-Issued ID Proof',
        hi: 'आधार कार्ड / सरकार द्वारा जारी वैध पहचान पत्र'
      },
      {
        en: 'Firm/Business Registration Certificate, GST Certificate, or PAN Card, as applicable',
        hi: 'व्यवसाय या फर्म का पंजीकरण प्रमाणपत्र, GST प्रमाणपत्र या PAN कार्ड, जो लागू हो'
      },
      {
        en: 'Clear and recent photographs of your products',
        hi: 'उत्पादों की साफ और हाल की तस्वीरें'
      },
      {
        en: 'Product details and estimated space requirement',
        hi: 'उत्पादों का विवरण और आवश्यक जगह की अनुमानित जानकारी'
      },
      {
        en: 'Any additional documents required by Kurukshetra Development Board (KDB)',
        hi: 'कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा मांगे जाने पर अन्य आवश्यक दस्तावेज'
      }
    ],
    bullets: [
      {
        en: 'Make sure your products are suitable for the Wooden Craft & Carpets (Large Space) category.',
        hi: 'सुनिश्चित करें कि आपके उत्पाद लकड़ी के हस्तशिल्प एवं कालीन (बड़े स्थान वाले बूथ/स्टॉल) श्रेणी के लिए उपयुक्त हैं।'
      },
      {
        en: 'Apply under this category only if your products genuinely require a larger display area than a regular booth/stall.',
        hi: 'इस श्रेणी में तभी आवेदन करें, जब आपके उत्पादों को सामान्य बूथ/स्टॉल से अधिक जगह की वास्तव में आवश्यकता हो।'
      },
      {
        en: 'Provide accurate product details, photographs, and information about the space you need.',
        hi: 'उत्पादों का सही विवरण, तस्वीरें और आवश्यक जगह की जानकारी दें।'
      },
      {
        en: 'Check all documents carefully before uploading them.',
        hi: 'दस्तावेज अपलोड करने से पहले उनकी जाँच कर लें।'
      },
      {
        en: 'The application fee is ₹236 (including 18% GST) and is non-refundable.',
        hi: 'आवेदन शुल्क ₹236 है, जिसमें 18% GST शामिल है। यह शुल्क वापस नहीं किया जाएगा।'
      },
      {
        en: 'The booth/stall allotment amount is ₹50,000.',
        hi: 'बूथ/स्टॉल आबंटन राशि ₹50,000 है।'
      },
      {
        en: 'Allotment will be through Direct Allotment / Draw, based on verified and eligible applications and the availability of suitable spaces.',
        hi: 'सत्यापित और पात्र आवेदनों की संख्या तथा उपलब्ध स्थानों के आधार पर सीधे आबंटन / ड्रॉ के माध्यम से बूथ/स्टॉल आबंटित किए जाएँगे।'
      },
      {
        en: 'The final booth/stall size and location will be decided by KDB according to availability and the approved layout.',
        hi: 'बूथ/स्टॉल का अंतिम आकार और स्थान उपलब्धता तथा स्वीकृत लेआउट के अनुसार KDB द्वारा तय किया जाएगा।'
      }
    ],
    importantInstructions: [
      {
        en: 'Submit correct and complete information in the application form.',
        hi: 'आवेदन फॉर्म में सही और पूरी जानकारी भरें।'
      },
      {
        en: 'Upload all mandatory documents before the application deadline.',
        hi: 'आवेदन की अंतिम तिथि से पहले सभी अनिवार्य दस्तावेज अपलोड करें।'
      },
      {
        en: 'Keep your application details and payment receipt for future reference.',
        hi: 'भविष्य के लिए आवेदन का विवरण और भुगतान की रसीद सुरक्षित रखें।'
      },
      {
        en: 'Payment of the application fee does not guarantee booth/stall allotment.',
        hi: 'केवल आवेदन शुल्क जमा करने से बूथ/स्टॉल मिलना सुनिश्चित नहीं होता।'
      },
      {
        en: 'Follow all guidelines and instructions issued by KDB.',
        hi: 'KDB द्वारा जारी सभी दिशानिर्देशों और निर्देशों का पालन करें।'
      },
      {
        en: 'Review your application carefully before submitting it.',
        hi: 'आवेदन जमा करने से पहले सभी जानकारी ध्यान से जाँच लें।'
      }
    ]
  }
]

export function getApplyInstructions(slug: string): ApplyInstructions | undefined {
  return APPLY_INSTRUCTIONS.find(c => c.slug === slug)
}
