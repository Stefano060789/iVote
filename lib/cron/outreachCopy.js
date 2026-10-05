export const OUTREACH_LANGUAGES = ["en", "de", "it", "ms"];

const COUNTRY_LANGUAGES = {
  Austria: "de",
  Italy: "it",
  Malaysia: "en"
};

const LANGUAGE_LABELS = {
  en: "English",
  de: "Deutsch",
  it: "Italiano",
  ms: "Bahasa Melayu"
};

const COPY = {
  en: {
    greeting: "Dear {name} team,",
    opening: "I came across {name}, listed as a {type}{location}. {reason}",
    product: "Godwit lets you place a QR code at the point of experience, ask a short poll, and review responses in one dashboard. That can help your team spot recurring feedback and decide what to improve, using input collected while the experience is still fresh.",
    pilot: "We would be glad to offer your team a complimentary, guided two-week pilot focused on {focus}. Would a brief 15-minute online introduction be convenient to see whether it fits your needs?",
    website: "You can learn more about Godwit at:",
    signoff: "Kind regards,\nStefano and Mariia"
  },
  de: {
    greeting: "Guten Tag liebes {name}-Team,",
    opening: "Ich bin auf {name} gestoßen. Der Eintrag beschreibt Ihr Unternehmen als {type}{location}. {reason}",
    product: "Mit Godwit können Sie am passenden Ort einen QR-Code platzieren, eine kurze Umfrage stellen und die Antworten in einem Dashboard ansehen. So erkennt Ihr Team wiederkehrendes Feedback und mögliche Verbesserungen anhand von Rückmeldungen, solange das Erlebnis noch präsent ist.",
    pilot: "Gerne bieten wir Ihrem Team einen kostenlosen, begleiteten zweiwöchigen Pilotversuch mit Schwerpunkt auf {focus} an. Hätten Sie Zeit für eine kurze 15-minütige Vorstellung, um gemeinsam zu prüfen, ob das zu Ihrem Bedarf passt?",
    website: "Mehr über Godwit erfahren Sie hier:",
    signoff: "Freundliche Grüße\nStefano and Mariia"
  },
  it: {
    greeting: "Gentile team di {name},",
    opening: "Ho trovato {name}, un'attività classificata come {type}{location}. {reason}",
    product: "Con Godwit potete posizionare un QR code nel punto giusto, proporre un breve sondaggio e consultare le risposte in un'unica dashboard. Questo può aiutare il vostro team a individuare commenti ricorrenti e possibili miglioramenti mentre l'esperienza è ancora fresca.",
    pilot: "Saremmo lieti di offrire al vostro team un progetto pilota guidato e gratuito di due settimane, concentrato su {focus}. Sareste disponibili per una breve presentazione online di 15 minuti per capire se è adatto alle vostre esigenze?",
    website: "Potete scoprire di più su Godwit qui:",
    signoff: "Cordiali saluti,\nStefano and Mariia"
  },
  ms: {
    greeting: "Salam sejahtera pasukan {name},",
    opening: "Saya menemui {name}, yang disenaraikan sebagai {type}{location}. {reason}",
    product: "Godwit membolehkan anda meletakkan kod QR pada tempat yang sesuai, mengajukan tinjauan ringkas dan melihat respons dalam satu papan pemuka. Ini boleh membantu pasukan anda mengenal pasti maklum balas berulang dan perkara yang boleh ditambah baik ketika pengalaman itu masih segar.",
    pilot: "Kami berbesar hati menawarkan program rintis berpandu selama dua minggu secara percuma, dengan fokus pada {focus}. Adakah anda lapang untuk pengenalan ringkas dalam talian selama 15 minit bagi melihat sama ada ia sesuai dengan keperluan anda?",
    website: "Ketahui lebih lanjut tentang Godwit di:",
    signoff: "Salam hormat,\nStefano and Mariia"
  }
};

const BUSINESS_PROFILES = [
  {
    id: "real-estate",
    matches: /\b(?:real estate|realty|immobilien|immobiliare|property agency|estate agent|property agent)\b/i,
    type: { en: "real estate agency", de: "Immobilienagentur", it: "agenzia immobiliare", ms: "agensi hartanah" },
    subject: {
      en: "A property-viewing feedback idea for {name}",
      de: "Eine Feedback-Idee für Besichtigungen bei {name}",
      it: "Un'idea per i feedback sulle visite di {name}",
      ms: "Idea maklum balas lawatan hartanah untuk {name}"
    },
    reason: {
      en: "Property viewings are high-intent moments: a brief QR poll could capture what prospective buyers or renters liked and which questions remain, giving your team clearer signals for follow-up.",
      de: "Bei einer Immobilienbesichtigung ist das Interesse oft besonders konkret: Eine kurze QR-Umfrage könnte festhalten, was Kauf- oder Mietinteressenten überzeugt hat und welche Fragen offen sind – als bessere Grundlage für die Nachbereitung.",
      it: "Durante una visita immobiliare l'interesse è concreto: un breve sondaggio con QR code potrebbe raccogliere ciò che è piaciuto ai potenziali acquirenti o locatari e le domande ancora aperte, offrendo al team indicazioni più chiare per il follow-up.",
      ms: "Lawatan hartanah ialah saat penting dalam membuat keputusan: tinjauan QR ringkas boleh mengumpulkan perkara yang disukai bakal pembeli atau penyewa serta soalan yang masih belum terjawab, lalu membantu pasukan membuat susulan dengan lebih jelas."
    },
    focus: {
      en: "feedback immediately after a property viewing",
      de: "Rückmeldungen direkt nach einer Immobilienbesichtigung",
      it: "i feedback subito dopo una visita immobiliare",
      ms: "maklum balas sejurus selepas lawatan hartanah"
    }
  },
  {
    id: "lodging",
    matches: /\b(?:hotel|bed and breakfast|guesthouse|hostel|lodge|resort)\b/i,
    type: { en: "place to stay", de: "Beherbergungsbetrieb", it: "struttura ricettiva", ms: "penginapan" },
    subject: {
      en: "A guest feedback idea for {name}",
      de: "Eine Idee für Gästefeedback bei {name}",
      it: "Un'idea per i feedback degli ospiti di {name}",
      ms: "Idea maklum balas tetamu untuk {name}"
    },
    reason: {
      en: "A stay has several important touchpoints, from arrival to checkout: a short QR poll at one of them could help you learn where guests feel well looked after and where a small improvement would matter.",
      de: "Ein Aufenthalt hat mehrere wichtige Momente – von der Anreise bis zum Check-out. Eine kurze QR-Umfrage an einem dieser Punkte könnte zeigen, wo sich Gäste gut betreut fühlen und wo eine kleine Verbesserung viel bewirken würde.",
      it: "Un soggiorno comprende momenti diversi, dall'arrivo al check-out: un breve sondaggio con QR code in uno di questi punti potrebbe aiutarvi a capire cosa apprezzano gli ospiti e dove un piccolo miglioramento farebbe la differenza.",
      ms: "Penginapan mempunyai beberapa titik penting, daripada ketibaan hingga daftar keluar: tinjauan QR ringkas pada salah satu titik ini boleh membantu anda mengetahui perkara yang dihargai tetamu dan ruang untuk penambahbaikan."
    },
    focus: {
      en: "one guest touchpoint, such as arrival or checkout",
      de: "einen Kontaktpunkt mit Gästen, etwa Anreise oder Check-out",
      it: "un momento del soggiorno, come l'arrivo o il check-out",
      ms: "satu titik pengalaman tetamu, seperti ketibaan atau daftar keluar"
    }
  },
  {
    id: "dining",
    matches: /\b(?:restaurant|cafe|coffee shop|bar|bistro|eatery)\b/i,
    type: { en: "food and drink business", de: "Gastronomiebetrieb", it: "attività di ristorazione", ms: "perniagaan makanan dan minuman" },
    subject: {
      en: "A customer feedback idea for {name}",
      de: "Eine Idee für Kundenfeedback bei {name}",
      it: "Un'idea per i feedback dei clienti di {name}",
      ms: "Idea maklum balas pelanggan untuk {name}"
    },
    reason: {
      en: "A quick response while a visit is still fresh can reveal what customers value about the food, service, or atmosphere, and flag a problem your team can address before it becomes a pattern.",
      de: "Eine kurze Rückmeldung direkt nach dem Besuch kann zeigen, was Gäste an Speisen, Service oder Atmosphäre schätzen – und auf Probleme hinweisen, bevor sie sich wiederholen.",
      it: "Un feedback raccolto subito dopo la visita può far capire cosa apprezzano i clienti di cucina, servizio o ambiente e segnalare un problema prima che diventi ricorrente.",
      ms: "Maklum balas ringkas ketika kunjungan masih segar boleh menunjukkan perkara yang dihargai pelanggan tentang makanan, layanan atau suasana, serta mengenal pasti masalah lebih awal."
    },
    focus: {
      en: "feedback immediately after a customer visit",
      de: "Rückmeldungen direkt nach einem Besuch",
      it: "i feedback subito dopo una visita",
      ms: "maklum balas sejurus selepas kunjungan pelanggan"
    }
  },
  {
    id: "tour",
    matches: /\b(?:tour operator|tour guide|sightseeing|excursion|travel experience)\b/i,
    type: { en: "tour and visitor experience business", de: "Anbieter von Touren und Besuchererlebnissen", it: "operatore di tour ed esperienze per visitatori", ms: "pengendali lawatan dan pengalaman pelawat" },
    subject: {
      en: "A tour feedback idea for {name}",
      de: "Eine Idee für Tour-Feedback bei {name}",
      it: "Un'idea per i feedback sui tour di {name}",
      ms: "Idea maklum balas lawatan untuk {name}"
    },
    reason: {
      en: "A short poll straight after a tour could capture which parts guests found most valuable and where the pace or explanations could improve, while details are still fresh.",
      de: "Eine kurze Umfrage direkt nach einer Tour könnte zeigen, welche Teile Gäste besonders schätzen und wo Tempo oder Erklärungen verbessert werden könnten – solange die Eindrücke noch frisch sind.",
      it: "Un breve sondaggio subito dopo un tour potrebbe mostrare quali momenti gli ospiti hanno apprezzato di più e dove migliorare ritmo o spiegazioni, finché i ricordi sono ancora freschi.",
      ms: "Tinjauan ringkas sejurus selepas lawatan boleh menunjukkan bahagian yang paling dihargai tetamu dan perkara yang boleh diperbaiki pada tempo atau penerangan, ketika pengalaman masih segar."
    },
    focus: {
      en: "feedback immediately after one tour",
      de: "Rückmeldungen direkt nach einer Tour",
      it: "i feedback subito dopo un tour",
      ms: "maklum balas sejurus selepas satu lawatan"
    }
  },
  {
    id: "attraction",
    matches: /\b(?:museum|gallery|cultural venue|event venue|visitor attraction|attraction|exhibition|theatre|theater)\b/i,
    type: { en: "visitor-facing venue", de: "besucherorientierte Einrichtung", it: "spazio aperto ai visitatori", ms: "tempat yang menerima pengunjung" },
    subject: {
      en: "A visitor feedback idea for {name}",
      de: "Eine Idee für Besucherfeedback bei {name}",
      it: "Un'idea per i feedback dei visitatori di {name}",
      ms: "Idea maklum balas pelawat untuk {name}"
    },
    reason: {
      en: "Visitors experience different parts of a venue in one visit: a short QR poll at the exit or after an event could show what resonated and where the experience could be clearer or more welcoming.",
      de: "Besucher erleben bei einem Besuch unterschiedliche Bereiche. Eine kurze QR-Umfrage am Ausgang oder nach einer Veranstaltung könnte zeigen, was besonders ankommt und wo das Erlebnis verständlicher oder einladender werden kann.",
      it: "Durante una visita le persone vivono momenti diversi: un breve sondaggio con QR code all'uscita o dopo un evento potrebbe mostrare cosa ha colpito e dove rendere l'esperienza più chiara o accogliente.",
      ms: "Pelawat mengalami beberapa bahagian tempat dalam satu kunjungan: tinjauan QR ringkas di pintu keluar atau selepas acara boleh menunjukkan perkara yang memberi kesan dan ruang untuk menjadikan pengalaman lebih jelas atau mesra."
    },
    focus: {
      en: "feedback at the end of a visit or event",
      de: "Rückmeldungen am Ende eines Besuchs oder einer Veranstaltung",
      it: "i feedback al termine di una visita o di un evento",
      ms: "maklum balas pada akhir kunjungan atau acara"
    }
  }
];

const GENERAL_PROFILE = {
  id: "general",
  type: { en: "business", de: "Unternehmen", it: "attività", ms: "perniagaan" },
  subject: {
    en: "A customer feedback idea for {name}",
    de: "Eine Idee für Kundenfeedback bei {name}",
    it: "Un'idea per i feedback dei clienti di {name}",
    ms: "Idea maklum balas pelanggan untuk {name}"
  },
  reason: {
    en: "A short poll at a natural point in the customer experience could help you learn what is working and what needs attention, using feedback while the interaction is still fresh.",
    de: "Eine kurze Umfrage an einem passenden Punkt der Kundenerfahrung könnte zeigen, was gut funktioniert und wo Verbesserungsbedarf besteht – solange der Kontakt noch präsent ist.",
    it: "Un breve sondaggio nel momento giusto dell'esperienza del cliente potrebbe aiutarvi a capire cosa funziona e cosa merita attenzione, raccogliendo feedback quando l'interazione è ancora fresca.",
    ms: "Tinjauan ringkas pada titik yang sesuai dalam pengalaman pelanggan boleh membantu anda mengetahui perkara yang berjalan lancar dan perkara yang perlu diberi perhatian, selagi pengalaman itu masih segar."
  },
  focus: {
    en: "one important moment in the customer experience",
    de: "einen wichtigen Moment der Kundenerfahrung",
    it: "un momento importante dell'esperienza del cliente",
    ms: "satu detik penting dalam pengalaman pelanggan"
  }
};

function getBusinessProfile(businessType) {
  const normalizedType = String(businessType || "").replaceAll("_", " ").trim();
  return BUSINESS_PROFILES.find(({ matches }) => matches.test(normalizedType)) || GENERAL_PROFILE;
}

export function resolveOutreachLanguage(language, country) {
  if (language === "auto" || !language) return COUNTRY_LANGUAGES[country] || "en";
  return OUTREACH_LANGUAGES.includes(language) ? language : "en";
}

export function getOutreachLanguageLabel(language) {
  return LANGUAGE_LABELS[language] || LANGUAGE_LABELS.en;
}

export function createOutreachCopy({ companyName, businessType, country, city, language = "auto" }) {
  const name = String(companyName || "your team").trim();
  const selectedLanguage = resolveOutreachLanguage(language, country);
  const copy = COPY[selectedLanguage];
  const profile = getBusinessProfile(businessType);
  const conciseName = name.split(/\s+(?:-|–|—)\s+/)[0].trim() || name;
  const type = profile.type[selectedLanguage] || profile.type.en;
  const location = city
    ? ` ${selectedLanguage === "it" ? "a" : "in"} ${String(city).trim()}`
    : "";
  const subject = profile.subject[selectedLanguage]
    .replaceAll("{name}", conciseName)
    .slice(0, 120);
  const message = [
    copy.greeting.replaceAll("{name}", name),
    "",
    copy.opening
      .replaceAll("{name}", name)
      .replaceAll("{type}", type)
      .replaceAll("{location}", location)
      .replaceAll("{reason}", profile.reason[selectedLanguage] || profile.reason.en),
    "",
    copy.product,
    "",
    copy.pilot
      .replaceAll("{focus}", profile.focus[selectedLanguage] || profile.focus.en),
    "",
    copy.website,
    "https://hellogodwit.com",
    "",
    copy.signoff
  ].join("\n");

  return {
    subject,
    message,
    language: selectedLanguage,
    personalizationReason: profile.reason[selectedLanguage] || profile.reason.en,
    businessProfile: profile.id
  };
}
