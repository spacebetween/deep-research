'use client';

const SESSION_STORAGE_KEY = 'bad_unicorn_session_id';

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const getOrCreateSessionId = () => {
  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const nextId = createId();
  window.localStorage.setItem(SESSION_STORAGE_KEY, nextId);
  return nextId;
};

export const createConversationId = () => createId();

type TrackUserEventInput = {
  requestId?: string | null;
  sessionId?: string | null;
  conversationId?: string | null;
  eventType: 'linkedin_click' | 'result_feedback';
  candidateUrl?: string;
  feedbackValue?: string;
  metadata?: Record<string, unknown>;
};

export const trackUserEvent = (event: TrackUserEventInput) => {
  const body = JSON.stringify(event);

  if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/observability/events', blob);
    return;
  }

  void fetch('/api/observability/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  });
};
