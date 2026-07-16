import { useState } from 'react';
import { Mail, Phone, MapPin, MessageSquare, Send, Clock, AlertCircle } from 'lucide-react';
import { PublicPage } from '../../components/public/PublicPage';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { ChatbotWidget } from '../../components/public/ChatbotWidget';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

export function ContactPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const { error } = await supabase.functions.invoke('contact-email', { body: form });
    if (error) {
      setSending(false);
      toast('Unable to send your message right now. Please try again shortly.', 'error');
      return;
    }
    setSending(false);
    toast('Message sent! We will get back to you within 24 hours.');
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <PublicPage>
      <section className="public-hero py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <MessageSquare className="h-3.5 w-3.5" /> Contact
          </div>
          <h1 className="mt-4 text-4xl font-extrabold text-slate-900">Get in Touch</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">Questions about donation, partnerships, or technical support? We're here to help.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">About LifeLink</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">We connect people and organizations to support lifesaving donations.</h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">Learn about our purpose, the community we serve, and the principles behind LifeLink.</p>
          </div>
          <Link to="/about-us" className="shrink-0 rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-brand-700">About Us</Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Contact info */}
          <div className="space-y-4">
            {[
              { icon: <Phone className="h-5 w-5" />, t: 'Emergency Hotline', v: '1919', d: '24/7 blood emergency line', accent: 'brand' },
              { icon: <Mail className="h-5 w-5" />, t: 'Email Us', v: 'support@lifelink.org', d: 'We reply within 24 hours', accent: 'sky' },
              { icon: <MapPin className="h-5 w-5" />, t: 'Head Office', v: 'Colombo, Sri Lanka', d: 'National Blood Center', accent: 'emerald' },
              { icon: <Clock className="h-5 w-5" />, t: 'Service Hours', v: '24/7 Platform', d: 'Emergency response always on', accent: 'amber' },
            ].map((c) => (
              <Card key={c.t} className="p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${
                  c.accent === 'brand' ? 'bg-brand-50 text-brand-600' :
                  c.accent === 'sky' ? 'bg-sky-50 text-sky-600' :
                  c.accent === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                  'bg-amber-50 text-amber-600'
                }`}>{c.icon}</div>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">{c.t}</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{c.v}</p>
                <p className="mt-0.5 text-sm text-slate-500">{c.d}</p>
              </Card>
            ))}
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="p-8">
              <h2 className="text-xl font-bold text-slate-900">Send us a message</h2>
              <p className="mt-1 text-sm text-slate-500">Fill out the form and our team will respond shortly.</p>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
                  <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
                </div>
                <Input label="Subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="How can we help?" />
                <Textarea label="Message" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us more..." />
                <Button type="submit" loading={sending} icon={<Send className="h-4 w-4" />}>Send Message</Button>
              </form>
              <div className="mt-6 flex items-start gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>For urgent blood requirements, please call the <strong>1919</strong> emergency hotline. This contact form is for general inquiries only.</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <ChatbotWidget />
    </PublicPage>
  );
}
