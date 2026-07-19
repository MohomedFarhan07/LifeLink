import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

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
    if (profile?.role !== "blood_bank") throw new Error("Only blood bank accounts can generate awareness articles.");
    const { title, description, keywords } = await req.json();
    if (![title, description, keywords].every((value) => typeof value === "string" && value.trim()) || title.length > 160 || description.length > 1500 || keywords.length > 2000) throw new Error("Add a title, description, and article keywords before generating.");
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
    const prompt = `Write a useful, publication-ready awareness article for LifeLink, a blood and organ donation platform. Produce 5 short, well-developed paragraphs with at least one complete sentence in each paragraph. Structure it naturally: a welcoming introduction, clear explanation, practical guidance, a responsible note about checking with a qualified clinician or blood bank where relevant, and a supportive closing call to action. Use only the title, description, and keywords supplied. Do not invent medical facts, statistics, dates, locations, organisations, guarantees, or personal stories. Keep language plain, accurate, and encouraging. Return only the article body, without a title or markdown heading. Title: ${title.trim()} Description: ${description.trim()} Article keywords: ${keywords.trim()}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.55, maxOutputTokens: 900 } }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error?.message || "Gemini request failed");
    if (body?.candidates?.[0]?.finishReason === "MAX_TOKENS") throw new Error("The AI response was cut off. Please generate again.");
    const article = body?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
    if (!article) throw new Error("Gemini returned no article");
    return new Response(JSON.stringify({ article }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) { return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
