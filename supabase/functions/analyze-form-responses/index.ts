import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formName, schema, aggregatedData, totalResponses } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build a descriptive prompt
    const schemaDescription = schema
      .map((f: { label: string; type: string; options?: string[] }) => {
        let desc = `- ${f.label} (${f.type})`;
        if (f.options) desc += `: opzioni [${f.options.join(', ')}]`;
        return desc;
      })
      .join('\n');

    const dataDescription = Object.entries(aggregatedData)
      .map(([label, value]) => {
        if (typeof value === 'object' && value !== null) {
          if ('min' in value) {
            const numValue = value as { min: number; max: number; avg: string; count: number };
            return `- ${label}: min=${numValue.min}, max=${numValue.max}, media=${numValue.avg}, risposte=${numValue.count}`;
          }
          if ('totalDates' in value) {
            const dateValue = value as { totalDates: number };
            return `- ${label}: ${dateValue.totalDates} date registrate`;
          }
          // Distribution
          const dist = value as Record<string, number>;
          const items = Object.entries(dist)
            .sort(([, a], [, b]) => b - a)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          return `- ${label}: ${items}`;
        }
        return `- ${label}: ${value}`;
      })
      .join('\n');

    const prompt = `Sei un analista di dati. Analizza le risposte del modulo "${formName}" e fornisci insights utili in italiano.

STRUTTURA DEL MODULO:
${schemaDescription}

DATI AGGREGATI (${totalResponses} risposte totali):
${dataDescription}

Fornisci un'analisi concisa (max 200 parole) che includa:
1. Osservazioni principali sui dati
2. Tendenze o pattern rilevanti
3. Eventuali suggerimenti basati sui dati

Usa un tono professionale ma accessibile. Non usare markdown, solo testo semplice con elenchi puntati dove utile.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || 'Nessuna analisi disponibile.';

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-form-responses:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
