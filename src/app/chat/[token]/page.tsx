// /chat/[token]
//
// The prospect's conversation with the landlord. The token is a per-conversation
// capability carried by their emailed link — no account, no login. It grants
// access to this ONE thread only, and the payload is PII-minimized (listing name
// + landlord name + messages), so a forwarded link can't expose a portfolio.
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquareText, SendHorizonal, Home } from 'lucide-react';
import {
  fetchChatThread,
  sendChatMessage,
  type ChatThread,
} from '@/lib/chatApi';

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function ProspectChatPage() {
  const params = useParams();
  const token = params.token as string;
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(
    (scroll = false) =>
      fetchChatThread(token)
        .then((t) => {
          setThread(t);
          if (scroll)
            requestAnimationFrame(() =>
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            );
        })
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false)),
    [token]
  );

  useEffect(() => {
    load();
    // Light polling so a landlord reply appears without a manual refresh.
    const id = setInterval(() => load(), 15000);
    return () => clearInterval(id);
  }, [load]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await sendChatMessage(token, body);
      setThread(updated);
      setDraft('');
      requestAnimationFrame(() =>
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong — try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (notFound || !thread) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <MessageSquareText className="mx-auto mb-4 h-12 w-12 text-neutral-300" />
        <h1 className="mb-2 text-xl font-semibold text-neutral-900">
          We couldn&apos;t find that conversation
        </h1>
        <p className="text-sm text-neutral-500">
          The link may be incomplete — try opening it again from your email.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Card className="flex h-[80vh] flex-col">
        <CardHeader className="border-b border-neutral-100">
          <CardTitle className="text-lg">{thread.landlord_name}</CardTitle>
          <CardDescription>
            {thread.listing
              ? `About ${thread.listing}`
              : thread.subject || 'Your enquiry'}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-3 overflow-y-auto py-4">
          {thread.messages.length === 0 && (
            <p className="my-auto text-center text-sm text-neutral-400">
              No messages yet — say hello.
            </p>
          )}
          {thread.messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.from_landlord ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                  m.from_landlord
                    ? 'bg-neutral-100 text-neutral-800'
                    : 'bg-teal-600 text-white'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    m.from_landlord ? 'text-neutral-400' : 'text-teal-100'
                  }`}
                >
                  {fmtWhen(m.created_at)}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </CardContent>

        <div className="border-t border-neutral-100 p-3">
          {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              className="max-h-32 min-h-[42px] flex-1 resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
              placeholder="Write a message…"
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              disabled={busy || !draft.trim()}
              onClick={send}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-neutral-400">
            <Home className="h-3 w-3" />
            Looking for other places?{' '}
            <Link href="/" className="text-teal-700 underline">
              Browse Rentium
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
