'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { FeedbackKind } from '@/lib/feedback';

type Feedback = { id: number; kind: FeedbackKind; message: string };

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [requestActive, setRequestActive] = useState(false);

  useEffect(() => {
    const handleFeedback = (event: Event) => {
      const detail = (event as CustomEvent<Omit<Feedback, 'id'>>).detail;
      setFeedback({ ...detail, id: Date.now() });
    };
    const handleRequestActivity = (event: Event) => {
      setRequestActive(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener('woodex:feedback', handleFeedback);
    window.addEventListener('woodex:request-activity', handleRequestActivity);
    return () => {
      window.removeEventListener('woodex:feedback', handleFeedback);
      window.removeEventListener('woodex:request-activity', handleRequestActivity);
    };
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), feedback.kind === 'error' ? 7000 : 4500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const Icon = feedback?.kind === 'success' ? CheckCircle2 : feedback?.kind === 'error' ? AlertCircle : Info;

  return (
    <>
      {children}
      {requestActive && (
        <div
          role="progressbar"
          aria-label="Loading"
          className="fixed inset-x-0 top-0 z-[110] h-1 overflow-hidden bg-zinc-200"
        >
          <div className="h-full w-1/3 animate-pulse bg-black" />
        </div>
      )}
      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`fixed top-4 right-4 left-4 sm:left-auto z-[100] sm:w-[380px] rounded-xl border px-4 py-3 shadow-2xl flex items-start gap-3 ${
            feedback.kind === 'error'
              ? 'bg-red-50 border-red-200 text-red-950'
              : feedback.kind === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-white border-zinc-200 text-zinc-950'
          }`}
        >
          <Icon className="w-5 h-5 mt-0.5 shrink-0" />
          <p className="text-sm font-semibold leading-5 flex-1">{feedback.message}</p>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss message"
            className="p-0.5 rounded-md hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
