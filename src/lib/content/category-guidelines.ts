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
// the two never drift apart.
//
// Hindi text is translated, not transliterated. The business's original
// source mixed English technical/legal terms directly into Hindi sentences
// (common in Indian government documents), but on a clean language toggle
// (Hindi selected → only Hindi should appear) that reads as broken Hindi
// with unrelated English words sitting inside it — reported live. Per
// explicit instruction, the Hindi below uses plain, everyday words for
// translatable terms (e.g. "पंजीकरण प्रमाणपत्र" for Registration Certificate,
// "लॉटरी (ड्रॉ)" for Draw of Lots, "सुरक्षा जमा राशि" for Security Deposit,
// "आवंटन" for Allotment) — not literary/शुद्ध Hindi, which would be harder to
// read than the mixed original. Official acronyms and names with no common
// Hindi equivalent (KDB, GST, FSSAI, PAN, Aadhaar, DD, LPG) are kept as-is
// in both languages. English bullets are a faithful translation of the same
// meaning, not a separate authored text.
//
// National Awardee intentionally omits a fee/selection-method bullet — the
// source document explicitly states those aren't defined yet for this
// category, so none is invented here (see .ai/OPEN_QUESTIONS.md). The DB's
// 10th category, "Reserved Categories (Khadi, etc.)" (slug
// 'khadi-other-reserved'), isn't covered by this source document, so no
// guideline entry exists for it either — nothing here should be invented.
// Slugs match migrations 0007/0013/0018 exactly.
export const CATEGORY_GUIDELINES: CategoryGuideline[] = [
  {
    slug: 'ngos-social-organizations',
    title: 'Social Organisation (NGO)',
    titleHi: 'सामाजिक संगठन (एनजीओ)',
    body: [
      {
        en: 'For any NGO/Social Organisation to take a booth/stall at International Geeta Jayanti Mahotsav 2026, the organisation must be duly registered.',
        hi: 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 में किसी भी सामाजिक संस्था (एनजीओ) द्वारा बूथ/स्टॉल लेने के लिए संस्था का विधिवत पंजीकृत होना अनिवार्य है।'
      },
      {
        en: 'At the time of application, the representative’s Aadhaar Card and the organisation’s valid Registration Certificate must be attached with the online application.',
        hi: 'आवेदन के समय संस्था के प्रतिनिधि का आधार कार्ड तथा संस्था का वैध पंजीकरण प्रमाणपत्र ऑनलाइन आवेदन के साथ संलग्न करना अनिवार्य होगा।'
      },
      {
        en: 'Application Fee: ₹200 + 18% GST = ₹236. Every organisation applying online must pay the ₹236 application fee — this applies to all applicants. The application fee is Non-Refundable: it will not be returned whether the application is approved or rejected, whether a booth/stall is allotted or not, or if not selected in the draw.',
        hi: 'आवेदन शुल्क ₹200/- + 18% GST = ₹236/-। ऑनलाइन आवेदन करने वाली प्रत्येक संस्था के लिए ₹236/- की आवेदन फीस जमा करना अनिवार्य होगा। यह फीस सभी आवेदकों पर लागू होगी। आवेदन फीस वापस नहीं की जाएगी। आवेदन स्वीकृत या अस्वीकृत होने, बूथ/स्टॉल आवंटित होने या न होने अथवा लॉटरी में चयन न होने की स्थिति में भी जमा की गई आवेदन फीस वापस नहीं की जाएगी।'
      },
      {
        en: 'Booth/Stall Fee: eligible NGOs and social-service organisations selected after verification by Kurukshetra Development Board, following the prescribed process, will be allotted a booth/stall free of cost. No additional booth fee or allotment fee will be charged to the selected organisation.',
        hi: 'बूथ/स्टॉल शुल्क: कुरुक्षेत्र विकास बोर्ड द्वारा सत्यापन एवं निर्धारित प्रक्रिया के बाद चयनित पात्र एनजीओ एवं समाज सेवा संगठनों को बूथ/स्टॉल निःशुल्क आवंटित किया जाएगा। चयनित संस्था से बूथ/स्टॉल के लिए कोई अतिरिक्त बूथ शुल्क अथवा आवंटन शुल्क नहीं लिया जाएगा।'
      },
      {
        en: 'Application & allotment process: the organisation must fill the online application form and pay the ₹236 (₹200 + 18% GST) application fee, and must upload the representative’s Aadhaar Card and a valid Registration Certificate with the application. Kurukshetra Development Board will check and verify all received applications and attached documents — only applications found eligible after document verification will be included in the booth/stall allotment process.',
        hi: 'आवेदन एवं आवंटन प्रक्रिया: संस्था द्वारा ऑनलाइन आवेदन पत्र भरना एवं ₹236/- (₹200/- + 18% GST) आवेदन फीस जमा करना अनिवार्य होगा। आवेदन के साथ संस्था के प्रतिनिधि का आधार कार्ड एवं वैध पंजीकरण प्रमाणपत्र अपलोड करना होगा। कुरुक्षेत्र विकास बोर्ड द्वारा प्राप्त सभी आवेदनों एवं संलग्न दस्तावेजों की जांच एवं सत्यापन किया जाएगा। केवल दस्तावेजों के सत्यापन के बाद पात्र पाए गए आवेदनों को ही बूथ/स्टॉल आवंटन प्रक्रिया में शामिल किया जाएगा।'
      },
      {
        en: 'If, after verification, the number of eligible applications is equal to or less than the fixed number of available booths/stalls, eligible organisations will be directly allotted a booth/stall as per the rules. If eligible applications exceed the fixed number of available booths/stalls, allotment among eligible and verified organisations will be made through a Draw of Lots. Only organisations whose documents have been verified and found eligible by Kurukshetra Development Board will take part in the draw. Document verification is mandatory in both Direct Allotment and Draw situations.',
        hi: 'यदि सत्यापन के बाद पात्र आवेदनों की संख्या उपलब्ध बूथ/स्टॉल की निर्धारित संख्या के बराबर या उससे कम रहती है, तो पात्र संस्थाओं को नियमानुसार सीधे बूथ/स्टॉल आवंटित किए जाएंगे। यदि सत्यापन के बाद पात्र आवेदनों की संख्या उपलब्ध बूथ/स्टॉल की निर्धारित संख्या से अधिक होती है, तो पात्र एवं सत्यापित संस्थाओं के बीच लॉटरी (ड्रॉ) के माध्यम से बूथ/स्टॉल का आवंटन किया जाएगा। लॉटरी में केवल वही संस्थाएं शामिल होंगी जिनके दस्तावेज कुरुक्षेत्र विकास बोर्ड द्वारा सत्यापित एवं पात्र पाए गए हों। सीधे आवंटन अथवा लॉटरी—दोनों ही परिस्थितियों में दस्तावेजों का सत्यापन अनिवार्य होगा।'
      },
      {
        en: 'The selected NGO will be given the booth/stall free of cost. The ₹236 application fee is only for the application process and is Non-Refundable.',
        hi: 'चयनित एनजीओ को बूथ/स्टॉल निःशुल्क प्रदान किया जाएगा। ₹236/- की आवेदन फीस केवल आवेदन प्रक्रिया के लिए है और यह वापस नहीं की जाएगी।'
      },
      {
        en: 'Condition on activities: the booth/stall will be given to the NGO only for publicity, social awareness, and social-service related activities. No commercial activity, sale of goods, or trading work of any kind will be permitted at the booth/stall.',
        hi: 'गतिविधियों से संबंधित शर्त: एनजीओ को बूथ/स्टॉल केवल प्रचार-प्रसार, सामाजिक जागरूकता एवं समाज सेवा से संबंधित गतिविधियों के लिए प्रदान किया जाएगा। बूथ/स्टॉल पर किसी भी प्रकार की व्यावसायिक गतिविधि, वस्तुओं की बिक्री अथवा व्यापारिक कार्य करने की अनुमति नहीं होगी।'
      }
    ]
  },
  {
    slug: 'govt-departments',
    title: 'Government Department',
    titleHi: 'सरकारी विभाग',
    body: [
      {
        en: 'Booths/stalls may be made available to central government, state government, and other government departments/institutions at International Geeta Jayanti Mahotsav 2026, for the publicity of their departmental work, government schemes, citizen services, public awareness, and public-interest activities.',
        hi: 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 में केंद्र सरकार, राज्य सरकार एवं अन्य सरकारी विभागों/सरकारी संस्थानों को उनके विभागीय कार्यों, सरकारी योजनाओं, नागरिक सेवाओं, जन-जागरूकता एवं सार्वजनिक हित से संबंधित गतिविधियों के प्रचार-प्रसार हेतु बूथ/स्टॉल उपलब्ध करवाए जा सकते हैं।'
      },
      {
        en: 'Eligibility & documents: the concerned government department/institution may apply. The application must be made by the department’s authorized officer/representative. The authorized officer/representative’s valid ID/Aadhaar Card must be attached. An authorized application/permission letter from the department, or a related authorization document, must be attached. The application must briefly describe the government schemes, services, and public-awareness activities to be displayed at the booth/stall.',
        hi: 'पात्रता एवं दस्तावेज: संबंधित सरकारी विभाग/सरकारी संस्था द्वारा आवेदन किया जा सकता है। आवेदन संबंधित विभाग के अधिकृत अधिकारी/प्रतिनिधि द्वारा किया जाना आवश्यक होगा। अधिकृत अधिकारी/प्रतिनिधि का वैध पहचान पत्र/आधार कार्ड संलग्न करना होगा। विभाग की ओर से अधिकृत आवेदन/अनुमति पत्र अथवा संबंधित प्राधिकरण दस्तावेज संलग्न करना आवश्यक होगा। आवेदन में बूथ/स्टॉल पर प्रदर्शित की जाने वाली सरकारी योजनाओं, सेवाओं एवं जन-जागरूकता गतिविधियों का संक्षिप्त विवरण देना होगा।'
      },
      {
        en: 'Application Fee: no application fee is payable for government departments.',
        hi: 'आवेदन शुल्क: सरकारी विभागों के लिए आवेदन शुल्क देय नहीं होगा।'
      },
      {
        en: 'Booth/Stall Fee: eligible and verified government departments may be provided a free booth/stall as per the prescribed process and availability. No general allotment fee is payable by a government department for the booth/stall, provided the application falls within the eligibility of a government department and the booth is used only for departmental/public-interest activities.',
        hi: 'बूथ/स्टॉल शुल्क: पात्र एवं सत्यापित सरकारी विभागों को निर्धारित प्रक्रिया एवं उपलब्धता के अनुसार निःशुल्क बूथ/स्टॉल उपलब्ध करवाया जा सकता है। सरकारी विभाग से बूथ/स्टॉल के लिए कोई सामान्य आवंटन शुल्क देय नहीं होगा, बशर्ते आवेदन सरकारी विभाग की पात्रता के अंतर्गत हो और बूथ का उपयोग केवल विभागीय/जनहित गतिविधियों के लिए किया जा रहा हो।'
      },
      {
        en: 'Special condition regarding commercial/business entities: government/public-sector institutions of a commercial nature may not apply in this category. For example, a Bank, Insurance Company, Financial Institution, or other such entity that wants a booth to publicize its commercial/business activities, products, or services will not be given a free booth/stall under the Government Department category. If such entities wish to publicize their Brand, Products, Services, or Commercial Activities at the Mahotsav, they may instead apply under the prescribed Brand Promotion category. Application and booth/stall allotment under the Brand Promotion category will be as per its prescribed fee and related rules.',
        hi: 'व्यावसायिक/व्यापारिक संस्थाओं के संबंध में विशेष शर्त: व्यावसायिक प्रकृति वाले सरकारी/सार्वजनिक क्षेत्र के संस्थान इस श्रेणी में आवेदन नहीं कर सकेंगे। उदाहरण के लिए बैंक, बीमा कंपनी, वित्तीय संस्था अथवा अन्य ऐसी संस्थाएं जो अपनी व्यावसायिक गतिविधियों, उत्पादों या सेवाओं के प्रचार-प्रसार के उद्देश्य से बूथ लेना चाहती हैं, उन्हें सरकारी विभाग श्रेणी में निःशुल्क बूथ/स्टॉल प्रदान नहीं किया जाएगा। ऐसी संस्थाएं यदि महोत्सव में अपने ब्रांड, उत्पादों, सेवाओं या व्यावसायिक गतिविधियों का प्रचार-प्रसार करना चाहती हैं, तो वे निर्धारित ब्रांड प्रमोशन श्रेणी के अंतर्गत आवेदन कर सकती हैं। ब्रांड प्रमोशन श्रेणी में आवेदन एवं बूथ/स्टॉल का आवंटन निर्धारित शुल्क एवं संबंधित नियमों के अनुसार किया जाएगा।'
      },
      {
        en: 'Allotment process: application will be made through the online application process prescribed by the concerned government department. The necessary departmental documents and the authorized representative’s identity documents must be attached with the application. Kurukshetra Development Board will check and verify the application and documents. Booth/stall allotment will be made only after verification of documents and departmental eligibility. Allotment will be made based on the number of eligible applications and the available booths/stalls.',
        hi: 'आवंटन प्रक्रिया: संबंधित सरकारी विभाग द्वारा निर्धारित ऑनलाइन आवेदन प्रक्रिया के माध्यम से आवेदन किया जाएगा। आवेदन के साथ आवश्यक विभागीय दस्तावेज एवं अधिकृत प्रतिनिधि के पहचान संबंधी दस्तावेज संलग्न किए जाएंगे। कुरुक्षेत्र विकास बोर्ड द्वारा आवेदन एवं दस्तावेजों की जांच एवं सत्यापन किया जाएगा। दस्तावेज एवं विभागीय पात्रता के सत्यापन के बाद ही बूथ/स्टॉल आवंटन किया जाएगा। पात्र आवेदनों की संख्या एवं उपलब्ध बूथ/स्टॉल के आधार पर आवंटन किया जाएगा।'
      },
      {
        en: 'The booth/stall location will be decided by Kurukshetra Development Board as per the prescribed layout and availability — accommodating a request for a particular location/booth is not mandatory. If a government institution’s application is actually found to be for a commercial/brand-promotion purpose, it will not be included in the Government Department category; such an institution may, if eligible, be permitted to apply under the Brand Promotion category instead.',
        hi: 'बूथ/स्टॉल का स्थान कुरुक्षेत्र विकास बोर्ड द्वारा निर्धारित लेआउट एवं उपलब्धता के अनुसार तय किया जाएगा। किसी विशेष स्थान/बूथ की मांग को स्वीकार करना अनिवार्य नहीं होगा। यदि किसी सरकारी संस्था का आवेदन वास्तव में व्यावसायिक/ब्रांड प्रमोशन उद्देश्य का पाया जाता है, तो उसे सरकारी विभाग श्रेणी में शामिल नहीं किया जाएगा। ऐसी संस्था को, यदि पात्र हो, ब्रांड प्रमोशन श्रेणी में आवेदन करने की अनुमति दी जा सकती है।'
      },
      {
        en: 'A booth allotted to a government department may be used only for government schemes, services, public awareness, and departmental activities. The allotted booth may not be used for the commercial promotion of any private person, company, or other entity, and may not be rented, sublet, or transferred to any other person/entity. An application/allotment may be cancelled at any stage if false information, incorrect documents, or concealment of facts relevant to eligibility is found. The final allotment of a booth/stall will be made by Kurukshetra Development Board as per its prescribed rules, availability, and process.',
        hi: 'सरकारी विभाग को आवंटित बूथ का उपयोग केवल सरकारी योजनाओं, सेवाओं, जन-जागरूकता एवं विभागीय गतिविधियों के लिए किया जाएगा। आवंटित बूथ का उपयोग किसी निजी व्यक्ति, कंपनी अथवा अन्य संस्था के व्यावसायिक प्रचार के लिए नहीं किया जा सकेगा। आवंटित बूथ को किसी अन्य व्यक्ति/संस्था को किराये पर देना, उप-किराए पर देना अथवा हस्तांतरित करना अनुमत नहीं होगा। गलत जानकारी, गलत दस्तावेज अथवा पात्रता से संबंधित तथ्य छिपाए जाने की स्थिति में आवेदन/आवंटन को किसी भी चरण पर निरस्त किया जा सकता है। बूथ/स्टॉल का अंतिम आवंटन कुरुक्षेत्र विकास बोर्ड द्वारा निर्धारित नियमों, उपलब्धता एवं प्रक्रिया के अनुसार किया जाएगा।'
      },
      {
        en: 'Important clarification: the purpose of the Government Department category is solely the publicity of government schemes, citizen services, and public-interest activities. Banks, Insurance Companies, Financial Institutions, and other commercial entities applying for commercial-promotion purposes will not be given a free booth/stall under this category — they may apply under the prescribed Brand Promotion category, with its applicable fee.',
        hi: 'महत्वपूर्ण स्पष्टीकरण: सरकारी विभाग श्रेणी का उद्देश्य केवल सरकारी योजनाओं, नागरिक सेवाओं एवं जनहित संबंधी गतिविधियों का प्रचार-प्रसार है। व्यावसायिक प्रचार के उद्देश्य से आवेदन करने वाले बैंक, बीमा कंपनियों, वित्तीय संस्थाओं एवं अन्य व्यावसायिक संस्थाओं को इस श्रेणी में निःशुल्क बूथ/स्टॉल नहीं दिया जाएगा। वे निर्धारित शुल्क के साथ ब्रांड प्रमोशन श्रेणी में आवेदन कर सकते हैं।'
      }
    ]
  },
  {
    slug: 'refreshment-stalls',
    title: 'Refreshment Food Stall (Through Auction)',
    titleHi: 'रिफ्रेशमेंट फूड स्टॉल (नीलामी द्वारा)',
    body: [
      {
        en: '1. Online Application: every applicant interested in a Refreshment Food Stall must apply online through the prescribed portal, and pay an Application Fee of ₹200 + 18% GST = ₹236 at the time of application. This ₹236 fee is mandatory for every applicant and Non-Refundable — it will not be returned even if the application is rejected, the applicant is not found eligible for the Auction, or not selected in the Auction. Last date to apply: 6 November 2026, 11:59 PM.',
        hi: '1. ऑनलाइन आवेदन: रिफ्रेशमेंट फूड स्टॉल के इच्छुक प्रत्येक आवेदक को निर्धारित पोर्टल के माध्यम से ऑनलाइन आवेदन करना अनिवार्य होगा। आवेदन के समय प्रत्येक आवेदक को ₹200 + 18% GST = ₹236/- आवेदन शुल्क जमा करनी होगी। ₹236/- आवेदन शुल्क प्रत्येक आवेदक के लिए अनिवार्य है और वापस नहीं की जाएगी। आवेदन अस्वीकृत होने, नीलामी के लिए पात्र न पाए जाने अथवा नीलामी में चयन न होने की स्थिति में भी आवेदन शुल्क वापस नहीं की जाएगी। आवेदन करने की अंतिम तिथि: 06 नवंबर 2026, रात्रि 11:59 बजे तक।'
      },
      {
        en: '2. Document Check & Eligibility: after the online application is received, Kurukshetra Development Board (KDB) will check and verify all required documents submitted by the applicant. Only applicants whose documents are fully verified and who are declared Eligible for Auction by KDB will be eligible to participate in the Auction. Eligible applicants will be informed via WhatsApp once document verification and eligibility are complete. Applicants will also be able to check their Auction Eligibility/Result through the portal on the specified date.',
        hi: '2. दस्तावेजों की जाँच एवं पात्रता: ऑनलाइन आवेदन प्राप्त होने के बाद आवेदक द्वारा जमा किए गए सभी आवश्यक दस्तावेजों की जाँच एवं सत्यापन KDB द्वारा किया जाएगा। केवल वे आवेदक ही नीलामी में भाग लेने के लिए पात्र होंगे जिनके दस्तावेजों का सत्यापन पूर्ण हो चुका हो और जिन्हें KDB द्वारा नीलामी हेतु पात्र घोषित किया गया हो। दस्तावेज सत्यापन एवं पात्रता पूरी होने के बाद पात्र आवेदकों को WhatsApp के माध्यम से सूचना दी जाएगी। आवेदक निर्धारित तिथि पर पोर्टल के माध्यम से अपनी नीलामी पात्रता/परिणाम भी देख सकेंगे।'
      },
      {
        en: '3. Auction Participation Fee – ₹50,000: only applicants who are declared eligible/selected to participate in the Auction after document verification must deposit an Auction Participation Fee of ₹50,000 (fifty thousand rupees only), as a Demand Draft (DD). This ₹50,000 is collected only from applicants eligible to participate in the Auction. Auction dates: 7 and 8 November 2026.',
        hi: '3. नीलामी भागीदारी शुल्क – ₹50,000/-: केवल वे आवेदक जो दस्तावेज सत्यापन के बाद नीलामी में भाग लेने के लिए पात्र/चयनित घोषित किए जाएंगे, उन्हें ₹50,000/- (पचास हजार रुपये मात्र) की नीलामी भागीदारी शुल्क जमा करनी होगी। यह शुल्क डिमांड ड्राफ्ट (DD) के रूप में जमा की जाएगी। यह ₹50,000/- की राशि केवल नीलामी में भाग लेने के लिए पात्र आवेदकों से ली जाएगी। नीलामी की निर्धारित तिथि: 07 एवं 08 नवंबर 2026।'
      },
      {
        en: '4. Return of DD if the bid is unsuccessful: for eligible applicants who participate in the Auction but whose bid is not successful and who are not allotted a Stall/Booth, the ₹50,000 Demand Draft will be returned at that time itself. Such applicants’ ₹50,000 will not be retained as a Security Deposit. Only the successful bidder’s ₹50,000 Participation Fee will be converted into a Security Deposit.',
        hi: '4. नीलामी में बोली सफल न होने पर DD की वापसी: जो पात्र आवेदक नीलामी में भाग लेंगे, लेकिन उनकी बोली सफल नहीं होगी और उन्हें कोई स्टॉल/बूथ आवंटित नहीं होगा, उनकी ₹50,000/- की डिमांड ड्राफ्ट उसी समय वापस कर दी जाएगी। ऐसे आवेदकों की ₹50,000/- की राशि को सुरक्षा जमा राशि के रूप में नहीं रखा जाएगा। केवल सफल बोलीदाता की ₹50,000/- भागीदारी शुल्क को सुरक्षा जमा राशि में परिवर्तित किया जाएगा।'
      },
      {
        en: '5. The successful bidder’s Participation Fee itself becomes the Security Deposit: for the applicant whose bid is successful and who is allotted the Refreshment Food Stall, their ₹50,000 Auction Participation Fee itself will be treated as the Security Deposit. The successful bidder does not need to separately deposit a ₹50,000 Security Deposit. This Security Deposit is separate from the Final Bid Amount and will not be adjusted against it. The successful bidder’s Security Deposit will be returned, as per the prescribed process, after the conclusion of International Gita Jayanti Mahotsav 2026 — only once the Stall Holder has complied with all rules and conditions prescribed by KDB.',
        hi: '5. सफल बोलीदाता की भागीदारी शुल्क ही सुरक्षा जमा राशि होगी: जिस आवेदक की नीलामी में बोली सफल होगी और जिसे रिफ्रेशमेंट फूड स्टॉल आवंटित किया जाएगा, उसकी ₹50,000/- नीलामी भागीदारी शुल्क को ही सुरक्षा जमा राशि माना जाएगा। सफल बोलीदाता को अलग से ₹50,000/- सुरक्षा जमा राशि जमा करने की आवश्यकता नहीं होगी। यह सुरक्षा जमा राशि अंतिम बोली राशि से अलग होगी तथा इसे अंतिम बोली राशि में समायोजित नहीं किया जाएगा। सफल बोलीदाता की सुरक्षा जमा राशि अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 के समापन के बाद निर्धारित प्रक्रिया के अनुसार वापस की जाएगी। सुरक्षा जमा राशि की वापसी तभी की जाएगी जब स्टॉल धारक द्वारा KDB द्वारा निर्धारित सभी नियमों एवं शर्तों का पालन किया गया हो।'
      },
      {
        en: '6. Base Bid & Final Bid Amount: the Base Bid for the Refreshment Food Stall is fixed at ₹2,00,000 (two lakh rupees only), and the Auction will start from this Base Bid. The final successful bid given by the successful bidder in the Auction will be treated as the Final Bid Amount, payable online. The successful bidder must deposit the full Final Bid Amount online within 4 days of succeeding in the Auction. If the Final Bid Amount is not deposited within the prescribed time, KDB may take necessary action as per the rules, including cancelling the allotment.',
        hi: '6. न्यूनतम बोली एवं अंतिम बोली राशि: रिफ्रेशमेंट फूड स्टॉल के लिए न्यूनतम बोली ₹2,00,000/- (दो लाख रुपये मात्र) निर्धारित होगी। नीलामी की शुरुआत ₹2,00,000/- की न्यूनतम बोली से होगी। नीलामी में सफल बोलीदाता द्वारा दी गई अंतिम सफल बोली को अंतिम बोली राशि माना जाएगा। अंतिम बोली राशि का भुगतान ऑनलाइन किया जाएगा। सफल बोलीदाता को अंतिम बोली राशि की पूरी राशि नीलामी में सफल होने की तारीख से 4 दिनों के भीतर ऑनलाइन जमा करनी होगी। निर्धारित समय में अंतिम बोली राशि जमा नहीं करने पर KDB द्वारा नियमानुसार आवश्यक कार्रवाई की जा सकती है तथा आवंटन रद्द किया जा सकता है।'
      },
      {
        en: '7. Return of Security Deposit: the successful bidder’s ₹50,000 Security Deposit will remain with KDB until the successful conclusion of International Gita Jayanti Mahotsav 2026. After the Mahotsav ends, the Security Deposit will be returned following compliance with rules/conditions and inspection of the stall’s condition. The Security Deposit will be returned, as per the prescribed process, before 31 January 2027. The Security Deposit will not be adjusted against the Final Bid Amount.',
        hi: '7. सुरक्षा जमा राशि की वापसी: सफल बोलीदाता की ₹50,000/- सुरक्षा जमा राशि अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 के सफल समापन तक KDB के पास रहेगी। महोत्सव समाप्त होने के बाद, नियमों एवं शर्तों के पालन तथा स्टॉल की स्थिति की जाँच के उपरांत सुरक्षा जमा राशि वापस की जाएगी। सुरक्षा जमा राशि की वापसी 31 जनवरी 2027 से पहले निर्धारित प्रक्रिया के अनुसार की जाएगी। सुरक्षा जमा राशि को अंतिम बोली राशि में समायोजित नहीं किया जाएगा।'
      },
      {
        en: '8. Electricity Charges: the Stall Holder must pay Electricity Charges of ₹600 per day for electricity. Electricity Charges must be deposited online, separately and in advance. Payment of Electricity Charges is separate from the Application Fee, Auction Participation Fee, Security Deposit, or Final Bid Amount. Drawing an electrical load beyond the prescribed capacity, or installing additional electrical equipment without permission, is prohibited.',
        hi: '8. बिजली शुल्क: स्टॉल धारक को बिजली के लिए ₹600/- प्रतिदिन बिजली शुल्क का भुगतान करना होगा। बिजली शुल्क अलग से एवं अग्रिम में ऑनलाइन जमा करने होंगे। बिजली शुल्क का भुगतान आवेदन शुल्क, नीलामी भागीदारी शुल्क, सुरक्षा जमा राशि अथवा अंतिम बोली राशि से अलग होगा। निर्धारित क्षमता से अधिक बिजली लोड लेना अथवा बिना अनुमति अतिरिक्त विद्युत उपकरण लगाना प्रतिबंधित होगा।'
      },
      {
        en: '9. Rules relating to food items at the Food Stall: only Pre-Packed/Ready-to-Sell Food Products may be sold at the Refreshment Food Stall. Any Cooking, Frying, Roasting, Baking, or Food Preparation inside the stall is completely prohibited. The Stall Holder may not use any of the following: LPG Cylinder; Gas Stove/Gas Burner; Coal; Wood; Furnace/Bhatti; Open Flame; any kind of cooking equipment. Only food and beverage items that do not need to be cooked or heated at the stall may be sold. Packaged food products must conform to the prescribed Food Safety and applicable rules, and must clearly display required information — such as Product Name, Quantity, Manufacturer/Packer/Seller Details, Packing/Manufacturing Details, and Best Before/Expiry — wherever applicable. Selling expired, spoiled, contaminated, open, or improperly packed food is prohibited. Sale of sealed/packaged beverages is allowed as per applicable rules. Sale of alcohol, tobacco, narcotics, or other prohibited items is completely prohibited.',
        hi: '9. फूड स्टॉल पर खाद्य सामग्री से संबंधित नियम: रिफ्रेशमेंट फूड स्टॉल पर केवल पहले से पैक/बिक्री हेतु तैयार खाद्य उत्पाद ही बेचे जा सकेंगे। स्टॉल के अंदर किसी भी प्रकार का खाना पकाना, तलना, भूनना, बेक करना या खाद्य तैयारी करना पूर्णतः प्रतिबंधित होगा। स्टॉल धारक द्वारा निम्न में से किसी भी वस्तु का उपयोग नहीं किया जा सकेगा: LPG सिलेंडर, गैस स्टोव/बर्नर, कोयला, लकड़ी, भट्टी, खुली लौ, किसी भी प्रकार का खाना पकाने का उपकरण। केवल ऐसे खाद्य एवं पेय पदार्थ बेचे जा सकेंगे जिन्हें स्टॉल पर पकाने या गर्म करने की आवश्यकता न हो। पैक किए गए खाद्य उत्पाद निर्धारित खाद्य सुरक्षा एवं लागू नियमों के अनुरूप होने चाहिए। जहाँ लागू हो, पैक किए गए खाद्य पदार्थों पर आवश्यक जानकारी जैसे उत्पाद का नाम, मात्रा, निर्माता/पैकर/विक्रेता विवरण, पैकिंग/निर्माण विवरण, एक्सपायरी तिथि आदि स्पष्ट रूप से अंकित होनी चाहिए। एक्सपायर, खराब, दूषित, खुला या अनुचित रूप से पैक किया हुआ खाद्य पदार्थ बेचना प्रतिबंधित होगा। बंद/पैक किए हुए पेय पदार्थों की बिक्री लागू नियमों के अनुसार की जा सकेगी। शराब, तंबाकू, नशीले पदार्थ या अन्य प्रतिबंधित वस्तुओं की बिक्री पूर्णतः प्रतिबंधित होगी।'
      },
      {
        en: '10. General rules relating to stall operation: a Stall Holder may keep goods only within the space and prescribed limit set by KDB. Spreading goods outside the stall’s boundary, blocking pathways, or obstructing public movement is prohibited. A stall may not be transferred, sublet, or rented to any other person. The Stall Holder must maintain cleanliness in and around their stall, and must properly dispose of food waste, packaging material, and other garbage. KDB or an authorized officer may inspect the stall from time to time. Violation of the prescribed rules may result in necessary action by KDB, including cancellation of the stall allotment. An application/allotment may be cancelled if any false information, incorrect documents, or concealment of facts is found. The Stall Holder must comply with all instructions relating to Security, Cleanliness, Timing, Electricity, Fire Safety, and Mahotsav Administration. KDB may issue additional rules and instructions according to the Mahotsav’s arrangements and circumstances, which will be mandatory for all Stall Holders to follow.',
        hi: '10. स्टॉल संचालन से संबंधित सामान्य नियम: स्टॉल धारक केवल उसी स्थान और निर्धारित सीमा के अंदर अपना सामान रख सकेगा जो KDB द्वारा निर्धारित किया गया है। स्टॉल की सीमा से बाहर सामान फैलाना, रास्ता रोकना या सार्वजनिक आवागमन में बाधा डालना प्रतिबंधित होगा। स्टॉल किसी अन्य व्यक्ति को हस्तांतरित, उप-किराए पर या किराए पर नहीं दिया जा सकेगा। स्टॉल धारक को अपने स्टॉल एवं आसपास के क्षेत्र में साफ-सफाई बनाए रखना अनिवार्य होगा। खाद्य अपशिष्ट, पैकेजिंग सामग्री एवं अन्य कचरे का उचित निपटान स्टॉल धारक द्वारा किया जाएगा। KDB अथवा अधिकृत अधिकारी द्वारा समय-समय पर स्टॉल की जाँच की जा सकती है। निर्धारित नियमों का उल्लंघन पाए जाने पर KDB द्वारा आवश्यक कार्रवाई की जा सकती है, जिसमें स्टॉल आवंटन को रद्द करना भी शामिल हो सकता है। किसी भी प्रकार की गलत जानकारी, गलत दस्तावेज या तथ्यों को छिपाने की स्थिति में आवेदन/आवंटन रद्द किया जा सकता है। स्टॉल धारक को सुरक्षा, स्वच्छता, समय-सारणी, बिजली, अग्नि सुरक्षा तथा महोत्सव प्रशासन से संबंधित सभी निर्देशों का पालन करना अनिवार्य होगा। KDB द्वारा महोत्सव की व्यवस्था एवं परिस्थितियों के अनुसार अतिरिक्त नियम एवं निर्देश जारी किए जा सकते हैं, जिनका पालन सभी स्टॉल धारकों के लिए अनिवार्य होगा।'
      },
      {
        en: '11. Financial Summary — Application Fee: ₹236, paid Online. Auction Participation Fee: ₹50,000, paid as a Demand Draft (DD). Base Bid: ₹2,00,000, via Auction. Security Deposit: ₹50,000, from the successful bidder’s Participation Fee. Final Bid Amount: as per the successful bid, paid Online. Electricity Charges: ₹600/day, Advance/Online. Important financial conditions: the ₹236 Application Fee is Non-Refundable. The ₹50,000 Auction Participation Fee is collected only from Eligible/Selected Auction Applicants. If the bid is unsuccessful, the ₹50,000 DD is returned at that time. The successful bidder’s ₹50,000 Participation Fee itself becomes the Security Deposit — a separate ₹50,000 Security Deposit is not collected from them. The Security Deposit will not be adjusted against the Final Bid Amount, and will be returned as per the prescribed process after the Mahotsav ends. The Final Bid Amount is paid online, and the successful bidder must deposit it within 4 days. Electricity Charges of ₹600/day must be deposited separately, in advance.',
        hi: '11. वित्तीय विवरण: आवेदन शुल्क ₹236/-, माध्यम ऑनलाइन। नीलामी भागीदारी शुल्क ₹50,000/-, माध्यम डिमांड ड्राफ्ट (DD)। न्यूनतम बोली ₹2,00,000/-, माध्यम नीलामी। सुरक्षा जमा राशि ₹50,000/-, सफल बोलीदाता की भागीदारी शुल्क से। अंतिम बोली राशि सफल बोली के अनुसार, माध्यम ऑनलाइन। बिजली शुल्क ₹600/- प्रतिदिन, अग्रिम/ऑनलाइन। महत्वपूर्ण वित्तीय शर्तें: ₹236/- आवेदन शुल्क वापस नहीं की जाएगी। ₹50,000/- नीलामी भागीदारी शुल्क केवल पात्र/चयनित नीलामी आवेदकों से ली जाएगी। नीलामी में बोली सफल न होने पर ₹50,000/- की DD उसी समय वापस कर दी जाएगी। सफल बोलीदाता की ₹50,000/- भागीदारी शुल्क ही सुरक्षा जमा राशि बन जाएगी, अलग से ₹50,000/- सुरक्षा जमा राशि नहीं ली जाएगी। सुरक्षा जमा राशि को अंतिम बोली राशि में समायोजित नहीं किया जाएगा तथा महोत्सव समाप्त होने के बाद निर्धारित प्रक्रिया के अनुसार वापस की जाएगी। अंतिम बोली राशि का भुगतान ऑनलाइन होगा और सफल बोलीदाता को यह राशि 4 दिनों के भीतर जमा करनी होगी। बिजली शुल्क ₹600/- प्रतिदिन अलग से अग्रिम में जमा करने होंगे।'
      },
      {
        en: '12. Important Dates: last date for Online Application — 6 November 2026, 11:59 PM. Auction dates — 7 and 8 November 2026. Security Deposit Refund — after the conclusion of International Gita Jayanti Mahotsav 2026, before 31 January 2027, as per the prescribed process.',
        hi: '12. महत्वपूर्ण तिथियाँ: ऑनलाइन आवेदन की अंतिम तिथि — 06 नवंबर 2026, रात्रि 11:59 बजे। नीलामी की तिथि — 07 एवं 08 नवंबर 2026। सुरक्षा जमा राशि की वापसी — अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 के समापन के बाद, 31 जनवरी 2027 से पहले निर्धारित प्रक्रिया के अनुसार।'
      },
      {
        en: 'Final decision: in all matters relating to the Refreshment Food Stall — application, document verification, eligibility, Auction, stall allotment, payments, Security Deposit, and all other matters — the decision of Kurukshetra Development Board (KDB), as per the prescribed rules and availability, will be final and binding.',
        hi: 'अंतिम निर्णय: रिफ्रेशमेंट फूड स्टॉल से संबंधित आवेदन, दस्तावेज सत्यापन, पात्रता, नीलामी, स्टॉल आवंटन, भुगतान, सुरक्षा जमा राशि तथा अन्य सभी मामलों में KDB का निर्णय निर्धारित नियमों एवं उपलब्धता के अनुसार अंतिम एवं मान्य होगा।'
      }
    ]
  },
  {
    slug: 'artisan-card-holders',
    title: 'Artisan (Card Holder)',
    titleHi: 'शिल्पकार (कार्डधारक)',
    body: [
      {
        en: '1. Eligibility: to apply in this category, the applicant must be genuinely engaged in handicraft/artisan work, and must hold a Valid Artisan Card / Artist Registration Card / Artisan Certificate issued by the concerned department/government authority. The Artisan Card must be valid through the last date of application — an expired, invalid, or unverified Artisan Card will not be accepted. The application must be made for the same type of art/handicraft work the applicant actually does.',
        hi: '1. पात्रता: इस श्रेणी में आवेदन करने के लिए आवेदक का वास्तविक रूप से हस्तशिल्प/शिल्पकारी के कार्य से जुड़ा होना आवश्यक है। आवेदक के पास संबंधित विभाग/सरकारी प्राधिकरण द्वारा जारी किया गया वैध शिल्पकार कार्ड/शिल्पकार पंजीकरण कार्ड/शिल्पकार प्रमाणपत्र होना अनिवार्य है। शिल्पकार कार्ड आवेदन की अंतिम तिथि तक वैध होना चाहिए। एक्सपायर, अवैध अथवा असत्यापित शिल्पकार कार्ड स्वीकार नहीं किया जाएगा। आवेदक द्वारा जिस प्रकार की कला/हस्तशिल्प का कार्य किया जाता है, उसी कार्य के आधार पर आवेदन किया जाना चाहिए।'
      },
      {
        en: '2. Required Documents: at the time of online application, the applicant must upload — the applicant’s Aadhaar Card; a valid Artisan Card issued by the concerned department; an Artisan Registration Certificate, if available/applicable; the applicant’s recent passport-size photograph; work details of the art/handicraft the applicant does; clear photographs of the applicant’s own actual products/artwork; and any other related document, if requested by KDB.',
        hi: '2. आवश्यक दस्तावेज: ऑनलाइन आवेदन करते समय आवेदक को निम्नलिखित दस्तावेज अपलोड करना अनिवार्य होगा: आवेदक का आधार कार्ड; संबंधित विभाग द्वारा जारी वैध शिल्पकार कार्ड; शिल्पकार पंजीकरण प्रमाणपत्र, यदि उपलब्ध/लागू हो; आवेदक का हाल का पासपोर्ट साइज़ फोटो; जिस कला/हस्तशिल्प का कार्य आवेदक करता है उसका कार्य विवरण; आवेदक द्वारा बनाए गए वास्तविक उत्पाद/कला कार्यों की स्पष्ट तस्वीरें; अन्य संबंधित दस्तावेज, यदि KDB द्वारा मांगे जाएं।'
      },
      {
        en: '3. Work Detail: in the application, the applicant must give a detailed description of their Artisan Work — this may include the type of art/handicraft work done, details of the products/items made, the type of material used, work experience, the speciality of the art/handicraft, information relating to traditional or local art, and any other important information the applicant wishes to share about their work. The Work Detail given must relate to the applicant’s actual Artisan Work.',
        hi: '3. कार्य का विवरण: आवेदन पत्र में आवेदक को अपने शिल्पकार्य का विस्तृत विवरण देना होगा। इसमें निम्न जानकारी दी जा सकती है: किस प्रकार की कला/हस्तशिल्प का कार्य किया जाता है; बनाए जाने वाले उत्पादों का विवरण; किस प्रकार की सामग्री का उपयोग किया जाता है; कार्य करने का अनुभव; कला/हस्तशिल्प की विशेषता; पारंपरिक अथवा स्थानीय कला से संबंधित जानकारी; अन्य महत्वपूर्ण जानकारी जो आवेदक अपने कार्य के संबंध में देना चाहता है। आवेदक द्वारा दी गई कार्य विवरण उसके वास्तविक शिल्पकार्य से संबंधित होनी चाहिए।'
      },
      {
        en: '4. Photos of the Work: the applicant must upload clear, recent photos of their own actual art/handicraft products with the application. Photos must clearly show the real nature and quality of the applicant’s Artisan Work. KDB may ask for additional photos, videos, or other proof if needed. Uploading photos of another person’s work, or photos taken from the internet, will not be accepted.',
        hi: '4. कार्य की तस्वीरें: आवेदक को अपने द्वारा बनाए गए वास्तविक कला/हस्तशिल्प उत्पादों की स्पष्ट एवं हाल की तस्वीरें आवेदन के साथ अपलोड करनी होंगी। तस्वीरें ऐसी होनी चाहिए जिनसे आवेदक के शिल्पकार्य की वास्तविक प्रकृति एवं गुणवत्ता स्पष्ट दिखाई दे। आवश्यकता होने पर KDB द्वारा अतिरिक्त तस्वीरें, वीडियो अथवा अन्य प्रमाण मांगे जा सकते हैं। किसी अन्य व्यक्ति के कार्य की तस्वीरें अथवा इंटरनेट से ली गई तस्वीरें अपलोड करना मान्य नहीं होगा।'
      },
      {
        en: '5. Document Verification: all online applications and documents will be checked by Kurukshetra Development Board (KDB). KDB may verify the validity of the Artisan Card, the applicant’s information, the Work Detail, and the submitted Work Photos. Only applicants whose documents and Artisan Work are found Verified/Eligible by KDB will be included in the Stall Allotment process. An application may be rejected if false information, incorrect documents, an invalid Artisan Card, or presenting another person’s work as one’s own is found.',
        hi: '5. दस्तावेज सत्यापन: सभी ऑनलाइन आवेदनों एवं दस्तावेजों की जाँच KDB द्वारा की जाएगी। KDB द्वारा शिल्पकार कार्ड की वैधता, आवेदक की जानकारी, कार्य विवरण एवं प्रस्तुत की गई कार्य तस्वीरों का सत्यापन किया जा सकता है। केवल वे आवेदक ही स्टॉल आवंटन प्रक्रिया में शामिल होंगे जिनके दस्तावेज एवं शिल्पकार्य को KDB द्वारा सत्यापित/पात्र पाया जाएगा। गलत जानकारी, गलत दस्तावेज, अवैध शिल्पकार कार्ड अथवा किसी अन्य व्यक्ति के कार्य को अपना बताने की स्थिति में आवेदन निरस्त किया जा सकता है।'
      },
      {
        en: '6. Application Fee: every applicant must pay an Application Fee of ₹200 + 18% GST = ₹236 at the time of online application. This ₹236 fee is mandatory for all applicants and Non-Refundable — it will not be returned even if the application is rejected, the applicant is not found eligible, or no stall is allotted.',
        hi: '6. आवेदन शुल्क: प्रत्येक आवेदक को ऑनलाइन आवेदन करते समय ₹200 + 18% GST = ₹236/- आवेदन शुल्क जमा करनी होगी। ₹236/- आवेदन शुल्क सभी आवेदकों के लिए अनिवार्य है और वापस नहीं की जाएगी। आवेदन अस्वीकृत होने, आवेदक पात्र न पाए जाने अथवा स्टॉल आवंटन न होने की स्थिति में भी आवेदन शुल्क वापस नहीं की जाएगी।'
      },
      {
        en: '7. Stall Fee: an Artisan selected/allotted a stall under this category must deposit a Stall Fee of ₹30,000 (thirty thousand rupees only), as per the process and timeline prescribed by KDB. The stall’s final allotment is considered complete only once the Stall Fee is deposited.',
        hi: '7. स्टॉल शुल्क: इस श्रेणी के अंतर्गत चयनित/आवंटित शिल्पकार को स्टॉल के लिए ₹30,000/- (तीस हजार रुपये मात्र) स्टॉल शुल्क जमा करनी होगी। स्टॉल शुल्क का भुगतान KDB द्वारा निर्धारित प्रक्रिया एवं समय सीमा के अनुसार किया जाएगा। स्टॉल शुल्क जमा होने के बाद ही स्टॉल का अंतिम आवंटन पूर्ण माना जाएगा।'
      },
      {
        en: '8. Draw if applications exceed available stalls: all received applications will first undergo Document Verification — only Verified and Eligible applicants will be included in the allotment process. If the number of Verified and Eligible applicants is equal to or less than the number of available stalls, KDB may directly allot stalls to eligible applicants as per availability. If the number of Verified and Eligible applicants exceeds the available stalls, a Draw of Lots (lucky draw) will be held for stall allotment, among only those applicants whose documents and Artisan Work have been found Verified and Eligible by KDB. Applicants not selected in the Draw will not be allotted a stall, and the ₹236 Application Fee will not be returned.',
        hi: '8. उपलब्ध स्टॉल से अधिक आवेदन होने पर लॉटरी: सभी प्राप्त आवेदनों की पहले दस्तावेज सत्यापन की जाएगी। केवल सत्यापित एवं पात्र आवेदकों को आवंटन प्रक्रिया में शामिल किया जाएगा। यदि सत्यापित एवं पात्र आवेदकों की संख्या उपलब्ध स्टॉल की संख्या के बराबर या कम है, तो KDB द्वारा पात्र आवेदकों को उपलब्धता के अनुसार स्टॉल आवंटित किए जा सकते हैं। यदि सत्यापित एवं पात्र आवेदकों की संख्या उपलब्ध स्टॉल से अधिक हो जाती है, तो स्टॉल आवंटन के लिए लॉटरी (लकी ड्रॉ) की जाएगी। लॉटरी केवल उन्हीं आवेदकों के बीच की जाएगी जिनके दस्तावेज एवं शिल्पकार्य को KDB द्वारा सत्यापित एवं पात्र पाया गया है। जिन आवेदकों का लॉटरी में चयन नहीं होता, उन्हें स्टॉल आवंटन नहीं दिया जाएगा। ₹236/- आवेदन शुल्क वापस नहीं की जाएगी।'
      },
      {
        en: '9. Artisan Work at the Stall: the allotted stall will be used mainly for the display and sale of the applicant’s own Artisan/Handicraft Work. Only the type of art/handicraft material the applicant described in their application should be kept at the stall. Displaying or selling another person’s/trader’s products under one’s own Artisan Work is not permitted. The stall may not be transferred, sublet, or rented to any other person.',
        hi: '9. स्टॉल पर शिल्पकार्य: आवंटित स्टॉल का उपयोग मुख्य रूप से आवेदक के स्वयं के शिल्पकार्य/हस्तशिल्प कार्य के प्रदर्शन एवं बिक्री के लिए किया जाएगा। स्टॉल पर वही प्रकार की कला/हस्तशिल्प सामग्री रखी जानी चाहिए जिसके संबंध में आवेदक ने आवेदन में जानकारी दी है। किसी अन्य व्यक्ति/व्यवसायी के उत्पादों को अपने शिल्पकार्य के नाम पर प्रदर्शित या बेचने की अनुमति नहीं होगी। स्टॉल किसी अन्य व्यक्ति को हस्तांतरित, उप-किराए पर या किराए पर नहीं दिया जा सकेगा।'
      },
      {
        en: '10. KDB’s Authority: KDB will have the right to check the submitted documents, Artisan Card, Work Details, and Work Photos. KDB may ask for additional documents or proof if needed. An application/allotment may be cancelled if false information, fake documents, an incorrect Artisan Card, or incorrect Work Details are found. The number of stalls, their location, and final allotment will be decided by KDB as per availability and the Mahotsav’s prescribed arrangements. In all matters relating to this category, KDB’s decision, as per the prescribed rules, will be final.',
        hi: '10. KDB का अधिकार: KDB को प्रस्तुत दस्तावेजों, शिल्पकार कार्ड, कार्य विवरण एवं कार्य तस्वीरों की जाँच करने का अधिकार होगा। आवश्यकता पड़ने पर KDB अतिरिक्त दस्तावेज या प्रमाण मांग सकता है। गलत जानकारी, फर्जी दस्तावेज, गलत शिल्पकार कार्ड अथवा गलत कार्य विवरण पाए जाने पर आवेदन/आवंटन को रद्द किया जा सकता है। स्टॉल की संख्या, स्थान एवं अंतिम आवंटन KDB द्वारा उपलब्धता एवं महोत्सव की निर्धारित व्यवस्था के अनुसार किया जाएगा। इस श्रेणी से संबंधित सभी मामलों में KDB का निर्णय निर्धारित नियमों के अनुसार अंतिम होगा।'
      },
      {
        en: 'Financial Summary — Application Fee: ₹236, Online. Stall Fee: ₹30,000, as per the process prescribed by KDB. Allotment Process: Direct/Draw, based on eligibility and stall availability. Important: all applicants’ documents and Artisan Card will first be verified; only then will Verified & Eligible Artisans be included in the allotment process. If eligible applications exceed available stalls, allotment will be made through a Draw of Lots.',
        hi: 'वित्तीय सारांश: आवेदन शुल्क ₹236/-, माध्यम ऑनलाइन। स्टॉल शुल्क ₹30,000/-, KDB द्वारा निर्धारित प्रक्रिया के अनुसार। आवंटन प्रक्रिया: सीधा/लॉटरी, पात्रता एवं स्टॉल उपलब्धता के आधार पर। महत्वपूर्ण: पहले सभी आवेदकों के दस्तावेज एवं शिल्पकार कार्ड सत्यापित किए जाएंगे। उसके बाद केवल सत्यापित एवं पात्र शिल्पकारों को आवंटन प्रक्रिया में शामिल किया जाएगा। उपलब्ध स्टॉल से अधिक पात्र आवेदन होने पर लॉटरी के माध्यम से आवंटन किया जाएगा।'
      }
    ]
  },
  {
    slug: 'national-awardees',
    title: 'National Awardee',
    titleHi: 'राष्ट्रीय पुरस्कार प्राप्तकर्ता',
    body: [
      {
        en: 'This category is for eligible applicants who are national award-winning artists/artisans.',
        hi: 'यह श्रेणी राष्ट्रीय पुरस्कार प्राप्त कलाकारों/शिल्पकारों से संबंधित पात्र आवेदकों के लिए है।'
      },
      {
        en: 'Required documents: Aadhaar Card, a valid National Award Certificate, a passport-size photograph, and work/product photographs.',
        hi: 'आवश्यक दस्तावेज: आधार कार्ड, वैध राष्ट्रीय पुरस्कार प्रमाणपत्र, पासपोर्ट साइज़ फोटो, तथा कार्य/उत्पाद की तस्वीरें।'
      },
      {
        en: 'The National Award Certificate must be clear and valid; only genuine, relevant work/product photographs should be uploaded. False information or incorrect documents may lead to rejection.',
        hi: 'राष्ट्रीय पुरस्कार प्रमाणपत्र स्पष्ट एवं वैध होना चाहिए। केवल वास्तविक और संबंधित कार्य/उत्पाद की तस्वीरें अपलोड करें। गलत जानकारी या गलत दस्तावेज पाए जाने पर आवेदन अस्वीकार किया जा सकता है।'
      },
      {
        en: 'Application Fee, Stall Fee, and Allotment Method for this category are not yet specified in the official guidelines — [TBC – Business Confirmation Required]. Final eligibility and allotment will follow KDB’s verification and prescribed process.',
        hi: 'इस श्रेणी की आवेदन शुल्क, स्टॉल शुल्क और आवंटन विधि का विवरण वर्तमान में उपलब्ध नहीं है — [TBC – व्यावसायिक पुष्टि आवश्यक]। अंतिम पात्रता और आवंटन KDB के सत्यापन एवं निर्धारित प्रक्रिया के अनुसार होगा।'
      }
    ]
  },
  {
    slug: 'brand-promotions',
    title: 'Brand Promotion',
    titleHi: 'ब्रांड प्रमोशन',
    body: [
      {
        en: '1. Purpose of this category: a reputed Agency/Company/Firm/Business Entity may apply for a Stall/Booth under this category to promote its product, service, or brand. The Stall/Booth in this category will mainly be used for Brand Promotion, Product Promotion, Publicity, and Marketing Activities. Booths under this category will be kept Reserved for Brand Promotion, separate from the other general categories.',
        hi: '1. श्रेणी का उद्देश्य: इस श्रेणी के अंतर्गत प्रतिष्ठित एजेंसी/कंपनी/फर्म/व्यावसायिक संस्था अपने उत्पाद, सेवा या ब्रांड के प्रचार-प्रसार के लिए स्टॉल/बूथ हेतु आवेदन कर सकती है। इस श्रेणी के स्टॉल/बूथ का उपयोग मुख्य रूप से ब्रांड प्रमोशन, उत्पाद प्रमोशन, प्रचार एवं विपणन गतिविधियों के लिए किया जाएगा। इस श्रेणी के अंतर्गत आने वाले बूथों को अन्य सामान्य श्रेणियों से अलग ब्रांड प्रमोशन श्रेणी के लिए आरक्षित रखा जाएगा।'
      },
      {
        en: '2. Required Documents: when applying, the Agency/Company/Firm must provide — Aadhaar Card of the Owner/Proprietor/Director/Manager/Authorized Representative; a valid Photo ID Card of the Owner/Manager/Authorized Representative; a valid Business Registration Certificate of the Agency/Company/Firm; GST Registration Certificate, if applicable; Firm/Company Registration Certificate, if applicable; an Authorization Letter for the authorized representative, if the application is made by a representative; details of the Brand/Product/Service; details of proposed promotional activities; and any other document required by KDB.',
        hi: '2. आवश्यक दस्तावेज: आवेदन करते समय एजेंसी/कंपनी/फर्म को निम्नलिखित दस्तावेज उपलब्ध कराने होंगे: मालिक/प्रोप्राइटर/डायरेक्टर/मैनेजर/अधिकृत प्रतिनिधि का आधार कार्ड; मालिक/मैनेजर/अधिकृत प्रतिनिधि का वैध फोटो पहचान पत्र; एजेंसी/कंपनी/फर्म का वैध व्यवसाय पंजीकरण प्रमाणपत्र; GST पंजीकरण प्रमाणपत्र, यदि लागू हो; फर्म/कंपनी पंजीकरण प्रमाणपत्र, यदि लागू हो; अधिकृत प्रतिनिधि के संबंध में प्राधिकार पत्र, यदि आवेदन किसी प्रतिनिधि द्वारा किया जा रहा हो; ब्रांड/उत्पाद/सेवा का विवरण; प्रचार हेतु प्रस्तावित गतिविधियों का विवरण; KDB द्वारा मांगे जाने पर अन्य आवश्यक दस्तावेज।'
      },
      {
        en: '3. Selection of Agency through Tender: the Agency for running the application process/operations for the Reserved Booths in this Brand Promotion category will be selected by KDB through a Tender Process. Only the Agency selected through the Tender Process will be authorized to entertain applications and run the allotment process for the Reserved Booths in this category. Details of the Agency selected by KDB through the Tender Process may be made available on the prescribed medium/Portal.',
        hi: '3. निविदा के माध्यम से एजेंसी का चयन: इस ब्रांड प्रमोशन श्रेणी के आरक्षित बूथों के संचालन/आवेदन प्रक्रिया के लिए एजेंसी का चयन KDB द्वारा निविदा प्रक्रिया के माध्यम से किया जाएगा। निविदा प्रक्रिया में चयनित एजेंसी ही इस श्रेणी के आरक्षित बूथों के लिए आवेदनों को स्वीकार करने तथा आवंटन प्रक्रिया संचालित करने के लिए अधिकृत होगी। KDB द्वारा निविदा प्रक्रिया के माध्यम से चयनित एजेंसी का विवरण निर्धारित माध्यम/पोर्टल पर उपलब्ध कराया जा सकता है।'
      },
      {
        en: '4. Application & Booth Allotment Process: a Company/Firm/Brand/Agency wishing to get a Booth under the Brand Promotion category must apply by filling the prescribed Application Form, giving the required information relating to the Brand, Company/Firm, Authorized Representative, Contact Details, Product/Service, and Promotion Activity. After the application is received, the Agency selected through the Tender will contact the applicant directly, and may check the applicant’s Brand/Company information and documents. Allotment of the Reserved Booth will be made by the selected Agency as per booth availability, the prescribed conditions, and Brand Promotion requirements. The standard Draw of Lots does not apply to the Reserved Booths in this category, since the allotment process for booths in this category is carried out by the Agency selected through Tender, as per its prescribed process.',
        hi: '4. आवेदन एवं बूथ आवंटन प्रक्रिया: ब्रांड प्रमोशन श्रेणी में बूथ प्राप्त करने के इच्छुक कंपनी/फर्म/ब्रांड/एजेंसी को निर्धारित आवेदन पत्र भरकर आवेदन करना होगा। आवेदन पत्र में ब्रांड, कंपनी/फर्म, अधिकृत प्रतिनिधि, संपर्क विवरण, उत्पाद/सेवा एवं प्रचार गतिविधि से संबंधित आवश्यक जानकारी देनी होगी। आवेदन प्राप्त होने के बाद निविदा के माध्यम से चयनित एजेंसी द्वारा आवेदक से सीधे संपर्क किया जाएगा। चयनित एजेंसी आवेदक के ब्रांड/कंपनी की आवश्यक जानकारी एवं दस्तावेजों की जाँच कर सकती है। बूथ की उपलब्धता, निर्धारित शर्तों तथा ब्रांड प्रमोशन आवश्यकताओं के अनुसार आरक्षित बूथ का आवंटन चयनित एजेंसी द्वारा किया जाएगा। इस श्रेणी के आरक्षित बूथों के लिए सामान्य लॉटरी लागू नहीं होगी, क्योंकि इस श्रेणी के बूथों की आवंटन प्रक्रिया निविदा के माध्यम से चयनित एजेंसी द्वारा निर्धारित प्रक्रिया के अनुसार की जाएगी।'
      },
      {
        en: '5. Reserved Booth: booths designated for Brand Promotion will be kept Reserved for this category, and may be used only for approved Brand Promotion/Product Promotion/Publicity activities. Booth location and availability will be as per the Mahotsav’s approved layout and KDB’s prescribed arrangements. An applicant may not claim Brand Promotion rights at a booth belonging to any other category.',
        hi: '5. आरक्षित बूथ: ब्रांड प्रमोशन के लिए निर्धारित बूथों को इस श्रेणी के लिए आरक्षित रखा जाएगा। इन बूथों का उपयोग केवल स्वीकृत ब्रांड प्रमोशन/उत्पाद प्रमोशन/प्रचार गतिविधियों के लिए किया जा सकेगा। बूथ की स्थिति एवं उपलब्धता महोत्सव के स्वीकृत लेआउट तथा KDB द्वारा निर्धारित व्यवस्था के अनुसार होगी। आवेदक द्वारा किसी अन्य श्रेणी के बूथ पर ब्रांड प्रमोशन करने का दावा नहीं किया जा सकेगा।'
      },
      {
        en: '6. Activities permitted for Brand Promotion: the following activities may be carried out at a booth in this category — brand publicity; sharing product/service information; product display; brand awareness activities; customer interaction; distribution of promotional material; approved marketing/promotional activities. All activities must be carried out as per the Mahotsav’s prescribed arrangements, security, and administrative rules.',
        hi: '6. ब्रांड प्रमोशन के लिए अनुमत गतिविधियाँ: इस श्रेणी के बूथ पर निम्न प्रकार की गतिविधियाँ की जा सकती हैं: ब्रांड का प्रचार-प्रसार; उत्पाद/सेवा की जानकारी देना; उत्पाद प्रदर्शन; ब्रांड जागरूकता गतिविधियां; ग्राहकों से संवाद; प्रचार सामग्री का वितरण; स्वीकृत विपणन/प्रचार गतिविधियां। सभी गतिविधियां महोत्सव की निर्धारित व्यवस्था, सुरक्षा एवं प्रशासनिक नियमों के अनुसार करनी होंगी।'
      },
      {
        en: '7. Prohibited activities: no activity may be carried out that affects public order, traffic, security, or the Mahotsav’s arrangements. Promotional material, banners, or other items may not be placed outside the booth’s prescribed limit, unless permitted by KDB/the authorized Agency. Excessive sound, advertisement, or other promotional activity may not be carried out without permission. The booth may not be used for any other Company/Brand without permission, and may not be transferred, sublet, or rented to any other person or company.',
        hi: '7. प्रतिबंधित गतिविधियाँ: कोई भी ऐसी गतिविधि नहीं की जाएगी जिससे सार्वजनिक व्यवस्था, यातायात, सुरक्षा या महोत्सव की व्यवस्था प्रभावित हो। बूथ की निर्धारित सीमा से बाहर प्रचार सामग्री, बैनर या अन्य सामान नहीं लगाया जाएगा, जब तक KDB/अधिकृत एजेंसी से अनुमति न हो। बिना अनुमति अत्यधिक ध्वनि, विज्ञापन या अन्य प्रचार गतिविधि नहीं की जाएगी। किसी अन्य कंपनी/ब्रांड के लिए बिना अनुमति बूथ का उपयोग नहीं किया जा सकेगा। बूथ को किसी अन्य व्यक्ति या कंपनी को हस्तांतरित, उप-किराए पर या किराए पर नहीं दिया जा सकेगा।'
      },
      {
        en: '8. Accuracy of documents and information: all information and documents given by the applicant in the Application Form must be correct and valid. An application/allotment may be cancelled if false information, incorrect documents, or an incorrect business-registration detail is found. KDB or the Agency selected through Tender will have the right to carry out additional checks of the required documents.',
        hi: '8. दस्तावेज एवं जानकारी की सत्यता: आवेदक द्वारा आवेदन पत्र में दी गई सभी जानकारी एवं दस्तावेज सही और वैध होने चाहिए। गलत जानकारी, गलत दस्तावेज या व्यवसाय पंजीकरण से संबंधित गलत विवरण पाए जाने पर आवेदन/आवंटन रद्द किया जा सकता है। KDB अथवा निविदा के माध्यम से चयनित एजेंसी को आवश्यक दस्तावेजों की अतिरिक्त जाँच करने का अधिकार होगा।'
      },
      {
        en: '9. Fees & Payment: fees/charges relating to a Booth and the payment terms in the Brand Promotion category will be as prescribed by KDB, or as determined by the Agency selected through Tender. The applicant must pay the prescribed fee and other applicable charges before booth allotment. A payment receipt/confirmation will be provided to the applicant as per the prescribed process.',
        hi: '9. शुल्क एवं भुगतान: ब्रांड प्रमोशन श्रेणी में बूथ से संबंधित शुल्क तथा भुगतान शर्तें KDB द्वारा निर्धारित अथवा निविदा के माध्यम से चयनित एजेंसी द्वारा निर्धारित प्रक्रिया के अनुसार होंगी। आवेदक को बूथ आवंटन से पहले निर्धारित शुल्क एवं अन्य लागू शुल्कों का भुगतान करना होगा। भुगतान की रसीद/पुष्टि आवेदक को निर्धारित प्रक्रिया के अनुसार प्रदान की जाएगी।'
      },
      {
        en: '10. Important process: Application Form → Applicant Details & Documents → Contact by the selected Tender Agency → Verification/Discussion → Reserved Booth Allotment → Payment of the prescribed Fee/Charges → Booth Confirmation. Important notice: in this category, only the Agency selected by KDB through the Tender Process will entertain applications for the Reserved Booths of Brand Promotion, and will contact applicants and carry out booth allotment as per the prescribed process. This is not a category with a standard Draw of Lots.',
        hi: '10. महत्वपूर्ण प्रक्रिया: आवेदन पत्र → आवेदक विवरण एवं दस्तावेज → चयनित निविदा एजेंसी द्वारा संपर्क → सत्यापन/चर्चा → आरक्षित बूथ आवंटन → निर्धारित शुल्क का भुगतान → बूथ पुष्टि। महत्वपूर्ण सूचना: इस श्रेणी में KDB द्वारा निविदा प्रक्रिया के माध्यम से चयनित एजेंसी ही ब्रांड प्रमोशन के आरक्षित बूथों के आवेदनों को स्वीकार करेगी तथा आवेदकों से संपर्क करके निर्धारित प्रक्रिया के अनुसार बूथ आवंटन करेगी। यह श्रेणी सामान्य लॉटरी वाली श्रेणी नहीं होगी।'
      }
    ]
  },
  {
    slug: 'self-help-groups',
    title: 'Self Help Groups (SHG)',
    titleHi: 'स्वयं सहायता समूह (SHG)',
    body: [
      {
        en: '1. Purpose of this category: under this category, Registered Self Help Groups (SHGs) will be provided a Stall/Booth to display and sell products made and prepared by their own group. The purpose is to provide an opportunity for SHGs to display and sell domestic, handicraft, traditional, food, and other products made by them.',
        hi: '1. श्रेणी का उद्देश्य: इस श्रेणी के अंतर्गत पंजीकृत स्वयं सहायता समूहों (SHG) को अपने समूह द्वारा बनाए एवं तैयार किए गए उत्पादों के प्रदर्शन एवं बिक्री के लिए स्टॉल/बूथ उपलब्ध करवाए जाएंगे। इसका उद्देश्य SHG द्वारा निर्मित घरेलू, हस्तशिल्प, पारंपरिक, खाद्य एवं अन्य उत्पादों को प्रदर्शित एवं बेचने के लिए अवसर प्रदान करना है।'
      },
      {
        en: '2. Reserved Stalls/Booths: a total of 60 Stalls/Booths are reserved for Self Help Groups — 40 for Registered SHGs from Haryana, and 20 for Registered SHGs from outside Haryana.',
        hi: '2. आरक्षित स्टॉल/बूथ: स्वयं सहायता समूहों के लिए कुल 60 स्टॉल/बूथ आरक्षित रहेंगे — हरियाणा के पंजीकृत SHG के लिए 40, और हरियाणा से बाहर के पंजीकृत SHG के लिए 20 (कुल 60)।'
      },
      {
        en: '3. Eligibility: only Registered Self Help Groups (SHGs) may apply in this category. The SHG’s registration must be valid at the time of application. The application will be made by the SHG’s authorized member/representative. Only products made/manufactured by the SHG itself may mainly be displayed and sold at the stall.',
        hi: '3. पात्रता: इस श्रेणी में केवल पंजीकृत स्वयं सहायता समूह (SHG) आवेदन कर सकते हैं। आवेदन के समय SHG का पंजीकरण वैध होना चाहिए। आवेदन SHG की ओर से अधिकृत सदस्य/प्रतिनिधि द्वारा किया जाएगा। स्टॉल पर मुख्य रूप से SHG द्वारा स्वयं बनाए/निर्मित उत्पाद ही प्रदर्शित एवं बेचे जा सकेंगे।'
      },
      {
        en: '4. Required Documents: the following must be provided with the online application — SHG’s valid Registration Certificate/Registration Proof; the authorized member/representative’s Aadhaar Card; the authorized member/representative’s valid ID Card; details of the SHG’s work and products; clear photographs of products made by the SHG; an Authorization Letter/document, if applicable; and any other document required by KDB.',
        hi: '4. आवश्यक दस्तावेज: ऑनलाइन आवेदन के साथ निम्न दस्तावेज उपलब्ध करवाने होंगे: SHG का वैध पंजीकरण प्रमाणपत्र/पंजीकरण प्रमाण; अधिकृत सदस्य/प्रतिनिधि का आधार कार्ड; अधिकृत सदस्य/प्रतिनिधि का वैध पहचान पत्र; SHG के कार्य एवं उत्पादों का विवरण; SHG द्वारा बनाए गए उत्पादों की स्पष्ट तस्वीरें; प्राधिकार पत्र/दस्तावेज, यदि लागू हो; KDB द्वारा मांगे जाने पर अन्य आवश्यक दस्तावेज।'
      },
      {
        en: '5. Application Fee: an Application Fee is mandatory for all SHG applicants — ₹200 + 18% GST = ₹236, deposited at the time of online application. This ₹236 fee is Non-Refundable — it will not be returned even if the application is rejected, the applicant is not found eligible, or a stall is not obtained in the draw.',
        hi: '5. आवेदन शुल्क: सभी SHG आवेदकों के लिए आवेदन शुल्क अनिवार्य होगी। आवेदन शुल्क: ₹200 + 18% GST = ₹236/-। आवेदन शुल्क ऑनलाइन आवेदन के समय जमा करनी होगी। ₹236/- आवेदन शुल्क वापस नहीं की जाएगी। आवेदन अस्वीकृत होने, पात्र न पाए जाने अथवा लॉटरी में स्टॉल न मिलने की स्थिति में भी आवेदन शुल्क वापस नहीं की जाएगी।'
      },
      {
        en: '6. Stall/Booth Allotment Fee: a Stall/Booth will be allotted free of cost in the SHG category — no Stall/Booth Allotment Fee is charged in this category. Only the ₹236 Application Fee applies.',
        hi: '6. स्टॉल/बूथ आवंटन शुल्क: SHG श्रेणी में स्टॉल/बूथ का निःशुल्क आवंटन किया जाएगा। इस श्रेणी में कोई स्टॉल/बूथ आवंटन शुल्क नहीं ली जाएगी। केवल ₹236/- आवेदन शुल्क लागू होगी।'
      },
      {
        en: '7. Allotment Method — Through Draw: all applications and documents will first be verified; only Verified & Eligible SHGs will be included in the allotment process. If eligible applications in a given region are equal to or fewer than the fixed quota, eligible SHGs may be allotted a stall as per availability. If eligible applications exceed the fixed quota, stall allotment will be made through a Transparent Draw of Lots. The draw will be conducted separately for Haryana and Outside Haryana, as per their respective fixed quotas.',
        hi: '7. आवंटन विधि – लॉटरी के माध्यम से: सभी आवेदनों एवं दस्तावेजों का पहले सत्यापन किया जाएगा। केवल सत्यापित एवं पात्र SHG को आवंटन प्रक्रिया में शामिल किया जाएगा। यदि किसी क्षेत्र में पात्र आवेदन निर्धारित कोटे के बराबर या कम हैं, तो पात्र SHG को उपलब्धता के अनुसार स्टॉल आवंटित किया जा सकता है। यदि पात्र आवेदन निर्धारित कोटे से अधिक हो जाते हैं, तो पारदर्शी लॉटरी के माध्यम से स्टॉल आवंटन किया जाएगा। हरियाणा और हरियाणा से बाहर के लिए लॉटरी अलग-अलग निर्धारित कोटे के अनुसार की जाएगी।'
      },
      {
        en: '8. Sale of food and other products at the SHG stall — permitted products: SHGs may sell the following types of products made/manufactured by themselves — handicraft and handicraft products; handmade products; items for domestic use; decorative products; traditional products; Achar (pickle); Masale (spices); uncooked/non-cooked Papad; other packaged food products made by the SHG itself; and other permitted products made by the SHG itself. Important condition: sale of food products is allowed, but such products must not be Ready-to-Eat/Refreshment items falling under the Refreshment Food Stall category.',
        hi: '8. SHG स्टॉल पर खाद्य एवं अन्य उत्पादों की बिक्री — अनुमत उत्पाद: SHG अपने द्वारा स्वयं बनाए/निर्मित निम्न प्रकार के उत्पाद बेच सकते हैं: हस्तशिल्प एवं हस्तशिल्प उत्पाद; हस्तनिर्मित उत्पाद; घरेलू उपयोग की वस्तुएँ; सजावटी उत्पाद; पारंपरिक उत्पाद; अचार; मसाले; कच्चे/बिना पके पापड़; अन्य SHG द्वारा स्वयं निर्मित पैक किए गए खाद्य उत्पाद; अन्य अनुमत उत्पाद जो SHG द्वारा स्वयं बनाए गए हों। महत्वपूर्ण शर्त: खाद्य उत्पादों की बिक्री की अनुमति है, लेकिन वे उत्पाद रिफ्रेशमेंट फूड स्टॉल श्रेणी के अंतर्गत आने वाले तुरंत खाने योग्य/जलपान सामग्री नहीं होने चाहिए।'
      },
      {
        en: '9. Restriction on Refreshment Food Items: operating as a Refreshment Food Stall — cooking or serving prepared food for sale — is not permitted in the SHG category. No Cooking, Frying, Roasting, or Food Preparation of any kind will be done at the stall. LPG Cylinder, Gas Stove/Burner, Bhatti, Coal, Wood, or Open Flame may not be used. The following types of Refreshment/Ready-to-Serve food business are not permitted in this category: selling prepared/cooked food; selling hot food cooked/served on the spot; making and selling items like Pakoras, Samosas, etc.; making and selling tea/coffee; and any refreshment activity involving cooking or heating food. However, SHG-made Achar, Masale, uncooked Papad, and similar packaged/non-ready-to-serve food products may be sold, provided they comply with applicable Food Safety and other related rules.',
        hi: '9. जलपान सामग्री (Refreshment) पर प्रतिबंध: SHG श्रेणी में जलपान स्टॉल की तरह खाना तैयार करके या परोसकर बेचने की अनुमति नहीं होगी। स्टॉल पर किसी भी प्रकार का खाना पकाना, तलना, भूनना या खाद्य तैयारी नहीं की जाएगी। LPG सिलेंडर, गैस स्टोव/बर्नर, भट्टी, कोयला, लकड़ी या खुली लौ का उपयोग नहीं किया जाएगा। निम्न प्रकार के जलपान/तुरंत परोसने योग्य खाद्य व्यवसाय इस श्रेणी में अनुमत नहीं होंगे: तैयार खाना बनाकर बेचना; गरम खाना बनाकर/परोसकर बेचना; पकौड़े, समोसे आदि बनाकर बेचना; चाय/कॉफी बनाकर बेचना; खाना पकाने या गर्म करने वाली जलपान गतिविधियां। हालांकि, SHG द्वारा स्वयं निर्मित अचार, मसाले, कच्चे पापड़ तथा इसी प्रकार के पैक किए गए/तुरंत न परोसे जाने वाले खाद्य उत्पाद बेचे जा सकते हैं, बशर्ते वे लागू खाद्य सुरक्षा एवं अन्य संबंधित नियमों का पालन करते हों।'
      },
      {
        en: '10. Authenticity of products: products sold at the stall must be made/manufactured by the SHG itself. Selling products bought from another trader, company, or brand as the SHG’s own made products is not permitted. KDB will have the right to ask for information/proof relating to the products and their manufacture, if needed. In the case of packaged food products, applicable Food Safety and labelling requirements must be followed.',
        hi: '10. उत्पादों की वास्तविकता: स्टॉल पर बेचे जाने वाले उत्पाद SHG द्वारा स्वयं बनाए/निर्मित किए गए होने चाहिए। किसी अन्य व्यापारी, कंपनी या ब्रांड से खरीदे गए उत्पादों को SHG के स्वयं निर्मित उत्पादों के रूप में बेचना अनुमत नहीं होगा। KDB को आवश्यकता पड़ने पर उत्पादों एवं उनके निर्माण से संबंधित जानकारी/प्रमाण मांगने का अधिकार होगा। पैक किए गए खाद्य उत्पादों के मामले में लागू खाद्य सुरक्षा एवं लेबलिंग आवश्यकताओं का पालन करना होगा।'
      },
      {
        en: '11. Use of the Stall: the stall may be used only for the display and sale of approved SHG products. The stall may not be transferred, sublet, or rented to any other person, organisation, company, or trader. Keeping goods outside the stall’s prescribed limit, or obstructing public movement, is prohibited. The SHG must maintain cleanliness in and around the stall.',
        hi: '11. स्टॉल का उपयोग: स्टॉल का उपयोग केवल स्वीकृत SHG उत्पादों के प्रदर्शन एवं बिक्री के लिए किया जाएगा। स्टॉल किसी अन्य व्यक्ति, संस्था, कंपनी या व्यापारी को हस्तांतरित, उप-किराए पर या किराए पर नहीं दिया जा सकेगा। स्टॉल की निर्धारित सीमा से बाहर सामान रखना या सार्वजनिक आवागमन में बाधा डालना प्रतिबंधित होगा। SHG को स्टॉल एवं आसपास के क्षेत्र में साफ-सफाई बनाए रखना अनिवार्य होगा।'
      },
      {
        en: '12. Verification & action: KDB may check the SHG’s Registration, Representative Details, Products, and required documents. An Application/Allotment may be cancelled if false information, incorrect documents, or presenting another person’s/business’s products as one’s own is found. KDB may take action as per the rules if a Refreshment Food Stall-type prohibited activity is carried out. KDB or an authorized officer will have the right to inspect the stall.',
        hi: '12. सत्यापन एवं कार्रवाई: KDB द्वारा SHG का पंजीकरण, प्रतिनिधि विवरण, उत्पाद एवं आवश्यक दस्तावेजों की जाँच की जा सकती है। गलत जानकारी, गलत दस्तावेज अथवा किसी अन्य व्यक्ति/व्यवसाय के उत्पादों को अपने उत्पादों के रूप में प्रस्तुत करने पर आवेदन/आवंटन रद्द किया जा सकता है। रिफ्रेशमेंट फूड स्टॉल से संबंधित प्रतिबंधित गतिविधि करने पर KDB द्वारा नियमानुसार कार्रवाई की जा सकती है। KDB अथवा अधिकृत अधिकारी को स्टॉल की जाँच करने का अधिकार होगा।'
      },
      {
        en: '13. Financial Summary — Haryana SHG: 40 Reserved Stalls/Booths, ₹236 Application Fee, FREE Stall/Booth Allotment Fee, Direct/Draw Allotment Method. Outside Haryana SHG: 20 Reserved Stalls/Booths, ₹236 Application Fee, FREE Stall/Booth Allotment Fee, Direct/Draw Allotment Method. (If Verified & Eligible applications exceed the fixed quota, a Transparent Draw of Lots will be held.) Important: a total of 60 Stalls/Booths are reserved for SHGs — 40 Haryana and 20 Outside Haryana. The ₹236 Application Fee is mandatory and Non-Refundable for all applicants. There is no Stall/Booth Allotment Fee. SHGs may sell Achar, Masale, uncooked Papad, and other permitted Food/Non-Food products made by themselves. Cooking/Preparing/Serving activity like a Refreshment Food Stall is not permitted. Sale of food products must comply with applicable Food Safety and other related rules. A Transparent Draw will be held if eligible applications exceed the fixed quota.',
        hi: '13. वित्तीय सारांश: हरियाणा SHG — 40 आरक्षित स्टॉल/बूथ, ₹236/- आवेदन शुल्क, निःशुल्क स्टॉल/बूथ आवंटन शुल्क, आवंटन विधि सीधा/लॉटरी*। हरियाणा से बाहर SHG — 20 आरक्षित स्टॉल/बूथ, ₹236/- आवेदन शुल्क, निःशुल्क स्टॉल/बूथ आवंटन शुल्क, आवंटन विधि सीधा/लॉटरी*। (*यदि सत्यापित एवं पात्र आवेदन निर्धारित कोटे से अधिक होते हैं, तो पारदर्शी लॉटरी की जाएगी।) महत्वपूर्ण: कुल 60 स्टॉल/बूथ SHG के लिए आरक्षित हैं — 40 हरियाणा एवं 20 हरियाणा से बाहर। सभी आवेदकों के लिए ₹236/- आवेदन शुल्क अनिवार्य और वापस न होने वाली है। स्टॉल/बूथ आवंटन शुल्क नहीं होगी। SHG अपने द्वारा बनाए गए अचार, मसाले, कच्चे पापड़ एवं अन्य अनुमत खाद्य/गैर-खाद्य उत्पाद बेच सकते हैं। रिफ्रेशमेंट फूड स्टॉल जैसी खाना पकाने/तैयार करने/परोसने की गतिविधि अनुमत नहीं होगी। खाद्य उत्पादों की बिक्री में लागू खाद्य सुरक्षा एवं अन्य संबंधित नियमों का पालन करना होगा। निर्धारित कोटे से अधिक पात्र आवेदन होने पर पारदर्शी लॉटरी की जाएगी।'
      }
    ]
  },
  {
    slug: 'special-art-craft',
    title: 'Special Art & Craft',
    titleHi: 'विशेष कला एवं शिल्प',
    body: [
      {
        en: '1. Purpose of this category: this category provides a Stall/Booth to participants connected with traditional, special, and distinctive Indian Art & Craft. Its purpose is to display India’s traditional art, handicraft, and special craft, and to give related artists/businesspersons an opportunity to display and sell their products.',
        hi: '1. श्रेणी का उद्देश्य: इस श्रेणी के अंतर्गत ऐसे प्रतिभागियों को स्टॉल/बूथ उपलब्ध करवाए जाएंगे जो पारंपरिक, विशिष्ट एवं विशेष भारतीय कला एवं शिल्प से जुड़े हुए हैं। इस श्रेणी का उद्देश्य भारत की पारंपरिक कला, हस्तशिल्प एवं विशेष शिल्प को प्रदर्शित करने तथा संबंधित कलाकारों/व्यवसायियों को अपने उत्पाद प्रदर्शित एवं बेचने का अवसर प्रदान करना है।'
      },
      {
        en: '2. Eligibility: an Artisan/Craftsperson/Artist/Craft Business/Individual engaged in traditional or distinctive Indian Art & Craft work may apply in this category. The applicant must clearly describe their Art & Craft Work in the application. The products displayed and sold by the applicant must relate to the Art & Craft work they actually do. KDB may check and verify the applicant’s Art & Craft Work as needed.',
        hi: '2. पात्रता: इस श्रेणी में ऐसे शिल्पकार/कारीगर/कलाकार/शिल्प व्यवसाय/व्यक्ति आवेदन कर सकते हैं जो पारंपरिक अथवा विशिष्ट भारतीय कला एवं शिल्प से संबंधित कार्य करते हों। आवेदक को अपनी कला एवं शिल्प कार्य की स्पष्ट जानकारी आवेदन में देनी होगी। आवेदक द्वारा प्रदर्शित एवं बेचे जाने वाले उत्पाद उसके द्वारा किए जाने वाले कला एवं शिल्प कार्य से संबंधित होने चाहिए। KDB द्वारा आवश्यकता के अनुसार आवेदक की कला एवं शिल्प कार्य की जाँच एवं सत्यापन किया जा सकता है।'
      },
      {
        en: '3. Required Documents: the following must be provided with the online application — the applicant’s Aadhaar Card; the applicant’s valid Photo ID; a detailed description of the Art & Craft Work; clear photographs of Art & Craft products made/prepared by the applicant; a Craft/Business Registration Certificate, if available/applicable; an Artisan/Craft-related Certificate, if available; and any other document required by KDB.',
        hi: '3. आवश्यक दस्तावेज: ऑनलाइन आवेदन के साथ निम्नलिखित दस्तावेज उपलब्ध करवाने होंगे: आवेदक का आधार कार्ड; आवेदक का वैध फोटो पहचान पत्र; कला एवं शिल्प कार्य का विस्तृत विवरण; आवेदक द्वारा बनाए/तैयार किए गए कला एवं शिल्प उत्पादों की स्पष्ट तस्वीरें; शिल्प/व्यवसाय पंजीकरण प्रमाणपत्र, यदि उपलब्ध/लागू हो; शिल्पकार/शिल्प से संबंधित प्रमाणपत्र, यदि उपलब्ध हो; KDB द्वारा मांगे जाने पर अन्य आवश्यक दस्तावेज।'
      },
      {
        en: '4. Work Detail / Art & Craft Details: the applicant must describe their Art & Craft Work, which may include — the name and type of Art/Craft; a description of the products made; the materials used; the process/specialty of making the craft; connection to traditional or local art; experience in this field; the uniqueness/speciality of the products; and other related information.',
        hi: '4. कार्य विवरण / कला एवं शिल्प का विवरण: आवेदक को अपने कला एवं शिल्प कार्य का विवरण देना होगा, जिसमें निम्न जानकारी दी जा सकती है: कला/शिल्प का नाम एवं प्रकार; बनाए जाने वाले उत्पादों का विवरण; उपयोग की जाने वाली सामग्री; शिल्प बनाने की प्रक्रिया/विशेषता; पारंपरिक या स्थानीय कला से संबंध; इस क्षेत्र में अनुभव; उत्पादों की विशेषता एवं विशिष्टता; अन्य संबंधित जानकारी।'
      },
      {
        en: '5. Photos of the Work: the applicant must upload clear and recent photos of their actual Art & Craft products with the application. The photos must clearly show the real nature of the applicant’s Art & Craft Work. KDB may ask for additional photos, videos, or other proof if needed. Presenting another person’s products, or photos obtained from the internet, as one’s own work is not valid.',
        hi: '5. कार्य की तस्वीरें: आवेदक को अपने वास्तविक कला एवं शिल्प उत्पादों की स्पष्ट एवं हाल की तस्वीरें आवेदन के साथ अपलोड करनी होंगी। तस्वीरों से आवेदक के कला एवं शिल्प कार्य की वास्तविक प्रकृति स्पष्ट दिखाई देनी चाहिए। आवश्यकता होने पर KDB द्वारा अतिरिक्त तस्वीरें, वीडियो अथवा अन्य प्रमाण मांगे जा सकते हैं। किसी अन्य व्यक्ति के उत्पादों अथवा इंटरनेट से प्राप्त तस्वीरों को अपने कार्य के रूप में प्रस्तुत करना मान्य नहीं होगा।'
      },
      {
        en: '6. Document & Work Verification: all applications and documents will be checked by Kurukshetra Development Board (KDB), which may verify the applicant’s documents, Work Details, and Art & Craft Products. Only Verified & Eligible Applicants will be included in the Stall Allotment Process. An Application/Allotment may be cancelled if false information, incorrect documents, or incorrect information about one’s own work is given.',
        hi: '6. दस्तावेज एवं कार्य सत्यापन: सभी आवेदनों एवं दस्तावेजों की जाँच KDB द्वारा की जाएगी, जो आवेदक के दस्तावेजों, कार्य विवरण एवं कला एवं शिल्प उत्पादों की जाँच कर सकता है। केवल सत्यापित एवं पात्र आवेदकों को स्टॉल आवंटन प्रक्रिया में शामिल किया जाएगा। गलत जानकारी, गलत दस्तावेज अथवा अपने कार्य के संबंध में गलत जानकारी देने पर आवेदन/आवंटन रद्द किया जा सकता है।'
      },
      {
        en: '7. Application Fee: an Application Fee is mandatory for every applicant in this category — ₹200 + 18% GST = ₹236, deposited at the time of online application. This ₹236 fee is Non-Refundable — it will not be returned even if the application is rejected, the applicant is not found eligible, or a stall is not obtained in the draw.',
        hi: '7. आवेदन शुल्क: इस श्रेणी में आवेदन करने वाले प्रत्येक आवेदक के लिए आवेदन शुल्क अनिवार्य होगी। आवेदन शुल्क: ₹200 + 18% GST = ₹236/-। आवेदन शुल्क ऑनलाइन आवेदन के समय जमा करनी होगी। ₹236/- आवेदन शुल्क वापस नहीं की जाएगी। आवेदन अस्वीकृत होने, आवेदक पात्र न पाए जाने अथवा लॉटरी में स्टॉल न मिलने की स्थिति में भी आवेदन शुल्क वापस नहीं की जाएगी।'
      },
      {
        en: '8. Stall/Booth Fee: an applicant selected/allotted a stall in this category must deposit a Stall/Booth Fee of ₹30,000 (thirty thousand rupees only), as per the process and timeline prescribed by KDB. The stall allotment is considered Final once the prescribed Stall/Booth Fee is deposited.',
        hi: '8. स्टॉल/बूथ शुल्क: इस श्रेणी में चयनित/आवंटित आवेदक को ₹30,000/- (तीस हजार रुपये मात्र) स्टॉल/बूथ शुल्क जमा करनी होगी। स्टॉल/बूथ शुल्क का भुगतान KDB द्वारा निर्धारित प्रक्रिया एवं समय सीमा के अनुसार किया जाएगा। निर्धारित स्टॉल/बूथ शुल्क जमा होने के बाद स्टॉल आवंटन को अंतिम माना जाएगा।'
      },
      {
        en: '9. Allotment Method — Through Draw: all applications will first undergo Document and Work Verification, and only Verified and Eligible applicants will be included in the Allotment Process. If the number of Verified and Eligible applications is equal to or fewer than the available stalls, KDB may allot stalls as per availability. If the number of Verified and Eligible applications exceeds the available stalls, a Transparent Draw of Lots will be held for stall allotment, among only Verified and Eligible applicants. An applicant selected in the draw must deposit the prescribed ₹30,000 Stall/Booth Fee.',
        hi: '9. आवंटन विधि – लॉटरी के माध्यम से: सभी आवेदनों की पहले दस्तावेज एवं कार्य सत्यापन की जाएगी। केवल सत्यापित एवं पात्र आवेदकों को आवंटन प्रक्रिया में शामिल किया जाएगा। यदि सत्यापित एवं पात्र आवेदनों की संख्या उपलब्ध स्टॉल के बराबर या कम है, तो KDB द्वारा उपलब्धता के अनुसार स्टॉल आवंटित किया जा सकता है। यदि सत्यापित एवं पात्र आवेदनों की संख्या उपलब्ध स्टॉल से अधिक हो जाती है, तो स्टॉल आवंटन के लिए पारदर्शी लॉटरी की जाएगी। लॉटरी केवल सत्यापित एवं पात्र आवेदकों के बीच की जाएगी। लॉटरी में चयनित आवेदक को निर्धारित ₹30,000/- स्टॉल/बूथ शुल्क जमा करनी होगी।'
      },
      {
        en: '10. Activities permitted at the Stall: the stall may be used only for the display and sale of the related Art & Craft products. Only products related to the Art & Craft described and approved in the applicant’s application may be displayed/sold at the stall. Selling another person’s, company’s, or trader’s products as one’s own Art & Craft products is not permitted. The stall may not be transferred, sublet, or rented to any other person/businessperson.',
        hi: '10. स्टॉल पर अनुमत गतिविधियाँ: स्टॉल का उपयोग केवल संबंधित कला एवं शिल्प उत्पादों के प्रदर्शन एवं बिक्री के लिए किया जाएगा। आवेदक द्वारा अपने आवेदन में बताए गए एवं स्वीकृत कला एवं शिल्प से संबंधित उत्पाद ही स्टॉल पर प्रदर्शित/बेचे जाएंगे। किसी अन्य व्यक्ति, कंपनी या व्यापारी के उत्पादों को अपने कला एवं शिल्प उत्पादों के रूप में बेचना अनुमत नहीं होगा। स्टॉल को किसी अन्य व्यक्ति/व्यवसायी को हस्तांतरित, उप-किराए पर या किराए पर नहीं दिया जा सकेगा।'
      },
      {
        en: '11. General rules: the Stall Holder must maintain cleanliness in and around their stall. Keeping goods outside the stall’s prescribed limit, or obstructing public movement, is prohibited. KDB’s permission is required for any unauthorized promotional activity or installing an additional structure. KDB or an authorized officer may inspect the stall. The Stall Holder must comply with all instructions relating to security, cleanliness, timing, electrical arrangements, and Mahotsav Administration.',
        hi: '11. सामान्य नियम: स्टॉल धारक को अपने स्टॉल एवं आसपास के क्षेत्र में साफ-सफाई बनाए रखना होगा। स्टॉल की निर्धारित सीमा से बाहर सामान रखना या सार्वजनिक आवागमन में बाधा डालना प्रतिबंधित होगा। किसी भी प्रकार की अनधिकृत प्रचार गतिविधि अथवा अतिरिक्त संरचना लगाने के लिए KDB की अनुमति आवश्यक होगी। KDB अथवा अधिकृत अधिकारी द्वारा स्टॉल की जाँच की जा सकती है। सुरक्षा, स्वच्छता, समय-सारणी, विद्युत व्यवस्था एवं महोत्सव प्रशासन से संबंधित सभी निर्देशों का पालन करना अनिवार्य होगा।'
      },
      {
        en: '12. Financial Summary — Application Fee: ₹236, Online. Stall/Booth Fee: ₹30,000, as per the process prescribed by KDB. Allotment Method: Direct/Draw, based on eligibility and availability. (If Verified & Eligible applications exceed the available stalls, allotment will be made through a Transparent Draw of Lots.) Important: this category is for Traditional and Distinctive Indian Art & Craft. The ₹236 Application Fee is mandatory and Non-Refundable for all applicants. A selected/allotted applicant must pay the ₹30,000 Stall/Booth Fee. Document + Work Verification happens first, and only Verified & Eligible Applicants will be included in the Allotment Process. A Transparent Draw will be held if eligible applications exceed the available stalls.',
        hi: '12. वित्तीय सारांश: आवेदन शुल्क ₹236/-, माध्यम ऑनलाइन। स्टॉल/बूथ शुल्क ₹30,000/-, KDB द्वारा निर्धारित प्रक्रिया। आवंटन विधि: सीधा/लॉटरी*, पात्रता एवं उपलब्धता के आधार पर। (*यदि सत्यापित एवं पात्र आवेदन उपलब्ध स्टॉल से अधिक होते हैं, तो पारदर्शी लॉटरी के माध्यम से आवंटन किया जाएगा।) महत्वपूर्ण: यह श्रेणी पारंपरिक एवं विशिष्ट भारतीय कला एवं शिल्प के लिए है। सभी आवेदकों के लिए ₹236/- आवेदन शुल्क अनिवार्य एवं वापस न होने वाली है। चयनित/आवंटित आवेदक को ₹30,000/- स्टॉल/बूथ शुल्क देनी होगी। पहले दस्तावेज एवं कार्य सत्यापन होगा। केवल सत्यापित एवं पात्र आवेदक ही आवंटन प्रक्रिया में शामिल होंगे। उपलब्ध स्टॉल से अधिक पात्र आवेदन होने पर पारदर्शी लॉटरी की जाएगी।'
      }
    ]
  },
  {
    slug: 'wooden-craft-carpets',
    title: 'Wooden Craft & Carpets (Large Space)',
    titleHi: 'काष्ठ शिल्प एवं कालीन (बड़ा स्थान)',
    body: [
      {
        en: '1. Purpose of this category: Artisans/Craftspersons/Businesses/Exhibitors who need Large Space/a bigger stall area to display and sell their products may apply in this category. This category is specifically meant for large-size, space-intensive products such as — Heavy Wooden Handicrafts; Wooden Craft Products; Wooden Furniture; Large Wooden Decorative Items; Handmade Carpets; Rugs; Large Handcrafted Products; and other Art & Craft products that need more space than a regular stall.',
        hi: '1. श्रेणी का उद्देश्य: इस श्रेणी के अंतर्गत ऐसे शिल्पकार/कारीगर/व्यवसाय/प्रदर्शक आवेदन कर सकते हैं जिन्हें अपने उत्पादों के प्रदर्शन एवं बिक्री के लिए बड़े स्थान/बड़े स्टॉल क्षेत्र की आवश्यकता होती है। यह श्रेणी विशेष रूप से निम्न प्रकार के बड़े आकार वाले एवं अधिक स्थान लेने वाले उत्पादों के लिए निर्धारित है: भारी काष्ठ हस्तशिल्प; काष्ठ शिल्प उत्पाद; काष्ठ फर्नीचर; बड़ी काष्ठ सजावटी वस्तुएं; हस्तनिर्मित कालीन; दरी; बड़े हस्तशिल्प उत्पाद; अन्य ऐसे कला एवं शिल्प उत्पाद जिनके लिए सामान्य स्टॉल की तुलना में अधिक स्थान आवश्यक हो।'
      },
      {
        en: '2. Important — apply only if you need Large Space: this category is specifically for applicants who need a large space to display their products. If an applicant does not need Large Space, they do not need to apply in this category, and should instead apply under another category suitable to their art/products. Applying in this category merely to obtain more space, without actually needing Large Space, is not appropriate. KDB may assess the space requirement based on the applicant’s products, the space needed, and the available layout.',
        hi: '2. महत्वपूर्ण – केवल वही आवेदन करें जिन्हें बड़े स्थान की आवश्यकता हो: यह श्रेणी विशेष रूप से उन आवेदकों के लिए है जिन्हें अपने उत्पादों के प्रदर्शन के लिए बड़े स्थान की आवश्यकता है। यदि आवेदक को बड़े स्थान की आवश्यकता नहीं है, तो उसे इस श्रेणी में आवेदन करने की आवश्यकता नहीं है। ऐसे आवेदक अपनी कला/उत्पादों के अनुसार किसी अन्य उपयुक्त श्रेणी में आवेदन कर सकते हैं। बड़े स्थान की आवश्यकता न होने पर केवल अधिक स्थान प्राप्त करने के उद्देश्य से इस श्रेणी में आवेदन करना उचित नहीं होगा। KDB द्वारा आवेदक के उत्पादों, आवश्यक स्थान तथा उपलब्ध लेआउट के आधार पर स्थान की आवश्यकता का आकलन किया जा सकता है।'
      },
      {
        en: '3. Eligibility: applicants connected to the making, display, or sale of Wooden Craft, Furniture, Carpets, or other large-size Traditional/Handmade Products may apply in this category. The applicant must give a clear description of their products and required space in the Application Form. The products proposed by the applicant must match the purpose of this category.',
        hi: '3. पात्रता: इस श्रेणी में ऐसे आवेदक आवेदन कर सकते हैं जो काष्ठ शिल्प, फर्नीचर, कालीन अथवा अन्य बड़े आकार के पारंपरिक/हस्तनिर्मित उत्पादों के निर्माण, प्रदर्शन या बिक्री से जुड़े हों। आवेदक को अपने उत्पादों एवं आवश्यक स्थान का स्पष्ट विवरण आवेदन पत्र में देना होगा। आवेदक द्वारा प्रस्तावित उत्पाद इस श्रेणी के उद्देश्य के अनुरूप होने चाहिए।'
      },
      {
        en: '4. Required Documents & Information: with the online application, the applicant must provide — the applicant’s Aadhaar Card; a valid Photo ID; Business/Firm Registration, if available/applicable; a detailed description of the products; details of the Wooden Craft/Furniture/Carpet work; clear and recent photographs of the products; the Space Requirement needed for the proposed stall; and any other related document required by KDB.',
        hi: '4. आवश्यक दस्तावेज एवं जानकारी: ऑनलाइन आवेदन के साथ आवेदक को निम्न जानकारी/दस्तावेज उपलब्ध करवाने होंगे: आवेदक का आधार कार्ड; वैध फोटो पहचान पत्र; व्यवसाय/फर्म पंजीकरण, यदि उपलब्ध/लागू हो; उत्पादों का विस्तृत विवरण; काष्ठ शिल्प/फर्नीचर/कालीन कार्य का विवरण; उत्पादों की स्पष्ट एवं हाल की तस्वीरें; प्रस्तावित स्टॉल के लिए आवश्यक स्थान की आवश्यकता; KDB द्वारा मांगे जाने पर अन्य संबंधित दस्तावेज।'
      },
      {
        en: '5. Product & Work Details: in the Application Form, the applicant must give information about their products, such as — the type of Wooden Craft; the type and size of Furniture; the type of Handmade Carpet/Rug; the approximate size of the products; how large the products to be displayed are; the estimated Space Requirement for the stall; the number of products; and other necessary information. This information will help KDB determine suitable space for the applicant.',
        hi: '5. उत्पाद एवं कार्य विवरण: आवेदन पत्र में आवेदक को अपने उत्पादों की जानकारी देनी होगी, जैसे: काष्ठ शिल्प का प्रकार; फर्नीचर का प्रकार एवं आकार; हस्तनिर्मित कालीन/दरी का प्रकार; उत्पादों का अनुमानित आकार; कितने बड़े उत्पाद प्रदर्शित किए जाएंगे; स्टॉल में अनुमानित स्थान की आवश्यकता; उत्पादों की संख्या; अन्य आवश्यक जानकारी। यह जानकारी KDB को आवेदक के लिए उपयुक्त स्थान निर्धारित करने में सहायता करेगी।'
      },
      {
        en: '6. Application Fee: every applicant in this category must pay — Application Fee: ₹200 + 18% GST = ₹236, deposited at the time of online application. This ₹236 fee is Non-Refundable — it will not be returned even if the application is rejected, the applicant does not get space, or no allotment is made.',
        hi: '6. आवेदन शुल्क: इस श्रेणी में आवेदन करने वाले प्रत्येक आवेदक के लिए आवेदन शुल्क: ₹200 + 18% GST = ₹236/-। आवेदन शुल्क ऑनलाइन आवेदन के समय जमा करनी होगी। ₹236/- आवेदन शुल्क वापस नहीं की जाएगी। आवेदन अस्वीकृत होने, आवेदक को स्थान न मिलने अथवा आवंटन न होने की स्थिति में भी आवेदन शुल्क वापस नहीं की जाएगी।'
      },
      {
        en: '7. Stall/Booth Allotment Fee: for the Large Space allotted in this category — Stall/Booth Allotment Fee: ₹60,000 (sixty thousand rupees only). A selected/allotted applicant must deposit this ₹60,000 Stall/Booth Allotment Fee, paid as per the process and timeline prescribed by KDB. This fee applies to the Large Space Stall/Booth in this category.',
        hi: '7. स्टॉल/बूथ आवंटन शुल्क: इस श्रेणी में आवंटित बड़े स्थान के लिए स्टॉल/बूथ आवंटन शुल्क: ₹60,000/- (साठ हजार रुपये मात्र)। चयनित/आवंटित आवेदक को यह ₹60,000/- शुल्क जमा करनी होगी, जिसका भुगतान KDB द्वारा निर्धारित प्रक्रिया एवं समय सीमा के अनुसार किया जाएगा। यह शुल्क इस श्रेणी के बड़े स्थान वाले स्टॉल/बूथ के लिए लागू होगी।'
      },
      {
        en: '8. Allotment Method: the Stall/Space allotment process in this category will be determined by Kurukshetra Development Board (KDB). Allotment will be made based on the applicant’s products, space requirement, availability, location, and stall size. Location and space size will be determined by KDB as per the available layout and arrangements. The exact space requested by the applicant is not guaranteed — the final space/location will be decided by KDB as per availability. KDB may allot suitable available space to an applicant as per their products and requirement.',
        hi: '8. आवंटन विधि: इस श्रेणी में स्टॉल/स्थान आवंटन की प्रक्रिया KDB द्वारा निर्धारित की जाएगी। आवंटन आवेदक के उत्पादों, स्थान की आवश्यकता, उपलब्धता, स्थिति एवं स्टॉल आकार के आधार पर किया जाएगा। स्थिति एवं स्थान का आकार KDB द्वारा उपलब्ध लेआउट एवं व्यवस्था के अनुसार निर्धारित किया जाएगा। आवेदक द्वारा मांगा गया ठीक वही स्थान उपलब्ध होना आवश्यक नहीं है। अंतिम स्थान/स्थिति KDB द्वारा उपलब्धता के अनुसार तय की जाएगी। KDB आवश्यकता के अनुसार आवेदक को उसके उत्पादों एवं आवश्यकता के लिए उपयुक्त उपलब्ध स्थान आवंटित कर सकता है।'
      },
      {
        en: '9. Use of the Large Space: the allotted space will mainly be used for the display and sale of Wooden Craft, Furniture, Carpets, and approved large-format products. The applicant may keep their products only within the prescribed limit of the allotted space. Spreading products into a public pathway or another stall/booth’s space is prohibited. An additional structure, extension, or additional space may not be used without permission. The stall/space may not be transferred, sublet, or rented to any other person, company, or business entity.',
        hi: '9. बड़े स्थान का उपयोग: आवंटित स्थान का उपयोग मुख्य रूप से काष्ठ शिल्प, फर्नीचर, कालीन एवं स्वीकृत बड़े उत्पादों के प्रदर्शन एवं बिक्री के लिए किया जाएगा। आवेदक आवंटित स्थान की निर्धारित सीमा के अंदर ही अपने उत्पाद रख सकेगा। उत्पादों को सार्वजनिक रास्ते या अन्य स्टॉल/बूथ की जगह में फैलाना प्रतिबंधित होगा। बिना अनुमति अतिरिक्त संरचना, विस्तार या अतिरिक्त स्थान का उपयोग नहीं किया जा सकेगा। स्टॉल/स्थान को किसी अन्य व्यक्ति, कंपनी या व्यावसायिक संस्था को हस्तांतरित, उप-किराए पर या किराए पर नहीं दिया जा सकेगा।'
      },
      {
        en: '10. Verification & Inspection: KDB may check the applicant’s documents, products, and space requirement. Additional photos, product details, or other documents may be requested from the applicant if needed. KDB or an authorized officer will have the right to inspect the allotted space. An Application/Allotment may be cancelled if false information, incorrect documents, or incorrect information relating to the category is found.',
        hi: '10. सत्यापन एवं निरीक्षण: KDB द्वारा आवेदक के दस्तावेजों, उत्पादों एवं स्थान की आवश्यकता की जाँच की जा सकती है। आवश्यकता होने पर आवेदक से अतिरिक्त तस्वीरें, उत्पाद विवरण अथवा अन्य दस्तावेज मांगे जा सकते हैं। KDB अथवा अधिकृत अधिकारी को आवंटित स्थान का निरीक्षण करने का अधिकार होगा। गलत जानकारी, गलत दस्तावेज अथवा श्रेणी से संबंधित गलत जानकारी पाए जाने पर आवेदन/आवंटन रद्द किया जा सकता है।'
      },
      {
        en: '11. General rules: the Stall Holder must maintain cleanliness in and around their allotted area. All of KDB’s instructions relating to security, cleanliness, timing, electricity, and Mahotsav administration must be followed. Keeping products outside the stall’s prescribed limit, or obstructing public movement, is prohibited. KDB may issue additional rules and instructions as needed and as per the Mahotsav’s arrangements.',
        hi: '11. सामान्य नियम: स्टॉल धारक को अपने आवंटित क्षेत्र एवं आसपास साफ-सफाई बनाए रखना अनिवार्य होगा। सुरक्षा, स्वच्छता, समय-सारणी, बिजली एवं महोत्सव प्रशासन से संबंधित KDB के सभी निर्देशों का पालन करना होगा। स्टॉल की निर्धारित सीमा से बाहर उत्पाद रखना या सार्वजनिक आवागमन में बाधा उत्पन्न करना प्रतिबंधित होगा। KDB आवश्यकता एवं महोत्सव की व्यवस्था के अनुसार अतिरिक्त नियम एवं निर्देश जारी कर सकता है।'
      },
      {
        en: '12. Financial Summary — Application Fee: ₹236, Online. Large Space Stall/Booth Fee: ₹60,000, as per the process prescribed by KDB. Allotment Method: as decided by KDB, based on location & size. Space: as per location & size, as determined by KDB. Important: this category is only for applicants who need Large Space. It is suitable for Heavy Wooden Craft, Furniture, Handmade Carpets, and large-size Handicraft Products. Applicants who do not need Large Space may apply under a Suitable Category matching their need and products. The ₹236 Application Fee is mandatory and Non-Refundable. A ₹60,000 Allotment Fee applies for a Large Space Stall/Booth. The final location and space size will be determined by Kurukshetra Development Board as per availability and the approved layout. The Allotment Method will follow the process prescribed by KDB.',
        hi: '12. वित्तीय सारांश: आवेदन शुल्क ₹236/-, माध्यम ऑनलाइन। बड़े स्थान की स्टॉल/बूथ शुल्क ₹60,000/-, KDB द्वारा निर्धारित प्रक्रिया। आवंटन विधि: KDB द्वारा निर्णीत, स्थिति एवं आकार के अनुसार। स्थान: स्थिति एवं आकार के अनुसार, KDB द्वारा निर्धारित। महत्वपूर्ण: यह श्रेणी केवल बड़े स्थान की आवश्यकता वाले आवेदकों के लिए है। यह भारी काष्ठ शिल्प, फर्नीचर, हस्तनिर्मित कालीन एवं बड़े आकार के हस्तशिल्प उत्पादों के लिए उपयुक्त है। जिन आवेदकों को बड़े स्थान की आवश्यकता नहीं है, वे अपनी आवश्यकता एवं उत्पादों के अनुसार उपयुक्त श्रेणी में आवेदन कर सकते हैं। आवेदन शुल्क ₹236/- अनिवार्य एवं वापस न होने वाली है। बड़े स्थान वाले स्टॉल/बूथ के लिए ₹60,000/- आवंटन शुल्क लागू होगी। अंतिम स्थिति एवं स्थान का आकार कुरुक्षेत्र विकास बोर्ड द्वारा उपलब्धता एवं स्वीकृत लेआउट के अनुसार निर्धारित किया जाएगा। आवंटन विधि KDB द्वारा निर्धारित प्रक्रिया के अनुसार रहेगी।'
      }
    ]
  }
]

export function getCategoryGuideline(slug: string): CategoryGuideline | undefined {
  return CATEGORY_GUIDELINES.find(c => c.slug === slug)
}
