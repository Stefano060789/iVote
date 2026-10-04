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
    subject: "A visitor feedback idea for {name}",
    greeting: "Dear {name} team,",
    opening: "I am reaching out because visitor-facing organizations such as yours are always looking for thoughtful ways to understand and improve the guest experience.",
    product: "Godwit helps teams collect timely feedback through simple QR-based experiences and turn responses into clear, actionable insights, without adding friction for visitors or staff.",
    pilot: "We would be glad to offer your team a complimentary, guided two-week pilot tailored to your venue. Would a brief 15-minute online conversation be convenient to explore whether it could be useful?",
    website: "You can learn more about Godwit at:",
    signoff: "Kind regards,\nStefano and Mariia"
  },
  de: {
    subject: "Eine Idee für Ihr Besucherfeedback bei {name}",
    greeting: "Guten Tag liebes {name}-Team,",
    opening: "Ich melde mich bei Ihnen, weil besucherorientierte Einrichtungen wie Ihre stets nach durchdachten Möglichkeiten suchen, das Besuchserlebnis besser zu verstehen und zu verbessern.",
    product: "Godwit unterstützt Teams dabei, zeitnahes Feedback über einfache QR-Code-Erlebnisse zu sammeln und Antworten in klare, umsetzbare Erkenntnisse zu verwandeln – ohne Besucher oder Mitarbeitende zusätzlich zu belasten.",
    pilot: "Gerne bieten wir Ihrem Team einen kostenlosen, begleiteten zweiwöchigen Pilotversuch an, der auf Ihre Einrichtung zugeschnitten ist. Hätten Sie Zeit für ein kurzes 15-minütiges Online-Gespräch, um gemeinsam zu prüfen, ob das hilfreich sein könnte?",
    website: "Mehr über Godwit erfahren Sie hier:",
    signoff: "Freundliche Grüße\nStefano and Mariia"
  },
  it: {
    subject: "Un’idea per il feedback dei visitatori di {name}",
    greeting: "Gentile team di {name},",
    opening: "Vi contatto perché realtà aperte al pubblico come la vostra cercano spesso modi efficaci per comprendere e migliorare l’esperienza dei visitatori.",
    product: "Godwit aiuta i team a raccogliere feedback nel momento giusto attraverso semplici esperienze con QR code e a trasformare le risposte in indicazioni chiare e utili, senza complicare la visita né il lavoro dello staff.",
    pilot: "Saremmo lieti di offrire al vostro team un progetto pilota guidato e gratuito di due settimane, pensato per la vostra realtà. Sareste disponibili per un breve incontro online di 15 minuti per valutare insieme se può esservi utile?",
    website: "Potete scoprire di più su Godwit qui:",
    signoff: "Cordiali saluti,\nStefano and Mariia"
  },
  ms: {
    subject: "Idea maklum balas pelawat untuk {name}",
    greeting: "Salam sejahtera pasukan {name},",
    opening: "Saya menghubungi anda kerana organisasi yang menerima pelawat seperti anda sentiasa mencari cara yang bermakna untuk memahami dan menambah baik pengalaman tetamu.",
    product: "Godwit membantu pasukan mengumpulkan maklum balas tepat pada masanya melalui pengalaman kod QR yang mudah, kemudian menukarkan respons kepada pandangan yang jelas dan boleh diambil tindakan tanpa menyukarkan pelawat atau kakitangan.",
    pilot: "Kami berbesar hati menawarkan program rintis berpandu selama dua minggu secara percuma, disesuaikan untuk tempat anda. Adakah anda lapang untuk perbualan dalam talian selama 15 minit bagi melihat sama ada ia sesuai untuk pasukan anda?",
    website: "Ketahui lebih lanjut tentang Godwit di:",
    signoff: "Salam hormat,\nStefano and Mariia"
  }
};

export function resolveOutreachLanguage(language, country) {
  if (language === "auto" || !language) return COUNTRY_LANGUAGES[country] || "en";
  return OUTREACH_LANGUAGES.includes(language) ? language : "en";
}

export function getOutreachLanguageLabel(language) {
  return LANGUAGE_LABELS[language] || LANGUAGE_LABELS.en;
}

export function createOutreachCopy({ companyName, businessType, country, language = "auto" }) {
  const name = String(companyName || "your team").trim();
  const selectedLanguage = resolveOutreachLanguage(language, country);
  const copy = COPY[selectedLanguage];
  const conciseName = name.split(/\s+(?:-|–|—)\s+/)[0].trim() || name;
  const subject = copy.subject.replaceAll("{name}", conciseName).slice(0, 120);
  const body = [
    copy.greeting.replaceAll("{name}", name),
    "",
    copy.opening,
    "",
    copy.product,
    "",
    copy.pilot,
    "",
    copy.website,
    "https://hellogodwit.com",
    "",
    copy.signoff
  ].join("\n");

  return { subject, message: body, language: selectedLanguage };
}
