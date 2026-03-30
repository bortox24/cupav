import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Sei un esperto di email HTML per il CUPAV (Campeggio Unità Pastorale Altavilla Valmarana).
Genera email HTML complete, responsive e con stili inline seguendo ESATTAMENTE questa struttura e stile.

REGOLE TECNICHE:
- Usa SOLO stili inline (no <style> tag, no CSS esterno)
- Layout responsive con max-width: 600px centrato
- Font: Arial, Helvetica, sans-serif
- Rispondi SOLO con il codice HTML completo, senza spiegazioni, senza markdown, senza backtick
- L'HTML deve iniziare con <!DOCTYPE html> e finire con </html>
- NON usare immagini esterne
- Ogni rigenerazione deve produrre l'HTML completo, non parziale

STILE CUPAV (da seguire sempre):
- Sfondo pagina: #f0fdf4 (verde chiaro)
- Container email: #ffffff con border-radius: 16px e box-shadow
- Header: sfondo gradiente verde (#166534 → #15803d) con testo bianco, titolo "Campeggio Unità Pastorale Altavilla Valmarana" e sottotitolo "CUPAV"
- Titoli sezioni: colore #166534 (verde scuro), font-size 22px, font-weight bold
- Testo normale: colore #374151, font-size 15px, line-height 1.7
- Box informativi: sfondo #f0fdf4, bordo sinistro 4px solid #22c55e, border-radius 12px, padding 20px
- Tabelle riepilogo: sfondo header #166534 con testo bianco, righe alternate #f9fafb e bianco
- Box avviso/attenzione: sfondo #fffbeb, bordo sinistro 4px solid #f59e0b
- Footer: sfondo #f9fafb, testo #6b7280, font-size 12px
- Email di contatto: cupavdirettivo@gmail.com, colore link #1a5c2e
- Chiusura con messaggio positivo e emoji (⛺🌿)

CAMPI DINAMICI - FONDAMENTALE:
L'email DEVE contenere segnaposto dinamici per personalizzare ogni messaggio. Usa ESATTAMENTE questi segnaposto:
- {{nome_ragazzo}} — nome completo del ragazzo/a (es: "Marco Rossi")
- {{nome_ragazzo_breve}} — solo il nome di battesimo del ragazzo/a (es: "Marco")
- {{nome_genitore}} — nome completo del primo genitore (es: "Giuseppe Rossi")
- {{turno}} — il turno di iscrizione (es: "1^ Media")
- {{numero}} — il numero assegnato al ragazzo (es: "42")

Usa questi segnaposto nel testo dove ha senso per rendere l'email personale e non generica.
Ad esempio: "Gentile {{nome_genitore}}, ..." oppure "...la preiscrizione di {{nome_ragazzo}}..."
NON tutti i campi devono essere usati per forza, usa quelli che hanno senso nel contesto del messaggio.

STRUTTURA EMAIL DI RIFERIMENTO:
1. Header con logo testuale CUPAV (sfondo verde gradiente)
2. Sezione principale con titolo e corpo del messaggio
3. Eventuali box riepilogo con tabella (se applicabile)
4. Eventuali box informativi con icone emoji
5. Sezione contatti
6. Footer con nota "email automatica"

Adatta la struttura in base al tipo di comunicazione richiesta dall'utente.`;

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
