// src/components/dashboard/landlord/CommunicationHub.tsx
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Search, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  type ConversationSummary,
  type ChatMessage,
} from '@/lib/engagementApi';

function timeShort(iso: string): string {
  const d = new Date(iso);
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function CommunicationHub() {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchConversations(token);
      setConversations(data);
      setSelected((cur) => cur ?? data[0]?.id ?? null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load conversations.'
      );
    } finally {
      setLoadingList(false);
    }
  }, [token]);

  const loadThread = useCallback(
    async (id: string) => {
      if (!token) return;
      setLoadingThread(true);
      try {
        setMessages(await fetchMessages(token, id));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to load messages.'
        );
      } finally {
        setLoadingThread(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);
  useEffect(() => {
    if (selected) loadThread(selected);
  }, [selected, loadThread]);

  // Light polling so replies appear without a refresh.
  useEffect(() => {
    if (!selected) return;
    const t = setInterval(() => loadThread(selected), 15000);
    return () => clearInterval(t);
  }, [selected, loadThread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !selected) return;
    setSending(true);
    const body = text.trim();
    setText('');
    try {
      const msg = await sendMessage(token!, selected, body);
      setMessages((prev) => [...prev, msg]);
      loadConversations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send.');
      setText(body);
    } finally {
      setSending(false);
    }
  };

  const visible = conversations.filter(
    (c) =>
      c.other_party.toLowerCase().includes(search.toLowerCase()) ||
      (c.subject || '').toLowerCase().includes(search.toLowerCase())
  );
  const current = conversations.find((c) => c.id === selected);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Messages</h1>
        <p className="text-ink-3 text-sm mt-1">
          Direct conversations with your tenants.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
        {/* list */}
        <Card className="md:col-span-1 overflow-hidden flex flex-col">
          <CardHeader className="p-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-ink-4" />
              <Input
                placeholder="Search…"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-auto flex-1">
            {loadingList ? (
              <div className="p-6 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-ink-4" />
              </div>
            ) : visible.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink-3">
                No conversations yet.
              </p>
            ) : (
              <div>
                {visible.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-start p-3 cursor-pointer hover:bg-canvas border-b border-line ${selected === c.id ? 'bg-canvas' : ''}`}
                    onClick={() => setSelected(c.id)}
                  >
                    <Avatar className="h-10 w-10 bg-brand text-white shrink-0">
                      <AvatarFallback>
                        {c.other_party.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <h3 className="font-medium text-sm truncate">
                          {c.other_party}
                        </h3>
                        <span className="text-xs text-ink-4 whitespace-nowrap">
                          {c.last_message
                            ? timeShort(c.last_message.created_at)
                            : ''}
                        </span>
                      </div>
                      {c.subject && (
                        <p className="text-xs text-ink-4 truncate">
                          {c.subject}
                        </p>
                      )}
                      <p className="text-xs text-ink-3 truncate">
                        {c.last_message?.body || 'No messages yet'}
                      </p>
                    </div>
                    {c.unread_count > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-2 h-5 min-w-5 px-1 flex items-center justify-center rounded-full"
                      >
                        {c.unread_count}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* thread */}
        <Card className="md:col-span-2 flex flex-col overflow-hidden">
          {current ? (
            <>
              <CardHeader className="p-4 border-b flex-row items-center gap-3 space-y-0">
                <Avatar className="h-10 w-10 bg-brand text-white">
                  <AvatarFallback>
                    {current.other_party.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{current.other_party}</h3>
                  {current.subject && (
                    <p className="text-xs text-ink-3">{current.subject}</p>
                  )}
                </div>
              </CardHeader>

              <CardContent
                ref={scrollRef}
                className="flex-1 overflow-auto p-4 space-y-3"
              >
                {loadingThread && messages.length === 0 ? (
                  <div className="flex justify-center pt-8">
                    <Loader2 className="h-5 w-5 animate-spin text-ink-4" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-ink-4 pt-8">
                    No messages yet — say hello.
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.is_mine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg p-3 ${m.is_mine ? 'bg-brand text-white' : 'bg-surface-sunken text-ink'}`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                        <div
                          className={`text-[11px] mt-1 text-right ${m.is_mine ? 'text-white/70' : 'text-ink-4'}`}
                        >
                          {timeShort(m.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>

              <div className="p-4 border-t flex gap-2">
                <Input
                  placeholder="Type a message…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <Button
                  className=""
                  onClick={send}
                  disabled={sending || !text.trim()}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <MessageSquare className="h-12 w-12 text-ink-5 mb-3" />
              <p className="text-sm text-ink-3">
                Select a conversation to start messaging.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
