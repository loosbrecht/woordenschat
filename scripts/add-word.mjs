import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORDS_PATH = join(__dirname, '..', 'src', 'data', 'words.json');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const aiMode = args.includes('--ai');
const validate = args.includes('--validate');
const daysIndex = args.indexOf('--days');
const days = daysIndex !== -1 ? parseInt(args[daysIndex + 1], 10) : 1;

if (isNaN(days) || days < 1) {
  console.error('Error: --days must be a positive integer');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Readline helpers
// ---------------------------------------------------------------------------

function createRl() {
  return createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

// ---------------------------------------------------------------------------
// words.json helpers
// ---------------------------------------------------------------------------

async function loadWords() {
  const raw = await readFile(WORDS_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function saveWords(words) {
  await writeFile(WORDS_PATH, JSON.stringify(words, null, 2) + '\n', 'utf-8');
}

function getNextDate(words) {
  const sorted = [...words].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1]?.date;
  if (!last) {
    // If no words exist, start from today
    const d = new Date();
    return formatDate(d);
  }
  const [y, m, d] = last.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  return formatDate(next);
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  return formatDate(date);
}

// ---------------------------------------------------------------------------
// OpenAI helpers
// ---------------------------------------------------------------------------

async function getOpenAI() {
  // Try to load .env file
  const envPath = join(__dirname, '..', '.env');
  try {
    const envContent = await readFile(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env file not found, rely on environment variables
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY is not set. Set it in .env or as an environment variable.');
    process.exit(1);
  }

  const { default: OpenAI } = await import('openai');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function generateWords(openai, existingWords, aantal) {
  const wordList = existingWords.map((w) => w.word).join(', ');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 1.0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Je bent een expert in het Nederlands met een Vlaamse voorkeur, gespecialiseerd in literair, intellectueel, academisch en juridisch taalgebruik.

Genereer ${aantal} Nederlandse woorden die:
- gevorderd en niet alledaags zijn
- de woordenschat van een volwassen moedertaalspreker verrijken
- voorkomen in literatuur, academische contexten of juridisch taalgebruik
- algemeen Nederlands zijn, maar natuurlijk aanvoelen in Vlaanderen

Vermijd expliciet:
- banale of alledaagse woorden
- typisch Noord-Nederlandse formuleringen
- dialectwoorden of regionaal beperkte termen
- anglicismen
- woorden die al in deze lijst staan: ${wordList}

Outputvereisten (zeer belangrijk):
- Geef uitsluitend geldige JSON terug
- Geen uitleg, geen markdown, geen tekst buiten JSON
- De output is één JSON-object met een "words" key die een array bevat met exact ${aantal} objecten
- Elk object volgt exact dit formaat:

{
  "word": "string",
  "explanation": "string",
  "example": "string"
}

Inhoudsregels:
- De uitleg is precies, genuanceerd en in correct (Vlaams) Nederlands
- Het voorbeeld is een inhoudelijk sterke, natuurlijke zin met een literair, academisch of juridisch register
- Zorg voor variatie in woordsoort en betekenis`,
      },
      {
        role: 'user',
        content: `Genereer ${aantal} gevorderde Nederlandse woorden.`,
      },
    ],
  });

  const result = JSON.parse(response.choices[0].message.content);
  return Array.isArray(result) ? result : result.words;
}

async function verifyWord(openai, word) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Je bent een strenge taalkundige die woorden verifieert voor een Vlaamse woordenschat-app gericht op gevorderd Nederlands.

Je krijgt een woord met uitleg en voorbeeldzin. Beoordeel op deze criteria:

1. BESTAAT HET WOORD? Het moet een echt, geattesteerd Nederlands woord zijn dat in Van Dale of vergelijkbare woordenboeken voorkomt. Samengestelde neologismen of verzinsels zijn ONGELDIG.
2. IS HET GEVORDERD GENOEG? Banale of alledaagse woorden zijn ONGELDIG — het doel is de woordenschat van een volwassen moedertaalspreker te verrijken.
3. IS DE UITLEG CORRECT EN BONDIG? De uitleg moet kloppen, genuanceerd zijn en in correct Nederlands.
4. IS DE VOORBEELDZIN CORRECT? Grammaticaal correct, natuurlijk klinkend, en het woord wordt juist gebruikt in een literair, academisch of juridisch register.

Antwoord in JSON-formaat: { "valid": true/false, "reason": "..." }
Wees streng. Bij twijfel: ongeldig.`,
      },
      {
        role: 'user',
        content: JSON.stringify(word),
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}

// ---------------------------------------------------------------------------
// AI mode
// ---------------------------------------------------------------------------

async function aiGenerateWords(openai, existingWords, startDate, count, shouldValidate) {
  console.log(`\nGenerating ${count} word${count !== 1 ? 's' : ''}...`);

  const generated = await generateWords(openai, existingWords, count);
  console.log(`  Generated ${generated.length} word${generated.length !== 1 ? 's' : ''}.`);

  const results = [];

  for (let i = 0; i < generated.length; i++) {
    const word = generated[i];
    const date = i === 0 ? startDate : addDays(startDate, i);

    console.log(`\n  [${i + 1}/${generated.length}] ${word.word} (${date})`);
    console.log(`      Explanation: ${word.explanation}`);
    console.log(`      Example: ${word.example}`);

    // Check for duplicates
    if (existingWords.some((w) => w.word.toLowerCase() === word.word.toLowerCase())) {
      console.log('      -> Duplicate word, skipping.');
      continue;
    }

    // Verify with independent call
    console.log('      Verifying...');
    const verification = await verifyWord(openai, word);
    console.log(`      Verification: ${verification.valid ? 'VALID' : 'INVALID'} — ${verification.reason}`);

    if (!verification.valid) {
      console.log('      -> Verification failed, skipping.');
      continue;
    }

    // If --validate, ask user for approval
    if (shouldValidate) {
      const rl = createRl();
      const answer = await ask(rl, '      Add this word? (y/n): ');
      rl.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('      -> Skipped.');
        continue;
      }
    }

    results.push({ date, ...word });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Manual mode
// ---------------------------------------------------------------------------

async function manualAddOneWord(existingWords, date) {
  const rl = createRl();

  console.log(`\nAdding word for date: ${date}`);

  const word = await ask(rl, '  Word: ');
  if (!word.trim()) {
    rl.close();
    console.log('  -> Skipped (empty word).');
    return null;
  }

  // Check for duplicates
  if (existingWords.some((w) => w.word.toLowerCase() === word.trim().toLowerCase())) {
    rl.close();
    console.log(`  -> "${word.trim()}" already exists in words.json, skipping.`);
    return null;
  }

  const explanation = await ask(rl, '  Explanation: ');
  const example = await ask(rl, '  Example: ');
  rl.close();

  if (!explanation.trim() || !example.trim()) {
    console.log('  -> Skipped (empty explanation or example).');
    return null;
  }

  return { date, word: word.trim(), explanation: explanation.trim(), example: example.trim() };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  let words = await loadWords();
  let nextDate = getNextDate(words);
  let openai;

  if (aiMode) {
    openai = await getOpenAI();
  }

  console.log(`Mode: ${aiMode ? 'AI' : 'manual'}${validate ? ' + validate' : ''}`);
  console.log(`Words to add: ${days}`);
  console.log(`Starting date: ${nextDate}`);

  let added = 0;

  if (aiMode) {
    const entries = await aiGenerateWords(openai, words, nextDate, days, validate);
    for (const entry of entries) {
      words.push(entry);
      words.sort((a, b) => a.date.localeCompare(b.date));
      await saveWords(words);
      console.log(`  -> Added "${entry.word}" for ${entry.date}`);
      added++;
    }
  } else {
    for (let i = 0; i < days; i++) {
      const date = i === 0 ? nextDate : addDays(nextDate, i);
      const entry = await manualAddOneWord(words, date);
      if (entry) {
        words.push(entry);
        words.sort((a, b) => a.date.localeCompare(b.date));
        await saveWords(words);
        console.log(`  -> Added "${entry.word}" for ${entry.date}`);
        added++;
      }
    }
  }

  console.log(`\nDone. Added ${added} word${added !== 1 ? 's' : ''}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
