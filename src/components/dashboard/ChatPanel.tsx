import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { supabase } from '../../lib/supabase';
import { ChatMessage } from '../../types';

interface ChatPanelProps {
  donationId: string;
  currentUserId: string;
  recipientId: string;
  recipientName: string;
  recipientSubtitle?: string;
  recipientAvatar?: string;
  className?: string;
}

export function ChatPanel({
  donationId,
  currentUserId,
  recipientId,
  recipientName,
  recipientSubtitle,
  className = '',
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('donation_id', donationId)
      .order('created_at', { ascending: true });
    setMessages((data as ChatMessage[]) || []);
  }, [donationId]);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`chat:${donationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `donation_id=eq.${donationId}` }, (payload) => {
        const incoming = payload.new as ChatMessage;
        setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [donationId, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    const unread = messages.filter((m) => m.recipient_id === currentUserId && !m.read_at);
    if (unread.length > 0) {
      supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unread.map((m) => m.id));
    }
  }, [messages, currentUserId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setInput('');

    const { data, error } = await supabase.from('chat_messages').insert({
      donation_id: donationId,
      sender_id: currentUserId,
      recipient_id: recipientId,
      body: text,
    }).select().single();

    if (error) {
      setInput(text);
    } else if (data) {
      const msg = data as ChatMessage;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    }
    setSending(false);
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

  let lastDay = '';

  return (
    <div className={`flex flex-col rounded-xl border border-slate-200 bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
          {recipientName?.split(' ').map((n) => n[0]).join('').slice(0, 2) || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{recipientName}</p>
          {recipientSubtitle && <p className="truncate text-xs text-slate-500">{recipientSubtitle}</p>}
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: '380px', minHeight: '240px' }}>
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="No messages yet" description={`Start the conversation with ${recipientName?.split(' ')[0] || 'them'}.`} />
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            const day = fmtDay(m.created_at);
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="my-3 flex items-center justify-center">
                    <span className="rounded-full bg-slate-100 px-3 py-0.5 text-[11px] font-medium text-slate-500">{day}</span>
                  </div>
                )}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-slate-100 text-slate-800'}`}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`mt-1 text-[10px] ${mine ? 'text-brand-100' : 'text-slate-400'}`}>{fmtTime(m.created_at)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-slate-100 p-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <Button size="sm" onClick={sendMessage} disabled={sending || !input.trim()} icon={<Send className="h-4 w-4" />}>
          Send
        </Button>
      </div>
    </div>
  );
}
