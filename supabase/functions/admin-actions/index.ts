import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AdminUser {
  id: string;
  email: string;
  role: string;
  full_name: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = req.headers.get("Authorization")?.replace("Bearer ", "");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(JSON.stringify({ error: "Missing configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with caller's token to verify their identity
    const callerClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin
    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client with service role (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || url.pathname.split("/").pop();
    const body = req.method !== "GET" ? await req.json().catch(() => ({})) : {};

    // ---- LIST ALL USERS ----
    if (action === "users" && req.method === "GET") {
      const { data: profiles, error: pErr } = await adminClient
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (pErr) throw new Error(pErr.message);

      return new Response(JSON.stringify({ users: profiles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- VERIFY / REJECT ORGANIZATION ----
    if (action === "verify" && req.method === "POST") {
      const { table, id, status } = body as { table: string; id: string; status: string };
      if (!["hospitals", "blood_banks", "volunteers"].includes(table)) {
        return new Response(JSON.stringify({ error: "Invalid table" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!["verified", "rejected", "pending"].includes(status)) {
        return new Response(JSON.stringify({ error: "Invalid status" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: updErr } = await adminClient
        .from(table)
        .update({ verification_status: status })
        .eq("id", id);
      if (updErr) throw new Error(updErr.message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- DELETE USER ----
    if (action === "delete-user" && req.method === "POST") {
      const { userId } = body as { userId: string };
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Profile + related rows cascade-delete via FK ON DELETE CASCADE
      const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
      if (delErr) throw new Error(delErr.message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
