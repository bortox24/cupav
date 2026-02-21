import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get webhook URL specifically for payment reminders
    const { data, error } = await supabase
      .from("webhook_config")
      .select("webhook_url")
      .eq("descrizione", "Webhook reminder pagamento")
      .limit(1)
      .single();

    if (error || !data?.webhook_url) {
      console.log("No payment reminder webhook URL configured, skipping.");
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "no_webhook_url" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhookUrl = data.webhook_url.trim();
    if (!webhookUrl) {
      console.log("Payment reminder webhook URL is empty, skipping.");
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "empty_webhook_url" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log(`Payment reminder webhook response: ${resp.status}`);
    } catch (webhookError) {
      console.error("Payment reminder webhook call failed:", webhookError);
      return new Response(JSON.stringify({ ok: false, error: "webhook_call_failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in notify-pagamento-reminder:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
