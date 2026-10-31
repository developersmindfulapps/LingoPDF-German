import fs from 'node:fs';
import path from 'node:path';

const authoringDir = path.resolve(process.cwd(), 'data-source', 'authoring');

function appendEntries(filename, newEntries) {
  const filePath = path.join(authoringDir, filename);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const existingHeadwords = new Set(data.map(e => e.headword));

  let added = 0;
  for (const entry of newEntries) {
    if (!existingHeadwords.has(entry.headword)) {
      data.push(entry);
      existingHeadwords.add(entry.headword);
      added++;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`[${filename}] Added ${added} new entries (total now: ${data.length})`);
}

// 1. Compounds
const newCompounds = [
  {
    headword: "Meldebehörde",
    pos: "noun",
    gender: "f",
    plural: "Meldebehörden",
    cefr: "A2",
    translations: [
      "registration office",
      "registration authority",
      "residents' registration office"
    ],
    examples: [
      {
        de: "Sie müssen sich bei der zuständigen Meldebehörde anmelden.",
        en: "You must register at the responsible registration office."
      }
    ],
    inflections: [
      "meldebehörde",
      "meldebehörden"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound noun: melden + Behörde; administrative registration office."
    }
  },
  {
    headword: "Wohnungsgeber",
    pos: "noun",
    gender: "m",
    plural: "Wohnungsgeber",
    cefr: "A2",
    translations: [
      "housing provider",
      "landlord"
    ],
    examples: [
      {
        de: "Sie benötigen eine Bestätigung des Wohnungsgebers.",
        en: "You need a confirmation from the housing provider."
      }
    ],
    inflections: [
      "wohnungsgeber",
      "wohnungsgebers",
      "wohnungsgebern"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound noun: Wohnung + s + Geber; masculine noun with Fugen-s."
    }
  },
  {
    headword: "Personalausweis",
    pos: "noun",
    gender: "m",
    plural: "Personalausweise",
    cefr: "A1",
    translations: [
      "identity card",
      "national ID card",
      "ID card"
    ],
    examples: [
      {
        de: "Bitte zeigen Sie Ihren Personalausweis oder Reisepass.",
        en: "Please show your identity card or passport."
      }
    ],
    inflections: [
      "personalausweis",
      "personalausweises",
      "personalausweise",
      "personalausweisen"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound noun: Personal + Ausweis; primary German identity document."
    }
  },
  {
    headword: "Einzugsdatum",
    pos: "noun",
    gender: "n",
    plural: "Einzugsdaten",
    cefr: "A2",
    translations: [
      "move-in date",
      "date of moving in"
    ],
    examples: [
      {
        de: "Das Einzugsdatum muss in der Bestätigung stehen.",
        en: "The move-in date must be in the confirmation."
      }
    ],
    inflections: [
      "einzugsdatum",
      "einzugsdatums",
      "einzugsdaten"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound noun: Einzug + s + Datum; administrative tenancy term."
    }
  },
  {
    headword: "Mietvertrag",
    pos: "noun",
    gender: "m",
    plural: "Mietverträge",
    cefr: "A1",
    translations: [
      "rental agreement",
      "lease",
      "tenancy agreement"
    ],
    examples: [
      {
        de: "Ein Mietvertrag reicht als Bestätigung nicht aus.",
        en: "A rental agreement is not sufficient as confirmation."
      }
    ],
    inflections: [
      "mietvertrag",
      "mietvertrags",
      "mietvertrages",
      "mietverträge",
      "mietverträgen"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound noun: Miete + Vertrag; housing contract."
    }
  },
  {
    headword: "Bußgeld",
    pos: "noun",
    gender: "n",
    plural: "Bußgelder",
    cefr: "A2",
    translations: [
      "fine",
      "administrative penalty",
      "monetary fine"
    ],
    examples: [
      {
        "de": "Bei Fristüberschreitung kann ein Bußgeld verhängt werden.",
        "en": "In case of exceeding the deadline, a fine may be imposed."
      }
    ],
    inflections: [
      "bußgeld",
      "bußgeldes",
      "bußgelds",
      "bußgelder",
      "bußgeldern"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound noun: Buße + Geld; legal administrative fine."
    }
  },
  {
    headword: "Bettdecke",
    pos: "noun",
    gender: "f",
    plural: "Bettdecken",
    cefr: "A1",
    translations: [
      "duvet",
      "blanket",
      "quilt",
      "bedspread"
    ],
    examples: [
      {
        de: "Die Bettdecke lag auf dem Bett.",
        en: "The duvet lay on the bed."
      }
    ],
    inflections: [
      "bettdecke",
      "bettdecken"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound noun: Bett + Decke; bedroom vocabulary."
    }
  },
  {
    headword: "Menschenzimmer",
    pos: "noun",
    gender: "n",
    plural: "Menschenzimmer",
    cefr: "B1",
    translations: [
      "human room",
      "regular room for a human being"
    ],
    examples: [
      {
        de: "Sein Zimmer war ein richtiges Menschenzimmer.",
        en: "His room was a real human room."
      }
    ],
    inflections: [
      "menschenzimmer",
      "menschenzimmers"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Literary compound noun: Mensch + en + Zimmer (Kafka)."
    }
  },
  {
    headword: "Zeitschrift",
    pos: "noun",
    gender: "f",
    plural: "Zeitschriften",
    cefr: "A1",
    translations: [
      "magazine",
      "periodical",
      "journal"
    ],
    examples: [
      {
        de: "Er liest eine illustrierte Zeitschrift.",
        en: "He is reading an illustrated magazine."
      }
    ],
    inflections: [
      "zeitschrift",
      "zeitschriften"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound noun: Zeit + Schrift; common media noun."
    }
  },
  {
    headword: "Heißgetränk",
    pos: "noun",
    gender: "n",
    plural: "Heißgetränke",
    cefr: "A2",
    translations: [
      "hot beverage",
      "hot drink"
    ],
    examples: [
      {
        de: "Kaffee und Tee sind beliebte Heißgetränke.",
        en: "Coffee and tea are popular hot beverages."
      }
    ],
    inflections: [
      "heißgetränk",
      "heißgetränks",
      "heißgetränke",
      "heißgetränken"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound noun: heiß + Getränk; beverage category."
    }
  },
  {
    headword: "Kaffeebohne",
    pos: "noun",
    gender: "f",
    plural: "Kaffeebohnen",
    cefr: "A2",
    translations: [
      "coffee bean"
    ],
    examples: [
      {
        de: "Aus gerösteten Kaffeebohnen wird Kaffee zubereitet.",
        en: "Coffee is prepared from roasted coffee beans."
      }
    ],
    inflections: [
      "kaffeebohne",
      "kaffeebohnen"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound noun: Kaffee + Bohne."
    }
  },
  {
    headword: "Kaffeepflanze",
    pos: "noun",
    gender: "f",
    plural: "Kaffeepflanzen",
    cefr: "A2",
    translations: [
      "coffee plant"
    ],
    examples: [
      {
        de: "Die Kaffeepflanze stammt aus Afrika.",
        en: "The coffee plant originates from Africa."
      }
    ],
    inflections: [
      "kaffeepflanze",
      "kaffeepflanzen"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound noun: Kaffee + Pflanze."
    }
  },
  {
    headword: "Straßenverkehr",
    pos: "noun",
    gender: "m",
    cefr: "A2",
    translations: [
      "road traffic",
      "street traffic",
      "traffic"
    ],
    examples: [
      {
        de: "Der Straßenverkehr in der Stadt nimmt zu.",
        en: "Road traffic in the city is increasing."
      }
    ],
    inflections: [
      "straßenverkehr",
      "straßenverkehrs"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound noun: Straße + n + Verkehr."
    }
  },
  {
    headword: "Verkehrsmittel",
    pos: "noun",
    gender: "n",
    plural: "Verkehrsmittel",
    cefr: "A2",
    translations: [
      "means of transport",
      "means of transportation",
      "vehicle"
    ],
    examples: [
      {
        de: "Die Bahn ist ein umweltfreundliches Verkehrsmittel.",
        en: "The train is an environmentally friendly means of transport."
      }
    ],
    inflections: [
      "verkehrsmittel",
      "verkehrsmittels",
      "verkehrsmitteln"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound noun: Verkehr + s + Mittel."
    }
  },
  {
    headword: "Fahrkartenautomat",
    pos: "noun",
    gender: "m",
    plural: "Fahrkartenautomaten",
    cefr: "A1",
    translations: [
      "ticket vending machine",
      "ticket machine"
    ],
    examples: [
      {
        de: "Sie können Fahrkarten am Fahrkartenautomaten kaufen.",
        en: "You can buy tickets at the ticket vending machine."
      }
    ],
    inflections: [
      "fahrkartenautomat",
      "fahrkartenautomaten"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound noun: Fahrkarte + n + Automat; masculine weak noun."
    }
  },
  {
    headword: "Zusammenhalt",
    pos: "noun",
    gender: "m",
    cefr: "B1",
    translations: [
      "cohesion",
      "solidarity",
      "togetherness"
    ],
    examples: [
      {
        de: "Der soziale Zusammenhalt in der Gesellschaft ist wichtig.",
        en: "Social cohesion in society is important."
      }
    ],
    inflections: [
      "zusammenhalt",
      "zusammenhalts"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound noun: zusammen + Halt; societal solidarity."
    }
  },
  {
    headword: "Niedergleiten",
    pos: "noun",
    gender: "n",
    cefr: "B2",
    translations: [
      "sliding down",
      "slipping down",
      "gliding down"
    ],
    examples: [
      {
        de: "Die Decke war zum Niedergleiten bereit.",
        en: "The blanket was ready to slide down."
      }
    ],
    inflections: [
      "niedergleiten",
      "niedergleitens"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Literary nominalized compound verb: nieder + gleiten; neuter gerund (Kafka)."
    }
  }
];

// 2. Nouns
const newNouns = [
  {
    headword: "Anmeldung",
    pos: "noun",
    gender: "f",
    plural: "Anmeldungen",
    cefr: "A1",
    translations: [
      "registration",
      "enrollment",
      "notification"
    ],
    examples: [
      {
        de: "Die Anmeldung beim Bürgeramt ist obligatorisch.",
        en: "Registration at the citizen's office is mandatory."
      }
    ],
    inflections: [
      "anmeldung",
      "anmeldungen"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Core administrative noun from verb anmelden."
    }
  },
  {
    headword: "Bestätigung",
    pos: "noun",
    gender: "f",
    plural: "Bestätigungen",
    cefr: "A2",
    translations: [
      "confirmation",
      "certificate",
      "verification"
    ],
    examples: [
      {
        de: "Sie erhalten eine schriftliche Bestätigung.",
        en: "You will receive a written confirmation."
      }
    ],
    inflections: [
      "bestätigung",
      "bestätigungen"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Core administrative noun from verb bestätigen."
    }
  },
  {
    headword: "Anschrift",
    pos: "noun",
    gender: "f",
    plural: "Anschriften",
    cefr: "A1",
    translations: [
      "address",
      "postal address"
    ],
    examples: [
      {
        de: "Bitte geben Sie Ihre neue Anschrift an.",
        en: "Please provide your new address."
      }
    ],
    inflections: [
      "anschrift",
      "anschriften"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Core administrative address noun."
    }
  },
  {
    headword: "Eigentümer",
    pos: "noun",
    gender: "m",
    plural: "Eigentümer",
    cefr: "A2",
    translations: [
      "owner",
      "property owner",
      "landlord"
    ],
    examples: [
      {
        de: "Der Name des Eigentümers muss genannt werden.",
        en: "The name of the owner must be stated."
      }
    ],
    inflections: [
      "eigentümer",
      "eigentümers",
      "eigentümern"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Administrative noun for property owner."
    }
  },
  {
    headword: "Überschreitung",
    pos: "noun",
    gender: "f",
    plural: "Überschreitungen",
    cefr: "B1",
    translations: [
      "exceeding",
      "breach",
      "violation",
      "overstepping"
    ],
    examples: [
      {
        de: "Bei einer Überschreitung der Frist droht eine Strafe.",
        en: "In case of exceeding the deadline, a penalty is imminent."
      }
    ],
    inflections: [
      "überschreitung",
      "überschreitungen"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Administrative noun from verb überschreiten."
    }
  },
  {
    headword: "Ungeziefer",
    pos: "noun",
    gender: "n",
    plural: "Ungeziefer",
    cefr: "B1",
    translations: [
      "vermin",
      "pest",
      "bug",
      "insect"
    ],
    examples: [
      {
        de: "Gregor fand sich zu einem Ungeziefer verwandelt.",
        en: "Gregor found himself transformed into vermin."
      }
    ],
    inflections: [
      "ungeziefer",
      "ungeziefers"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Literary and colloquial noun for vermin/pests (Kafka)."
    }
  },
  {
    headword: "Versteifung",
    pos: "noun",
    gender: "f",
    plural: "Versteifungen",
    cefr: "B2",
    translations: [
      "stiffening",
      "reinforcement",
      "brace",
      "rib"
    ],
    examples: [
      {
        de: "Sein Bauch war von bogenförmigen Versteifungen geteilt.",
        en: "His belly was partitioned by arched stiffening ribs."
      }
    ],
    inflections: [
      "versteifung",
      "versteifungen"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Literary anatomical noun from versteifen (Kafka)."
    }
  },
  {
    headword: "Region",
    pos: "noun",
    gender: "f",
    plural: "Regionen",
    cefr: "A2",
    translations: [
      "region",
      "area",
      "district"
    ],
    examples: [
      {
        de: "Die Pflanze wächst in tropischen Regionen.",
        en: "The plant grows in tropical regions."
      }
    ],
    inflections: [
      "region",
      "regionen"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "General geographical noun."
    }
  },
  {
    headword: "Afrika",
    pos: "noun",
    gender: "n",
    cefr: "A1",
    translations: [
      "Africa"
    ],
    examples: [
      {
        de: "Kaffee stammt ursprünglich aus den tropischen Regionen Afrikas.",
        en: "Coffee originally originates from tropical regions of Africa."
      }
    ],
    inflections: [
      "afrika",
      "afrikas",
      "Afrikas"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Proper geographic noun: continent."
    }
  },
  {
    headword: "Bürgerin",
    pos: "noun",
    gender: "f",
    plural: "Bürgerinnen",
    cefr: "A2",
    translations: [
      "citizen (female)",
      "citizen"
    ],
    examples: [
      {
        de: "Die Bürgerinnen und Bürger wurden informiert.",
        en: "The female and male citizens were informed."
      }
    ],
    inflections: [
      "bürgerin",
      "bürgerinnen"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Feminine form of Bürger."
    }
  },
  {
    headword: "Ministerin",
    pos: "noun",
    gender: "f",
    plural: "Ministerinnen",
    cefr: "B1",
    translations: [
      "minister (female)",
      "minister",
      "cabinet minister"
    ],
    examples: [
      {
        de: "Die Ministerinnen stellten das neue Gesetz vor.",
        en: "The ministers presented the new law."
      }
    ],
    inflections: [
      "ministerin",
      "ministerinnen"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Feminine form of Minister."
    }
  },
  {
    headword: "Innovation",
    pos: "noun",
    gender: "f",
    plural: "Innovationen",
    cefr: "B1",
    translations: [
      "innovation",
      "novelty"
    ],
    examples: [
      {
        de: "Technologische Innovation stärkt die Wirtschaft.",
        en: "Technological innovation strengthens the economy."
      }
    ],
    inflections: [
      "innovation",
      "innovationen"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Common political and technological noun."
    }
  },
  {
    headword: "Unterstützung",
    pos: "noun",
    gender: "f",
    plural: "Unterstützungen",
    cefr: "B1",
    translations: [
      "support",
      "assistance",
      "backing",
      "aid"
    ],
    examples: [
      {
        de: "Familien brauchen verlässliche Unterstützung.",
        en: "Families need reliable support."
      }
    ],
    inflections: [
      "unterstützung",
      "unterstützungen"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Civic and political noun from unterstützen."
    }
  },
  {
    headword: "Moderne",
    pos: "noun",
    gender: "f",
    cefr: "B1",
    translations: [
      "modernity",
      "modern era",
      "modern age"
    ],
    examples: [
      {
        de: "Moderne Technologien prägen unseren Alltag.",
        en: "Modern technologies shape our everyday lives."
      }
    ],
    inflections: [
      "moderne"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Cultural and era noun; also distinct from adjective modern."
    }
  },
  {
    headword: "Technologie",
    pos: "noun",
    gender: "f",
    plural: "Technologien",
    cefr: "B1",
    translations: [
      "technology",
      "technological process"
    ],
    examples: [
      {
        de: "Neue Technologien verändern die Arbeitswelt.",
        en: "New technologies are transforming the working world."
      }
    ],
    inflections: [
      "technologie",
      "technologien"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Scientific and news noun."
    }
  },
  {
    headword: "Investition",
    pos: "noun",
    gender: "f",
    plural: "Investitionen",
    cefr: "B1",
    translations: [
      "investment",
      "capital expenditure"
    ],
    examples: [
      {
        de: "Investitionen in Bildung sichern die Zukunft.",
        en: "Investments in education secure the future."
      }
    ],
    inflections: [
      "investition",
      "investitionen"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Economic and news noun."
    }
  }
];

// 3. Adjectives
const newAdjectives = [
  {
    headword: "panzerartig",
    pos: "adj",
    cefr: "B1",
    translations: [
      "armor-like",
      "shell-like",
      "like a carapace"
    ],
    examples: [
      {
        de: "Er lag auf seinem panzerartig harten Rücken.",
        en: "He lay on his armor-like hard back."
      }
    ],
    inflections: [
      "panzerartige",
      "panzerartigem",
      "panzerartigen",
      "panzerartiger",
      "panzerartiges"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Literary derived adjective with suffix -artig (Kafka)."
    }
  },
  {
    headword: "bogenförmig",
    pos: "adj",
    cefr: "B1",
    translations: [
      "arch-shaped",
      "arched",
      "curved"
    ],
    examples: [
      {
        de: "Der Bauch war von bogenförmigen Versteifungen geteilt.",
        en: "The belly was divided by arched stiffening ribs."
      }
    ],
    inflections: [
      "bogenförmige",
      "bogenförmigem",
      "bogenförmigen",
      "bogenförmiger",
      "bogenförmiges"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Literary derived adjective with suffix -förmig (Kafka)."
    }
  },
  {
    headword: "verpflichtet",
    pos: "adj",
    cefr: "A2",
    translations: [
      "obligated",
      "obliged",
      "required",
      "committed"
    ],
    examples: [
      {
        de: "Wer eine Wohnung bezieht, ist verpflichtet, sich anzumelden.",
        en: "Anyone moving into an apartment is obligated to register."
      }
    ],
    inflections: [
      "verpflichtete",
      "verpflichtetem",
      "verpflichteten",
      "verpflichteter",
      "verpflichtetes"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Participial adjective indicating legal obligation."
    }
  },
  {
    headword: "zuständig",
    pos: "adj",
    cefr: "A2",
    translations: [
      "responsible",
      "competent",
      "in charge",
      "having jurisdiction"
    ],
    examples: [
      {
        de: "Wenden Sie sich an die zuständige Behörde.",
        en: "Contact the responsible authority."
      }
    ],
    inflections: [
      "zuständige",
      "zuständigem",
      "zuständigen",
      "zuständiger",
      "zuständiges"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Core administrative adjective."
    }
  },
  {
    headword: "schriftlich",
    pos: "adj",
    cefr: "A1",
    translations: [
      "written",
      "in writing"
    ],
    examples: [
      {
        de: "Sie benötigen eine schriftliche Bestätigung.",
        en: "You need a written confirmation."
      }
    ],
    inflections: [
      "schriftliche",
      "schriftlichem",
      "schriftlichen",
      "schriftlicher",
      "schriftliches"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Core administrative adjective."
    }
  },
  {
    headword: "erforderlich",
    pos: "adj",
    cefr: "A2",
    translations: [
      "required",
      "necessary",
      "requisite"
    ],
    examples: [
      {
        de: "Ein gültiger Pass ist erforderlich.",
        en: "A valid passport is required."
      }
    ],
    inflections: [
      "erforderliche",
      "erforderlichem",
      "erforderlichen",
      "erforderlicher",
      "erforderliches"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Core administrative requirement adjective."
    }
  },
  {
    headword: "gebührenfrei",
    pos: "adj",
    cefr: "A2",
    translations: [
      "free of charge",
      "exempt from fees",
      "fee-free",
      "toll-free"
    ],
    examples: [
      {
        de: "Die Anmeldung ist gebührenfrei.",
        en: "Registration is free of charge."
      }
    ],
    inflections: [
      "gebührenfreie",
      "gebührenfreiem",
      "gebührenfreien",
      "gebührenfreier",
      "gebührenfreies"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound adjective: Gebühr + frei."
    }
  },
  {
    headword: "gesetzlich",
    pos: "adj",
    cefr: "A2",
    translations: [
      "statutory",
      "legal",
      "by law"
    ],
    examples: [
      {
        de: "Die gesetzliche Frist beträgt zwei Wochen.",
        en: "The statutory deadline is two weeks."
      }
    ],
    inflections: [
      "gesetzliche",
      "gesetzlichem",
      "gesetzlichen",
      "gesetzlicher",
      "gesetzliches"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Legal/administrative adjective from Gesetz."
    }
  },
  {
    headword: "vollständig",
    pos: "adj",
    cefr: "A2",
    translations: [
      "complete",
      "completely",
      "full",
      "entire"
    ],
    examples: [
      {
        de: "Bringen Sie alle Unterlagen vollständig mit.",
        en: "Bring all documents completely."
      }
    ],
    inflections: [
      "vollständige",
      "vollständigem",
      "vollständigen",
      "vollständiger",
      "vollständiges"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Common descriptive adjective."
    }
  },
  {
    headword: "unruhig",
    pos: "adj",
    cefr: "A2",
    translations: [
      "restless",
      "troubled",
      "uneasy",
      "agitated"
    ],
    examples: [
      {
        de: "Er erwachte aus unruhigen Träumen.",
        en: "He awoke from restless dreams."
      }
    ],
    inflections: [
      "unruhige",
      "unruhigem",
      "unruhigen",
      "unruhiger",
      "unruhiges"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Descriptive adjective: un- + ruhig (Kafka)."
    }
  },
  {
    headword: "gewölbt",
    pos: "adj",
    cefr: "B1",
    translations: [
      "arched",
      "vaulted",
      "curved",
      "domed",
      "convex"
    ],
    examples: [
      {
        de: "Sein Bauch war braun und gewölbt.",
        en: "His belly was brown and domed."
      }
    ],
    inflections: [
      "gewölbte",
      "gewölbtem",
      "gewölbten",
      "gewölbter",
      "gewölbtes"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Participial descriptive adjective from wölben (Kafka)."
    }
  },
  {
    headword: "geteilt",
    pos: "adj",
    cefr: "A2",
    translations: [
      "divided",
      "partitioned",
      "split",
      "shared"
    ],
    examples: [
      {
        de: "Der Bauch war von Versteifungen geteilt.",
        en: "The belly was divided by stiffening ribs."
      }
    ],
    inflections: [
      "geteilte",
      "teiltem",
      "geteilten",
      "geteilter",
      "geteiltes"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Participial adjective from teilen (Kafka)."
    }
  },
  {
    headword: "sonstig",
    pos: "adj",
    cefr: "B1",
    translations: [
      "other",
      "remaining",
      "further",
      "miscellaneous"
    ],
    examples: [
      {
        de: "Im Vergleich zu seinem sonstigen Umfang waren die Beine dünn.",
        en: "In comparison to his other bulk, the legs were thin."
      }
    ],
    inflections: [
      "sonstige",
      "sonstigem",
      "sonstigen",
      "sonstiger",
      "sonstiges"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Descriptive adjective indicating other/remaining (Kafka)."
    }
  },
  {
    headword: "kläglich",
    pos: "adj",
    cefr: "B2",
    translations: [
      "pitiful",
      "wretched",
      "feeble",
      "lamentable"
    ],
    examples: [
      {
        de: "Seine Beine waren kläglich dünn.",
        en: "His legs were pitifully thin."
      }
    ],
    inflections: [
      "klägliche",
      "kläglichem",
      "kläglichen",
      "kläglicher",
      "klägliches"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Literary descriptive adjective (Kafka)."
    }
  },
  {
    headword: "wohlbekannt",
    pos: "adj",
    cefr: "B1",
    translations: [
      "well-known",
      "familiar"
    ],
    examples: [
      {
        de: "Das Zimmer lag zwischen vier wohlbekannten Wänden.",
        en: "The room lay between four familiar walls."
      }
    ],
    inflections: [
      "wohlbekannte",
      "wohlbekanntem",
      "wohlbekannten",
      "wohlbekannter",
      "wohlbekanntes"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound adjective: wohl + bekannt (Kafka)."
    }
  },
  {
    headword: "illustriert",
    pos: "adj",
    cefr: "B1",
    translations: [
      "illustrated"
    ],
    examples: [
      {
        de: "Er schnitt ein Bild aus einer illustrierten Zeitschrift aus.",
        en: "He cut out a picture from an illustrated magazine."
      }
    ],
    inflections: [
      "illustrierte",
      "illustriertem",
      "illustrierten",
      "illustrierter",
      "illustriertes"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Participial adjective from illustrieren (Kafka)."
    }
  },
  {
    headword: "hübsch",
    pos: "adj",
    cefr: "A1",
    translations: [
      "pretty",
      "nice",
      "lovely",
      "handsome"
    ],
    examples: [
      {
        de: "Das Bild war in einem hübschen Rahmen.",
        en: "The picture was in a pretty frame."
      }
    ],
    inflections: [
      "hübsche",
      "hübschem",
      "hübschen",
      "hübscher",
      "hübsches",
      "hübschere",
      "hübscheste",
      "hübschesten"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "A1 descriptive adjective."
    }
  },
  {
    headword: "umweltfreundlich",
    pos: "adj",
    cefr: "A2",
    translations: [
      "environmentally friendly",
      "eco-friendly",
      "green"
    ],
    examples: [
      {
        de: "Die Bahn gehört zu den umweltfreundlichsten Verkehrsmitteln.",
        en: "The train is among the most environmentally friendly means of transport."
      }
    ],
    inflections: [
      "umweltfreundliche",
      "umweltfreundlichem",
      "umweltfreundlichen",
      "umweltfreundlicher",
      "umweltfreundliches",
      "umweltfreundlichste",
      "umweltfreundlichsten"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound adjective: Umwelt + freundlich."
    }
  },
  {
    headword: "weltweit",
    pos: "adj",
    cefr: "A2",
    translations: [
      "worldwide",
      "global",
      "globally"
    ],
    examples: [
      {
        de: "Kaffee ist eines der weltweit am meisten konsumierten Getränke.",
        en: "Coffee is one of the most consumed beverages worldwide."
      }
    ],
    inflections: [
      "weltweite",
      "weltweitem",
      "weltweiten",
      "weltweiter",
      "weltweites"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Compound adjective/adverb: Welt + weit."
    }
  },
  {
    headword: "spürbar",
    pos: "adj",
    cefr: "B1",
    translations: [
      "noticeable",
      "perceptible",
      "tangible",
      "appreciable"
    ],
    examples: [
      {
        de: "Die Entlastung im Straßenverkehr ist spürbar.",
        en: "The relief in road traffic is noticeable."
      }
    ],
    inflections: [
      "spürbare",
      "spürbarem",
      "spürbaren",
      "spürbarer",
      "spürbares"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Derived adjective from spüren + -bar."
    }
  },
  {
    headword: "kontinuierlich",
    pos: "adj",
    cefr: "B1",
    translations: [
      "continuous",
      "steady",
      "uninterrupted",
      "ongoing"
    ],
    examples: [
      {
        de: "Eine kontinuierliche Verbesserung ist wichtig.",
        en: "A continuous improvement is important."
      }
    ],
    inflections: [
      "kontinuierliche",
      "kontinuierlichem",
      "kontinuierlichen",
      "kontinuierlicher",
      "kontinuierliches"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Common descriptive adjective."
    }
  },
  {
    headword: "modern",
    pos: "adj",
    cefr: "A1",
    translations: [
      "modern",
      "contemporary",
      "up-to-date"
    ],
    examples: [
      {
        de: "Moderne Züge sind schnell und sauber.",
        en: "Modern trains are fast and clean."
      }
    ],
    inflections: [
      "moderne",
      "modernem",
      "modernen",
      "moderner",
      "modernes",
      "modernste",
      "modernsten"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Core A1 adjective: modern."
    }
  },
  {
    headword: "tropisch",
    pos: "adj",
    cefr: "A2",
    translations: [
      "tropical"
    ],
    examples: [
      {
        de: "Die Pflanze wächst in tropischen Regionen.",
        en: "The plant grows in tropical regions."
      }
    ],
    inflections: [
      "tropische",
      "tropischem",
      "tropischen",
      "tropischer",
      "tropisches"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Geographical adjective from Tropen."
    }
  },
  {
    headword: "ursprünglich",
    pos: "adj",
    cefr: "B1",
    translations: [
      "original",
      "originally",
      "initial",
      "native"
    ],
    examples: [
      {
        de: "Ursprünglich stammt die Pflanze aus Afrika.",
        en: "Originally, the plant comes from Africa."
      }
    ],
    inflections: [
      "ursprüngliche",
      "ursprünglichem",
      "ursprünglichen",
      "ursprünglicher",
      "ursprüngliches"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Adjective and adverb of origin."
    }
  },
  {
    headword: "bezahlbar",
    pos: "adj",
    cefr: "A2",
    translations: [
      "affordable",
      "payable"
    ],
    examples: [
      {
        de: "Bezahlbarer Wohnraum ist knapp.",
        en: "Affordable living space is scarce."
      }
    ],
    inflections: [
      "bezahlbare",
      "bezahlbarem",
      "bezahlbaren",
      "bezahlbarer",
      "bezahlbares"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Derived adjective from bezahlen + -bar."
    }
  },
  {
    headword: "verlässlich",
    pos: "adj",
    cefr: "B1",
    translations: [
      "reliable",
      "dependable",
      "trustworthy"
    ],
    examples: [
      {
        de: "Wir brauchen eine verlässliche Unterstützung.",
        en: "We need reliable support."
      }
    ],
    inflections: [
      "verlässliche",
      "verlässlichem",
      "verlässlichen",
      "verlässlicher",
      "verlässliches"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Adjective from verlassen + -lich."
    }
  },
  {
    headword: "gesellschaftlich",
    pos: "adj",
    cefr: "B1",
    translations: [
      "social",
      "societal"
    ],
    examples: [
      {
        de: "Der gesellschaftliche Zusammenhalt steht im Mittelpunkt.",
        en: "Societal cohesion is at the center."
      }
    ],
    inflections: [
      "gesellschaftliche",
      "gesellschaftlichem",
      "gesellschaftlichen",
      "gesellschaftlicher",
      "gesellschaftliches"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Social/political adjective from Gesellschaft."
    }
  },
  {
    headword: "gemeinsam",
    pos: "adj",
    cefr: "A1",
    translations: [
      "together",
      "joint",
      "jointly",
      "common",
      "mutual"
    ],
    examples: [
      {
        de: "Gemeinsam haben die Ministerinnen den Plan beschlossen.",
        en: "Together the ministers decided on the plan."
      }
    ],
    inflections: [
      "gemeinsame",
      "gemeinsamem",
      "gemeinsamen",
      "gemeinsamer",
      "gemeinsames"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Common descriptive adjective/adverb."
    }
  },
  {
    headword: "bürokratisch",
    pos: "adj",
    cefr: "B1",
    translations: [
      "bureaucratic",
      "red-tape"
    ],
    examples: [
      {
        de: "Bürokratische Hürden sollen abgebaut werden.",
        en: "Bureaucratic hurdles should be reduced."
      }
    ],
    inflections: [
      "bürokratische",
      "bürokratischem",
      "bürokratischen",
      "bürokratischer",
      "bürokratisches"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Administrative adjective from Bürokratie."
    }
  }
];

// 4. Verbs
const newVerbs = [
  {
    headword: "ausschneiden",
    pos: "verb",
    cefr: "A2",
    translations: [
      "to cut out",
      "to clip"
    ],
    examples: [
      {
        de: "Er hatte ein Bild aus der Zeitung ausgeschnitten.",
        en: "He had cut out a picture from the newspaper."
      }
    ],
    inflections: [
      "schneide aus",
      "schneidet aus",
      "schnitt aus",
      "ausgeschnitten",
      "auszuschneiden"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Separable verb: aus + schneiden."
    }
  },
  {
    headword: "unterbringen",
    pos: "verb",
    cefr: "B1",
    translations: [
      "to accommodate",
      "to house",
      "to put up",
      "to place",
      "to mount"
    ],
    examples: [
      {
        de: "Er hatte das Bild in einem hübschen Rahmen untergebracht.",
        en: "He had accommodated the picture in a pretty frame."
      }
    ],
    inflections: [
      "bringe unter",
      "bringt unter",
      "brachte unter",
      "untergebracht",
      "unterzubringen"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Separable verb: unter + bringen."
    }
  },
  {
    headword: "planen",
    pos: "verb",
    cefr: "A1",
    translations: [
      "to plan",
      "to design",
      "to project"
    ],
    examples: [
      {
        de: "Geplante Investitionen stärken den Standort.",
        en: "Planned investments strengthen the location."
      }
    ],
    inflections: [
      "plane",
      "planst",
      "plant",
      "plante",
      "geplant"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Core A1 verb: to plan."
    }
  },
  {
    headword: "verpflichten",
    pos: "verb",
    cefr: "B1",
    translations: [
      "to obligate",
      "to oblige",
      "to commit",
      "to require"
    ],
    examples: [
      {
        de: "Das Gesetz verpflichtet alle Bürger zur Anmeldung.",
        en: "The law obligates all citizens to register."
      }
    ],
    inflections: [
      "verpflichte",
      "verpflichtest",
      "verpflichtet",
      "verpflichtete",
      "verpflichteten"
    ],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Legal verb from Pflicht."
    }
  }
];

// 5. Adverbs
const newAdverbs = [
  {
    headword: "geradeaus",
    pos: "adv",
    cefr: "A1",
    translations: [
      "straight ahead",
      "straight on"
    ],
    examples: [
      {
        de: "Gehen Sie bitte immer geradeaus.",
        en: "Please go straight ahead."
      }
    ],
    inflections: [],
    provenance: {
      author: "pdf-language-companion-team",
      method: "independent_lexicography",
      reviewStatus: "verified",
      created: "2026-10-28",
      notes: "Directional adverb: straight ahead."
    }
  }
];

appendEntries('compounds.json', newCompounds);
appendEntries('nouns.json', newNouns);
appendEntries('adjectives.json', newAdjectives);
appendEntries('verbs.json', newVerbs);
appendEntries('adverbs.json', newAdverbs);
console.log('\nAll Phase 3 vocabulary additions successfully staged into authoring files.');
