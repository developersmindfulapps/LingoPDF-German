import fs from 'node:fs';
import path from 'node:path';
import {
  authoredDictionaryProvider,
  localDictionaryProvider,
  compositeDictionaryProvider
} from '../src/services/dictionary/index.ts';

async function auditBenchmarkFailures() {
  await compositeDictionaryProvider.ensureInitialized();
  const fixtureDir = path.resolve(process.cwd(), 'data-source', 'benchmarks', 'fixtures');
  const files = fs.readdirSync(fixtureDir).filter(f => f.endsWith('.json') && !f.includes('metadata'));

  console.log('=== MULTI-GENRE BENCHMARK DETAILED FAILURE & FALLBACK AUDIT ===\n');

  for (const f of files) {
    const fixture = JSON.parse(fs.readFileSync(path.join(fixtureDir, f), 'utf8'));
    const evaluatedTokens = fixture.tokens.filter(t => !t.isExcluded);
    console.log(`[Genre: ${fixture.genre}] (Denominator: ${evaluatedTokens.length} tokens):`);

    const legacyOnly = [];
    const unresolvedBoth = [];

    for (const item of evaluatedTokens) {
      const word = item.cleaned;
      const authRes = await authoredDictionaryProvider.lookup(word, 'de', 'en');
      const legRes = await localDictionaryProvider.lookup(word, 'de', 'en');

      if (!authRes && legRes) {
        legacyOnly.push({ token: word, lemma: legRes.lemma, trans: legRes.translations.slice(0, 2).join('; ') });
      } else if (!authRes && !legRes) {
        unresolvedBoth.push(word);
      }
    }

    console.log(`  • Authored misses resolved by Legacy fallback (${legacyOnly.length} tokens, ${(legacyOnly.length / evaluatedTokens.length * 100).toFixed(1)}%):`);
    legacyOnly.slice(0, 8).forEach(item => {
      console.log(`      "${item.token}" -> [legacy] ${item.lemma ? '(lemma: ' + item.lemma + ') ' : ''}${item.trans}`);
    });
    if (legacyOnly.length > 8) console.log(`      ... and ${legacyOnly.length - 8} more.`);

    console.log(`  • Unresolved by BOTH providers (${unresolvedBoth.length} tokens, ${(unresolvedBoth.length / evaluatedTokens.length * 100).toFixed(1)}%):`);
    console.log(`      ${unresolvedBoth.slice(0, 10).join(', ')}${unresolvedBoth.length > 10 ? ' ...' : ''}`);
    console.log();
  }
}

auditBenchmarkFailures().catch(console.error);
