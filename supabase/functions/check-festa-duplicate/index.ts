import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!rawEmail || rawEmail.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return jsonResponse({ error: "Valid email required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("festa_campeggio")
      .select("email, num_adulti, num_ragazzi, num_staff");

    if (error) throw error;

    const matches = (data || []).filter(
      (row: any) => (row.email || "").trim().toLowerCase() === rawEmail
    );

    if (matches.length === 0) {
      return jsonResponse({ exists: false });
    }

    // Solo dati aggregati: nessun nome, cognome o altro dato personale.
    const num_adulti = matches.reduce((s: number, r: any) => s + (r.num_adulti || 0), 0);
    const num_ragazzi = matches.reduce((s: number, r: any) => s + (r.num_ragazzi || 0), 0);
    const num_staff = matches.reduce((s: number, r: any) => s + (r.num_staff || 0), 0);

    return jsonResponse({ exists: true, num_adulti, num_ragazzi, num_staff });
  } catch (err) {
    console.error("check-festa-duplicate error:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
