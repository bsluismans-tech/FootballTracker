export interface Env {
  AI: Ai;
}

// Cloudflare Workers AI: geen externe API-key/account nodig, gratis 10.000 "neurons"/dag,
// draait op Cloudflare's eigen netwerk (via de "ai"-binding in wrangler.jsonc).
const MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

// Enkel de eigen app mag deze Worker aanroepen. Staat de aanvragende Origin er niet bij,
// dan geven we een niet-matchend Origin-header terug — de browser blokkeert de aanroep dan
// zelf (curl/server-naar-server calls negeren CORS toch, dus die blijven werken).
const ALLOWED_ORIGINS = [
  'https://football-tracker-c0635.web.app',
  'https://football-tracker-c0635.firebaseapp.com',
  'http://localhost:5173',
];

function corsHeaders(origin: string | null): HeadersInit {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(origin) });
    }

    try {
      const body = (await request.json()) as { prompt?: string };
      const prompt = body?.prompt;
      if (!prompt || typeof prompt !== 'string') {
        return new Response(JSON.stringify({ error: 'Body moet { "prompt": "..." } bevatten' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      }

      const result = (await env.AI.run(MODEL, {
        messages: [{ role: 'user', content: prompt }],
      })) as any;

      // Verschillende Workers AI-modellen geven de tekst in een net iets ander veld terug —
      // beide gekende vormen afvangen, en anders de ruwe respons meesturen voor debugging.
      const text = result?.response ?? result?.choices?.[0]?.message?.content ?? null;

      return new Response(JSON.stringify({ text, raw: text ? undefined : result }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }
  },
};
