import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("You must be signed in.");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("You must be signed in.");
    const { data: account } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (account?.role !== "donor") throw new Error("Eligibility checks are available to donor accounts only.");

    const input = await req.json();
    const medicines = Array.isArray(input.medicines) ? input.medicines.slice(0, 20).map((item: unknown) => ({ name: String((item as { name?: string }).name || "").slice(0, 120), dosage: String((item as { dosage?: string }).dosage || "").slice(0, 120) })).filter((item: { name: string }) => item.name) : [];
    const health = { diabetes: Boolean(input.diabetes), highBloodPressure: Boolean(input.highBloodPressure), highCholesterol: Boolean(input.highCholesterol), recentTattoo: Boolean(input.recentTattoo), tattooDetails: String(input.tattooDetails || "").slice(0, 1000), medicines, healthDetails: String(input.healthDetails || "").slice(0, 3000) };
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
    const prompt = `Assess this as a conservative preliminary blood-donation screen only, not medical advice. Return JSON only: {"eligible": boolean, "reason": string}. Mark eligible false when the information indicates a possible deferral, a condition/medicine/tattoo needs professional review, or details are insufficient. Keep reason under 280 characters and tell the person to confirm with a blood bank or clinician. Health details: ${JSON.stringify(health)}`;
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: "application/json", maxOutputTokens: 180 } }) });
    const body = await geminiResponse.json();
    if (!geminiResponse.ok) throw new Error(body?.error?.message || "Gemini request failed");
    const raw = body?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
    const result = JSON.parse(raw || "{}");
    if (typeof result.eligible !== "boolean") throw new Error("Gemini returned an invalid eligibility result");
    const reason = String(result.reason || "Please confirm your eligibility with a blood bank or clinician.").slice(0, 500);
    const { error: saveError } = await supabase.from("donor_eligibility_checks").insert({ donor_id: user.id, has_diabetes: health.diabetes, has_high_blood_pressure: health.highBloodPressure, has_high_cholesterol: health.highCholesterol, has_recent_tattoo: health.recentTattoo, tattoo_details: health.tattooDetails, medicines: health.medicines, health_details: health.healthDetails, ai_eligible: result.eligible, ai_reason: reason });
    if (saveError) throw new Error(saveError.message);
    return new Response(JSON.stringify({ eligible: result.eligible, reason }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) { return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
