import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { ragazzo_id } = await req.json();

    // Fetch ragazzo
    const { data: ragazzo, error: rErr } = await supabase
      .from("ragazzi")
      .select("*")
      .eq("id", ragazzo_id)
      .single();
    if (rErr || !ragazzo) throw new Error("Ragazzo non trovato");

    // Fetch existing genitori
    const { data: genitori = [] } = await supabase
      .from("ragazzi_genitori")
      .select("*")
      .eq("ragazzo_id", ragazzo_id);

    // Fetch iscrizioni matching this ragazzo by name
    const nameParts = ragazzo.full_name.trim().split(/\s+/);

    const { data: iscrizioni = [] } = await supabase
      .from("iscrizioni")
      .select("*")
      .or(
        nameParts.length >= 2
          ? `and(ragazzo_nome.ilike.%${nameParts[0]}%,ragazzo_cognome.ilike.%${nameParts[nameParts.length - 1]}%),and(ragazzo_nome.ilike.%${nameParts[nameParts.length - 1]}%,ragazzo_cognome.ilike.%${nameParts[0]}%)`
          : `ragazzo_nome.ilike.%${nameParts[0]}%`
      );

    if (!iscrizioni || iscrizioni.length === 0) {
      return new Response(JSON.stringify({ message: "Nessuna iscrizione trovata per questo ragazzo", enriched: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Enrich medical data directly (no AI needed) ---
    // Take the most recent iscrizione with medical data
    const iscrizioneConDatiMedici = iscrizioni
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .find((i: any) => i.ha_allergie || i.allergie_dettaglio || i.patologie_dettaglio || i.farmaco_1_nome);

    const medicalUpdate: Record<string, any> = {};
    if (iscrizioneConDatiMedici) {
      medicalUpdate.ha_allergie = iscrizioneConDatiMedici.ha_allergie || false;
      if (iscrizioneConDatiMedici.allergie_dettaglio) medicalUpdate.allergie_dettaglio = iscrizioneConDatiMedici.allergie_dettaglio;
      if (iscrizioneConDatiMedici.patologie_dettaglio) medicalUpdate.patologie_dettaglio = iscrizioneConDatiMedici.patologie_dettaglio;
      if (iscrizioneConDatiMedici.farmaco_1_nome) medicalUpdate.farmaco_1_nome = iscrizioneConDatiMedici.farmaco_1_nome;
      if (iscrizioneConDatiMedici.farmaco_1_posologia) medicalUpdate.farmaco_1_posologia = iscrizioneConDatiMedici.farmaco_1_posologia;
      if (iscrizioneConDatiMedici.farmaco_2_nome) medicalUpdate.farmaco_2_nome = iscrizioneConDatiMedici.farmaco_2_nome;
      if (iscrizioneConDatiMedici.farmaco_2_posologia) medicalUpdate.farmaco_2_posologia = iscrizioneConDatiMedici.farmaco_2_posologia;
      if (iscrizioneConDatiMedici.farmaco_3_nome) medicalUpdate.farmaco_3_nome = iscrizioneConDatiMedici.farmaco_3_nome;
      if (iscrizioneConDatiMedici.farmaco_3_posologia) medicalUpdate.farmaco_3_posologia = iscrizioneConDatiMedici.farmaco_3_posologia;
    }

    // Update ragazzi medical fields
    if (Object.keys(medicalUpdate).length > 0) {
      await supabase.from("ragazzi").update(medicalUpdate).eq("id", ragazzo_id);
    }

    // --- Enrich parent data with AI ---
    const existingData = genitori.map((g: any) => ({
      nome_cognome: g.nome_cognome,
      ruolo: g.ruolo,
      email: g.email,
      telefono: g.telefono,
    }));

    const iscrizioniData = iscrizioni.map((i: any) => ({
      genitore: `${i.genitore_nome} ${i.genitore_cognome}`,
      email: i.email,
      telefono: i.recapiti_telefonici,
    }));

    const prompt = `Sei un assistente che unifica dati genitori di ragazzi.

Dati genitori esistenti nell'anagrafica:
${JSON.stringify(existingData, null, 2)}

Dati dalle iscrizioni formali:
${JSON.stringify(iscrizioniData, null, 2)}

Unifica questi dati riconoscendo che "Mario Rossi" e "Rossi Mario" sono la stessa persona.
Combina email e telefoni trovati.
Se un genitore non ha un ruolo assegnato, usa "Genitore".`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You merge parent data, deduplicating by name (handle reversed first/last names). Return structured data." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "update_genitori",
              description: "Update parent records with merged, deduplicated data",
              parameters: {
                type: "object",
                properties: {
                  genitori: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome_cognome: { type: "string" },
                        ruolo: { type: "string", enum: ["Madre", "Padre", "Tutore", "Genitore"] },
                        email: { type: "string" },
                        telefono: { type: "string" },
                      },
                      required: ["nome_cognome", "ruolo"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["genitori"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "update_genitori" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Troppi tentativi, riprova tra poco." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + status);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const merged = JSON.parse(toolCall.function.arguments);
    const newGenitori = merged.genitori || [];

    // Delete existing genitori and insert new ones
    await supabase.from("ragazzi_genitori").delete().eq("ragazzo_id", ragazzo_id);

    if (newGenitori.length > 0) {
      const { error: insertErr } = await supabase.from("ragazzi_genitori").insert(
        newGenitori.map((g: any) => ({
          ragazzo_id,
          nome_cognome: g.nome_cognome,
          ruolo: g.ruolo,
          email: g.email || null,
          telefono: g.telefono || null,
        }))
      );
      if (insertErr) throw insertErr;
    }

    return new Response(JSON.stringify({
      message: "Dati arricchiti con successo",
      enriched: true,
      genitori: newGenitori,
      medical_updated: Object.keys(medicalUpdate).length > 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-anagrafica error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
