import words from '../data/words.json';

export interface Word {
  word: string;
  explanation: string;
  example: string;
}

export interface WordEntry extends Word {
  date: string;
}

const entries = words as WordEntry[];

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

export function getWordForDate(dateStr: string): WordEntry | null {
  return entries.find((e) => e.date === dateStr) ?? null;
}

export function getRecentWords(count: number): WordEntry[] {
  const today = getToday();
  return entries
    .filter((e) => e.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, count);
}

export function getPrevDate(dateStr: string): string | null {
  const prev = entries
    .filter((e) => e.date < dateStr)
    .sort((a, b) => b.date.localeCompare(a.date));
  return prev[0]?.date ?? null;
}

export function getNextDate(dateStr: string): string | null {
  const today = getToday();
  const next = entries
    .filter((e) => e.date > dateStr && e.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  return next[0]?.date ?? null;
}
