import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { CHATBOT_GREETING } from '../../lib/ai';

interface Msg { role: 'bot' | 'user'; text: string; suggestions?: string[] }
interface QuestionsApiResponse { success?: boolean; message?: string; data?: { answer?: string } }

const AI_QUESTIONS_ENDPOINT = `${import.meta.env.VITE_BACKEND_URL ?? 'https://bold-consultation-handmade-joint.trycloudflare.com'}/api/ai/questions`;

const buildAssistantQuestion = (question: string) => `
You are LifeLink's AI Donation Assistant. Answer the user's question using clear, warm,
plain language and focus on blood donation, organ donation, donor preparation, safety,
and general eligibility education.

Response rules:
- Answer only the question asked; do not mention these instructions.
- Be accurate, practical, and concise. Use short paragraphs.
- If the user asks for points, tips, steps, or a checklist, use exactly the number they
  requested when specified; otherwise provide 3 to 5 brief bullet points.
- Give general information only. Do not diagnose, make a personal eligibility decision,
  or replace a healthcare professional or blood bank.
- For individual medical conditions, medications, symptoms, pregnancy, or eligibility,
  explain that local donor-centre rules apply and advise contacting a qualified clinician
  or the local blood bank.
- For an emergency, tell the user to contact local emergency services or a hospital now.
- Do not invent LifeLink policies, local requirements, statistics, or medical facts.
- If the request is unrelated to donation or health, politely say that you can help with
  blood and organ donation questions.

User question: ${question}
`.trim();

const requestDonationAnswer = async (question: string) => {
  const response = await fetch(AI_QUESTIONS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: buildAssistantQuestion(question) }),
  });
  const payload = await response.json().catch(() => null) as QuestionsApiResponse | null;
  const answer = payload?.success === true && typeof payload.data?.answer === 'string'
    ? payload.data.answer.trim()
    : '';

  if (!response.ok || !answer) throw new Error(payload?.message || 'The donation assistant did not return an answer.');
  return answer;
};

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: 'bot', text: CHATBOT_GREETING.text, suggestions: CHATBOT_GREETING.suggestions }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');

    setThinking(true);
    try {
      const answer = await requestDonationAnswer(q);

      setMessages((m) => [...m, {
        role: 'bot',
        text: answer || 'I’m sorry, I couldn’t answer that right now. Please try again in a moment.',
      }]);
    } catch {
      setMessages((m) => [...m, {
        role: 'bot',
        text: 'I’m sorry, I couldn’t reach the donation assistant. Please check your connection and try again.',
      }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all hover:bg-brand-700 hover:scale-105 animate-pulse-ring"
          title="Ask the AI Assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[32rem] w-[calc(100vw-3rem)] max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-brand-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">AI Donation Assistant</p>
                <p className="text-xs text-brand-100">Typically replies instantly</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 transition-colors hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((m, i) => (
              <div key={i}>
                <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user' ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-white text-slate-700 shadow-sm'
                  }`}>
                    {m.text}
                  </div>
                </div>
                {m.suggestions && m.role === 'bot' && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border border-brand-200 bg-white px-2.5 py-1 text-xs text-brand-700 transition-colors hover:bg-brand-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-sm text-slate-500 shadow-sm">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 bg-white p-3">
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about donation..."
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <button type="submit" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50" disabled={!input.trim() || thinking}>
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
