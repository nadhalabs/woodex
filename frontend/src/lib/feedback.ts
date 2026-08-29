'use client';

export type FeedbackKind = 'success' | 'error' | 'info';

export function showFeedback(kind: FeedbackKind, message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('woodex:feedback', { detail: { kind, message } }));
}

export function showSuccess(message: string) {
  showFeedback('success', message);
}

export function showError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const message = error instanceof Error && error.message ? error.message : fallback;
  showFeedback('error', message);
}
