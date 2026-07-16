import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { CHATBOT_GREETING, chatbotReply } from '../../lib/ai';

interface Msg { role: 'bot' | 'user'; text: string; suggestions?: string[] }

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: 'bot', text: CHATBOT_GREETING.text, suggestions: CHATBOT_GREETING.suggestions }]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    const reply = chatbotReply(q);
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'bot', text: reply.text, suggestions: reply.suggestions }]);
    }, 400);
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
              <button type="submit" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50" disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
