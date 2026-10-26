import fs from 'node:fs';
import path from 'node:path';

const authoringDir = path.resolve('data-source/authoring');

const adjData = [
  {
    headword: 'weit',
    pos: 'adj',
    cefr: 'A1',
    translations: ['far', 'wide', 'distant', 'broad'],
    examples: [
      { de: 'Wie weit ist es zum Bahnhof?', en: 'How far is it to the train station?' },
      { de: 'Das Hemd ist mir zu weit.', en: 'The shirt is too wide for me.' }
    ],
    inflections: [
      'weite', 'weitem', 'weiten', 'weiter', 'weites',
      'weiterer', 'weiteren', 'weiterem', 'weiteres',
      'weitest', 'weiteste', 'weitestem', 'weitesten', 'weitester', 'weitestes'
    ],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'High-utility adjective/adverb; covers wide/far senses and comparative weiter.'
    }
  }
];

const advData = [
  {
    headword: 'eigentlich',
    pos: 'adv',
    cefr: 'A2',
    translations: ['actually', 'really', 'in fact'],
    examples: [
      { de: 'Was machst du eigentlich beruflich?', en: 'What do you actually do for a living?' }
    ],
    inflections: [
      'eigentliche', 'eigentlichen', 'eigentlicher', 'eigentliches', 'eigentlichem'
    ],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Modal adverb and focus particle in conversational German.'
    }
  },
  {
    headword: 'erst',
    pos: 'adv',
    cefr: 'A1',
    translations: ['only', 'not until', 'first'],
    examples: [
      { de: 'Er kommt erst um acht Uhr.', en: 'He is not coming until eight o\'clock.' },
      { de: 'Ich muss erst meine Arbeit beenden.', en: 'I must finish my work first.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Temporal adverb and focus particle indicating not before / only at.'
    }
  },
  {
    headword: 'überhaupt',
    pos: 'adv',
    cefr: 'A2',
    translations: ['at all', 'generally', 'in general'],
    examples: [
      { de: 'Ich habe überhaupt keine Zeit.', en: 'I don\'t have any time at all.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Focus and scalar particle, frequently used with negation (überhaupt nicht / überhaupt kein).'
    }
  },
  {
    headword: 'sogar',
    pos: 'adv',
    cefr: 'B1',
    translations: ['even'],
    examples: [
      { de: 'Er spricht sogar vier Sprachen.', en: 'He even speaks four languages.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Scalar additive particle emphasizing an extreme or surprising case.'
    }
  },
  {
    headword: 'bereits',
    pos: 'adv',
    cefr: 'B1',
    translations: ['already', 'as early as'],
    examples: [
      { de: 'Der Zug ist bereits abgefahren.', en: 'The train has already departed.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Temporal adverb synonymous with schon, common in formal and written German.'
    }
  },
  {
    headword: 'kaum',
    pos: 'adv',
    cefr: 'B1',
    translations: ['hardly', 'barely', 'scarcely'],
    examples: [
      { de: 'Ich kann dich kaum hören.', en: 'I can hardly hear you.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Negative-leaning degree adverb expressing minimal degree or probability.'
    }
  },
  {
    headword: 'deshalb',
    pos: 'adv',
    cefr: 'A2',
    translations: ['therefore', 'that is why', 'for that reason'],
    examples: [
      { de: 'Es regnet, deshalb bleibe ich zu Hause.', en: 'It is raining, that is why I am staying at home.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Causal conjunctive adverb triggering verb-second word order.'
    }
  },
  {
    headword: 'nämlich',
    pos: 'adv',
    cefr: 'B1',
    translations: ['namely', 'you see', 'that is because'],
    examples: [
      { de: 'Ich kann nicht kommen, ich bin nämlich krank.', en: 'I cannot come, you see, because I am ill.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Explanatory adverb positioned after the inflected verb in main clauses.'
    }
  },
  {
    headword: 'gerade',
    pos: 'adv',
    cefr: 'A1',
    translations: ['just now', 'right now', 'straight', 'exactly'],
    examples: [
      { de: 'Ich esse gerade zu Mittag.', en: 'I am eating lunch right now.' },
      { de: 'Gehen Sie geradeaus.', en: 'Go straight ahead.' }
    ],
    inflections: ['grade'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'High-frequency temporal and directional adverb; maps colloquial grade.'
    }
  },
  {
    headword: 'sonst',
    pos: 'adv',
    cefr: 'A1',
    translations: ['otherwise', 'else', 'usually'],
    examples: [
      { de: 'Sonst noch etwas?', en: 'Anything else?' },
      { de: 'Beeil dich, sonst verpassen wir den Bus.', en: 'Hurry up, otherwise we will miss the bus.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Adverb used for alternatives, conditional consequences, and habituality.'
    }
  }
];

const verbsData = [
  // 11 Core Verbs
  {
    headword: 'lassen',
    pos: 'verb',
    cefr: 'A2',
    translations: ['to let', 'to allow', 'to leave', 'to have done'],
    examples: [
      { de: 'Lass mich in Ruhe!', en: 'Leave me alone!' },
      { de: 'Ich lasse mein Fahrrad reparieren.', en: 'I am having my bicycle repaired.' }
    ],
    inflections: ['lasse', 'lässt', 'lasst', 'ließ', 'ließe', 'ließen', 'ließt', 'gelassen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'High-utility modal-like strong verb (Class 7) with causative and permissive uses.'
    }
  },
  {
    headword: 'halten',
    pos: 'verb',
    cefr: 'A2',
    translations: ['to hold', 'to stop', 'to keep', 'to consider'],
    examples: [
      { de: 'Der Bus hält hier.', en: 'The bus stops here.' },
      { de: 'Halt bitte meine Tasche.', en: 'Please hold my bag.' }
    ],
    inflections: ['halte', 'hältst', 'hält', 'haltet', 'hielt', 'hielten', 'hieltet', 'gehalten'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Strong verb (Class 7) with a-ä vowel change and extensive prefix derivatives.'
    }
  },
  {
    headword: 'führen',
    pos: 'verb',
    cefr: 'A2',
    translations: ['to lead', 'to guide', 'to conduct', 'to manage'],
    examples: [
      { de: 'Dieser Weg führt zum Park.', en: 'This path leads to the park.' },
      { de: 'Er führt ein erfolgreiches Unternehmen.', en: 'He runs a successful business.' }
    ],
    inflections: ['führe', 'führst', 'führt', 'führte', 'führten', 'geführt'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'High-utility weak verb expressing physical guidance and managerial leadership.'
    }
  },
  {
    headword: 'setzen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to set', 'to put', 'to place', 'to sit down (reflexive)'],
    examples: [
      { de: 'Setzen Sie sich bitte!', en: 'Please sit down!' },
      { de: 'Sie setzt das Kind auf den Stuhl.', en: 'She puts the child onto the chair.' }
    ],
    inflections: ['setze', 'setzt', 'setzte', 'setzten', 'gesetzt'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Positional weak verb paired with sitzen; governs accusative direction.'
    }
  },
  {
    headword: 'legen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to lay', 'to put horizontally', 'to place'],
    examples: [
      { de: 'Er legt das Buch auf den Tisch.', en: 'He lays the book on the table.' }
    ],
    inflections: ['lege', 'legst', 'legt', 'legte', 'legten', 'gelegt'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Positional weak verb paired with liegen; governs accusative direction.'
    }
  },
  {
    headword: 'ziehen',
    pos: 'verb',
    cefr: 'A2',
    translations: ['to pull', 'to draw', 'to move (residence)'],
    examples: [
      { de: 'Bitte ziehen, nicht drücken!', en: 'Please pull, do not push!' },
      { de: 'Wir ziehen nächsten Monat nach Berlin.', en: 'We are moving to Berlin next month.' }
    ],
    inflections: ['ziehe', 'ziehst', 'zieht', 'zog', 'zogen', 'zogt', 'gezogen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Strong verb (Class 2) with ie-o-o ablaut series.'
    }
  },
  {
    headword: 'gelten',
    pos: 'verb',
    cefr: 'B1',
    translations: ['to apply', 'to be valid', 'to count as'],
    examples: [
      { de: 'Die Fahrkarte gilt für eine Stunde.', en: 'The ticket is valid for one hour.' }
    ],
    inflections: ['gelte', 'giltst', 'gilt', 'geltet', 'galt', 'galten', 'gegolten'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Strong verb (Class 3) with e-i change and e-a-o ablaut.'
    }
  },
  {
    headword: 'scheinen',
    pos: 'verb',
    cefr: 'A2',
    translations: ['to shine', 'to seem', 'to appear'],
    examples: [
      { de: 'Die Sonne scheint heute hell.', en: 'The sun is shining brightly today.' },
      { de: 'Es scheint ein Problem zu geben.', en: 'There seems to be a problem.' }
    ],
    inflections: ['scheine', 'scheinst', 'scheint', 'schien', 'schienen', 'geschienen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Strong verb (Class 1) with ei-ie-ie ablaut series.'
    }
  },
  {
    headword: 'tragen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to wear', 'to carry', 'to bear'],
    examples: [
      { de: 'Er trägt einen warmen Pullover.', en: 'He is wearing a warm sweater.' },
      { de: 'Kannst du den Koffer tragen?', en: 'Can you carry the suitcase?' }
    ],
    inflections: ['trage', 'trägst', 'trägt', 'tragt', 'trug', 'trugen', 'trugt', 'getragen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Strong verb (Class 6) with a-ä vowel change and a-u-a ablaut.'
    }
  },
  {
    headword: 'schließen',
    pos: 'verb',
    cefr: 'A2',
    translations: ['to close', 'to shut', 'to conclude'],
    examples: [
      { de: 'Bitte schließen Sie die Tür.', en: 'Please close the door.' },
      { de: 'Das Geschäft schließt um 18 Uhr.', en: 'The shop closes at 6 p.m.' }
    ],
    inflections: ['schließe', 'schließt', 'schloss', 'schlossen', 'geschlossen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Strong verb (Class 2) with ie-o-o ablaut series.'
    }
  },
  {
    headword: 'fallen',
    pos: 'verb',
    cefr: 'A2',
    translations: ['to fall', 'to drop', 'to tumble'],
    examples: [
      { de: 'Die Blätter fallen von den Bäumen.', en: 'The leaves are falling from the trees.' }
    ],
    inflections: ['falle', 'fällst', 'fällt', 'fallt', 'fiel', 'fielen', 'fielt', 'gefallen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Strong verb (Class 7) with a-ä vowel change and a-ie-a ablaut.'
    }
  },

  // 16 Everyday Separable Verbs
  {
    headword: 'mitnehmen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to take along', 'to take with', 'to take away'],
    examples: [
      { de: 'Nimm einen Regenschirm mit!', en: 'Take an umbrella with you!' }
    ],
    inflections: ['mitnehme', 'mitnimmst', 'mitnimmt', 'mitnehmt', 'mitnahm', 'mitnahmen', 'mitgenommen', 'mitzunehmen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix mit-; indexed by single-token subordinate and non-finite forms.'
    }
  },
  {
    headword: 'anfangen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to begin', 'to start'],
    examples: [
      { de: 'Der Kurs fängt um neun Uhr an.', en: 'The course starts at nine o\'clock.' }
    ],
    inflections: ['anfange', 'anfängst', 'anfängt', 'anfangt', 'anfing', 'anfingen', 'angefangen', 'anzufangen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix an-; strong verb (Class 7) with a-ä change.'
    }
  },
  {
    headword: 'aussehen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to look', 'to appear', 'to look like'],
    examples: [
      { de: 'Du siehst heute gut aus.', en: 'You look good today.' }
    ],
    inflections: ['aussehe', 'aussiehst', 'aussieht', 'ausseht', 'aussah', 'aussahen', 'ausgesehen', 'auszusehen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix aus-; strong verb (Class 5) with e-ie vowel change.'
    }
  },
  {
    headword: 'ankommen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to arrive', 'to reach'],
    examples: [
      { de: 'Wann kommt der Zug in Berlin an?', en: 'When does the train arrive in Berlin?' }
    ],
    inflections: ['ankomme', 'ankommst', 'ankommt', 'ankam', 'ankamen', 'angekommen', 'anzukommen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix an-; strong verb (Class 4) with o-a-o ablaut.'
    }
  },
  {
    headword: 'anrufen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to call (on the phone)', 'to ring up'],
    examples: [
      { de: 'Ich rufe dich heute Abend an.', en: 'I will call you this evening.' }
    ],
    inflections: ['anrufe', 'anrufst', 'anruft', 'anrief', 'anriefen', 'angerufen', 'anzurufen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix an-; strong verb (Class 7) with u-ie-u ablaut.'
    }
  },
  {
    headword: 'aufpassen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to pay attention', 'to watch out', 'to look after'],
    examples: [
      { de: 'Pass gut im Straßenverkehr auf!', en: 'Pay close attention in traffic!' }
    ],
    inflections: ['aufpasse', 'aufpasst', 'aufpasste', 'aufpassten', 'aufgepasst', 'aufzupassen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix auf-; weak verb with regular dental preterite.'
    }
  },
  {
    headword: 'aufmachen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to open', 'to unlock'],
    examples: [
      { de: 'Mach bitte das Fenster auf.', en: 'Please open the window.' }
    ],
    inflections: ['aufmache', 'aufmachst', 'aufmacht', 'aufmachte', 'aufmachten', 'aufgemacht', 'aufzumachen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix auf-; weak verb.'
    }
  },
  {
    headword: 'zumachen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to close', 'to shut'],
    examples: [
      { de: 'Kannst du die Tür zumachen?', en: 'Can you close the door?' }
    ],
    inflections: ['zumache', 'zumachst', 'zumacht', 'zumachte', 'zumachten', 'zugemacht', 'zuzumachen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix zu-; weak verb.'
    }
  },
  {
    headword: 'vorbereiten',
    pos: 'verb',
    cefr: 'A2',
    translations: ['to prepare', 'to get ready'],
    examples: [
      { de: 'Ich bereite das Abendessen vor.', en: 'I am preparing dinner.' }
    ],
    inflections: ['vorbereite', 'vorbereitest', 'vorbereitet', 'vorbereitete', 'vorbereiteten', 'vorzubereiten'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix vor-; weak verb with stem ending in -t.'
    }
  },
  {
    headword: 'mitbringen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to bring along', 'to bring with'],
    examples: [
      { de: 'Bring bitte etwas zum Trinken mit.', en: 'Please bring something to drink along.' }
    ],
    inflections: ['mitbringe', 'mitbringst', 'mitbringt', 'mitbrachte', 'mitbrachten', 'mitgebracht', 'mitzubringen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix mit-; mixed verb with consonant shift ch in preterite/participle.'
    }
  },
  {
    headword: 'mitkommen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to come along', 'to join'],
    examples: [
      { de: 'Kommst du heute ins Kino mit?', en: 'Are you coming along to the cinema today?' }
    ],
    inflections: ['mitkomme', 'mitkommst', 'mitkommt', 'mitkam', 'mitkamen', 'mitgekommen', 'mitzukommen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix mit-; strong verb (Class 4).'
    }
  },
  {
    headword: 'abholen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to pick up', 'to collect'],
    examples: [
      { de: 'Ich hole dich um fünf Uhr ab.', en: 'I will pick you up at five o\'clock.' }
    ],
    inflections: ['abhole', 'abholst', 'abholt', 'abholte', 'abholten', 'abgeholt', 'abzuholen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix ab-; weak verb.'
    }
  },
  {
    headword: 'einladen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to invite', 'to treat'],
    examples: [
      { de: 'Ich lade dich zu meiner Geburtstagsparty ein.', en: 'I invite you to my birthday party.' }
    ],
    inflections: ['einlade', 'einlädst', 'einlädt', 'einladet', 'einlud', 'einluden', 'eingeladen', 'einzuladen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix ein-; strong verb (Class 6) with a-ä vowel change.'
    }
  },
  {
    headword: 'einsteigen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to get in', 'to board', 'to step into (vehicle)'],
    examples: [
      { de: 'Bitte alle einsteigen!', en: 'All aboard, please!' }
    ],
    inflections: ['einsteige', 'einsteigst', 'einsteigt', 'einstieg', 'einstiegen', 'eingestiegen', 'einzusteigen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix ein-; strong verb (Class 1) with ei-ie-ie ablaut.'
    }
  },
  {
    headword: 'aussteigen',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to get off', 'to alight', 'to step out of (vehicle)'],
    examples: [
      { de: 'Wir steigen an der nächsten Station aus.', en: 'We get off at the next station.' }
    ],
    inflections: ['aussteige', 'aussteigst', 'aussteigt', 'ausstieg', 'ausstiegen', 'ausgestiegen', 'auszusteigen'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix aus-; strong verb (Class 1) with ei-ie-ie ablaut.'
    }
  },
  {
    headword: 'abfahren',
    pos: 'verb',
    cefr: 'A1',
    translations: ['to depart', 'to leave (by vehicle)'],
    examples: [
      { de: 'Der Zug fährt um 10:15 Uhr ab.', en: 'The train departs at 10:15 a.m.' }
    ],
    inflections: ['abfahre', 'abfährst', 'abfährt', 'abfahrt', 'abfuhr', 'abfuhren', 'abgefahren', 'abzufahren'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Separable prefix ab-; strong verb (Class 6) with a-ä vowel change.'
    }
  }
];

const closedClassData = [
  // Conjunctions
  {
    headword: 'weil',
    pos: 'conj',
    cefr: 'A1',
    translations: ['because', 'since'],
    examples: [
      { de: 'Ich lerne Deutsch, weil ich in Wien arbeite.', en: 'I am learning German because I work in Vienna.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Subordinating conjunction initiating a subordinate clause with verb-final word order.'
    }
  },
  {
    headword: 'dass',
    pos: 'conj',
    cefr: 'A1',
    translations: ['that'],
    examples: [
      { de: 'Ich weiß, dass du recht hast.', en: 'I know that you are right.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Subordinating complementizer introducing noun clauses with verb-final word order.'
    }
  },
  {
    headword: 'wenn',
    pos: 'conj',
    cefr: 'A1',
    translations: ['if', 'when', 'whenever'],
    examples: [
      { de: 'Wenn es morgen regnet, bleiben wir drinnen.', en: 'If it rains tomorrow, we will stay inside.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Subordinating conjunction for conditional and recurring temporal clauses.'
    }
  },
  {
    headword: 'obwohl',
    pos: 'conj',
    cefr: 'B1',
    translations: ['although', 'even though', 'though'],
    examples: [
      { de: 'Er geht spazieren, obwohl es kalt ist.', en: 'He goes for a walk although it is cold.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Concessive subordinating conjunction triggering verb-final word order.'
    }
  },
  {
    headword: 'ob',
    pos: 'conj',
    cefr: 'A2',
    translations: ['whether', 'if'],
    examples: [
      { de: 'Ich weiß nicht, ob er heute Zeit hat.', en: 'I don\'t know whether he has time today.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Subordinating interrogative conjunction introducing indirect yes/no questions.'
    }
  },

  // Prepositions & Multi-POS Function Words
  {
    headword: 'als',
    senses: [
      { pos: 'conj', cefr: 'A2', translations: ['when', 'as', 'than'] },
      { pos: 'prep', cefr: 'A1', translations: ['as', 'in the role of', 'in the capacity of'] }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Subordinating temporal conjunction for single past events, comparative conjunction after adjectives, and role preposition.'
    }
  },
  {
    headword: 'da',
    senses: [
      { pos: 'adv', cefr: 'A1', translations: ['there', 'here', 'then'] },
      { pos: 'conj', cefr: 'B1', translations: ['since', 'as', 'because'] }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Locative/temporal adverb and causal subordinating conjunction.'
    }
  },
  {
    headword: 'damit',
    senses: [
      { pos: 'adv', cefr: 'A2', translations: ['with it', 'with that', 'thereby'] },
      { pos: 'conj', cefr: 'B1', translations: ['so that', 'in order that'] }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Pronominal adverb (da + mit) and purposive subordinating conjunction.'
    }
  },
  {
    headword: 'während',
    senses: [
      { pos: 'prep', cefr: 'A2', translations: ['during', 'throughout'] },
      { pos: 'conj', cefr: 'B1', translations: ['while', 'whereas'] }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Temporal preposition governing genitive (or colloquial dative) and temporal/adversative subordinating conjunction.'
    }
  },
  {
    headword: 'seit',
    senses: [
      { pos: 'prep', cefr: 'A1', translations: ['since', 'for (a period of time)'] },
      { pos: 'conj', cefr: 'B1', translations: ['since', 'ever since'] }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Temporal preposition governing dative case and temporal subordinating conjunction.'
    }
  },
  {
    headword: 'wegen',
    pos: 'prep',
    cefr: 'A2',
    translations: ['because of', 'on account of', 'due to'],
    examples: [
      { de: 'Wegen des Regens bleiben wir hier.', en: 'Because of the rain we are staying here.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Causal preposition governing genitive case (dative in colloquial German).'
    }
  },
  {
    headword: 'trotz',
    pos: 'prep',
    cefr: 'B1',
    translations: ['despite', 'in spite of'],
    examples: [
      { de: 'Trotz des schlechten Wetters gehen wir wandern.', en: 'In spite of the bad weather we go hiking.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Concessive preposition governing genitive case (dative in spoken German).'
    }
  },

  // Pronouns & Determiners / Relatives
  {
    headword: 'jemand',
    pos: 'pron',
    cefr: 'A2',
    translations: ['someone', 'somebody', 'anyone'],
    examples: [
      { de: 'Ist da jemand?', en: 'Is someone there?' }
    ],
    inflections: ['jemandem', 'jemanden', 'jemands', 'jemandes'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Indefinite pronoun with optional case declension.'
    }
  },
  {
    headword: 'niemand',
    pos: 'pron',
    cefr: 'A2',
    translations: ['no one', 'nobody'],
    examples: [
      { de: 'Niemand weiß die Antwort.', en: 'Nobody knows the answer.' }
    ],
    inflections: ['niemandem', 'niemanden', 'niemands', 'niemandes'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Negative indefinite pronoun with optional case declension.'
    }
  },
  {
    headword: 'keiner',
    pos: 'pron',
    cefr: 'A1',
    translations: ['no one', 'nobody', 'none', 'neither'],
    examples: [
      { de: 'Keiner von uns wusste Bescheid.', en: 'None of us knew about it.' }
    ],
    inflections: ['kein', 'keine', 'keinem', 'keinen', 'keines'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Negative indefinite pronoun and determiner forms.'
    }
  },
  {
    headword: 'dessen',
    pos: 'pron',
    cefr: 'B1',
    translations: ['whose', 'of which', 'his', 'its'],
    examples: [
      { de: 'Der Mann, dessen Auto gestohlen wurde, rief die Polizei.', en: 'The man whose car was stolen called the police.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Genitive masculine/neuter relative and demonstrative pronoun.'
    }
  },
  {
    headword: 'deren',
    pos: 'pron',
    cefr: 'B1',
    translations: ['whose', 'of which', 'their', 'her'],
    examples: [
      { de: 'Die Frau, deren Name ich vergessen habe, war sehr nett.', en: 'The woman whose name I forgot was very nice.' }
    ],
    inflections: ['derer'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Genitive feminine/plural relative and demonstrative pronoun.'
    }
  },
  {
    headword: 'einige',
    senses: [
      { pos: 'pron', cefr: 'A2', translations: ['some', 'a few', 'several'] },
      { pos: 'det', cefr: 'A2', translations: ['some', 'a few', 'several'] }
    ],
    inflections: ['einigem', 'einigen', 'einiger', 'einiges'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Indefinite pronoun and determiner.'
    }
  },
  {
    headword: 'beide',
    senses: [
      { pos: 'pron', cefr: 'A1', translations: ['both', 'the two'] },
      { pos: 'det', cefr: 'A1', translations: ['both'] }
    ],
    inflections: ['beidem', 'beiden', 'beider', 'beides'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Dual quantifier pronoun and determiner.'
    }
  },

  // Pronominal Adverbs
  {
    headword: 'darauf',
    pos: 'adv',
    cefr: 'A2',
    translations: ['on it', 'on that', 'thereupon', 'after that'],
    inflections: ['drauf'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Pronominal adverb (da(r) + auf).'
    }
  },
  {
    headword: 'davon',
    pos: 'adv',
    cefr: 'A2',
    translations: ['of it', 'from it', 'about that', 'away'],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Pronominal adverb (da + von).'
    }
  },
  {
    headword: 'daran',
    pos: 'adv',
    cefr: 'A2',
    translations: ['at it', 'on it', 'about it', 'to it'],
    inflections: ['dran'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Pronominal adverb (da(r) + an).'
    }
  },
  {
    headword: 'dafür',
    pos: 'adv',
    cefr: 'A2',
    translations: ['for it', 'for that', 'in favor of it'],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Pronominal adverb (da + für).'
    }
  },
  {
    headword: 'dazu',
    pos: 'adv',
    cefr: 'A2',
    translations: ['to it', 'in addition', 'for that purpose'],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Pronominal adverb (da + zu).'
    }
  },
  {
    headword: 'darüber',
    pos: 'adv',
    cefr: 'A2',
    translations: ['about it', 'over it', 'above that'],
    inflections: ['drüber'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Pronominal adverb (da(r) + über).'
    }
  },
  {
    headword: 'woran',
    pos: 'adv',
    cefr: 'B1',
    translations: ['at what', 'about what', 'on what', 'whereon'],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Interrogative and relative pronominal adverb (wo(r) + an).'
    }
  },
  {
    headword: 'darum',
    pos: 'adv',
    cefr: 'A2',
    translations: ['around it', 'therefore', 'that is why'],
    inflections: ['drum'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Pronominal adverb (da(r) + um).'
    }
  },
  {
    headword: 'darin',
    pos: 'adv',
    cefr: 'A2',
    translations: ['in it', 'inside', 'therein'],
    inflections: ['drin'],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Pronominal adverb (da(r) + in).'
    }
  },

  // Modal & Focus Particles
  {
    headword: 'nur',
    pos: 'part',
    cefr: 'A1',
    translations: ['only', 'just', 'merely'],
    examples: [
      { de: 'Ich habe nur zwei Euro.', en: 'I only have two euros.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Focus particle restricting scope to the following element.'
    }
  },
  {
    headword: 'halt',
    pos: 'part',
    cefr: 'A2',
    translations: ['just', 'simply (indicating resignation or accepted fact)'],
    examples: [
      { de: 'Das ist halt so.', en: 'That\'s just the way it is.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Colloquial modal particle conveying that a situation cannot be changed.'
    }
  },
  {
    headword: 'eben',
    senses: [
      { pos: 'part', cefr: 'A2', translations: ['just', 'simply', 'precisely'] },
      { pos: 'adv', cefr: 'A1', translations: ['just now', 'a moment ago'] }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Modal particle expressing inevitability and temporal adverb.'
    }
  },
  {
    headword: 'wohl',
    senses: [
      { pos: 'part', cefr: 'A2', translations: ['probably', 'presumably', 'surely'] },
      { pos: 'adv', cefr: 'A1', translations: ['well', 'comfortably'] }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Modal particle expressing assumption and adverb of well-being.'
    }
  },
  {
    headword: 'gar',
    pos: 'part',
    cefr: 'A2',
    translations: ['at all', 'even', 'completely (with negation: gar nicht / gar kein)'],
    examples: [
      { de: 'Ich habe gar keine Lust.', en: 'I don\'t feel like it at all.' }
    ],
    inflections: [],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Intensifying focus particle almost always accompanying negative polarity items.'
    }
  }
];

function updateFile(filename, newEntries) {
  const filePath = path.join(authoringDir, filename);
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const beforeLen = existing.length;
  existing.push(...newEntries);
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2) + '\n', 'utf8');
  console.log(`Updated ${filename}: ${beforeLen} -> ${existing.length} (+${newEntries.length})`);
}

updateFile('adjectives.json', adjData);
updateFile('adverbs.json', advData);
updateFile('verbs.json', verbsData);
updateFile('closed_class.json', closedClassData);

console.log('Successfully expanded authored dataset for Phase 10.');
