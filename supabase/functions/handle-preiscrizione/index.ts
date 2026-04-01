import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action } = body;

    // Action 1: Check duplicate for current year
    if (action === "check-duplicate") {
      const { full_name, anno } = body;
      if (!full_name || !anno) {
        return new Response(JSON.stringify({ error: "full_name and anno required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabase
        .from("ragazzi")
        .select("id, full_name")
        .ilike("full_name", full_name.trim());

      if (existing && existing.length > 0) {
        for (const rag of existing) {
          const { data: iscr } = await supabase
            .from("ragazzi_iscrizioni")
            .select("id")
            .eq("ragazzo_id", rag.id)
            .eq("anno", anno)
            .limit(1);
          if (iscr && iscr.length > 0) {
            return new Response(JSON.stringify({ exists: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      return new Response(JSON.stringify({ exists: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action 2: Full preiscrizione submission
    if (action === "submit") {
      const { fullName, dataNascita, turno, residenteAltavilla, genitore1, genitore2 } = body;

      if (!fullName || !dataNascita || !turno || residenteAltavilla === undefined || !genitore1) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if ragazzo already exists
      const { data: existing } = await supabase
        .from("ragazzi")
        .select("id")
        .ilike("full_name", fullName.trim())
        .maybeSingle();

      let ragazzoId: string;

      if (existing) {
        ragazzoId = existing.id;
        await supabase
          .from("ragazzi")
          .update({ data_nascita: dataNascita, residente_altavilla: residenteAltavilla })
          .eq("id", ragazzoId);
      } else {
        const { data: newRag, error: insertErr } = await supabase
          .from("ragazzi")
          .insert({
            full_name: fullName.trim(),
            data_nascita: dataNascita,
            residente_altavilla: residenteAltavilla,
          })
          .select("id")
          .single();
        if (insertErr) throw insertErr;
        ragazzoId = newRag.id;
      }

      // Replace genitori
      if (existing) {
        await supabase.from("ragazzi_genitori").delete().eq("ragazzo_id", ragazzoId);
      }

      const genitoriToInsert = [
        {
          ragazzo_id: ragazzoId,
          nome_cognome: genitore1.nomeCognome,
          ruolo: genitore1.ruolo,
          email: genitore1.email,
          telefono: genitore1.telefono,
        },
      ];

      if (genitore2?.nomeCognome) {
        genitoriToInsert.push({
          ragazzo_id: ragazzoId,
          nome_cognome: genitore2.nomeCognome,
          ruolo: genitore2.ruolo,
          email: genitore2.email,
          telefono: genitore2.telefono,
        });
      }

      const { error: gErr } = await supabase.from("ragazzi_genitori").insert(genitoriToInsert);
      if (gErr) throw gErr;

      // Handle iscrizione
      const anno = new Date().getFullYear();
      const { data: existingIscr } = await supabase
        .from("ragazzi_iscrizioni")
        .select("id")
        .eq("ragazzo_id", ragazzoId)
        .eq("anno", anno)
        .maybeSingle();

      if (existingIscr) {
        await supabase.from("ragazzi_iscrizioni").update({ turno }).eq("id", existingIscr.id);
      } else {
        const { error: iErr } = await supabase
          .from("ragazzi_iscrizioni")
          .insert({ ragazzo_id: ragazzoId, anno, turno });
        if (iErr) throw iErr;
      }

      return new Response(JSON.stringify({ success: true, ragazzoId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("handle-preiscrizione error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
