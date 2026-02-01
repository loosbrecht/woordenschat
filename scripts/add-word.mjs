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

async function generateWord(openai, existingWords) {
  const wordList = existingWords.map((w) => w.word).join(', ');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Je bent een expert in de Nederlandse taal. Genereer een interessant, minder bekend maar bruikbaar Nederlands woord met uitleg en voorbeeldzin. Het woord moet echt bestaan, mooi zijn, en iemands woordenschat verrijken.

Vermijd deze woorden die al bestaan in de lijst: ${wordList}

Antwoord in JSON-formaat: { "word": "...", "explanation": "...", "example": "..." }
- "explanation": een heldere uitleg van het woord in het Nederlands
- "example": een voorbeeldzin die het woord correct gebruikt`,
      },
      {
        role: 'user',
        content: 'Genereer een mooi Nederlands woord.',
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}

async function verifyWord(openai, word) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Je bent een strenge taalkundige die Nederlandse woorden controleert op juistheid.

Je krijgt een woord, uitleg en voorbeeldzin. Controleer:
1. Is dit een echt Nederlands woord?
2. Is de uitleg accuraat?
3. Is de voorbeeldzin grammaticaal correct en wordt het woord juist gebruikt?

Antwoord in JSON-formaat: { "valid": true/false, "reason": "..." }`,
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

async function aiGenerateOneWord(openai, existingWords, date, shouldValidate) {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\nGenerating word for ${date}... (attempt ${attempt}/${MAX_RETRIES})`);

    const generated = await generateWord(openai, existingWords);
    console.log(`  Word: ${generated.word}`);
    console.log(`  Explanation: ${generated.explanation}`);
    console.log(`  Example: ${generated.example}`);

    // Check for duplicates
    if (existingWords.some((w) => w.word.toLowerCase() === generated.word.toLowerCase())) {
      console.log('  -> Duplicate word, retrying...');
      continue;
    }

    // Verify with independent call
    console.log('  Verifying...');
    const verification = await verifyWord(openai, generated);
    console.log(`  Verification: ${verification.valid ? 'VALID' : 'INVALID'} — ${verification.reason}`);

    if (!verification.valid) {
      console.log('  -> Verification failed, retrying...');
      continue;
    }

    // If --validate, ask user for approval
    if (shouldValidate) {
      const rl = createRl();
      const answer = await ask(rl, '  Add this word? (y/n/r): ');
      rl.close();

      if (answer.toLowerCase() === 'n') {
        console.log('  -> Skipped.');
        return null;
      }
      if (answer.toLowerCase() === 'r') {
        console.log('  -> Retrying with a new word...');
        continue;
      }
    }

    return { date, ...generated };
  }

  console.log(`  -> Failed after ${MAX_RETRIES} attempts, skipping date ${date}.`);
  return null;
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

  for (let i = 0; i < days; i++) {
    const date = i === 0 ? nextDate : addDays(nextDate, i);
    let entry;

    if (aiMode) {
      entry = await aiGenerateOneWord(openai, words, date, validate);
    } else {
      entry = await manualAddOneWord(words, date);
    }

    if (entry) {
      words.push(entry);
      words.sort((a, b) => a.date.localeCompare(b.date));
      await saveWords(words);
      console.log(`  -> Added "${entry.word}" for ${entry.date}`);
      added++;
    }
  }

  console.log(`\nDone. Added ${added} word${added !== 1 ? 's' : ''}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
