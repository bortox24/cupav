import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Sei un esperto di email HTML. Genera email HTML complete, responsive e con stili inline.

REGOLE:
- Usa SOLO stili inline (no <style> tag, no CSS esterno)
- Layout responsive con max-width: 600px centrato
- Font: Arial, Helvetica, sans-serif
- Colori branding CUPAV: primario #2563eb (blu), secondario #1e40af, testo #333333, sfondo #f8fafc
- Header con sfondo blu (#2563eb) e testo bianco con scritto "CUPAV - Campeggio Parrocchiale"
- Footer con testo piccolo grigio: "Questa comunicazione è stata inviata da CUPAV"
- Paragrafi ben spaziati, leggibili
- Rispondi SOLO con il codice HTML completo, senza spiegazioni, senza markdown, senza backtick
- L'HTML deve iniziare con <!DOCTYPE html> e finire con </html>
- NON usare immagini esterne
- Ogni rigenerazione deve produrre l'HTML completo, non parziale`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, previousHtml, modifications } = await req.json();

    if (!prompt && !modifications) {
      return new Response(
        JSON.stringify({ error: "prompt o modifications richiesto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY non configurata" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];

    if (previousHtml && modifications) {
      messages.push({
        role: "user",
        content: `Ecco l'HTML email attuale:\n\n${previousHtml}\n\nApplica queste modifiche e restituisci l'HTML completo aggiornato:\n${modifications}`,
      });
    } else {
      messages.push({
        role: "user",
        content: `Genera un'email HTML completa basata su queste indicazioni:\n\n${prompt}`,
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite richieste AI superato, riprova tra poco." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crediti AI esauriti." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Errore nella generazione dell'email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    let html = data.choices?.[0]?.message?.content || "";

    // Clean up potential markdown wrapping
    html = html.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();

    return new Response(
      JSON.stringify({ html }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-email-html error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
