export interface Word {
  word: string;
  explanation: string;
  example: string;
}

export interface WordRow extends Word {
  id: number;
  date: string;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(m) - 1 ||
    date.getDate() !== Number(d)
  ) {
    return null;
  }
  return date;
}

export function getToday(): string {
  return formatDate(new Date());
}

export function formatDisplayDate(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString('nl-NL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function isFutureDate(dateStr: string): boolean {
  const date = parseDate(dateStr);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

export function isToday(dateStr: string): boolean {
  return dateStr === getToday();
}

export async function getWordForDate(db: D1Database, dateStr: string): Promise<WordRow | null> {
  return await db
    .prepare('SELECT * FROM words WHERE date = ? LIMIT 1')
    .bind(dateStr)
    .first<WordRow>();
}

export async function getRecentWords(db: D1Database, count: number): Promise<WordRow[]> {
  const today = getToday();
  const { results } = await db
    .prepare('SELECT * FROM words WHERE date <= ? ORDER BY date DESC LIMIT ?')
    .bind(today, count)
    .all<WordRow>();
  return results;
}

export async function getPrevDate(db: D1Database, dateStr: string): Promise<string | null> {
  const row = await db
    .prepare('SELECT date FROM words WHERE date < ? ORDER BY date DESC LIMIT 1')
    .bind(dateStr)
    .first<{ date: string }>();
  return row?.date ?? null;
}

export async function getNextDate(db: D1Database, dateStr: string): Promise<string | null> {
  const today = getToday();
  const row = await db
    .prepare('SELECT date FROM words WHERE date > ? AND date <= ? ORDER BY date ASC LIMIT 1')
    .bind(dateStr, today)
    .first<{ date: string }>();
  return row?.date ?? null;
}
