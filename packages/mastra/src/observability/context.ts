import { AsyncLocalStorage } from 'node:async_hooks';

export type ObservabilityContext = {
  requestId: string;
  sessionId: string | null;
  conversationId: string | null;
  route: string;
};

const storage = new AsyncLocalStorage<ObservabilityContext>();

export const runWithObservabilityContext = <T>(
  context: ObservabilityContext,
  callback: () => Promise<T>,
): Promise<T> => storage.run(context, callback);

export const getObservabilityContext = () => storage.getStore() ?? null;
