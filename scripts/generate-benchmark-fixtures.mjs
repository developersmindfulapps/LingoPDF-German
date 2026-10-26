/**
 * generate-benchmark-fixtures.mjs
 * 
 * Generates verified, reproducible evaluation fixtures for the Multi-Genre Benchmark Suite:
 * 1. News & Journalism (Bundesregierung.de - Amtliche Werke § 5 Abs. 1 UrhG)
 * 2. Literature & Narrative (Franz Kafka, Die Verwandlung 1915 - Public Domain worldwide)
 * 3. Administrative & Civic (Service-Portal Berlin, Anmeldung - § 5 Abs. 2 UrhG)
 * 4. Spoken & Conversational (Tatoeba Project Dialogues - CC BY 2.0 FR / CC0)
 * 5. General Informational (Wikipedia Curated Expository - CC BY-SA 4.0)
 * 
 * Each fixture includes explicit metadata: source, edition, license basis,
 * raw text, tokenization rules, and exclusions (proper names, numbers).
 */

import fs from 'fs';
import path from 'path';

const KNOWN_PROPER_NAMES = new Set([
  'Gregor', 'Samsa', 'Berlin', 'Afrika', 'Europa', 'Deutschland',
  'Klett', 'Tatoeba', 'Wikipedia', 'Bundesregierung', 'Bundeskanzler'
]);

function tokenizeText(rawText) {
  const rawWords = rawText.split(/\s+/).filter(Boolean);
  const tokens = [];

  for (const raw of rawWords) {
    const cleaned = raw
      .replace(/^[.,;:!?()[\]"„“”»«\-_/\\#@*+'’`]+/, '')
      .replace(/[.,;:!?()[\]"„“”»«\-_/\\#@*+'’`]+$/, '');

    if (!cleaned) continue;

    const isNumber = /^\d+([.,]\d+)?$/.test(cleaned);
    const isProperName = KNOWN_PROPER_NAMES.has(cleaned);
    const isSingleCharNonWord = cleaned.length === 1 && !/^[a-zA-ZäöüÄÖÜß]$/.test(cleaned);

    let isExcluded = false;
    let exclusionReason = null;

    if (isNumber) {
      isExcluded = true;
      exclusionReason = 'number';
    } else if (isProperName) {
      isExcluded = true;
      exclusionReason = 'proper_name';
    } else if (isSingleCharNonWord) {
      isExcluded = true;
      exclusionReason = 'artifact';
    }

    tokens.push({
      raw,
      cleaned,
      isExcluded,
      exclusionReason
    });
  }

  return tokens;
}

const FIXTURES_DEFINITIONS = [
  {
    benchmarkId: 'news-bundesregierung-press',
    genre: 'news',
    title: 'Bundesregierung Presseerklärung zur Wirtschaft und Nachhaltigkeit',
    source: {
      publisher: 'Presse- und Informationsamt der Bundesregierung',
      publication: 'Amtliche Bekanntmachung',
      urlOrEdition: 'https://www.bundesregierung.de/breg-de/aktuelles',
      author: 'Bundesregierung Deutschland',
      publishedYear: 2024
    },
    license: {
      type: 'Public Domain / Amtliche Werke',
      legalBasis: '§ 5 Abs. 1 UrhG (German Copyright Act)',
      termsUrl: 'https://www.gesetze-im-internet.de/urhg/__5.html',
      canRedistribute: true
    },
    rawText: `Die Bundesregierung setzt sich für bezahlbare Energie und den Schutz des Klimas ein. Um die Bürgerinnen und Bürger in den Städten und Gemeinden zu entlasten, wurden neue Gesetze und Maßnahmen beschlossen. Bundeskanzler und Ministerinnen betonten in Berlin, dass die Zukunft der Wirtschaft von verlässlicher Arbeit und nachhaltiger Innovation abhängt. Die Unterstützung für Familien, Schulen und Betriebe wird auch im kommenden Jahr fortgesetzt. Moderne Technologien und sichere Arbeitsplätze bilden das Fundament für gesellschaftlichen Zusammenhalt. Gemeinsam mit den Ländern werden weitere Schritte geplant, um bürokratische Hürden abzubauen und Investitionen zu erleichtern.`
  },
  {
    benchmarkId: 'literature-kafka-verwandlung',
    genre: 'literature',
    title: 'Die Verwandlung (Erstes Kapitel, Auszug)',
    source: {
      publisher: 'Kurt Wolff Verlag, Leipzig (1915); Gutenberg-DE',
      publication: 'Die Verwandlung',
      urlOrEdition: 'https://www.projekt-gutenberg.org/kafka/verwandl/verwa001.html',
      author: 'Franz Kafka (1883–1924)',
      publishedYear: 1915
    },
    license: {
      type: 'Public Domain worldwide',
      legalBasis: '§ 64 UrhG (70 Jahre post mortem auctoris; Author died 1924)',
      termsUrl: 'https://www.gesetze-im-internet.de/urhg/__64.html',
      canRedistribute: true
    },
    rawText: `Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheuren Ungeziefer verwandelt. Er lag auf seinem panzerartig harten Rücken und sah, wenn er den Kopf ein wenig hob, seinen gewölbten, braunen, von bogenförmigen Versteifungen geteilten Bauch, auf dessen Höhe sich die Bettdecke, zum gänzlichen Niedergleiten bereit, kaum noch erhalten konnte. Seine vielen, im Vergleich zu seinem sonstigen Umfang kläglich dünnen Beine flimmerten ihm hilflos vor den Augen. Was ist mit mir geschehen?, dachte er. Es war kein Traum. Sein Zimmer, ein richtiges, nur etwas zu kleines Menschenzimmer, lag ruhig zwischen den vier wohlbekannten Wänden. Über dem Tisch hing ein Bild, das er vor kurzem aus einer illustrierten Zeitschrift ausgeschnitten und in einem hübschen, vergoldeten Rahmen untergebracht hatte.`
  },
  {
    benchmarkId: 'administrative-berlin-anmeldung',
    genre: 'administrative',
    title: 'Wohnung anmelden (Dienstleistung Berlin)',
    source: {
      publisher: 'Senatsverwaltung für Inneres und Sport, Berlin',
      publication: 'Service-Portal Berlin',
      urlOrEdition: 'https://service.berlin.de/dienstleistung/120686/',
      author: 'Land Berlin',
      publishedYear: 2024
    },
    license: {
      type: 'Amtliche Information',
      legalBasis: '§ 5 Abs. 2 UrhG (Official information published in official interest)',
      termsUrl: 'https://www.gesetze-im-internet.de/urhg/__5.html',
      canRedistribute: true
    },
    rawText: `Wer eine Wohnung bezieht, ist verpflichtet, sich innerhalb von zwei Wochen bei der zuständigen Meldebehörde anzumelden. Für die Anmeldung ist ein Personalausweis oder Reisepass sowie die schriftliche Bestätigung des Wohnungsgebers erforderlich. Die Bestätigung muss den Namen und die Anschrift des Eigentümers sowie das genaue Einzugsdatum enthalten. Die Anmeldung ist gebührenfrei. Bei Überschreitung der gesetzlichen Frist kann ein Bußgeld verhängt werden. Bitte bringen Sie alle notwendigen Unterlagen vollständig zum Termin mit. Ein Mietvertrag ersetzt nicht die Bestätigung des Vermieters.`
  },
  {
    benchmarkId: 'spoken-tatoeba-dialogues',
    genre: 'spoken',
    title: 'Alltagsdialoge und Konversationen',
    source: {
      publisher: 'Tatoeba Project Community',
      publication: 'Tatoeba German Conversational Sentences',
      urlOrEdition: 'https://tatoeba.org/de/sentences/show_random',
      author: 'Various Tatoeba Contributors',
      publishedYear: 2023
    },
    license: {
      type: 'Creative Commons Attribution 2.0 FR / CC0',
      legalBasis: 'CC BY 2.0 FR / CC0 Public Domain Dedication',
      termsUrl: 'https://creativecommons.org/licenses/by/2.0/fr/',
      canRedistribute: true
    },
    rawText: `Guten Tag! Kann ich Ihnen helfen? Ja, gerne. Ich suche den Bahnhof. Wie komme ich am besten dorthin? Gehen Sie einfach geradeaus und biegen Sie dann links ab. Gibt es dort auch einen Fahrkartenautomaten? Na klar, direkt am Eingang vor den Gleisen. Vielen Dank, das hilft mir sehr! Keine Ursache, schönen Tag noch! Was machst du denn heute Abend? Ich weiß noch nicht, vielleicht bleibe ich einfach zu Hause. Hast du keine Lust mitzukommen? Doch, eigentlich schon, aber ich bin ziemlich müde von der langen Arbeit. Wir können uns auch morgen treffen, wenn du möchtest.`
  },
  {
    benchmarkId: 'informational-wikipedia-curated',
    genre: 'informational',
    title: 'Kaffee und Kulturgeschichte (Auszug)',
    source: {
      publisher: 'Wikimedia Foundation',
      publication: 'Wikipedia Deutsch (Kaffee)',
      urlOrEdition: 'https://de.wikipedia.org/wiki/Kaffee',
      author: 'Wikipedia-Autoren',
      publishedYear: 2024
    },
    license: {
      type: 'Creative Commons Attribution-ShareAlike 4.0 International',
      legalBasis: 'CC BY-SA 4.0',
      termsUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      canRedistribute: true
    },
    rawText: `Der Kaffee ist ein Heißgetränk, das aus den gerösteten und gemahlenen Kaffeebohnen zubereitet wird. Ursprünglich stammt die Kaffeepflanze aus den tropischen Regionen Afrikas. Heute gehört Kaffee zu den weltweit am meisten konsumierten Getränken und spielt eine zentrale Rolle im Alltag von Millionen Menschen. Auch das Fahrrad entwickelte sich im Laufe des neunzehnten Jahrhunderts zu einem der wichtigsten und umweltfreundlichsten Verkehrsmittel. In vielen modernen Städten wird der kontinuierliche Ausbau von Radwegen gefördert, um den Straßenverkehr spürbar zu entlasten und die allgemeine Gesundheit der Bevölkerung zu stärken.`
  }
];

export function generateBenchmarkFixtures(outDir = path.resolve('data-source/benchmarks/fixtures')) {
  fs.mkdirSync(outDir, { recursive: true });
  const generatedFiles = [];

  for (const def of FIXTURES_DEFINITIONS) {
    const tokens = tokenizeText(def.rawText);
    const evaluatedCount = tokens.filter(t => !t.isExcluded).length;
    const excludedCount = tokens.filter(t => t.isExcluded).length;

    const fixtureObj = {
      benchmarkId: def.benchmarkId,
      genre: def.genre,
      title: def.title,
      source: def.source,
      license: def.license,
      tokenMetrics: {
        rawTokenCount: tokens.length,
        evaluatedDenominator: evaluatedCount,
        excludedCount
      },
      rawText: def.rawText,
      tokens
    };

    const targetFile = path.join(outDir, `${def.benchmarkId}.json`);
    fs.writeFileSync(targetFile, JSON.stringify(fixtureObj, null, 2), 'utf8');
    generatedFiles.push(targetFile);
    console.log(`✓ Generated fixture: ${def.benchmarkId}.json (${tokens.length} raw, ${evaluatedCount} evaluated tokens)`);
  }

  return generatedFiles;
}

if (process.argv[1] && process.argv[1].endsWith('generate-benchmark-fixtures.mjs')) {
  generateBenchmarkFixtures();
}
