import fs from 'node:fs';
import path from 'node:path';

const authoringDir = path.resolve(process.cwd(), 'data-source', 'authoring');

function updateJson(filename, updater) {
  const filePath = path.join(authoringDir, filename);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const updated = updater(data);
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf8');
  console.log(`Updated ${filename}: now has ${updated.length} entries.`);
}

console.log('=== Applying Phase 11 Linguistic Corrections ===\n');

// 1. closed_class.json
updateJson('closed_class.json', (entries) => {
  // Update 'keiner'
  const idxKeiner = entries.findIndex(e => e.headword === 'keiner');
  if (idxKeiner === -1) throw new Error('keiner not found in closed_class.json');
  entries[idxKeiner] = {
    headword: 'keiner',
    pos: 'pron',
    cefr: 'A1',
    translations: [
      'no one',
      'nobody',
      'none',
      'neither'
    ],
    examples: [
      {
        de: 'Keiner von uns wusste Bescheid.',
        en: 'None of us knew about it.'
      }
    ],
    inflections: [
      'keine',
      'keinem',
      'keinen',
      'keines',
      'keins'
    ],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Negative indefinite pronoun forms.'
    }
  };

  // Add 'kein' if not present
  if (!entries.some(e => e.headword === 'kein')) {
    entries.push({
      headword: 'kein',
      pos: 'det',
      cefr: 'A1',
      translations: [
        'no',
        'not a',
        'not any'
      ],
      examples: [
        {
          de: 'Ich habe kein Geld dabei.',
          en: 'I have no money with me.'
        },
        {
          de: 'Das ist kein Problem.',
          en: 'That is no problem / not a problem.'
        }
      ],
      inflections: [
        'keine',
        'keinem',
        'keinen',
        'keines'
      ],
      provenance: {
        author: 'pdf-language-companion-team',
        method: 'independent_lexicography',
        reviewStatus: 'verified',
        created: '2026-10-19',
        notes: 'Negative determiner / indefinite article; declension patterns like ein.'
      }
    });
  }

  return entries;
});

// 2. adverbs.json
updateJson('adverbs.json', (entries) => {
  // Update 'eigentlich'
  const idxEig = entries.findIndex(e => e.headword === 'eigentlich');
  if (idxEig === -1) throw new Error('eigentlich not found in adverbs.json');
  entries[idxEig] = {
    headword: 'eigentlich',
    senses: [
      {
        pos: 'adv',
        cefr: 'A2',
        translations: [
          'actually',
          'really',
          'in fact'
        ],
        examples: [
          {
            de: 'Was machst du eigentlich beruflich?',
            en: 'What do you actually do for a living?'
          }
        ]
      },
      {
        pos: 'adj',
        cefr: 'B1',
        translations: [
          'actual',
          'real',
          'proper',
          'original'
        ],
        examples: [
          {
            de: 'Das eigentliche Problem ist die Zeit.',
            en: 'The actual problem is time.'
          }
        ]
      }
    ],
    inflections: [
      'eigentliche',
      'eigentlichen',
      'eigentlicher',
      'eigentliches',
      'eigentlichem'
    ],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'Multi-sense entry: modal adverb/focus particle and inflecting adjective.'
    }
  };

  // Add 'weiter' if not present
  if (!entries.some(e => e.headword === 'weiter')) {
    entries.push({
      headword: 'weiter',
      senses: [
        {
          pos: 'adv',
          cefr: 'A1',
          translations: [
            'further',
            'on',
            'onward',
            'ahead',
            'continue'
          ],
          examples: [
            {
              de: 'Gehen Sie bitte weiter.',
              en: 'Please walk further / keep walking.'
            },
            {
              de: 'und so weiter (usw.)',
              en: 'and so on (etc.)'
            }
          ]
        },
        {
          pos: 'adj',
          cefr: 'A2',
          translations: [
            'additional',
            'further',
            'more',
            'wider'
          ],
          examples: [
            {
              de: 'Haben Sie weitere Fragen?',
              en: 'Do you have further / additional questions?'
            }
          ]
        }
      ],
      inflections: [
        'weitere',
        'weiterem',
        'weiteren',
        'weiterer',
        'weiteres'
      ],
      provenance: {
        author: 'pdf-language-companion-team',
        method: 'independent_lexicography',
        reviewStatus: 'verified',
        created: '2026-10-19',
        notes: 'Adverb and comparative adjective headword with inflected forms.'
      }
    });
  }

  return entries;
});

// 3. adjectives.json
updateJson('adjectives.json', (entries) => {
  const idxWeit = entries.findIndex(e => e.headword === 'weit');
  if (idxWeit === -1) throw new Error('weit not found in adjectives.json');
  entries[idxWeit] = {
    headword: 'weit',
    pos: 'adj',
    cefr: 'A1',
    translations: [
      'far',
      'wide',
      'distant',
      'broad'
    ],
    examples: [
      {
        de: 'Wie weit ist es zum Bahnhof?',
        en: 'How far is it to the train station?'
      },
      {
        de: 'Das Hemd ist mir zu weit.',
        en: 'The shirt is too wide for me.'
      }
    ],
    inflections: [
      'weite',
      'weitem',
      'weiten',
      'weites',
      'weitest',
      'weiteste',
      'weitestem',
      'weitesten',
      'weitester',
      'weitestes'
    ],
    provenance: {
      author: 'pdf-language-companion-team',
      method: 'independent_lexicography',
      reviewStatus: 'verified',
      created: '2026-10-18',
      notes: 'High-utility adjective/adverb; covers wide/far senses and superlative weitest-.'
    }
  };
  return entries;
});

// 4. nouns.json
updateJson('nouns.json', (entries) => {
  const newNouns = [
    {
      headword: 'Abfahrt',
      pos: 'noun',
      gender: 'f',
      plural: 'Abfahrten',
      cefr: 'A1',
      translations: [
        'departure'
      ],
      examples: [
        {
          de: 'Die Abfahrt des Zuges ist um 10:15 Uhr.',
          en: 'The departure of the train is at 10:15 a.m.'
        }
      ],
      inflections: [
        'Abfahrten'
      ],
      provenance: {
        author: 'pdf-language-companion-team',
        method: 'independent_lexicography',
        reviewStatus: 'verified',
        created: '2026-10-19',
        notes: 'Feminine noun for departure; resolves homograph with abfahrt (verb).'
      }
    },
    {
      headword: 'Schloss',
      senses: [
        {
          pos: 'noun',
          gender: 'n',
          plural: 'Schlösser',
          cefr: 'A2',
          translations: [
            'castle',
            'palace'
          ],
          examples: [
            {
              de: 'Wir haben das alte Schloss besichtigt.',
              en: 'We visited the old castle.'
            }
          ]
        },
        {
          pos: 'noun',
          gender: 'n',
          plural: 'Schlösser',
          cefr: 'A2',
          translations: [
            'lock'
          ],
          examples: [
            {
              de: 'Das Schloss an der Tür ist kaputt.',
              en: 'The lock on the door is broken.'
            }
          ]
        }
      ],
      inflections: [
        'Schlosses',
        'Schlösser',
        'Schlössern'
      ],
      provenance: {
        author: 'pdf-language-companion-team',
        method: 'independent_lexicography',
        reviewStatus: 'verified',
        created: '2026-10-19',
        notes: 'Neuter noun with two core meanings: castle/palace and mechanical lock; resolves homograph with schloss (verb).'
      }
    },
    {
      headword: 'Einstieg',
      pos: 'noun',
      gender: 'm',
      plural: 'Einstiege',
      cefr: 'A2',
      translations: [
        'entry',
        'boarding',
        'access',
        'starting point'
      ],
      examples: [
        {
          de: 'Der Einstieg in den Zug ist hier.',
          en: 'Boarding for the train is here.'
        }
      ],
      inflections: [
        'Einstiegs',
        'Einstiege',
        'Einstiegen'
      ],
      provenance: {
        author: 'pdf-language-companion-team',
        method: 'independent_lexicography',
        reviewStatus: 'verified',
        created: '2026-10-19',
        notes: 'Masculine noun for boarding, entrance, entry point; resolves homograph with einstieg (verb).'
      }
    },
    {
      headword: 'Ausstieg',
      pos: 'noun',
      gender: 'm',
      plural: 'Ausstiege',
      cefr: 'A2',
      translations: [
        'exit',
        'alighting',
        'way out',
        'phase-out'
      ],
      examples: [
        {
          de: 'Der Ausstieg ist in Fahrtrichtung rechts.',
          en: 'The exit is on the right in the direction of travel.'
        }
      ],
      inflections: [
        'Ausstiegs',
        'Ausstiege',
        'Ausstiegen'
      ],
      provenance: {
        author: 'pdf-language-companion-team',
        method: 'independent_lexicography',
        reviewStatus: 'verified',
        created: '2026-10-19',
        notes: 'Masculine noun for exit, alighting; resolves homograph with ausstieg (verb).'
      }
    }
  ];

  for (const n of newNouns) {
    if (!entries.some(e => e.headword === n.headword)) {
      entries.push(n);
    }
  }
  return entries;
});

// 5. verbs.json
updateJson('verbs.json', (entries) => {
  if (!entries.some(e => e.headword === 'gefallen')) {
    entries.push({
      headword: 'gefallen',
      pos: 'verb',
      cefr: 'A1',
      translations: [
        'to please',
        'to appeal to',
        'to be liked'
      ],
      examples: [
        {
          de: 'Das Buch gefällt mir gut.',
          en: 'I like the book / The book pleases me.'
        },
        {
          de: 'Wie gefällt Ihnen Deutschland?',
          en: 'How do you like Germany?'
        }
      ],
      inflections: [
        'gefalle',
        'gefällst',
        'gefällt',
        'gefallt',
        'gefiel',
        'gefielen',
        'gefielt'
      ],
      provenance: {
        author: 'pdf-language-companion-team',
        method: 'independent_lexicography',
        reviewStatus: 'verified',
        created: '2026-10-19',
        notes: 'Strong verb (Class 7) with a-ä vowel change; takes dative object; resolves homograph with fallen.'
      }
    });
  }
  return entries;
});

console.log('\nAll authoring corrections applied successfully!');
