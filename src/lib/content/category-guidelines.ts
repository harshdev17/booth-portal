export type CategoryGuideline = {
  slug: string
  title: string
  titleHi: string
  body: Array<{ en: string; hi: string }>
}

// Content supplied directly from the official "Instructions & Guidelines"
// document (2026-10-07). Shared by the general /guidelines page (shows all
// of these, in order) and the category detail page (/categories/[slug],
// shows only the one matching that category's slug) — a single source so
// the two never drift apart. Hindi text is carried over near-verbatim from
// that source (it already mixes English terms, as Indian government
// documents typically do); English bullets are a faithful translation, not
// a separate authored text. National Awardee intentionally omits a fee/
// selection-method bullet — the source document explicitly states those
// aren't defined yet for this category, so none is invented here (see
// .ai/OPEN_QUESTIONS.md). The DB's 10th category, "Reserved Categories
// (Khadi, etc.)" (slug 'khadi-other-reserved'), isn't covered by this
// source document, so no guideline entry exists for it either — nothing
// here should be invented. Slugs match migrations 0007/0013/0018 exactly.
export const CATEGORY_GUIDELINES: CategoryGuideline[] = [
  {
    slug: 'ngos-social-organizations',
    title: 'Social Organisation (NGO)',
    titleHi: 'सामाजिक संगठन (NGO)',
    body: [
      {
        en: 'Selection method: Direct Allotment / Draw of Lots (if eligible applications exceed available stalls). Application Fee: ₹236 (₹200 + 18% GST). Stall Fee: FREE.',
        hi: 'चयन विधि: Direct Allotment / Draw of Lots (यदि पात्र आवेदन उपलब्ध स्टॉल से अधिक हों)। आवेदन शुल्क: ₹236 (₹200 + 18% GST)। स्टॉल शुल्क: निःशुल्क (FREE)।'
      },
      {
        en: 'Required documents: Aadhaar card of the applicant/authorized representative, a valid NGO Registration Certificate, and an Authorization Letter.',
        hi: 'आवश्यक दस्तावेज: आवेदक/अधिकृत प्रतिनिधि का आधार कार्ड, वैध NGO Registration Certificate, तथा Authorization Letter।'
      },
      {
        en: 'The organisation must hold a valid Registration Certificate, and the application must be made by its authorized representative.',
        hi: 'संस्था का वैध Registration Certificate होना आवश्यक है तथा आवेदन संस्था के अधिकृत प्रतिनिधि द्वारा ही किया जाना चाहिए।'
      },
      {
        en: 'The ₹236 application fee is mandatory for every applicant and is non-refundable.',
        hi: '₹236 आवेदन शुल्क सभी आवेदकों के लिए अनिवार्य है तथा यह Non-Refundable है।'
      },
      {
        en: 'Only after document verification will an eligible organisation be included in the allotment process; a draw is held if eligible applications exceed the available stalls.',
        hi: 'दस्तावेजों के सत्यापन के बाद ही पात्र संस्था को Allotment Process में शामिल किया जाएगा। पात्र आवेदन उपलब्ध Stalls से अधिक होने पर Draw of Lots किया जा सकता है।'
      },
      {
        en: 'The NGO stall may be used only for social awareness, publicity, and social-service activities — no commercial activity or product sale is permitted.',
        hi: 'NGO Stall का उपयोग केवल सामाजिक जागरूकता, प्रचार-प्रसार और समाज सेवा संबंधी गतिविधियों के लिए किया जा सकेगा। किसी भी प्रकार की commercial activity या product selling की अनुमति नहीं होगी।'
      }
    ]
  },
  {
    slug: 'govt-departments',
    title: 'Government Department',
    titleHi: 'सरकारी विभाग (Government Department)',
    body: [
      {
        en: 'Selection method: as per the process and availability prescribed by KDB. Application Fee: none. Stall Fee: FREE, subject to eligibility and availability.',
        hi: 'चयन विधि: KDB द्वारा निर्धारित प्रक्रिया एवं उपलब्धता के अनुसार। आवेदन शुल्क: कोई आवेदन शुल्क नहीं। स्टॉल शुल्क: निःशुल्क / FREE, पात्रता एवं उपलब्धता के अनुसार।'
      },
      {
        en: 'Required documents: a valid Government ID of the authorized officer/representative, a Department Authorization Letter, and details of the departmental schemes/services/activities.',
        hi: 'आवश्यक दस्तावेज: अधिकृत अधिकारी/प्रतिनिधि का Valid Government ID, Department Authorization Letter, तथा विभागीय योजनाओं/सेवाओं एवं गतिविधियों का विवरण।'
      },
      {
        en: 'The application must be made by the concerned government department’s authorized officer/representative, and the required departmental documents must be uploaded.',
        hi: 'आवेदन संबंधित सरकारी विभाग के अधिकृत अधिकारी/प्रतिनिधि द्वारा किया जाना चाहिए तथा आवश्यक विभागीय दस्तावेज अपलोड करना अनिवार्य है।'
      },
      {
        en: 'The stall may be used only for government schemes, citizen services, public awareness, and departmental activities.',
        hi: 'Stall का उपयोग केवल सरकारी योजनाओं, नागरिक सेवाओं, जन-जागरूकता एवं विभागीय गतिविधियों के लिए किया जा सकेगा।'
      },
      {
        en: 'Banks, insurance companies, financial institutions, or other commercial entities may not apply in this category for commercial promotion — such entities may instead apply under the Brand Promotion category.',
        hi: 'Bank, Insurance Company, Financial Institution या अन्य commercial entity इस category में commercial promotion के लिए आवेदन नहीं कर सकती। ऐसी संस्थाएं Brand Promotion Category में आवेदन कर सकती हैं।'
      },
      {
        en: 'The allotted stall may not be transferred, sublet, or rented to any other person or entity.',
        hi: 'Stall को किसी अन्य व्यक्ति/संस्था को Transfer, Sublet या Rent नहीं किया जा सकेगा।'
      }
    ]
  },
  {
    slug: 'refreshment-stalls',
    title: 'Refreshment Food Stall (Through Auction)',
    titleHi: 'रिफ्रेशमेंट फूड स्टॉल (Through Auction)',
    body: [
      {
        en: 'Selection method: Through Auction. Application Fee: ₹236 (₹200 + 18% GST), non-refundable. Auction Participation Fee: ₹50,000 (eligible auction applicants only). Base Bid: ₹2,00,000. Electricity Charges: ₹600/day.',
        hi: 'चयन विधि: Through Auction। आवेदन शुल्क: ₹236 (₹200 + 18% GST), Non-Refundable। Auction Participation Fee: ₹50,000/- (केवल Eligible Auction Applicants के लिए)। Base Bid: ₹2,00,000/-। Electricity Charges: ₹600/- प्रतिदिन।'
      },
      {
        en: 'Required documents: Aadhaar Card, Business/Firm Registration Certificate / GST Certificate / PAN Card, and FSSAI License.',
        hi: 'आवश्यक दस्तावेज: Aadhaar Card, Business / Firm Registration Certificate / GST Certificate / PAN Card, तथा FSSAI License।'
      },
      {
        en: 'Important dates: last date to apply is 6 November 2026, 11:59 PM; the auction will be held on 7 and 8 November 2026.',
        hi: 'महत्वपूर्ण तिथियां: आवेदन की अंतिम तिथि 06 नवंबर 2026, रात्रि 11:59 बजे; Auction 07 एवं 08 नवंबर 2026।'
      },
      {
        en: 'Only applicants verified and declared eligible by KDB may take part in the auction. The eligible applicant must deposit the ₹50,000 Auction Participation Fee as a Demand Draft.',
        hi: 'केवल KDB द्वारा Verified एवं Eligible Applicants ही Auction में भाग ले सकेंगे। Eligible Applicant को ₹50,000/- Auction Participation Fee Demand Draft के रूप में जमा करनी होगी।'
      },
      {
        en: 'If the bid is unsuccessful, the ₹50,000 DD is returned; for the successful bidder, this same ₹50,000 becomes the Security Deposit, and the full Final Bid Amount must be paid within 4 days.',
        hi: 'Auction में बोली सफल न होने पर ₹50,000/- DD वापस कर दी जाएगी। Successful Bidder की ₹50,000/- Participation Fee ही Security Deposit बनेगी, तथा Final Bid Amount का पूरा भुगतान 4 दिनों के भीतर करना होगा।'
      },
      {
        en: 'Only pre-packed/ready-to-sell food products may be sold. Cooking, frying, roasting, baking or food preparation — and LPG, gas stove, coal, wood, furnace, bhatti or open flame — are not permitted. Alcohol, tobacco, narcotics, or other prohibited items may never be sold.',
        hi: 'Stall पर केवल Pre-Packed / Ready-to-Sell Food Products बेचे जा सकेंगे। Cooking, Frying, Roasting, Baking या Food Preparation तथा LPG, Gas Stove, Coal, Wood, Furnace, Bhatti या Open Flame का उपयोग प्रतिबंधित है। Alcohol, Tobacco, Narcotic या अन्य प्रतिबंधित वस्तुओं की बिक्री पूर्णतः प्रतिबंधित है।'
      }
    ]
  },
  {
    slug: 'artisan-card-holders',
    title: 'Artisan (Card Holder)',
    titleHi: 'कलाकार (Artisan - Card Holder)',
    body: [
      {
        en: 'Selection method: Direct Allotment / Draw of Lots, depending on availability and eligible applications. Application Fee: ₹236 (₹200 + 18% GST), non-refundable. Stall Fee: ₹30,000.',
        hi: 'चयन विधि: Direct Allotment / Draw of Lots*। आवेदन शुल्क: ₹236 (₹200 + 18% GST), Non-Refundable। स्टॉल शुल्क: ₹30,000/-।'
      },
      {
        en: 'Required documents: Aadhaar Card, a valid Artisan Card / Artisan Registration Card / Artisan Certificate, a passport-size photograph, work/product photographs, and work details.',
        hi: 'आवश्यक दस्तावेज: Aadhaar Card, वैध Artisan Card / Artisan Registration Card / Artisan Certificate, Passport Size Photograph, Work/Product Photographs, तथा Work Detail।'
      },
      {
        en: 'The applicant must genuinely be engaged in artisan/handicraft work, and must hold a valid Artisan Card that remains valid through the last date of application.',
        hi: 'आवेदक का वास्तविक रूप से Artisan/Handicraft Work से जुड़ा होना आवश्यक है। Valid Artisan Card होना अनिवार्य है, जो आवेदन की अंतिम तिथि तक valid होना चाहिए।'
      },
      {
        en: 'Clear photographs of the applicant’s own work must be uploaded — photos of another person’s work or images taken from the internet will not be accepted.',
        hi: 'अपने बनाए हुए Products/Art Work की clear photographs upload करनी होंगी। किसी अन्य व्यक्ति के Work की Photos या Internet से ली गई Photos स्वीकार नहीं की जाएंगी।'
      },
      {
        en: 'Only verified and eligible applicants proceed to the allotment process; a Draw of Lots is held if eligible applications exceed the available stalls.',
        hi: 'केवल Verified & Eligible Applicants को Allotment Process में शामिल किया जाएगा। उपलब्ध Stalls से अधिक eligible applications होने पर Draw of Lots किया जाएगा।'
      }
    ]
  },
  {
    slug: 'national-awardees',
    title: 'National Awardee',
    titleHi: 'राष्ट्रीय पुरस्कार प्राप्तकर्ता (National Awardee)',
    body: [
      {
        en: 'This category is for eligible applicants who are national award-winning artists/artisans.',
        hi: 'यह श्रेणी National Award प्राप्त कलाकार/हस्तशिल्प से संबंधित पात्र आवेदकों के लिए है।'
      },
      {
        en: 'Required documents: Aadhaar Card, a valid National Award Certificate, a passport-size photograph, and work/product photographs.',
        hi: 'आवश्यक दस्तावेज: Aadhaar Card, Valid National Award Certificate, Passport Size Photograph, तथा Work/Product Photographs।'
      },
      {
        en: 'The National Award Certificate must be clear and valid; only genuine, relevant work/product photographs should be uploaded. False information or incorrect documents may lead to rejection.',
        hi: 'National Award Certificate स्पष्ट एवं valid होना चाहिए। केवल वास्तविक और संबंधित Work/Product की photographs अपलोड करें। गलत जानकारी या गलत दस्तावेज पाए जाने पर application reject किया जा सकता है।'
      },
      {
        en: 'Application Fee, Stall Fee, and Allotment Method for this category are not yet specified in the official guidelines — [TBC – Business Confirmation Required]. Final eligibility and allotment will follow KDB’s verification and prescribed process.',
        hi: 'इस category की Application Fee, Stall Fee और Allotment Method का विवरण वर्तमान में उपलब्ध नहीं है — [TBC – Business Confirmation Required]। Final eligibility और allotment KDB के verification एवं निर्धारित प्रक्रिया के अनुसार होगा।'
      }
    ]
  },
  {
    slug: 'brand-promotions',
    title: 'Brand Promotion',
    titleHi: 'ब्रांड प्रमोशन (Brand Promotion)',
    body: [
      {
        en: 'Selection method: through the agency selected by KDB via Tender Process, following its prescribed procedure. Application/Booth Fee: as per the prescribed process and applicable charges.',
        hi: 'चयन विधि: Tender के माध्यम से चयनित Agency द्वारा निर्धारित प्रक्रिया। आवेदन शुल्क / Booth Fee: निर्धारित प्रक्रिया एवं applicable charges के अनुसार।'
      },
      {
        en: 'Required documents: Aadhaar Card of the owner/authorized representative, Firm/Company/Business Registration Certificate, an Authorization Letter, GST Registration Certificate (if applicable), and Brand/Product/Service details.',
        hi: 'आवश्यक दस्तावेज: Owner / Authorized Representative Aadhaar Card, Firm / Company / Business Registration Certificate, Authorization Letter, GST Registration Certificate (यदि लागू हो), तथा Brand / Product / Service Details।'
      },
      {
        en: 'This category is for the brand promotion of a company, firm, agency, or business entity; the booth may be used for brand, product, service, and publicity activities only.',
        hi: 'यह category Company, Firm, Agency या Business Entity के Brand Promotion के लिए है। Booth का उपयोग Brand, Product, Service एवं Publicity Activities के लिए किया जा सकेगा।'
      },
      {
        en: 'The agency selected by KDB through the Tender Process will contact applicants directly and verify documents and Brand/Company details; the standard Draw of Lots does not apply to this category.',
        hi: 'Selected Tender Agency applicant से संपर्क करेगी तथा documents एवं Brand/Company details verify कर सकती है। इस category में सामान्य Draw of Lots लागू नहीं होगा।'
      },
      {
        en: 'Process: Application Form → Applicant Details & Documents → Contact by the selected Tender Agency → Verification/Discussion → Reserved Booth Allotment → Fee/Charges Payment → Booth Confirmation.',
        hi: 'प्रक्रिया: Application Form → Applicant Details & Documents → Selected Tender Agency द्वारा संपर्क → Verification/Discussion → Reserved Booth Allotment → Fee/Charges Payment → Booth Confirmation।'
      }
    ]
  },
  {
    slug: 'self-help-groups',
    title: 'Self Help Groups (SHG)',
    titleHi: 'स्वयं सहायता समूह (Self Help Groups - SHG)',
    body: [
      {
        en: 'Reserved stalls: 60 total — 40 for Haryana-based SHGs, 20 for SHGs from outside Haryana. Selection method: Direct Allotment / Draw of Lots. Application Fee: ₹236, non-refundable. Stall Fee: FREE.',
        hi: 'Reserved Stalls: कुल 60 — Haryana के लिए 40, Outside Haryana के लिए 20। चयन विधि: Direct Allotment / Draw of Lots*। आवेदन शुल्क: ₹236 (₹200 + 18% GST), Non-Refundable। स्टॉल शुल्क: FREE।'
      },
      {
        en: 'Required documents: SHG Registration Certificate/Registration Proof, Authorized Representative’s Aadhaar Card, Authorization Letter, and Product Photographs.',
        hi: 'आवश्यक दस्तावेज: SHG Registration Certificate / Registration Proof, Authorized Representative Aadhaar Card, Authorization Letter, तथा Product Photographs।'
      },
      {
        en: 'Only registered SHGs may apply, through their authorized member/representative; the stall may display and sell primarily products made by the SHG itself.',
        hi: 'केवल Registered SHGs इस category में आवेदन कर सकते हैं, SHG के Authorized Member/Representative द्वारा। Stall पर मुख्य रूप से SHG द्वारा स्वयं बनाए गए Products ही प्रदर्शित एवं बेचे जा सकेंगे।'
      },
      {
        en: 'Allowed products include SHG-made Achar, Masale, uncooked Papad, and other permitted items — but cooking, frying, roasting, or refreshment food preparation is not permitted on the stall.',
        hi: 'SHG द्वारा बनाए गए Achar, Masale, Uncooked Papad एवं अन्य अनुमत Products बेचे जा सकते हैं। Stall पर Cooking, Frying, Roasting या Refreshment Food Preparation की अनुमति नहीं होगी।'
      },
      {
        en: 'If eligible applications exceed the quota reserved for Haryana or Outside Haryana, a transparent Draw of Lots is held separately for each.',
        hi: 'Eligible applications निर्धारित quota से अधिक होने पर Haryana और Outside Haryana के लिए अलग-अलग Transparent Draw of Lots किया जाएगा।'
      }
    ]
  },
  {
    slug: 'special-art-craft',
    title: 'Special Art & Craft',
    titleHi: 'विशेष कला एवं शिल्प (Special Art & Craft)',
    body: [
      {
        en: 'Selection method: Direct Allotment / Draw of Lots. Application Fee: ₹236 (₹200 + 18% GST), non-refundable. Stall Fee: ₹30,000.',
        hi: 'चयन विधि: Direct Allotment / Draw of Lots*। आवेदन शुल्क: ₹236 (₹200 + 18% GST), Non-Refundable। स्टॉल शुल्क: ₹30,000/-।'
      },
      {
        en: 'Required documents: Aadhaar Card, passport-size photograph, work/product photographs, Art & Craft work details, and (if applicable) a Craft/Business Registration Certificate or Artisan/Craft Certificate.',
        hi: 'आवश्यक दस्तावेज: Aadhaar Card, Passport Size Photograph, Work/Product Photographs, Art & Craft Work Details, तथा (यदि लागू हो) Craft/Business Registration Certificate या Artisan/Craft Certificate।'
      },
      {
        en: 'This category is for applicants connected to traditional and distinctive Indian Art & Craft. Photos of another person’s products, or images taken from the internet, will not be accepted as one’s own work.',
        hi: 'यह category Traditional एवं Distinctive Indian Art & Craft से संबंधित applicants के लिए है। किसी अन्य व्यक्ति के Products या Internet से प्राप्त Photos को अपने Work के रूप में प्रस्तुत करना मान्य नहीं होगा।'
      },
      {
        en: 'Only verified and eligible applicants proceed to the allotment process; a transparent Draw of Lots is held if eligible applications exceed the available stalls, and the selected applicant must deposit the ₹30,000 Stall/Booth Fee.',
        hi: 'केवल Verified & Eligible Applicants allotment process में शामिल होंगे। उपलब्ध Stalls से अधिक eligible applications होने पर Transparent Draw of Lots किया जाएगा, तथा Selected Applicant को ₹30,000/- Stall/Booth Fee जमा करनी होगी।'
      }
    ]
  },
  {
    slug: 'wooden-craft-carpets',
    title: 'Wooden Craft & Carpets (Large Space)',
    titleHi: 'काष्ठ शिल्प एवं कालीन (Wooden Craft & Carpets - Large Space)',
    body: [
      {
        en: 'This category is only for applicants who genuinely require a large display space — e.g. heavy wooden handicrafts, furniture, handmade carpets, rugs, and other large handcrafted products. Applicants who don’t need large space should apply under another suitable category instead.',
        hi: 'यह category केवल उन applicants के लिए है जिन्हें अपने Products के लिए Large Space की आवश्यकता है — जैसे Heavy Wooden Craft, Furniture, Handmade Carpets, Rugs एवं बड़े Handcrafted Products। जिन्हें Large Space की आवश्यकता नहीं है, वे अन्य suitable category में आवेदन करें।'
      },
      {
        en: 'Application Fee: ₹236 (₹200 + 18% GST), non-refundable. Large Space Stall/Booth Fee (for a selected/allotted applicant): ₹60,000.',
        hi: 'आवेदन शुल्क: ₹236 (₹200 + 18% GST), Non-Refundable। Large Space Stall/Booth Fee (Selected/Allotted applicant के लिए): ₹60,000/-।'
      },
      {
        en: 'Required documents: Aadhaar Card, Firm/Business Registration Certificate / GST Certificate / PAN Card, Product/Work Photographs, Product Details, and Space Requirement Details.',
        hi: 'आवश्यक दस्तावेज: Aadhaar Card, Firm / Business Registration Certificate / GST Certificate / PAN Card, Product / Work Photographs, Product Details, तथा Space Requirement Details।'
      },
      {
        en: 'The final space size and location will be decided by KDB as per the approved layout and availability — the exact space or location requested by the applicant is not guaranteed.',
        hi: 'Final Space Size एवं Location KDB द्वारा approved layout और availability के अनुसार तय की जाएगी। Applicant द्वारा मांगा गया exact Space या Location मिलना आवश्यक नहीं है।'
      }
    ]
  }
]

export function getCategoryGuideline(slug: string): CategoryGuideline | undefined {
  return CATEGORY_GUIDELINES.find(c => c.slug === slug)
}
