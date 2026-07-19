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
    if (!profile || !["hospital", "blood_bank"].includes(profile.role)) throw new Error("Only hospital and blood bank accounts can generate content descriptions.");
    const { title, details, contentType } = await req.json();
    if (typeof title !== "string" || !title.trim() || title.length > 160 || typeof details !== "string" || !details.trim() || details.length > 1500 || !["awareness", "campaign", "story"].includes(contentType)) throw new Error("Provide a title and short details of up to 1,500 characters.");
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
    const prompt = `Write a polished, publication-ready ${contentType} description for LifeLink, a blood and organ donation platform. Write exactly 5 complete, meaningful sentences in one paragraph. Make it warm, specific, and useful: explain the purpose, who it helps, what readers can expect, and an appropriate next step. For campaigns, include an inviting call to participate; for awareness content, make the benefit educational; for success stories, keep the tone respectful and hopeful. Use only the title and details supplied. Do not invent dates, locations, medical claims, results, names, or statistics. Return only the finished description. Title: ${title.trim()} Details/keywords: ${details.trim()}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 600 } }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error?.message || "Gemini request failed");
    if (body?.candidates?.[0]?.finishReason === "MAX_TOKENS") throw new Error("The AI response was cut off. Please generate again.");
    const description = body?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
    if (!description) throw new Error("Gemini returned no description");
    return new Response(JSON.stringify({ description }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) { return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
