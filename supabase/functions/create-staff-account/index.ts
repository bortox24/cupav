import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generatePassword(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

interface CreateStaffRequest {
  email: string;
  fullName: string;
  turni: string[];
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

    // Verify caller is admin
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

    const { email, fullName, turni }: CreateStaffRequest = await req.json();

    if (!email || !fullName || !turni || turni.length === 0) {
      return new Response(
        JSON.stringify({ error: "Campi obbligatori: email, fullName, turni" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const password = generatePassword(8);

    // Check if user with this email already exists in auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: `Un account con l'email ${email} esiste già. Non è possibile ricrearlo da qui.` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userData?.user) {
      return new Response(
        JSON.stringify({ error: "User creation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // Insert turno_permessi for each turno
    const permRows = turni.map((turno) => ({
      user_id: userId,
      turno,
      assegnato_da: callingUser.id,
    }));

    const { error: permError } = await adminClient
      .from('turno_permessi')
      .insert(permRows);

    if (permError) {
      console.error('Error inserting turno_permessi:', permError);
      // Rollback: delete user
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Errore nell'assegnazione dei permessi turno" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read default pages from site_settings
    let defaultPages: string[] = ['/home'];
    const { data: settingRow } = await adminClient
      .from('site_settings')
      .select('value')
      .eq('key', 'staff_default_pages')
      .maybeSingle();

    if (settingRow?.value) {
      try {
        const parsed = JSON.parse(settingRow.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          defaultPages = parsed.includes('/home') ? parsed : ['/home', ...parsed];
        }
      } catch {
        // Keep default ['/home']
      }
    }

    // Grant access to all default pages
    const pagePermRows = defaultPages.map((pagePath: string) => ({
      user_id: userId,
      page_path: pagePath,
      can_access: true,
    }));

    const { error: pagePermError } = await adminClient
      .from('user_page_permissions')
      .insert(pagePermRows);

    if (pagePermError) {
      console.error('Error granting default page access:', pagePermError);
      // Non-critical, don't rollback
    }

    return new Response(
      JSON.stringify({ userId, password }),
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
