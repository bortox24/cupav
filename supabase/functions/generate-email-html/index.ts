import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
- NON usare immagini esterne tranne il logo CUPAV indicato sotto
- Ogni rigenerazione deve produrre l'HTML completo, non parziale

STILE CUPAV (da seguire ESATTAMENTE):
- Sfondo pagina: #f4f4f4 (grigio chiaro)
- Container email: #ffffff con border-radius: 10px e box-shadow: 0 4px 15px rgba(0,0,0,0.1)
- Header: sfondo #f2c10f (giallo ambra), padding 30px, text-align center, border-radius 10px 10px 0 0
  - Logo: <img src="https://lymuvosryafhpeaiqcba.supabase.co/storage/v1/object/public/site-assets/cupav-logo.png" alt="CUPAV Logo" style="width:160px; margin-bottom:15px;">
  - Titolo: "Campeggio Unità Pastorale Altavilla Valmarana" — color #000000, font-size 22px, font-weight bold
  - Sottotitolo: "CUPAV" — color #1a5c2e, font-size 28px, font-weight bold, letter-spacing 3px
- Titoli sezioni: color #1a5c2e (verde scuro), font-size 22px, font-weight bold, border-bottom 2px solid #f2c10f, padding-bottom 10px
- Testo normale: color #444444, font-size 15px, line-height 1.6
- Box informativi (attenzione/info): sfondo #fff8e1, bordo sinistro 4px solid #f2c10f, border-radius 8px, padding 15px 20px
- Box "prossimi passi" o azioni: sfondo #e8f5e9, bordo sinistro 4px solid #1a5c2e, border-radius 8px, padding 15px 20px
- Tabelle riepilogo: width 100%, border-collapse collapse
  - Header tabella: sfondo #1a5c2e, testo bianco, font-size 14px, padding 12px 15px
  - Righe pari: sfondo #f9f9f9
  - Righe dispari: sfondo #eeeeee
  - Celle: padding 10px 15px, bordo 1px solid #e0e0e0, font-size 14px, color #333333
- Sezione contatti: text-align center, padding 25px
  - Testo: "Per qualsiasi informazione contattaci a"
  - Link email: cupavdirettivo@gmail.com con color #1a5c2e, font-weight bold
- Chiusura: messaggio positivo centrato con emoji (⛺🌿)
- Footer: sfondo #1a5c2e (verde scuro), padding 25px, text-align center, border-radius 0 0 10px 10px
  - Titolo footer: color #ffffff, font-size 14px, font-weight bold
  - Testo footer: color #c8e6c9, font-size 11px
  - Link footer: color #a5d6a7

CAMPI DINAMICI - FONDAMENTALE:
L'email DEVE contenere segnaposto dinamici per personalizzare ogni messaggio. Usa ESATTAMENTE questi segnaposto:
- {{nome_ragazzo}} — nome completo del ragazzo/a (es: "Marco Rossi")
- {{nome_ragazzo_breve}} — solo il nome di battesimo del ragazzo/a (es: "Marco")
- {{nome_genitore}} — nome completo del primo genitore (es: "Giuseppe Rossi")
- {{turno}} — il turno di iscrizione (es: "1^ Media")
- {{numero}} — il numero assegnato al ragazzo (es: "42")

Usa questi segnaposto nel testo dove ha senso per rendere l'email personale e non generica.
NON tutti i campi devono essere usati per forza, usa quelli che hanno senso nel contesto del messaggio.

STRUTTURA EMAIL DI RIFERIMENTO:
1. Header con logo CUPAV (sfondo giallo #f2c10f)
2. Sezione principale con titolo (verde #1a5c2e con bordo inferiore giallo) e corpo del messaggio
3. Eventuali box riepilogo con tabella (header verde, righe alternate grigie)
4. Eventuali box informativi (sfondo giallo chiaro con bordo giallo, oppure sfondo verde chiaro con bordo verde)
5. Sezione contatti centrata con link email
6. Messaggio di chiusura positivo con emoji
7. Footer verde scuro con "CUPAV — Campeggio Unità Pastorale Altavilla Valmarana" e nota "email automatica"

Adatta la struttura in base al tipo di comunicazione richiesta dall'utente.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authErr } = await supa.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
