// RamaPanel — per-landlord RAMA chat. Shown only when this landlord has
// enabled RAMA in Settings and the platform has a key for their provider.
// Conversation memory is server-side (their audit trail only).
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Paperclip, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  fetchRamaConfig,
  fetchPortfolios,
  setActingPortfolio,
  sendRamaMessage,
  uploadRamaDocument,
  type RamaConfig,
  type RamaPendingPlan,
  type RamaPortfolio,
  type RamaRole,
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
  const [pendingPlan, setPendingPlan] = useState<RamaPendingPlan | null>(null);
  // Corporal = fast ops agent; General = your chief of staff (Constitution,
  // delegation, stronger model). Each mode keeps its own conversation.
  const [role, setRole] = useState<RamaRole>('corporal');
  // Business records are staged, OCRed, and sent as document context.
  const [attachments, setAttachments] = useState<
    { id: string; name: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  // Portfolios this user can act on. A co-landlord who co-hosts other owners can
  // switch which portfolio RAMA operates on (own = primary; others = co-hosted).
  const [portfolios, setPortfolios] = useState<RamaPortfolio[]>([]);
  const [actingAs, setActingAs] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onPickPhotos = async (files: FileList | null) => {
    if (!files || !token) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const document = await uploadRamaDocument(token, file);
        setAttachments((a) => [...a, { id: document.id, name: file.name }]);
      }
    } catch {
      setBubbles((b) => [
        ...b,
        { role: 'error', text: "Couldn't upload that document — try again." },
      ]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!token) return;
    // Resolve the portfolio to act on FIRST (the backend's smart default lands a
    // co-landlord on the owner's portfolio, not their empty own account), then
    // load config for that portfolio.
    fetchPortfolios(token)
      .then((p) => {
        setPortfolios(p.portfolios);
        setActingPortfolio(p.acting_as);
        setActingAs(p.acting_as);
      })
      .catch(() => {})
      .finally(() => {
        fetchRamaConfig(token)
          .then(setConfig)
          .catch(() => setConfig(null));
      });
  }, [token]);

  const onSwitchPortfolio = (ownerId: string) => {
    setActingPortfolio(ownerId);
    setActingAs(ownerId);
    // New portfolio = fresh context: reset the conversation and reload config.
    setBubbles([]);
    setConversationId(undefined);
    setPendingPlan(null);
    if (token)
      fetchRamaConfig(token)
        .then(setConfig)
        .catch(() => {});
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [bubbles, busy]);

  if (!config) return null;
  // Not enabled, or enabled without a usable key → don't silently hide RAMA;
  // show the button and, on open, tell them how to finish setup.
  const needsSetup = !config.enabled || !config.configured;

  if (needsSetup) {
    return (
      <>
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
            className="fixed bottom-5 right-5 z-50 flex w-[min(360px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl"
            style={{ borderColor: 'hsl(var(--line))' }}
          >
            <div className="flex items-center justify-between bg-[hsl(var(--brand))] px-4 py-3 text-white">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4" /> RAMA
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 hover:bg-white/15"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-sm font-medium">RAMA isn&apos;t set up yet</p>
              <p className="text-sm text-[hsl(var(--ink-3))]">
                {config.enabled
                  ? 'Add an API key for your model to start chatting.'
                  : 'Turn RAMA on and add an API key for your model to start chatting.'}
              </p>
              <Link
                href="/dashboard/settings"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-[hsl(var(--brand))] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Open Settings → Account &amp; RAMA
              </Link>
            </div>
          </div>
        )}
      </>
    );
  }

  const ask = async (text: string) => {
    const message = text.trim();
    const uploadIds = attachments.map((a) => a.id);
    if ((!message && uploadIds.length === 0) || !token || busy) return;
    setInput('');
    setBubbles((b) => [
      ...b,
      {
        role: 'user',
        text:
          message +
          (uploadIds.length ? ` 📎 ${uploadIds.length} document(s)` : ''),
      },
    ]);
    setAttachments([]);
    setBusy(true);
    try {
      const reply = await sendRamaMessage(
        token,
        {
          message: message || 'Here is a photo to attach.',
          conversation_id: conversationId,
          document_ids: uploadIds.length ? uploadIds : undefined,
        },
        role
      );
      setConversationId(reply.conversation_id);
      setPendingPlan(reply.pending_plan ?? null);
      setBubbles((b) => [
        ...b,
        { role: 'assistant', text: reply.reply, model: reply.model },
      ]);
    } catch (err) {
      const text =
        err instanceof Error
          ? err.message
          : 'Something went wrong talking to RAMA.';
      setBubbles((b) => [...b, { role: 'error', text }]);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setBubbles([]);
    setConversationId(undefined);
    setPendingPlan(null);
  };

  return (
    <>
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
          <div className="flex items-center justify-between border-b bg-[hsl(var(--brand))] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <div>
                <p className="text-sm font-semibold leading-tight">
                  RAMA {role === 'general' ? '· General' : ''}
                </p>
                <p className="text-[11px] leading-tight text-white/75">
                  {role === 'general'
                    ? 'Chief of staff · follows your Constitution'
                    : 'Your portfolio · asks before acting · private to you'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  // Each mode keeps its own conversation thread.
                  setRole(role === 'general' ? 'corporal' : 'general');
                  setBubbles([]);
                  setConversationId(undefined);
                  setPendingPlan(null);
                }}
                title={
                  role === 'general'
                    ? 'Switch to the ops agent'
                    : 'Switch to the General (chief of staff)'
                }
                className="ml-1 rounded-full border border-white/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide hover:bg-white/15"
              >
                {role === 'general' ? 'General' : 'Ops'}
              </button>
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

          {portfolios.length > 1 && (
            <div
              className="flex items-center gap-2 border-b bg-[hsl(var(--surface-sunken))] px-4 py-2 text-xs"
              style={{ borderColor: 'hsl(var(--line))' }}
            >
              <span className="text-[hsl(var(--ink-4))]">Managing</span>
              <select
                value={actingAs ?? ''}
                onChange={(e) => onSwitchPortfolio(e.target.value)}
                className="flex-1 rounded-md border bg-white px-2 py-1 text-[hsl(var(--ink-1))]"
                style={{ borderColor: 'hsl(var(--line))' }}
              >
                {portfolios.map((p) => (
                  <option key={p.owner_id} value={p.owner_id}>
                    {p.name}
                    {p.is_own ? ' (you)' : ' — co-host'} · {p.property_count}{' '}
                    {p.property_count === 1 ? 'property' : 'properties'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {bubbles.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-[hsl(var(--ink-3))]">
                  Ask about your rent, leases, deposits, or maintenance. Answers
                  come from your records only — nothing is shared with other
                  accounts.
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
                <p className="text-xs text-[hsl(var(--ink-4))]">
                  Model:{' '}
                  <span className="font-medium text-[hsl(var(--ink-2))]">
                    {config.provider} / {config.model}
                  </span>
                  .{' '}
                  <Link
                    href="/dashboard/settings"
                    className="text-[hsl(var(--brand))] underline-offset-2 hover:underline"
                  >
                    Change in settings
                  </Link>
                </p>
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
            {/* Pending plan card. Confirm/Cancel just send "yes"/"cancel" —
                the backend's deterministic confirm machine stays the single
                authority; the buttons only make it language-independent. */}
            {pendingPlan && !busy && (
              <div
                className="rounded-2xl border bg-[hsl(var(--surface-sunken))] p-3 text-sm"
                style={{ borderColor: 'hsl(var(--line))' }}
              >
                <p className="font-medium">
                  {pendingPlan.awaiting_own_confirm
                    ? 'This step needs its own confirmation:'
                    : 'Waiting for your confirmation:'}
                </p>
                <p className="mt-1 text-xs text-[hsl(var(--ink-3))]">
                  {pendingPlan.summary}
                </p>
                <ol className="mt-2 space-y-1">
                  {pendingPlan.steps.map((s) => (
                    <li
                      key={s.n}
                      className={cn(
                        'text-xs',
                        s.status === 'DONE' &&
                          'text-[hsl(var(--ink-4))] line-through',
                        s.status === 'FAILED' && 'text-red-700'
                      )}
                    >
                      {s.n}. {s.target || s.tool}
                      {s.requires_own_confirm && s.status === 'PENDING' && (
                        <span className="ml-1 text-[10px] text-amber-700">
                          (asks separately)
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
                {pendingPlan.blocked.length > 0 && (
                  <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                    {pendingPlan.blocked.map((b) => (
                      <p key={b.target}>
                        Blocked — {b.target}: {b.detail}
                      </p>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void ask('yes')}
                    className="rounded-lg bg-[hsl(var(--brand))] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    {pendingPlan.awaiting_own_confirm
                      ? 'Confirm this step'
                      : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void ask('cancel')}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium text-[hsl(var(--ink-2))] hover:bg-white"
                    style={{ borderColor: 'hsl(var(--line))' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-[hsl(var(--ink-3))]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking your records…
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
            className="border-t p-3"
            style={{ borderColor: 'hsl(var(--line))' }}
          >
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {attachments.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--surface-sunken))] px-2 py-1 text-[11px] text-[hsl(var(--ink-3))]"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span className="max-w-[120px] truncate">{a.name}</span>
                    <button
                      type="button"
                      aria-label="Remove document"
                      onClick={() =>
                        setAttachments((list) =>
                          list.filter((x) => x.id !== a.id)
                        )
                      }
                      className="text-[hsl(var(--ink-4))] hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.webp,.heic,.heif"
                multiple
                hidden
                onChange={(e) => void onPickPhotos(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy || uploading}
                aria-label="Attach business document"
                title="Attach a receipt, notice, invoice, or other business document"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[hsl(var(--ink-3))] transition hover:text-[hsl(var(--brand))] disabled:opacity-40"
                style={{ borderColor: 'hsl(var(--line))' }}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </button>
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
                disabled={busy || (!input.trim() && attachments.length === 0)}
                aria-label="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--brand))] text-white transition disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-[hsl(var(--ink-3))]">
              Powered by {config.model} · beta — double-check anything important
            </p>
          </form>
        </div>
      )}
    </>
  );
}
