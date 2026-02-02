import type { APIRoute } from 'astro';
import OpenAI from 'openai';

export const POST: APIRoute = async ({ request }) => {
  const { secret, existingWords, aantal = 1 } = await request.json();

  if (!secret || secret !== process.env.GENERATE_SECRET) {
    return new Response(JSON.stringify({ error: 'Ongeldig wachtwoord.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is niet geconfigureerd.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const openai = new OpenAI({ apiKey });
  const wordList = (existingWords as string[]).join(', ');
  const count = Math.max(1, Math.min(30, Number(aantal)));

  try {
    // Generate words
    const genResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 1.0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Je bent een expert in het Nederlands met een Vlaamse voorkeur, gespecialiseerd in literair, intellectueel, academisch en juridisch taalgebruik.

Genereer ${count} Nederlandse woorden die:
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
- De output is één JSON-object met een "words" key die een array bevat met exact ${count} objecten
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
          content: `Genereer ${count} gevorderde Nederlandse woorden.`,
        },
      ],
    });

    const genResult = JSON.parse(genResponse.choices[0].message.content!);
    const generatedWords: Array<{ word: string; explanation: string; example: string }> =
      Array.isArray(genResult) ? genResult : genResult.words;

    // Verify each word independently
    const verifiedWords = await Promise.all(
      generatedWords.map(async (generated) => {
        const verifyResponse = await openai.chat.completions.create({
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
              content: JSON.stringify(generated),
            },
          ],
        });

        const verification = JSON.parse(verifyResponse.choices[0].message.content!);
        return {
          word: generated.word,
          explanation: generated.explanation,
          example: generated.example,
          verification,
        };
      })
    );

    return new Response(
      JSON.stringify({ words: verifiedWords }),
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
