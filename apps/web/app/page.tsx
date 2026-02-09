'use client';

import { FormEvent, useMemo, useState } from 'react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const initialMessage: ChatMessage = {
  role: 'assistant',
  content:
    'Tell me which people you are looking for. Example: "Find 5 VP Product leaders at B2B SaaS companies in New York."',
};

export default function HomePage() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [status, setStatus] = useState('Ready');

  const historyForApi = useMemo(
    () => messages.filter(message => message.role === 'user' || message.role === 'assistant'),
    [messages],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);
    setStatus('Searching people profiles...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'peopleResearchAgent',
          messages: [...historyForApi, { role: 'user', content: trimmed }],
        }),
      });

      const payload = (await response.json()) as { text?: string; error?: string };

      if (!response.ok || !payload.text) {
        throw new Error(payload.error || 'Request failed');
      }

      setMessages(current => [...current, { role: 'assistant', content: payload.text as string }]);
      setStatus('Done');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      setMessages(current => [...current, { role: 'assistant', content: `Error: ${message}` }]);
      setStatus('Failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main>
      <header className="header">
        <h1 className="title">Deep Research Chat</h1>
        <p className="subtitle">Non-streaming chat UI connected to Mastra people research agent</p>
      </header>

      <section className="chat-shell">
        <div className="messages">
          {messages.map((message, index) => (
            <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
              <div className="meta">{message.role === 'user' ? 'You' : 'Agent'}</div>
              <div>{message.content}</div>
            </article>
          ))}
        </div>

        <form className="composer" onSubmit={onSubmit}>
          <textarea
            value={input}
            placeholder="Ask for people (role, company, location, seniority)"
            onChange={event => setInput(event.target.value)}
            disabled={isLoading}
          />
          <div className="controls">
            <div className="status">{status}</div>
            <button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? 'Working...' : 'Send'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}