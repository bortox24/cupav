import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildEmailHtml } from "./_email_template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-runner-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SELF_URL = `${SUPABASE_URL}/functions/v1/invio-massivo-runner`;

const MAX_RUN_MS = 20 * 60 * 1000; // 20 min, sotto al limite Edge Function
const FIXED_WEBHOOK_DESCRIZIONE = "Invio comunicazione custom";

const admin = () =>
  createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// --- Auth helper: verifica utente + permesso pagina ---
async function verifyUser(authHeader: string | null): Promise<
  { userId: string; userName: string; userEmail: string } | null
> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const supa = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supa.auth.getUser(token);
  if (error || !data?.user) return null;
  const userId = data.user.id;

  const a = admin();
  const [{ data: isAdmin }, { data: hasPage }, { data: profile }] = await Promise.all([
    a.rpc("has_role", { _user_id: userId, _role: "admin" }),
    a.rpc("has_page_access", { _user_id: userId, _page_path: "/anagrafica-ragazzi" }),
    a.from("profiles").select("full_name,email").eq("id", userId).maybeSingle(),
  ]);
  if (!isAdmin && !hasPage) return null;
  return {
    userId,
    userName: profile?.full_name || profile?.email || "Utente",
    userEmail: profile?.email || data.user.email || "",
  };
}

// --- START ---
async function handleStart(req: Request) {
  const auth = await verifyUser(req.headers.get("Authorization"));
  if (!auth) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const {
    titolo, testo, ctaLabel, ctaUrl,
    ragazzi_ids, filtri,
  } = body;

  // Validazione
  if (!titolo?.trim() || !testo?.trim()) return json({ error: "Titolo e testo obbligatori" }, 400);
  if (titolo.length > 200 || testo.length > 5000) return json({ error: "Lunghezza non valida" }, 400);
  const ctaL = (ctaLabel || "").trim();
  const ctaU = (ctaUrl || "").trim();
  if ((ctaL.length > 0) !== (ctaU.length > 0)) return json({ error: "CTA incompleta" }, 400);
  if (ctaU && !/^https?:\/\//i.test(ctaU)) return json({ error: "CTA URL non valido" }, 400);
  if (!Array.isArray(ragazzi_ids) || ragazzi_ids.length === 0) return json({ error: "Nessun destinatario" }, 400);
  if (ragazzi_ids.length > 2000) return json({ error: "Troppi destinatari (max 2000)" }, 400);

  const interval = 30;

  const a = admin();

  // Mutex: nessun job in corso per questo utente
  const { data: active } = await a
    .from("invio_massivo_jobs")
    .select("id,stato")
    .eq("created_by", auth.userId)
    .in("stato", ["queued", "running"])
    .limit(1);
  if (active && active.length > 0) {
    return json({ error: "Hai già un invio in corso", existing_job_id: active[0].id }, 409);
  }

  // Webhook fisso: 'Invio comunicazione custom'
  const { data: webhook, error: whErr } = await a
    .from("webhook_config").select("*").eq("descrizione", FIXED_WEBHOOK_DESCRIZIONE).maybeSingle();
  if (whErr || !webhook) return json({ error: `Webhook '${FIXED_WEBHOOK_DESCRIZIONE}' non configurato` }, 400);

  // Carica ragazzi (server-side, no fidarsi del client)
  const { data: ragazzi, error: rErr } = await a
    .from("ragazzi")
    .select("id, full_name, data_nascita, residente_altavilla, numero, archiviato")
    .in("id", ragazzi_ids);
  if (rErr) return json({ error: "Errore caricamento ragazzi", detail: rErr.message }, 500);
  const validRagazzi = (ragazzi || []).filter((r) => !r.archiviato);
  if (validRagazzi.length === 0) return json({ error: "Nessun ragazzo valido" }, 400);

  // Genitori + iscrizioni
  const ids = validRagazzi.map((r) => r.id);
  const [{ data: genitori }, { data: iscrizioni }] = await Promise.all([
    a.from("ragazzi_genitori").select("*").in("ragazzo_id", ids),
    a.from("ragazzi_iscrizioni").select("*").in("ragazzo_id", ids),
  ]);

  // Crea job
  const { data: job, error: jobErr } = await a
    .from("invio_massivo_jobs")
    .insert({
      created_by: auth.userId,
      created_by_nome: auth.userName,
      titolo: titolo.trim(),
      testo,
      cta_label: ctaL || null,
      cta_url: ctaU || null,
      webhook_id: webhook.id,
      webhook_url: webhook.webhook_url,
      webhook_descrizione: webhook.descrizione || null,
      filtri: filtri || {},
      dry_run: false,
      send_interval_seconds: interval,
      stato: "queued",
      totale: validRagazzi.length,
      last_heartbeat_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (jobErr || !job) return json({ error: "Errore creazione job", detail: jobErr?.message }, 500);

  // Crea items (ordina per full_name)
  const sorted = [...validRagazzi].sort((x, y) => (x.full_name || "").localeCompare(y.full_name || ""));
  const items = sorted.map((r, idx) => {
    const gens = (genitori || []).filter((g: any) => g.ragazzo_id === r.id);
    const iscr = (iscrizioni || []).filter((i: any) => i.ragazzo_id === r.id);
    const genitoreNome = gens[0]?.nome_cognome || "Genitore";
    return {
      job_id: job.id,
      position: idx,
      ragazzo_id: r.id,
      ragazzo_full_name: r.full_name,
      genitore_nome: genitoreNome,
      payload: {
        full_name: r.full_name,
        data_nascita: r.data_nascita,
        residente_altavilla: r.residente_altavilla,
        numero: r.numero,
        genitori: gens,
        iscrizioni: iscr,
      },
    };
  });

  // Insert in batch da 500
  for (let i = 0; i < items.length; i += 500) {
    const chunk = items.slice(i, i + 500);
    const { error } = await a.from("invio_massivo_job_items").insert(chunk);
    if (error) {
      await a.from("invio_massivo_jobs").update({
        stato: "failed",
        error_message: `Errore creazione items: ${error.message}`,
        finished_at: new Date().toISOString(),
      }).eq("id", job.id);
      return json({ error: "Errore creazione items", detail: error.message }, 500);
    }
  }

  // Avvia background
  // @ts-ignore — EdgeRuntime is provided
  EdgeRuntime.waitUntil(runJob(job.id));

  return json({ job_id: job.id, totale: validRagazzi.length }, 202);
}

// --- ABORT ---
async function handleAbort(req: Request) {
  const auth = await verifyUser(req.headers.get("Authorization"));
  if (!auth) return json({ error: "Unauthorized" }, 401);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const jobId = body.job_id;
  if (!jobId) return json({ error: "job_id richiesto" }, 400);

  const a = admin();
  const { data: job } = await a.from("invio_massivo_jobs")
    .select("id,created_by,stato").eq("id", jobId).maybeSingle();
  if (!job) return json({ error: "Job non trovato" }, 404);
  if (job.created_by !== auth.userId) {
    const { data: isAdmin } = await a.rpc("has_role", { _user_id: auth.userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);
  }
  await a.from("invio_massivo_jobs").update({ abort_requested: true }).eq("id", jobId);
  return json({ ok: true });
}

// --- RESUME (self / cron / service-role) ---
async function handleResume(req: Request) {
  const secret = req.headers.get("x-runner-secret");
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let isAuthorized = secret === SERVICE_ROLE_KEY || bearer === SERVICE_ROLE_KEY;
  if (!isAuthorized && bearer) {
    try {
      const parts = bearer.split(".");
      if (parts.length === 3) {
        const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const pad = b64 + "=".repeat((4 - b64.length % 4) % 4);
        const c = JSON.parse(atob(pad));
        if (c?.role === "service_role") isAuthorized = true;
      }
    } catch (_) { /* ignore */ }
  }
  if (!isAuthorized) return json({ error: "Forbidden" }, 403);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const jobId = body.job_id;
  if (!jobId) return json({ error: "job_id richiesto" }, 400);

  // @ts-ignore
  EdgeRuntime.waitUntil(runJob(jobId));
  return json({ ok: true, resumed: jobId }, 202);
}

// --- runJob: ciclo principale ---
async function runJob(jobId: string) {
  const a = admin();
  const startTs = Date.now();
  const deadline = startTs + MAX_RUN_MS;

  try {
    // Carica job
    const { data: job } = await a.from("invio_massivo_jobs").select("*").eq("id", jobId).maybeSingle();
    if (!job) { console.error("runJob: job non trovato", jobId); return; }
    if (job.stato === "completed" || job.stato === "aborted" || job.stato === "failed") {
      console.log("runJob: job già terminato", jobId, job.stato);
      return;
    }

    await a.from("invio_massivo_jobs").update({
      stato: "running",
      started_at: job.started_at || new Date().toISOString(),
      last_heartbeat_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", jobId);

    const intervalMs = (job.send_interval_seconds || 30) * 1000;

    while (true) {
      // refetch job per abort + dati aggiornati
      const { data: cur } = await a.from("invio_massivo_jobs").select("*").eq("id", jobId).maybeSingle();
      if (!cur) return;
      if (cur.abort_requested) {
        await a.from("invio_massivo_jobs").update({
          stato: "aborted", finished_at: new Date().toISOString(),
        }).eq("id", jobId);
        console.log("runJob: aborted", jobId);
        return;
      }

      // Prendi prossimo pending
      const { data: nextItems } = await a.from("invio_massivo_job_items")
        .select("*").eq("job_id", jobId).eq("stato", "pending")
        .order("position", { ascending: true }).limit(1);
      const item = nextItems?.[0];
      if (!item) {
        await a.from("invio_massivo_jobs").update({
          stato: "completed", finished_at: new Date().toISOString(),
          last_heartbeat_at: new Date().toISOString(),
        }).eq("id", jobId);
        console.log("runJob: completed", jobId);
        return;
      }

      // Auto-chain se manca tempo per il prossimo invio + sleep
      if (Date.now() + intervalMs + 5000 > deadline) {
        console.log("runJob: chaining (deadline)", jobId);
        await a.from("invio_massivo_jobs").update({
          last_heartbeat_at: new Date().toISOString(),
        }).eq("id", jobId);
        await fetch(SELF_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-runner-secret": SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ action: "resume", job_id: jobId }),
        }).catch((e) => console.error("chain fetch err", e));
        return;
      }

      // Mark sending
      await a.from("invio_massivo_job_items").update({ stato: "sending" }).eq("id", item.id);

      const html = buildEmailHtml(cur.titolo, cur.testo, item.genitore_nome, cur.cta_label || undefined, cur.cta_url || undefined);
      let success = false;
      let errMsg = "";

      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 25000);
        const res = await fetch(cur.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titolo: cur.titolo,
            testo: cur.testo,
            cta_label: cur.cta_label,
            cta_url: cur.cta_url,
            html,
            html_content: html,
            ragazzo_id: item.ragazzo_id,
            full_name: item.payload?.full_name,
            data_nascita: item.payload?.data_nascita,
            residente_altavilla: item.payload?.residente_altavilla,
            genitori: item.payload?.genitori,
            iscrizioni: item.payload?.iscrizioni,
            numero: item.payload?.numero,
          }),
          signal: ctrl.signal,
        });
        clearTimeout(to);
        success = res.ok;
        if (!success) errMsg = `HTTP ${res.status}`;
      } catch (e: any) {
        errMsg = e?.message || "Errore di rete";
      }

      // Update item + counters + log
      await a.from("invio_massivo_job_items").update({
        stato: success ? "sent" : "error",
        error_message: success ? null : errMsg,
        sent_at: new Date().toISOString(),
      }).eq("id", item.id);

      const incField = success ? "inviati" : "falliti";
      await a.from("invio_massivo_jobs").update({
        [incField]: (cur as any)[incField] + 1,
        current_index: item.position + 1,
        last_heartbeat_at: new Date().toISOString(),
      } as any).eq("id", jobId);

      // Log
      const dettaglio = `Webhook: ${cur.webhook_descrizione || "webhook"} — Titolo: ${cur.titolo} — ${(cur.testo || "").slice(0, 150)}${errMsg ? ` — ${errMsg}` : ""}`;
      await a.from("anagrafica_invio_logs").insert({
        ragazzo_id: item.ragazzo_id,
        inviato_da: cur.created_by,
        inviato_da_nome: cur.created_by_nome,
        successo: success,
        tipo: "invio_massivo",
        dettaglio,
      });

      // Pausa, ma controllando abort/deadline
      const { count: remaining } = await a.from("invio_massivo_job_items")
        .select("id", { count: "exact", head: true })
        .eq("job_id", jobId).eq("stato", "pending");
      if ((remaining || 0) === 0) {
        await a.from("invio_massivo_jobs").update({
          stato: "completed", finished_at: new Date().toISOString(),
          last_heartbeat_at: new Date().toISOString(),
        }).eq("id", jobId);
        return;
      }

      // Sleep frazionato per reattività all'abort
      const sleepEnd = Date.now() + intervalMs;
      while (Date.now() < sleepEnd) {
        const slice = Math.min(2000, sleepEnd - Date.now());
        await sleep(slice);
        const { data: chk } = await a.from("invio_massivo_jobs")
          .select("abort_requested").eq("id", jobId).maybeSingle();
        if (chk?.abort_requested) break;
        // heartbeat ogni ciclo
        await a.from("invio_massivo_jobs").update({
          last_heartbeat_at: new Date().toISOString(),
        }).eq("id", jobId);
      }
    }
  } catch (e: any) {
    console.error("runJob fatal", jobId, e);
    await admin().from("invio_massivo_jobs").update({
      stato: "failed",
      error_message: e?.message || "Errore sconosciuto",
      finished_at: new Date().toISOString(),
    }).eq("id", jobId);
  }
}

// --- Router ---
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    let action = url.searchParams.get("action") || "";
    if (!action && req.method === "POST") {
      const clone = req.clone();
      try {
        const b = await clone.json();
        action = b?.action || "";
        return await routeAction(action, req);
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
    }
    return await routeAction(action, req);
  } catch (e: any) {
    console.error("router err", e);
    return json({ error: e?.message || "Server error" }, 500);
  }
});

async function routeAction(action: string, req: Request): Promise<Response> {
  switch (action) {
    case "start": return await handleStart(req);
    case "abort": return await handleAbort(req);
    case "resume": return await handleResume(req);
    case "watchdog": return await handleWatchdog();
    default: return json({ error: `Azione sconosciuta: ${action}` }, 400);
  }
}

// --- WATCHDOG: ripristina job rimasti senza heartbeat ---
async function handleWatchdog(): Promise<Response> {
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  const { data: stuck } = await supa
    .from("invio_massivo_jobs")
    .select("id, stato, last_heartbeat_at")
    .in("stato", ["queued", "running"])
    .or(`last_heartbeat_at.is.null,last_heartbeat_at.lt.${cutoff}`)
    .limit(10);
  const resumed: string[] = [];
  for (const j of (stuck ?? [])) {
    // @ts-ignore
    EdgeRuntime.waitUntil(runJob((j as any).id));
    resumed.push((j as any).id);
  }
  return json({ ok: true, resumed });
}
