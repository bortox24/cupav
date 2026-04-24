import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const ragazzoCognome = typeof body.ragazzo_cognome === "string" ? body.ragazzo_cognome.trim() : "";
    const ragazzoNome = typeof body.ragazzo_nome === "string" ? body.ragazzo_nome.trim() : "";
    const turno = typeof body.turno === "string" ? body.turno.trim() : "";

    if (!ragazzoCognome || !ragazzoNome || !turno) {
      return jsonResponse({ error: "ragazzo_cognome, ragazzo_nome and turno required" }, 400);
    }

    if (ragazzoCognome.length > 120 || ragazzoNome.length > 120 || turno.length > 80) {
      return jsonResponse({ error: "Input too long" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("iscrizioni")
      .select("created_at, turno, ragazzo_cognome, ragazzo_nome")
      .eq("turno", turno)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (error) throw error;

    const targetCognome = normalizeText(ragazzoCognome);
    const targetNome = normalizeText(ragazzoNome);
    const existing = (data || []).find((row: any) =>
      normalizeText(row.ragazzo_cognome || "") === targetCognome &&
      normalizeText(row.ragazzo_nome || "") === targetNome
    );

    if (!existing) {
      return jsonResponse({ exists: false });
    }

    return jsonResponse({
      exists: true,
      turno: existing.turno,
      created_at: existing.created_at,
    });
  } catch (err) {
    console.error("check-iscrizione-duplicate error:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
