import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

async function sha1(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) throw new Error("You must be signed in.");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("You must be signed in.");
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile || !["hospital", "blood_bank"].includes(profile.role)) throw new Error("Only hospital and blood bank accounts can upload content images.");
    // Prefer server-only names. The VITE fallbacks support existing Supabase
    // secrets with the names used by this project; they are never sent to the browser.
    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME") || Deno.env.get("VITE_CLOUDINARY_CLOUD_NAME");
    const apiKey = Deno.env.get("CLOUDINARY_API_KEY") || Deno.env.get("VITE_CLOUDINARY_API_KEY");
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET") || Deno.env.get("VITE_CLOUDINARY_API_SECRET");
    if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary is not configured on the server.");
    const { contentType } = await req.json();
    if (!['awareness', 'story', 'campaign'].includes(contentType)) throw new Error("Invalid content type.");
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `lifelink/${profile.role}/${user.id}/${contentType}`;
    const signature = await sha1(`folder=${folder}&timestamp=${timestamp}${apiSecret}`);
    return new Response(JSON.stringify({ cloudName, apiKey, timestamp, folder, signature }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) { return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
