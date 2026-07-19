import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing configuration" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Check if admin already exists
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id, email")
      .eq("role", "admin")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({
        message: "Admin already exists",
        email: existing.email,
        login: `Use email: ${existing.email} | password: (already set)`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create default admin user
    const adminEmail = "admin@lifelink.org";
    const adminPassword = "Admin123!life";

    const { data: userData, error: createErr } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "LifeLink Admin", role: "admin" },
    });

    if (createErr) throw new Error(createErr.message);

    const adminId = userData.user.id;
    await adminClient.from("profiles").insert({
      id: adminId,
      email: adminEmail,
      full_name: "LifeLink Admin",
      role: "admin",
      phone: "+94 11 555 0000",
      country: "Sri Lanka",
      district: "Colombo",
      postal_code: "00100",
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Default admin account created",
      credentials: { email: adminEmail, password: adminPassword },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
