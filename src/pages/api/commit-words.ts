import type { APIRoute } from 'astro';

interface WordEntry {
  date: string;
  word: string;
  explanation: string;
  example: string;
}

const GITHUB_API = 'https://api.github.com';
const FILE_PATH = 'src/data/words.json';

export const POST: APIRoute = async ({ request }) => {
  const { secret, words: newWords } = (await request.json()) as {
    secret: string;
    words: WordEntry[];
  };

  if (!secret || secret !== process.env.GENERATE_SECRET) {
    return new Response(JSON.stringify({ error: 'Ongeldig wachtwoord.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO;

  if (!githubToken || !githubRepo) {
    return new Response(
      JSON.stringify({ error: 'GITHUB_TOKEN of GITHUB_REPO is niet geconfigureerd.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!newWords || !Array.isArray(newWords) || newWords.length === 0) {
    return new Response(JSON.stringify({ error: 'Geen woorden om op te slaan.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Fetch current file from GitHub
    const fileRes = await fetch(`${GITHUB_API}/repos/${githubRepo}/contents/${FILE_PATH}`, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!fileRes.ok) {
      throw new Error(`Kan words.json niet ophalen van GitHub: ${fileRes.status}`);
    }

    const fileData = await fileRes.json();
    const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const currentWords: WordEntry[] = JSON.parse(currentContent);

    // Add new words and sort by date
    const allWords = [...currentWords, ...newWords];
    allWords.sort((a, b) => a.date.localeCompare(b.date));

    // Commit updated file via GitHub API
    const updatedContent = Buffer.from(
      JSON.stringify(allWords, null, 2) + '\n'
    ).toString('base64');

    const wordNames = newWords.map((w) => w.word).join(', ');
    const commitMessage =
      newWords.length === 1
        ? `Add new word: ${wordNames}`
        : `Add ${newWords.length} new words: ${wordNames}`;

    const commitRes = await fetch(`${GITHUB_API}/repos/${githubRepo}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMessage,
        content: updatedContent,
        sha: fileData.sha,
      }),
    });

    if (!commitRes.ok) {
      const errBody = await commitRes.text();
      throw new Error(`Commit mislukt: ${commitRes.status} — ${errBody}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${newWords.length} woord${newWords.length !== 1 ? 'en' : ''} opgeslagen.`,
        commitMessage,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Onbekende fout';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
