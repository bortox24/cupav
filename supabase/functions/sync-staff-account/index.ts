import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SyncRequest {
  animatoreId: string;
  fullName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callingUser }, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authorization: admin OR access to Anagrafica Staff page
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    let isAuthorized = !!roleData;

    if (!isAuthorized) {
      const { data: hasPage } = await adminClient.rpc('has_page_access', {
        _user_id: callingUser.id,
        _page_path: '/anagrafica-animatori',
      });
      isAuthorized = hasPage === true;
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Forbidden: non hai i permessi per sincronizzare account staff" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { animatoreId, fullName }: SyncRequest = await req.json();

    if (!animatoreId || !fullName || !fullName.trim()) {
      return new Response(
        JSON.stringify({ error: "Campi obbligatori: animatoreId, fullName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanName = fullName.trim();

    // Find staff account linked to this animatore
    const { data: staffAccount, error: saErr } = await adminClient
      .from('staff_accounts')
      .select('user_id')
      .eq('animatore_id', animatoreId)
      .maybeSingle();

    if (saErr) {
      console.error('Error fetching staff_accounts:', saErr);
      return new Response(
        JSON.stringify({ error: "Errore nel recupero dell'account staff" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!staffAccount?.user_id) {
      // No staff account: nothing to sync
      return new Response(
        JSON.stringify({ synced: false, reason: "no_account" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = staffAccount.user_id;

    // Update profiles.full_name
    const { error: profErr } = await adminClient
      .from('profiles')
      .update({ full_name: cleanName })
      .eq('id', userId);
    if (profErr) console.error('Error updating profile:', profErr);

    // Update Auth user_metadata.full_name
    const { error: authUpdErr } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: { full_name: cleanName },
    });
    if (authUpdErr) console.error('Error updating auth metadata:', authUpdErr);

    // Update staff_accounts.full_name
    const { error: saUpdErr } = await adminClient
      .from('staff_accounts')
      .update({ full_name: cleanName })
      .eq('animatore_id', animatoreId);
    if (saUpdErr) console.error('Error updating staff_accounts:', saUpdErr);

    return new Response(
      JSON.stringify({ synced: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
