// RamaPanel — the RAMA v1 chat surface: a floating, read-only Q&A assistant
// over the landlord's own portfolio.
//
// Feature-flagged by the BACKEND (GET /api/rama/config/), not an env var, so
// the flag has one source of truth. The launcher renders only when the server
// says RAMA is enabled AND either a provider key is configured or the viewer
// is staff (staff get to see the panel pre-launch; customers never see a
// broken toy). Every reply carries a visible "powered by <model>" tag, and
// staff get a provider/model picker for A/B-ing the same conversation.
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  fetchRamaConfig,
  sendRamaMessage,
  type RamaConfig,
} from '@/lib/ramaApi';

interface Bubble {
  role: 'user' | 'assistant' | 'error';
  text: string;
  model?: string;
}

const SUGGESTIONS = [
  'How are things going this month?',
  'What needs my attention?',
  'Did anyone miss rent?',
];

export default function RamaPanel() {
  const { token } = useAuth();
  const [config, setConfig] = useState<RamaConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  // Staff-only overrides; empty string = use the server default.
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    fetchRamaConfig(token)
      .then(setConfig)
      .catch(() => setConfig(null)); // tenants / disabled → no panel
  }, [token]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [bubbles, busy]);

  if (!config?.enabled) return null;
  if (!config.configured && !config.can_override) return null;

  const activeModel = model || config.model;

  const ask = async (text: string) => {
    const message = text.trim();
    if (!message || !token || busy) return;
    setInput('');
    setBubbles((b) => [...b, { role: 'user', text: message }]);
    setBusy(true);
    try {
      const reply = await sendRamaMessage(token, {
        message,
        conversation_id: conversationId,
        ...(config.can_override && provider ? { provider } : {}),
        ...(config.can_override && model ? { model } : {}),
      });
      setConversationId(reply.conversation_id);
      setBubbles((b) => [
        ...b,
        { role: 'assistant', text: reply.reply, model: reply.model },
      ]);
    } catch (err) {
      setBubbles((b) => [
        ...b,
        {
          role: 'error',
          text: err instanceof Error ? err.message : 'Something went wrong.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setBubbles([]);
    setConversationId(undefined);
  };

  return (
    <>
      {/* launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ask RAMA"
          className="fixed bottom-5 right-5 z-50 flex h-12 items-center gap-2 rounded-full bg-[hsl(var(--brand))] px-4 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" />
          Ask RAMA
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-5 right-5 z-50 flex h-[min(560px,80vh)] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl"
          style={{ borderColor: 'hsl(var(--line))' }}
        >
          {/* header */}
          <div className="flex items-center justify-between border-b bg-[hsl(var(--brand))] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <div>
                <p className="text-sm font-semibold leading-tight">RAMA</p>
                <p className="text-[11px] leading-tight text-white/75">
                  Read-only · answers come from your records
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {bubbles.length > 0 && (
                <button
                  onClick={reset}
                  aria-label="New conversation"
                  title="New conversation"
                  className="rounded-lg p-1.5 hover:bg-white/15"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close RAMA"
                className="rounded-lg p-1.5 hover:bg-white/15"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* staff-only model picker */}
          {config.can_override && (
            <div
              className="flex items-center gap-2 border-b bg-[hsl(var(--surface-sunken))] px-3 py-2"
              style={{ borderColor: 'hsl(var(--line))' }}
            >
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                aria-label="Provider"
                className="rounded-md border bg-white px-2 py-1 text-xs"
                style={{ borderColor: 'hsl(var(--line))' }}
              >
                <option value="">{config.provider} (default)</option>
                {config.providers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={`${config.model} (default)`}
                aria-label="Model"
                className="min-w-0 flex-1 rounded-md border bg-white px-2 py-1 text-xs"
                style={{ borderColor: 'hsl(var(--line))' }}
              />
            </div>
          )}

          {/* messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {bubbles.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-[hsl(var(--ink-3))]">
                  Ask about your own portfolio — rent, leases, deposits,
                  maintenance. I can look things up but never change anything.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="rounded-full border px-3 py-1.5 text-xs text-[hsl(var(--ink-2))] transition hover:border-[hsl(var(--brand))] hover:text-[hsl(var(--brand))]"
                      style={{ borderColor: 'hsl(var(--line))' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {!config.configured && (
                  <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                    No provider API key is configured yet — messages will fail
                    until one is set. (Only staff can see this panel right now.)
                  </p>
                )}
              </div>
            )}
            {bubbles.map((bubble, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm',
                  bubble.role === 'user' &&
                    'ml-auto rounded-br-sm bg-[hsl(var(--brand))] text-white',
                  bubble.role === 'assistant' &&
                    'rounded-bl-sm bg-[hsl(var(--surface-sunken))] text-[hsl(var(--ink))]',
                  bubble.role === 'error' &&
                    'rounded-bl-sm bg-red-50 text-red-800'
                )}
              >
                {bubble.text}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-[hsl(var(--ink-3))]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking your records…
              </div>
            )}
          </div>

          {/* composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
            className="border-t p-3"
            style={{ borderColor: 'hsl(var(--line))' }}
          >
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your portfolio…"
                disabled={busy}
                maxLength={4000}
                className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:border-[hsl(var(--brand))]"
                style={{ borderColor: 'hsl(var(--line))' }}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--brand))] text-white transition disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-[hsl(var(--ink-3))]">
              Powered by {activeModel} · beta — double-check anything important
            </p>
          </form>
        </div>
      )}
    </>
  );
}
