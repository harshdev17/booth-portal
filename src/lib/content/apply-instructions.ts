export type ApplyInstructions = {
  slug: string
  bullets: Array<{ en: string; hi: string }>
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
// "लॉटरी निकालना" for Draw of Lots, "वापस नहीं की जाएगी" for Non-Refundable) —
// not literary/शुद्ध Hindi, which would be harder to read than the mixed
// original. Official acronyms and names with no common Hindi equivalent
// (KDB, GST, FSSAI, Aadhaar, DD, LPG) are kept as-is in both languages.
export const APPLY_INSTRUCTIONS: ApplyInstructions[] = [
  {
    slug: 'ngos-social-organizations',
    bullets: [
      {
        en: 'The organisation must hold a valid Registration Certificate.',
        hi: 'संस्था के पास वैध पंजीकरण प्रमाणपत्र होना आवश्यक है।'
      },
      {
        en: 'The application must be made by the organisation’s authorized representative.',
        hi: 'आवेदन संस्था के अधिकृत प्रतिनिधि द्वारा किया जाना चाहिए।'
      },
      {
        en: 'All documents must be clear and legible.',
        hi: 'सभी दस्तावेज स्पष्ट और पढ़ने योग्य होने चाहिए।'
      },
      {
        en: 'The ₹236 application fee is mandatory for all applicants and is Non-Refundable.',
        hi: '₹236 आवेदन शुल्क सभी आवेदकों के लिए अनिवार्य है और यह वापस नहीं की जाएगी।'
      },
      {
        en: 'Only after document verification will an eligible organisation be included in the allotment process.',
        hi: 'दस्तावेजों के सत्यापन के बाद ही पात्र संस्था को आवंटन प्रक्रिया में शामिल किया जाएगा।'
      },
      {
        en: 'A Draw of Lots may be held if eligible applications exceed the available stalls.',
        hi: 'पात्र आवेदन उपलब्ध स्टॉल से अधिक होने पर लॉटरी (ड्रॉ) की जा सकती है।'
      },
      {
        en: 'The NGO stall may be used only for social awareness, publicity, and social-service activities.',
        hi: 'एनजीओ स्टॉल का उपयोग केवल सामाजिक जागरूकता, प्रचार-प्रसार और समाज सेवा संबंधी गतिविधियों के लिए किया जा सकेगा।'
      },
      {
        en: 'No commercial activity or product selling is permitted.',
        hi: 'किसी भी प्रकार की व्यावसायिक गतिविधि या उत्पाद बिक्री की अनुमति नहीं होगी।'
      },
      {
        en: 'If Verified & Eligible Applications exceed the available stalls, allotment will be made through a Draw of Lots. This category is for registered NGOs, and the selected NGO will be given the stall free of cost.',
        hi: '*यदि सत्यापित एवं पात्र आवेदन उपलब्ध स्टॉल से अधिक होते हैं, तो लॉटरी (ड्रॉ) के माध्यम से आवंटन किया जाएगा। यह श्रेणी पंजीकृत एनजीओ के लिए है और चयनित एनजीओ को स्टॉल निःशुल्क दिया जाएगा।'
      }
    ]
  },
  {
    slug: 'govt-departments',
    bullets: [
      {
        en: 'The application must be made by the concerned government department’s authorized officer/representative.',
        hi: 'आवेदन संबंधित सरकारी विभाग के अधिकृत अधिकारी/प्रतिनिधि द्वारा किया जाना चाहिए।'
      },
      {
        en: 'The required departmental documents must be uploaded.',
        hi: 'आवश्यक विभागीय दस्तावेज अपलोड करना अनिवार्य है।'
      },
      {
        en: 'The application and documents will be verified by KDB.',
        hi: 'आवेदन एवं दस्तावेजों का सत्यापन KDB द्वारा किया जाएगा।'
      },
      {
        en: 'The stall may be used only for government schemes, citizen services, public awareness, and departmental activities.',
        hi: 'स्टॉल का उपयोग केवल सरकारी योजनाओं, नागरिक सेवाओं, जन-जागरूकता एवं विभागीय गतिविधियों के लिए किया जा सकेगा।'
      },
      {
        en: 'A Bank, Insurance Company, Financial Institution, or other commercial entity may not apply in this category for commercial promotion.',
        hi: 'बैंक, बीमा कंपनी, वित्तीय संस्था या अन्य व्यावसायिक संस्था इस श्रेणी में व्यावसायिक प्रचार के लिए आवेदन नहीं कर सकती।'
      },
      {
        en: 'Entities eligible for commercial promotion may instead apply under the Brand Promotion category.',
        hi: 'व्यावसायिक प्रचार के लिए पात्र संस्थाएं ब्रांड प्रमोशन श्रेणी में आवेदन कर सकती हैं।'
      },
      {
        en: 'The final stall location will be decided by KDB as per the approved layout and availability.',
        hi: 'अंतिम स्टॉल स्थान KDB द्वारा स्वीकृत लेआउट और उपलब्धता के अनुसार तय किया जाएगा।'
      },
      {
        en: 'The stall may not be transferred, sublet, or rented to any other person/entity.',
        hi: 'स्टॉल को किसी अन्य व्यक्ति/संस्था को हस्तांतरित, उप-किराए पर या किराए पर नहीं दिया जा सकेगा।'
      },
      {
        en: 'The purpose of the Government Department category is solely the publicity of government and public-interest activities.',
        hi: 'सरकारी विभाग श्रेणी का उद्देश्य केवल सरकारी एवं जनहित गतिविधियों का प्रचार-प्रसार है।'
      }
    ]
  },
  {
    slug: 'refreshment-stalls',
    bullets: [
      {
        en: 'Depositing the ₹236 Application Fee online is mandatory.',
        hi: '₹236 आवेदन शुल्क ऑनलाइन जमा करना अनिवार्य है।'
      },
      {
        en: 'The Application Fee is Non-Refundable.',
        hi: 'आवेदन शुल्क वापस नहीं की जाएगी।'
      },
      {
        en: 'Only applicants verified and declared eligible by KDB may take part in the Auction.',
        hi: 'केवल KDB द्वारा सत्यापित एवं पात्र घोषित आवेदक ही नीलामी (Auction) में भाग ले सकेंगे।'
      },
      {
        en: 'An eligible applicant must deposit the ₹50,000 Auction Participation Fee as a Demand Draft.',
        hi: 'पात्र आवेदक को ₹50,000/- की नीलामी भागीदारी शुल्क डिमांड ड्राफ्ट (DD) के रूप में जमा करनी होगी।'
      },
      {
        en: 'If the bid is unsuccessful, the ₹50,000 DD will be returned.',
        hi: 'नीलामी में बोली सफल न होने पर ₹50,000/- की DD वापस कर दी जाएगी।'
      },
      {
        en: 'The successful bidder’s ₹50,000 Participation Fee itself becomes the Security Deposit.',
        hi: 'सफल बोलीदाता की ₹50,000/- भागीदारी शुल्क ही सुरक्षा जमा राशि बन जाएगी।'
      },
      {
        en: 'The successful bidder must pay the full Final Bid Amount within 4 days.',
        hi: 'सफल बोलीदाता को अंतिम बोली राशि का पूरा भुगतान 4 दिनों के भीतर करना होगा।'
      },
      {
        en: 'Only pre-packed/ready-to-sell food products may be sold at the stall.',
        hi: 'स्टॉल पर केवल पहले से पैक/बिक्री हेतु तैयार खाद्य उत्पाद ही बेचे जा सकेंगे।'
      },
      {
        en: 'Cooking, frying, roasting, baking, or food preparation is not permitted at the stall.',
        hi: 'स्टॉल पर खाना पकाने, तलने, भूनने, बेक करने या किसी भी प्रकार की खाद्य तैयारी की अनुमति नहीं होगी।'
      },
      {
        en: 'Use of LPG, gas stove, coal, wood, furnace, bhatti, or open flame is prohibited.',
        hi: 'LPG, गैस स्टोव, कोयला, लकड़ी, भट्टी या खुली लौ का उपयोग प्रतिबंधित है।'
      },
      {
        en: 'Sale of alcohol, tobacco, narcotics, or other prohibited items is completely prohibited.',
        hi: 'शराब, तंबाकू, नशीले पदार्थ या अन्य प्रतिबंधित वस्तुओं की बिक्री पूर्णतः प्रतिबंधित है।'
      }
    ]
  },
  {
    slug: 'artisan-card-holders',
    bullets: [
      {
        en: 'The applicant must genuinely be engaged in Artisan/Handicraft Work.',
        hi: 'आवेदक का वास्तविक रूप से शिल्पकला/हस्तशिल्प कार्य से जुड़ा होना आवश्यक है।'
      },
      {
        en: 'A valid Artisan Card is mandatory.',
        hi: 'वैध शिल्पकार कार्ड होना अनिवार्य है।'
      },
      {
        en: 'The Artisan Card must be valid through the last date of application.',
        hi: 'शिल्पकार कार्ड आवेदन की अंतिम तिथि तक वैध होना चाहिए।'
      },
      {
        en: 'A description of one’s actual Artisan Work must be given.',
        hi: 'अपने वास्तविक शिल्पकार्य का विवरण देना होगा।'
      },
      {
        en: 'Clear photographs of one’s own products/artwork must be uploaded.',
        hi: 'अपने बनाए हुए उत्पादों/कलाकृतियों की स्पष्ट तस्वीरें अपलोड करनी होंगी।'
      },
      {
        en: 'Photos of another person’s work, or images taken from the internet, will not be accepted.',
        hi: 'किसी अन्य व्यक्ति के कार्य की तस्वीरें या इंटरनेट से ली गई तस्वीरें स्वीकार नहीं की जाएंगी।'
      },
      {
        en: 'Documents, the Artisan Card, and the work will first be verified.',
        hi: 'पहले दस्तावेजों, शिल्पकार कार्ड और कार्य का सत्यापन किया जाएगा।'
      },
      {
        en: 'Only Verified & Eligible Applicants will be included in the allotment process.',
        hi: 'केवल सत्यापित एवं पात्र आवेदकों को आवंटन प्रक्रिया में शामिल किया जाएगा।'
      },
      {
        en: 'A Draw of Lots will be held if eligible applications exceed the available stalls.',
        hi: 'उपलब्ध स्टॉल से अधिक पात्र आवेदन होने पर लॉटरी (ड्रॉ) की जाएगी।'
      },
      {
        en: 'The stall will be used for the display and sale of the applicant’s own Artisan/Handicraft Work.',
        hi: 'स्टॉल का उपयोग आवेदक के अपने शिल्पकार्य/हस्तशिल्प के प्रदर्शन एवं बिक्री के लिए किया जाएगा।'
      },
      {
        en: 'Allotment may be Direct or through a Draw, depending on availability and eligible applications.',
        hi: '*उपलब्धता और पात्र आवेदनों के आधार पर आवंटन सीधे अथवा लॉटरी (ड्रॉ) के माध्यम से हो सकता है।'
      }
    ]
  },
  {
    slug: 'national-awardees',
    bullets: [
      {
        en: 'This category is for eligible applicants who are national award-winning artists/artisans.',
        hi: 'यह श्रेणी राष्ट्रीय पुरस्कार प्राप्त कलाकारों/शिल्पकारों से संबंधित पात्र आवेदकों के लिए है।'
      },
      {
        en: 'The National Award Certificate must be clear and valid.',
        hi: 'राष्ट्रीय पुरस्कार प्रमाणपत्र स्पष्ट एवं वैध होना चाहिए।'
      },
      {
        en: 'The applicant’s information must be filled in correctly, as per their documents.',
        hi: 'आवेदक की जानकारी दस्तावेजों के अनुसार सही-सही भरी जानी चाहिए।'
      },
      {
        en: 'Clear photographs of the work/product must be uploaded.',
        hi: 'कार्य/उत्पाद की स्पष्ट तस्वीरें अपलोड करनी होंगी।'
      },
      {
        en: 'Only genuine and relevant work/product photographs should be uploaded.',
        hi: 'केवल वास्तविक और संबंधित कार्य/उत्पाद की तस्वीरें ही अपलोड करें।'
      },
      {
        en: 'An application may be rejected if false information or incorrect documents are found.',
        hi: 'गलत जानकारी या गलत दस्तावेज पाए जाने पर आवेदन अस्वीकार किया जा सकता है।'
      },
      {
        en: 'Final eligibility and allotment will follow KDB’s verification and prescribed process.',
        hi: 'अंतिम पात्रता और आवंटन KDB के सत्यापन एवं निर्धारित प्रक्रिया के अनुसार होगा।'
      }

      // Note: the current official Instructions & Guidelines document does
      // not specify this category's Application Fee, Stall Fee, or
      // Allotment Method — per explicit instruction, no estimated figure is
      // shown here either. See ApplicationSummaryPanel.tsx, which already
      // shows "To be confirmed" / "जल्द घोषित" when category.feePaise is null.
    ]
  },
  {
    slug: 'brand-promotions',
    bullets: [
      {
        en: 'This category is for the Brand Promotion of a Company, Firm, Agency, or Business Entity.',
        hi: 'यह श्रेणी किसी कंपनी, फर्म, एजेंसी या व्यावसायिक संस्था के ब्रांड प्रमोशन के लिए है।'
      },
      {
        en: 'The booth may be used for Brand, Product, Service, and Publicity Activities.',
        hi: 'बूथ का उपयोग ब्रांड, उत्पाद, सेवा एवं प्रचार गतिविधियों के लिए किया जा सकेगा।'
      },
      {
        en: 'The Agency for the Reserved Booths in the Brand Promotion category will be selected by KDB through a Tender Process.',
        hi: 'ब्रांड प्रमोशन श्रेणी के आरक्षित बूथों के लिए एजेंसी का चयन KDB द्वारा निविदा (Tender) प्रक्रिया के माध्यम से किया जाएगा।'
      },
      {
        en: 'The selected Tender Agency will contact the applicant.',
        hi: 'चयनित एजेंसी आवेदक से संपर्क करेगी।'
      },
      {
        en: 'The applicant’s documents and Brand/Company details may be verified.',
        hi: 'आवेदक के दस्तावेज और ब्रांड/कंपनी विवरण सत्यापित किए जा सकते हैं।'
      },
      {
        en: 'The Reserved Booth will be allotted by the selected Agency as per its prescribed process.',
        hi: 'आरक्षित बूथ का आवंटन चयनित एजेंसी द्वारा निर्धारित प्रक्रिया के अनुसार किया जाएगा।'
      },
      {
        en: 'The standard Draw of Lots does not apply to this category.',
        hi: 'इस श्रेणी में सामान्य लॉटरी (ड्रॉ) लागू नहीं होगी।'
      },
      {
        en: 'The booth may be used only for approved Brand Promotion activities.',
        hi: 'बूथ का उपयोग केवल स्वीकृत ब्रांड प्रमोशन गतिविधियों के लिए किया जा सकेगा।'
      },
      {
        en: 'The booth may not be transferred, sublet, or rented to any other person/Company.',
        hi: 'बूथ को किसी अन्य व्यक्ति/कंपनी को हस्तांतरित, उप-किराए पर या किराए पर नहीं दिया जा सकेगा।'
      },
      {
        en: 'An application/allotment may be cancelled if false information or incorrect documents are found.',
        hi: 'गलत जानकारी या गलत दस्तावेज मिलने पर आवेदन/आवंटन रद्द किया जा सकता है।'
      },
      {
        en: 'Process: Application Form → Applicant Details & Documents → Contact by the selected Tender Agency → Verification/Discussion → Reserved Booth Allotment → Fee/Charges Payment → Booth Confirmation.',
        hi: 'प्रक्रिया: आवेदन पत्र → आवेदक विवरण एवं दस्तावेज → चयनित एजेंसी द्वारा संपर्क → सत्यापन/चर्चा → आरक्षित बूथ आवंटन → शुल्क/भुगतान → बूथ पुष्टि।'
      }
    ]
  },
  {
    slug: 'self-help-groups',
    bullets: [
      {
        en: 'Only Registered SHGs may apply in this category.',
        hi: 'केवल पंजीकृत स्वयं सहायता समूह (SHG) ही इस श्रेणी में आवेदन कर सकते हैं।'
      },
      {
        en: 'The application must be made by the SHG’s Authorized Member/Representative.',
        hi: 'आवेदन SHG के अधिकृत सदस्य/प्रतिनिधि द्वारा किया जाना चाहिए।'
      },
      {
        en: 'The stall may mainly display and sell products made by the SHG itself.',
        hi: 'स्टॉल पर मुख्य रूप से SHG द्वारा स्वयं बनाए गए उत्पाद ही प्रदर्शित एवं बेचे जा सकेंगे।'
      },
      {
        en: 'The ₹236 Application Fee is mandatory for all applicants.',
        hi: 'सभी आवेदकों के लिए ₹236 आवेदन शुल्क अनिवार्य है।'
      },
      {
        en: 'No Stall/Booth Allotment Fee will be charged.',
        hi: 'स्टॉल/बूथ आवंटन शुल्क नहीं ली जाएगी।'
      },
      {
        en: 'All documents and SHG details will first be verified.',
        hi: 'पहले सभी दस्तावेजों एवं SHG विवरण का सत्यापन किया जाएगा।'
      },
      {
        en: 'Only Verified & Eligible SHGs will be included in the allotment process.',
        hi: 'केवल सत्यापित एवं पात्र SHG ही आवंटन प्रक्रिया में शामिल होंगे।'
      },
      {
        en: 'A Transparent Draw of Lots will be held if eligible applications exceed the fixed quota.',
        hi: 'पात्र आवेदन निर्धारित कोटे से अधिक होने पर पारदर्शी लॉटरी (ड्रॉ) की जाएगी।'
      },
      {
        en: 'SHG-made Achar, Masale, uncooked Papad, and other permitted products may be sold.',
        hi: 'SHG द्वारा बनाए गए अचार, मसाले, कच्चे पापड़ एवं अन्य अनुमत उत्पाद बेचे जा सकते हैं।'
      },
      {
        en: 'Cooking, frying, roasting, or refreshment food preparation is not permitted at the stall.',
        hi: 'स्टॉल पर खाना पकाने, तलने, भूनने या जलपान सामग्री तैयार करने की अनुमति नहीं होगी।'
      },
      {
        en: 'Direct/Draw allotment will be made for Haryana and Outside Haryana as per their fixed quotas.',
        hi: '*हरियाणा और हरियाणा से बाहर के लिए निर्धारित कोटे के अनुसार सीधा/लॉटरी आवंटन किया जाएगा।'
      }
    ]
  },
  {
    slug: 'special-art-craft',
    bullets: [
      {
        en: 'This category is for applicants connected to Traditional and Distinctive Indian Art & Craft.',
        hi: 'यह श्रेणी पारंपरिक एवं विशिष्ट भारतीय कला एवं शिल्प से जुड़े आवेदकों के लिए है।'
      },
      {
        en: 'The applicant must give a clear description of their Art & Craft Work.',
        hi: 'आवेदक को अपने कला एवं शिल्प कार्य का स्पष्ट विवरण देना होगा।'
      },
      {
        en: 'Clear and recent photos of one’s actual products must be uploaded.',
        hi: 'अपने वास्तविक उत्पादों की स्पष्ट एवं हाल की तस्वीरें अपलोड करनी होंगी।'
      },
      {
        en: 'Presenting another person’s products, or photos obtained from the internet, as one’s own work is not valid.',
        hi: 'किसी अन्य व्यक्ति के उत्पादों या इंटरनेट से प्राप्त तस्वीरों को अपने कार्य के रूप में प्रस्तुत करना मान्य नहीं होगा।'
      },
      {
        en: 'Documents and the work will first be verified.',
        hi: 'पहले दस्तावेजों और कार्य का सत्यापन किया जाएगा।'
      },
      {
        en: 'Only Verified & Eligible Applicants will be included in the allotment process.',
        hi: 'केवल सत्यापित एवं पात्र आवेदक ही आवंटन प्रक्रिया में शामिल होंगे।'
      },
      {
        en: 'A Transparent Draw of Lots will be held if eligible applications exceed the available stalls.',
        hi: 'उपलब्ध स्टॉल से अधिक पात्र आवेदन होने पर पारदर्शी लॉटरी (ड्रॉ) की जाएगी।'
      },
      {
        en: 'A selected applicant must deposit the ₹30,000 Stall/Booth Fee.',
        hi: 'चयनित आवेदक को ₹30,000/- स्टॉल/बूथ शुल्क जमा करनी होगी।'
      },
      {
        en: 'The stall may be used only for the display and sale of approved Art & Craft products.',
        hi: 'स्टॉल का उपयोग केवल स्वीकृत कला एवं शिल्प उत्पादों के प्रदर्शन एवं बिक्री के लिए किया जाएगा।'
      },
      {
        en: 'Direct/Draw allotment will be made based on eligible applications and stall availability.',
        hi: '*पात्र आवेदनों और स्टॉल उपलब्धता के आधार पर सीधा/लॉटरी आवंटन किया जाएगा।'
      }
    ]
  },
  {
    slug: 'wooden-craft-carpets',
    bullets: [
      {
        en: 'This category is only for applicants who need Large Space for their products.',
        hi: 'यह श्रेणी केवल उन आवेदकों के लिए है जिन्हें अपने उत्पादों के लिए बड़े स्थान की आवश्यकता है।'
      },
      {
        en: 'It is suitable for Heavy Wooden Craft, Furniture, Handmade Carpets, Rugs, and large Handcrafted Products.',
        hi: 'यह भारी काष्ठ शिल्प, फर्नीचर, हस्तनिर्मित कालीन, दरी एवं बड़े हस्तशिल्प उत्पादों के लिए उपयुक्त है।'
      },
      {
        en: 'Applicants who do not need Large Space should apply under another suitable category instead.',
        hi: 'जिन्हें बड़े स्थान की आवश्यकता नहीं है, उन्हें अपनी आवश्यकता के अनुसार किसी अन्य उपयुक्त श्रेणी में आवेदन करना चाहिए।'
      },
      {
        en: 'The application must clearly describe the products and the space required.',
        hi: 'आवेदन में उत्पादों और आवश्यक स्थान का स्पष्ट विवरण देना होगा।'
      },
      {
        en: 'Clear and recent photographs of the products must be uploaded.',
        hi: 'उत्पादों की स्पष्ट एवं हाल की तस्वीरें अपलोड करनी होंगी।'
      },
      {
        en: 'The ₹236 Application Fee is Non-Refundable.',
        hi: '₹236 आवेदन शुल्क वापस नहीं की जाएगी।'
      },
      {
        en: 'A selected/allotted applicant must deposit the ₹60,000 Large Space Stall/Booth Fee.',
        hi: 'चयनित/आवंटित आवेदक को ₹60,000/- बड़े स्थान की स्टॉल/बूथ शुल्क जमा करनी होगी।'
      },
      {
        en: 'The final space size and location will be decided by KDB as per the approved layout and availability.',
        hi: 'अंतिम स्थान का आकार एवं स्थिति KDB द्वारा स्वीकृत लेआउट और उपलब्धता के अनुसार तय की जाएगी।'
      },
      {
        en: 'The exact space or location requested by the applicant is not guaranteed.',
        hi: 'आवेदक द्वारा मांगा गया ठीक वही स्थान या स्थिति मिलना आवश्यक नहीं है।'
      },
      {
        en: 'Keeping products outside the allotted space’s limit, or obstructing public movement, is prohibited.',
        hi: 'आवंटित स्थान की सीमा से बाहर उत्पाद रखना या सार्वजनिक आवागमन में बाधा डालना प्रतिबंधित होगा।'
      }
    ]
  }
]

export function getApplyInstructions(slug: string): ApplyInstructions | undefined {
  return APPLY_INSTRUCTIONS.find(c => c.slug === slug)
}
