import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const recipient = "offxl.mohomedfarhan07@gmail.com";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[character] || character));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { name, email, subject, message } = await req.json();
    const fields = [name, email, subject, message];
    if (!fields.every((field) => typeof field === "string" && field.trim()) || message.length > 5000 || subject.length > 160 || name.length > 120) {
      return new Response(JSON.stringify({ error: "Please provide valid contact details." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Please provide a valid email address." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("CONTACT_FROM_EMAIL");
    if (!apiKey || !from) throw new Error("Email service is not configured");

    const safe = {
      name: escapeHtml(name.trim()),
      email: escapeHtml(email.trim()),
      subject: escapeHtml(subject.trim()),
      message: escapeHtml(message.trim()).replace(/\n/g, "<br />"),
    };
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "LifeLink Contact Form",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: email.trim(),
        subject: `[LifeLink] ${subject.trim()}`,
        text: `New LifeLink contact message\n\nFrom: ${name.trim()} <${email.trim()}>\nSubject: ${subject.trim()}\n\n${message.trim()}`,
        html: `<h2>New LifeLink contact message</h2><p><strong>From:</strong> ${safe.name} &lt;${safe.email}&gt;</p><p><strong>Subject:</strong> ${safe.subject}</p><hr /><p>${safe.message}</p>`,
      }),
    });
    const result = await emailResponse.json();
    if (!emailResponse.ok) throw new Error(result?.message || "Email delivery failed");

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Contact email error:", (error as Error).message);
    return new Response(JSON.stringify({ error: "Unable to send message" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
