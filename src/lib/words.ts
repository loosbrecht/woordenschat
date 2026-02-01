import words from '../data/words.json';

export interface Word {
  date: string;
  word: string;
  explanation: string;
  example: string;
}

// Pre-sorted by date ascending for index-based navigation
const entries: Word[] = (words as Word[]).sort((a, b) => a.date.localeCompare(b.date));

export function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isValidDate(dateStr: string): boolean {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function isFutureDate(dateStr: string): boolean {
  return dateStr > getToday();
}

export function isToday(dateStr: string): boolean {
  return dateStr === getToday();
}

export function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('nl-NL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getWordForDate(dateStr: string): Word | null {
  return entries.find((e) => e.date === dateStr) ?? null;
}

export function getRecentWords(count: number): Word[] {
  const today = getToday();
  return entries.filter((e) => e.date <= today).reverse().slice(0, count);
}

export function getPrevDate(dateStr: string): string | null {
  const i = entries.findIndex((e) => e.date === dateStr);
  return i > 0 ? entries[i - 1].date : null;
}

export function getNextDate(dateStr: string): string | null {
  const today = getToday();
  const i = entries.findIndex((e) => e.date === dateStr);
  if (i < 0 || i >= entries.length - 1) return null;
  const next = entries[i + 1];
  return next.date <= today ? next.date : null;
}
