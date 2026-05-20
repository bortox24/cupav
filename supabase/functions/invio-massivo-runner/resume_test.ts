// Test runner: trigger resume on the prepared dry-run job using SERVICE_ROLE_KEY from env.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.test("resume kicks off runner (dry-run job)", async () => {
  assert(SUPABASE_URL, "missing SUPABASE_URL");
  assert(SERVICE, "missing SUPABASE_SERVICE_ROLE_KEY");
  const jobId = Deno.env.get("TEST_JOB_ID") || "8f810766-9ce2-4985-8eea-b19a6695ad29";
  const res = await fetch(`${SUPABASE_URL}/functions/v1/invio-massivo-runner`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-runner-secret": SERVICE,
      "Authorization": `Bearer ${SERVICE}`,
    },
    body: JSON.stringify({ action: "resume", job_id: jobId }),
  });
  const txt = await res.text();
  console.log("status", res.status, "body", txt);
  assert(res.status === 202 || res.status === 200, `expected 2xx, got ${res.status}: ${txt}`);
});
