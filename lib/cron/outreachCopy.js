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
    opening: [
      "I came across {name}, listed as a {type}{location}. {reason}",
      "I found {name} while looking at {type} businesses{location}. {reason}",
      "Your {type} listing for {name}{location} caught my attention. {reason}"
    ],
    product: [
      "Godwit connects a QR code to a short poll and shared dashboard, helping your team spot recurring feedback and decide what to improve. Used over time, it can turn isolated comments into a more consistent feedback loop.",
      "With Godwit, visitors can scan a QR code, answer a few focused questions, and share what mattered to them. If the pilot surfaces useful signals, a subscription lets your team keep gathering and reviewing feedback as you improve the experience.",
      "Godwit makes it easy to hear from people while an experience is still fresh. A pilot tests one use case; if it proves useful, subscribing helps make that feedback routine, so decisions are based on recurring responses rather than guesswork."
    ],
    pilot: [
      "We would be glad to offer a complimentary, guided two-week pilot focused on {focus}. You can judge whether the ongoing feedback is valuable before deciding about a subscription. Could we arrange a brief 15-minute introduction?",
      "We can set up a complimentary, guided two-week pilot around {focus}. If it helps your team make better-informed decisions, a subscription can keep that feedback loop going. Would a short 15-minute conversation be convenient?",
      "Try {focus} in a complimentary, guided two-week pilot, then decide from the responses whether ongoing use merits a subscription. Could we arrange a brief 15-minute introduction?"
    ],
    website: "You can learn more about Godwit at:",
    signoff: "Kind regards,\nStefano and Mariia"
  },
  de: {
    greeting: "Guten Tag liebes {name}-Team,",
    opening: [
      "Ich bin auf {name} gestoßen. Der Eintrag beschreibt Ihr Unternehmen als {type}{location}. {reason}",
      "Bei meiner Suche nach {type} bin ich auf {name}{location} aufmerksam geworden. {reason}",
      "Ihr Eintrag als {type} – {name}{location} – hat mein Interesse geweckt. {reason}"
    ],
    product: [
      "Godwit verbindet einen QR-Code mit einer kurzen Umfrage und einem gemeinsamen Dashboard. So erkennt Ihr Team wiederkehrendes Feedback und kann Verbesserungen angehen. Bei regelmäßiger Nutzung wird aus einzelnen Kommentaren ein verlässlicheres Stimmungsbild.",
      "Besucher können über einen QR-Code einige kurze Fragen beantworten und mitteilen, was ihnen wichtig war. Wenn der Pilot hilfreiche Erkenntnisse liefert, können Sie mit einem Abonnement weiter Feedback sammeln und gemeinsam auswerten.",
      "Mit Godwit können Sie unkompliziert erfahren, wie Menschen Ihr Angebot erleben. Ein Pilot testet einen konkreten Anwendungsfall; ein Abonnement kann daraus einen regelmäßigen Feedback-Kreislauf machen, der Entscheidungen besser fundiert."
    ],
    pilot: [
      "Gerne bieten wir einen kostenlosen, begleiteten zweiwöchigen Pilotversuch zu {focus} an. Danach können Sie anhand der Rückmeldungen entscheiden, ob ein Abonnement für Sie sinnvoll ist. Passt eine kurze Vorstellung von 15 Minuten?",
      "Wir können einen kostenlosen, begleiteten zweiwöchigen Pilotversuch zu {focus} einrichten. Wenn er Ihrem Team hilft, fundierter zu entscheiden, kann ein Abonnement den Feedback-Kreislauf fortsetzen. Hätten Sie Zeit für 15 Minuten?",
      "Testen Sie {focus} in einem kostenlosen, begleiteten zweiwöchigen Pilotversuch und entscheiden Sie danach anhand der Ergebnisse, ob sich die fortlaufende Nutzung lohnt. Passt eine kurze Vorstellung?"
    ],
    website: "Mehr über Godwit erfahren Sie hier:",
    signoff: "Freundliche Grüße\nStefano and Mariia"
  },
  it: {
    greeting: "Gentile team di {name},",
    opening: [
      "Ho trovato {name}, un'attività classificata come {type}{location}. {reason}",
      "Cercando attività come {type}, ho notato {name}{location}. {reason}",
      "La scheda di {name}{location}, indicata come {type}, ha attirato la mia attenzione. {reason}"
    ],
    product: [
      "Godwit collega un QR code a un breve sondaggio e a una dashboard condivisa. Il vostro team può individuare temi ricorrenti e decidere cosa migliorare. Usato nel tempo, trasforma commenti isolati in un flusso di feedback più costante.",
      "Chi visita la vostra attività può scansionare un QR code e raccontare cosa conta per lui. Se il progetto pilota porta indicazioni utili, un abbonamento vi permette di continuare a raccogliere e valutare feedback.",
      "Con Godwit potete capire meglio come le persone vivono la vostra attività. Il progetto pilota verifica un caso concreto; se è utile, l'abbonamento aiuta a rendere il feedback una pratica continuativa."
    ],
    pilot: [
      "Saremmo lieti di offrire un progetto pilota guidato e gratuito di due settimane su {focus}. Poi potrete decidere dai risultati se l'abbonamento continuativo è utile per la vostra attività. Possiamo fissare una presentazione di 15 minuti?",
      "Possiamo organizzare un progetto pilota guidato e gratuito di due settimane su {focus}. Se aiuta il vostro team a prendere decisioni più informate, l'abbonamento può mantenere attivo questo flusso di feedback. Vi andrebbero 15 minuti?",
      "Provate {focus} con un progetto pilota guidato e gratuito di due settimane; poi valutate dai risultati se la continuità giustifica un abbonamento. Possiamo fissare una breve presentazione?"
    ],
    website: "Potete scoprire di più su Godwit qui:",
    signoff: "Cordiali saluti,\nStefano and Mariia"
  },
  ms: {
    greeting: "Salam sejahtera pasukan {name},",
    opening: [
      "Saya menemui {name}, yang disenaraikan sebagai {type}{location}. {reason}",
      "Semasa mencari perniagaan {type}, saya menemui {name}{location}. {reason}",
      "Senarai {name}{location} sebagai {type} menarik perhatian saya. {reason}"
    ],
    product: [
      "Godwit menghubungkan kod QR dengan tinjauan ringkas dan papan pemuka bersama. Pasukan anda boleh mengenal pasti maklum balas berulang dan memilih perkara yang perlu ditambah baik. Penggunaan berterusan membina gambaran yang lebih konsisten.",
      "Pengunjung boleh mengimbas kod QR dan berkongsi perkara yang penting bagi mereka. Jika percubaan ini menghasilkan maklumat yang berguna, langganan membolehkan pasukan anda terus mengumpul dan menilai maklum balas.",
      "Godwit membantu anda memahami pengalaman pelanggan ketika ia masih segar. Percubaan menguji satu kegunaan; jika berkesan untuk pasukan anda, langganan boleh menjadikan maklum balas amalan berterusan."
    ],
    pilot: [
      "Kami berbesar hati menawarkan percubaan berpandu selama dua minggu secara percuma untuk {focus}. Selepas itu, anda boleh menilai respons dan memutuskan sama ada langganan berterusan berbaloi. Bolehkah kita berbual selama 15 minit?",
      "Kami boleh menyediakan percubaan berpandu percuma selama dua minggu tentang {focus}. Jika ia membantu pasukan membuat keputusan yang lebih baik, langganan boleh meneruskan aliran maklum balas ini. Adakah anda lapang 15 minit?",
      "Uji {focus} melalui percubaan berpandu percuma selama dua minggu, kemudian tentukan daripada hasilnya sama ada penggunaan berterusan wajar dilanggan. Bolehkah kita mengatur pengenalan ringkas?"
    ],
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
      en: "A QR idea for {name}'s property listings",
      de: "Eine QR-Idee für Immobilienangebote von {name}",
      it: "Un'idea QR per gli annunci immobiliari di {name}",
      ms: "Idea QR untuk iklan hartanah {name}"
    },
    reason: {
      en: "A QR code on each property poster could let interested buyers or renters share what they are looking for and scan a short poll. Those who explicitly opt in can leave an email, giving your team a permission-based way to follow up with relevant property offers.",
      de: "Ein QR-Code auf jedem Immobilienplakat könnte Interessierten ermöglichen, kurz mitzuteilen, wonach sie suchen. Wer ausdrücklich einwilligt, kann eine E-Mail-Adresse hinterlassen – so kann Ihr Team gezielt passende Immobilienangebote nachfassen.",
      it: "Un QR code su ogni annuncio immobiliare potrebbe permettere a chi è interessato di indicare brevemente cosa cerca. Chi acconsente esplicitamente può lasciare un'e-mail, offrendo al vostro team un modo autorizzato per ricontattarlo con proposte immobiliari pertinenti.",
      ms: "Kod QR pada setiap poster hartanah boleh membolehkan bakal pembeli atau penyewa berkongsi perkara yang dicari melalui tinjauan ringkas. Mereka yang memberikan persetujuan jelas boleh meninggalkan e-mel supaya pasukan anda boleh membuat susulan dengan tawaran hartanah yang sesuai."
    },
    focus: {
      en: "QR responses and opt-in interest from property posters",
      de: "QR-Rückmeldungen und freiwillige Interessensbekundungen auf Immobilienplakaten",
      it: "risposte QR e contatti con consenso esplicito dagli annunci immobiliari",
      ms: "respons QR dan minat yang diberikan secara sukarela melalui poster hartanah"
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

export function createOutreachCopy({ companyName, businessType, country, city, language = "auto", variation = 0 }) {
  const name = String(companyName || "your team").trim();
  const selectedLanguage = resolveOutreachLanguage(language, country);
  const copy = COPY[selectedLanguage];
  const profile = getBusinessProfile(businessType);
  const conciseName = name.split(/\s+(?:-|–|—)\s+/)[0].trim() || name;
  const type = profile.type[selectedLanguage] || profile.type.en;
  const copyVariation = Math.abs(Number.isInteger(variation) ? variation : 0)
    % copy.opening.length;
  const location = city
    ? ` ${selectedLanguage === "it" ? "a" : "in"} ${String(city).trim()}`
    : "";
  const subject = profile.subject[selectedLanguage]
    .replaceAll("{name}", conciseName)
    .slice(0, 120);
  const message = [
    copy.greeting.replaceAll("{name}", name),
    "",
    copy.opening[copyVariation]
      .replaceAll("{name}", name)
      .replaceAll("{type}", type)
      .replaceAll("{location}", location)
      .replaceAll("{reason}", profile.reason[selectedLanguage] || profile.reason.en),
    "",
    copy.product[copyVariation],
    "",
    copy.pilot[copyVariation]
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
