import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const instructions = `You are LifeLink's donation-information assistant. Answer directly and use plain, supportive language. Do not begin with praise, filler, or a vague acknowledgement. Keep ordinary answers to a maximum of 3 short sentences. When the user asks for a checklist, steps, tips, or a list, give exactly 3 to 5 practical bullet points instead. Give general education only: do not diagnose, determine a person's eligibility, or replace medical professionals. For personal eligibility, symptoms, or medical concerns, advise speaking with a qualified clinician or blood bank. For emergencies, tell the user to contact local emergency services or a hospital. Do not invent LifeLink features or statistics.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { message } = await req.json();
    if (typeof message !== "string" || !message.trim() || message.length > 600) {
      return new Response(JSON.stringify({ error: "Please send a question of up to 600 characters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions }] },
          contents: [{ role: "user", parts: [{ text: message.trim() }] }],
          generationConfig: { temperature: 0.25, maxOutputTokens: 220 },
        }),
      },
    );

    const body = await geminiResponse.json();
    if (!geminiResponse.ok) throw new Error(body?.error?.message || "Gemini request failed");

    const reply = body?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("")
      .trim();
    if (!reply) throw new Error("Gemini returned no response");

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
