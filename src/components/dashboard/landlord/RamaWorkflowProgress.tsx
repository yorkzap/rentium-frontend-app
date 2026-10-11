'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchRamaTasks,
  resumeRamaTask,
  type RamaReply,
  type RamaWorkflowTask,
} from '@/lib/ramaApi';

const labels: Record<string, string> = {
  RECEIVED: 'Preparing',
  NEEDS_INPUT: 'Needs information',
  READY: 'Ready for review',
  SKIPPED: 'Not run',
  AWAITING_CONFIRMATION: 'Ready for approval',
  EXECUTING: 'Running',
  WAITING: 'Waiting',
  PARTIAL: 'Partially completed',
  VERIFIED: 'Completed',
  FAILED: 'Needs attention',
  CANCELLED: 'Cancelled',
  SUSPENDED: 'Paused',
  EXPIRED: 'Needs a fresh review',
};

export default function RamaWorkflowProgress({
  token,
  conversationId,
  busy,
  onResume,
}: {
  token: string;
  conversationId?: string;
  busy: boolean;
  onResume: (reply: RamaReply) => void;
}) {
  const [tasks, setTasks] = useState<RamaWorkflowTask[]>([]);
  const [attention, setAttention] = useState<
    Awaited<ReturnType<typeof fetchRamaTasks>>['attention']
  >([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [resuming, setResuming] = useState('');
  const refresh = useCallback(async () => {
    try {
      const result = await fetchRamaTasks(token);
      setTasks(result.tasks);
      setAttention(result.attention || []);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load workflow progress.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [refresh, busy]);

  const resume = async (id: string) => {
    setResuming(id);
    try {
      onResume(await resumeRamaTask(token, id, conversationId));
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not prepare the remaining work.'
      );
    } finally {
      setResuming('');
    }
  };

  return (
    <details
      className="rounded-xl border border-slate-200 bg-white p-3 text-xs"
      open={tasks.some((t) =>
        ['PARTIAL', 'FAILED', 'WAITING'].includes(t.status)
      )}
    >
      <summary className="cursor-pointer font-semibold">
        Your workflows{' '}
        {loading
          ? '· Loading…'
          : `· ${tasks.filter((t) => !['VERIFIED', 'CANCELLED'].includes(t.status)).length} unfinished`}
      </summary>
      {error && (
        <p role="alert" className="mt-2 text-red-700">
          {error}{' '}
          <button
            type="button"
            onClick={() => void refresh()}
            className="underline"
          >
            Retry
          </button>
        </p>
      )}
      {!loading && !error && tasks.length === 0 && (
        <p className="mt-2 text-slate-500">
          Work you ask RAMA to prepare will appear here.
        </p>
      )}
      <ul className="mt-2 space-y-3">
        {tasks.slice(0, 8).map((task) => (
          <li key={task.id} className="min-w-0 rounded-lg bg-slate-50 p-2">
            <p className="break-words font-medium">{task.summary}</p>
            <p className="mt-1 text-slate-600">
              {labels[task.status] || task.status}
            </p>
            {task.detail && (
              <p className="mt-1 break-words text-slate-600">{task.detail}</p>
            )}
            <ol className="mt-1 space-y-1">
              {task.steps.map((step) => (
                <li key={step.step_id}>
                  {step.tool.replaceAll('_', ' ')} ·{' '}
                  {step.status === 'DONE'
                    ? step.verified
                      ? 'Verified'
                      : 'Recorded; not independently verified'
                    : labels[step.status] || step.status}
                  {step.detail && (
                    <p className="break-words text-amber-800">{step.detail}</p>
                  )}
                </li>
              ))}
            </ol>
            {task.receipts.flatMap((receipt) =>
              receipt.links.map((link) => (
                <a
                  key={`${receipt.id}:${link.url}`}
                  href={link.url}
                  className="mr-2 inline-block text-blue-700 underline"
                >
                  View record
                </a>
              ))
            )}
            {task.can_resume && (
              <button
                type="button"
                disabled={busy || !!resuming}
                onClick={() => void resume(task.id)}
                className="mt-2 rounded border border-slate-300 px-2 py-1 font-medium disabled:opacity-50"
              >
                {resuming === task.id ? 'Preparing…' : 'Review remaining work'}
              </button>
            )}
          </li>
        ))}
      </ul>
      {attention.length > 0 && (
        <div className="mt-3 border-t pt-2">
          <p className="font-semibold">Prepared for your attention</p>
          <ul className="mt-1 space-y-2">
            {attention.map((item) => (
              <li key={item.id}>
                <p>{item.summary}</p>
                {item.path && (
                  <Link href={item.path} className="text-blue-700 underline">
                    Review
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}
