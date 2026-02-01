import type { APIRoute } from 'astro';
import OpenAI from 'openai';

export const POST: APIRoute = async ({ request }) => {
  const { secret, existingWords } = await request.json();

  if (!secret || secret !== import.meta.env.GENERATE_SECRET) {
    return new Response(JSON.stringify({ error: 'Ongeldig wachtwoord.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is niet geconfigureerd.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const openai = new OpenAI({ apiKey });
  const wordList = (existingWords as string[]).join(', ');

  try {
    // Generate a word
    const genResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Je bent een expert in het Vlaams (Belgisch-Nederlands). Genereer een interessant, minder bekend maar bruikbaar Vlaams woord met uitleg en voorbeeldzin. Het woord moet echt bestaan, mooi zijn, en iemands woordenschat verrijken. Het mag een typisch Vlaams woord zijn, een woord uit het Belgisch-Nederlands, of een woord dat vooral in Vlaanderen gebruikt wordt.

Vermijd deze woorden die al bestaan in de lijst: ${wordList}

Antwoord in JSON-formaat: { "word": "...", "explanation": "...", "example": "..." }
- "explanation": een heldere uitleg van het woord in het Vlaams/Belgisch-Nederlands
- "example": een voorbeeldzin in het Vlaams die het woord correct gebruikt`,
        },
        {
          role: 'user',
          content: 'Genereer een mooi Vlaams woord.',
        },
      ],
    });

    const generated = JSON.parse(genResponse.choices[0].message.content!);

    // Verify the word independently
    const verifyResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Je bent een strenge taalkundige met expertise in het Vlaams (Belgisch-Nederlands) die woorden controleert op juistheid.

Je krijgt een woord, uitleg en voorbeeldzin. Controleer:
1. Is dit een echt woord dat in het Vlaams/Belgisch-Nederlands gebruikt wordt?
2. Is de uitleg accuraat?
3. Is de voorbeeldzin grammaticaal correct en wordt het woord juist gebruikt?

Antwoord in JSON-formaat: { "valid": true/false, "reason": "..." }`,
        },
        {
          role: 'user',
          content: JSON.stringify(generated),
        },
      ],
    });

    const verification = JSON.parse(verifyResponse.choices[0].message.content!);

    return new Response(
      JSON.stringify({
        word: generated.word,
        explanation: generated.explanation,
        example: generated.example,
        verification,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Onbekende fout';
    return new Response(JSON.stringify({ error: `Generatie mislukt: ${message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
